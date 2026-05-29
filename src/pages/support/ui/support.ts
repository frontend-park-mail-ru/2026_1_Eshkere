import './support.scss';
import { maybeStartAdvertiserTour } from 'features/onboarding';
import { getAds, type AdItem } from 'features/ads/api/get-ads';
import { listAppeals, createAppeal, getAppeal, type AppealResponse, type AppealCategory } from 'features/appeals';
import { CampaignChatCoordinator } from 'features/support-chat';
import { authState } from 'entities/user';
import { getCurrentPath } from 'shared/lib/navigation';
import { isPartnerCabinet } from 'shared/lib/cabinet';
import { initNativeSelectArrows } from 'shared/lib/native-select-arrow';
import { renderTemplate } from 'shared/lib/render';
import { showToast } from 'shared/lib/toast';
import {
  getActiveCampaignThread,
  parseCampaignId,
  renderChatMessages,
  updateChatEmptyState,
  updateConnectionStatus,
  updateModeratorNote,
} from '../lib/campaign-chat-ui';
import supportTemplate from './support.hbs';

interface SupportCampaign {
  id: number;
  title: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'muted';
  subtitle: string;
  isSelected: boolean;
}

const PARTNER_TOPIC_TO_CATEGORY: Record<string, AppealCategory> = {
  question: 'question',
  complaint: 'complaint',
  bug: 'bug',
  suggestion: 'suggestion',
};

const APPEAL_STATUS_LABELS: Record<string, string> = {
  open: 'Новое',
  new: 'Новое',
  in_progress: 'В работе',
  resolved: 'Решено',
  closed: 'Закрыто',
};

const APPEAL_STATUS_TONES: Record<string, string> = {
  open: 'warning',
  new: 'warning',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'muted',
};

function formatAppealDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

let supportController: AbortController | null = null;

function getCampaignId(ad: AdItem, index: number): number {
  return typeof ad.id === 'number' && Number.isFinite(ad.id) ? ad.id : index + 1;
}

function getStatusMeta(status: AdItem['status']): Pick<SupportCampaign, 'statusLabel' | 'statusTone' | 'subtitle'> {
  if (status === 'rejected') {
    return {
      statusLabel: 'Отклонена',
      statusTone: 'danger',
      subtitle: 'Есть сообщение модератора',
    };
  }

  if (status === 'moderation') {
    return {
      statusLabel: 'На модерации',
      statusTone: 'warning',
      subtitle: 'Можно уточнить детали проверки',
    };
  }

  if (status === 'working') {
    return {
      statusLabel: 'Активна',
      statusTone: 'success',
      subtitle: 'Можно задать вопрос по работе кампании',
    };
  }

  if (status === 'not_enough_money') {
    return {
      statusLabel: 'Нужен баланс',
      statusTone: 'warning',
      subtitle: 'Есть ограничение запуска',
    };
  }

  if (status === 'turned_off') {
    return {
      statusLabel: 'Остановлена',
      statusTone: 'muted',
      subtitle: 'Можно уточнить условия перезапуска',
    };
  }

  return {
    statusLabel: 'Черновик',
    statusTone: 'muted',
    subtitle: 'Можно спросить перед отправкой',
  };
}

function mapCampaigns(ads: AdItem[]): SupportCampaign[] {
  const selectedIndex = Math.max(
    0,
    ads.findIndex((ad) => ad.status === 'rejected' || ad.status === 'moderation'),
  );

  return ads.map((ad, index) => {
    const id = getCampaignId(ad, index);
    const statusMeta = getStatusMeta(ad.status);

    return {
      id,
      title: ad.title || 'Без названия',
      ...statusMeta,
      isSelected: index === selectedIndex,
    };
  });
}

function mapAppeals(appeals: AppealResponse[]) {
  return appeals.map((a) => ({
    ...a,
    statusLabel: APPEAL_STATUS_LABELS[a.status] ?? a.status,
    statusTone: APPEAL_STATUS_TONES[a.status] ?? 'muted',
    createdAtFormatted: formatAppealDate(a.created_at),
  }));
}

export async function renderSupportPage(): Promise<string> {
  const isPartner = isPartnerCabinet(getCurrentPath());
  const appealsResult = await listAppeals().catch(() => ({ advertiser_id: 0, appeals: [] as AppealResponse[] }));
  const backendAppeals = mapAppeals(appealsResult.appeals);

  if (isPartner) {
    const openAppealsCount = backendAppeals.filter(
      (a) => a.status === 'open' || a.status === 'new' || a.status === 'in_progress',
    ).length;
    const resolvedAppealsCount = backendAppeals.filter(
      (a) => a.status === 'resolved' || a.status === 'closed',
    ).length;

    return renderTemplate(supportTemplate, {
      isPartner: true,
      backendAppeals,
      hasBackendAppeals: backendAppeals.length > 0,
      openAppealsCount,
      resolvedAppealsCount,
      loadError: '',
    });
  }

  const adsResult = await getAds();
  const campaigns = mapCampaigns(adsResult.ads);

  return renderTemplate(supportTemplate, {
    isPartner: false,
    campaigns,
    hasCampaigns: campaigns.length > 0,
    pendingCount: campaigns.filter((c) => c.statusTone === 'warning').length,
    rejectedCount: campaigns.filter((c) => c.statusTone === 'danger').length,
    loadError: adsResult.error ? adsResult.message : '',
    backendAppeals,
    hasBackendAppeals: backendAppeals.length > 0,
  });
}

function setActiveCampaign(root: HTMLElement, campaignId: string): void {
  root.querySelectorAll<HTMLElement>('[data-support-campaign]').forEach((card) => {
    const isActive = card.dataset.supportCampaign === campaignId;
    card.classList.toggle('is-active', isActive);
    card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  root.querySelectorAll<HTMLElement>('[data-support-thread]').forEach((thread) => {
    thread.hidden = thread.dataset.supportThread !== campaignId;
  });
}

function bindFileLabel(fileInput: HTMLInputElement): void {
  const label = fileInput.closest<HTMLElement>('[data-file-label]')
    ?? fileInput.parentElement?.querySelector<HTMLElement>('[data-file-label]');
  if (!label) return;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    label.textContent = file ? file.name : 'Прикрепить скриншот';
  });
}

function bindAdvertiserCampaignChat(root: HTMLElement, signal: AbortSignal): () => void {
  const chatCoordinator = new CampaignChatCoordinator();
  let loadingCampaignId: number | null = null;

  const refreshActiveChat = async (campaignId: number): Promise<void> => {
    const thread = getActiveCampaignThread(root);
    if (!thread || parseCampaignId(thread) !== campaignId) return;

    loadingCampaignId = campaignId;

    const messagesEl = thread.querySelector<HTMLElement>('[data-support-messages]');
    if (messagesEl) {
      messagesEl.innerHTML = '';
    }
    updateConnectionStatus(thread, 'connecting');
    updateChatEmptyState(thread, []);
    updateModeratorNote(thread, null);

    await chatCoordinator.switchTo(campaignId, {
      onMessagesChange: (messages) => {
        if (loadingCampaignId !== campaignId) return;
        const activeThread = getActiveCampaignThread(root);
        if (!activeThread || parseCampaignId(activeThread) !== campaignId) return;

        const list = activeThread.querySelector<HTMLElement>('[data-support-messages]');
        if (list) renderChatMessages(list, messages);
        updateChatEmptyState(activeThread, messages);
      },
      onModeratorNote: (text) => {
        if (loadingCampaignId !== campaignId) return;
        const activeThread = getActiveCampaignThread(root);
        if (!activeThread || parseCampaignId(activeThread) !== campaignId) return;
        updateModeratorNote(activeThread, text);
      },
      onConnectionState: (state) => {
        if (loadingCampaignId !== campaignId) return;
        const activeThread = getActiveCampaignThread(root);
        if (!activeThread || parseCampaignId(activeThread) !== campaignId) return;
        updateConnectionStatus(activeThread, state);
      },
      onSendError: () => {
        showToast('Ошибка', 'Не удалось отправить сообщение. Попробуйте ещё раз.', 'error', 4000);
      },
    });

    if (loadingCampaignId === campaignId) {
      loadingCampaignId = null;
    }
  };

  const activateCampaign = (campaignId: string): void => {
    setActiveCampaign(root, campaignId);
    const id = Number(campaignId);
    if (Number.isFinite(id) && id > 0) {
      void refreshActiveChat(id);
    }
  };

  root.querySelectorAll<HTMLElement>('[data-support-campaign]').forEach((card) => {
    card.addEventListener(
      'click',
      () => {
        const campaignId = card.dataset.supportCampaign;
        if (campaignId) activateCampaign(campaignId);
      },
      { signal },
    );
  });

  root.querySelectorAll<HTMLFormElement>('[data-support-form]').forEach((form) => {
    form.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        const thread = form.closest<HTMLElement>('[data-support-thread]');
        const campaignId = parseCampaignId(thread);
        const textarea = form.querySelector<HTMLTextAreaElement>('[data-support-message]');
        const submitBtn = form.querySelector<HTMLButtonElement>('[data-support-submit]');
        const value = textarea?.value.trim() ?? '';

        if (!thread || campaignId === null || !textarea || !value) return;
        if (!authState.getCurrentUser()) return;

        if (submitBtn) submitBtn.disabled = true;

        const session = chatCoordinator.getActive();
        const sent = session && session.getCampaignId() === campaignId
          ? await session.send(value)
          : false;

        if (sent) {
          textarea.value = '';
          textarea.focus();
        }

        if (submitBtn) submitBtn.disabled = false;
      },
      { signal },
    );
  });

  const initialThread = getActiveCampaignThread(root);
  const initialCampaignId = parseCampaignId(initialThread);
  if (initialCampaignId !== null) {
    void refreshActiveChat(initialCampaignId);
  }

  return () => {
    chatCoordinator.destroy();
  };
}

export function Support(): void | VoidFunction {
  if (supportController) {
    supportController.abort();
  }

  const root = document.querySelector<HTMLElement>('[data-support-page]');
  if (!root) return;

  maybeStartAdvertiserTour();

  const controller = new AbortController();
  supportController = controller;
  const { signal } = controller;

  initNativeSelectArrows({
    root,
    signal,
    selectSelector: '.support-partner-form__select',
    fieldSelector: '.support-partner-form__label--select',
  });

  root.querySelectorAll<HTMLInputElement>('[data-support-screenshot]').forEach(bindFileLabel);

  root.querySelectorAll<HTMLElement>('[data-appeal-id]').forEach((card) => {
    card.addEventListener(
      'click',
      async () => {
        const id = Number(card.dataset.appealId);
        if (!id) return;

        const descEl = card.querySelector<HTMLElement>('[data-appeal-desc]');
        if (!descEl || descEl.dataset.loaded) return;

        try {
          const appeal = await getAppeal(id);
          descEl.textContent = appeal.description;
          descEl.dataset.loaded = 'true';
        } catch {
          // игнорируем
        }
      },
      { signal },
    );
  });

  const partnerForm = root.querySelector<HTMLFormElement>('[data-support-partner-form]');
  if (partnerForm) {
    const errorBanner = partnerForm.querySelector<HTMLElement>('[data-partner-form-error]')!;
    const successBanner = partnerForm.querySelector<HTMLElement>('[data-partner-form-success]')!;
    const submitBtn = partnerForm.querySelector<HTMLButtonElement>('[data-partner-submit]')!;

    partnerForm.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        const topicSelect = partnerForm.querySelector<HTMLSelectElement>('[data-support-topic]');
        const titleInput = partnerForm.querySelector<HTMLInputElement>('[data-support-title]');
        const textarea = partnerForm.querySelector<HTMLTextAreaElement>('[data-support-message]');
        const fileInput = partnerForm.querySelector<HTMLInputElement>('[data-support-screenshot]');

        const topicValue = topicSelect?.value ?? 'question';
        const title = titleInput?.value.trim() ?? '';
        const text = textarea?.value.trim() ?? '';

        errorBanner.hidden = true;
        successBanner.hidden = true;

        if (!title) {
          errorBanner.textContent = 'Укажите тему обращения';
          errorBanner.hidden = false;
          titleInput?.focus();
          return;
        }

        if (!text) {
          errorBanner.textContent = 'Опишите проблему подробнее';
          errorBanner.hidden = false;
          textarea?.focus();
          return;
        }

        const user = authState.getCurrentUser();
        if (!user) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляем…';

        try {
          const category: AppealCategory = PARTNER_TOPIC_TO_CATEGORY[topicValue] ?? 'question';
          await createAppeal({
            category,
            title,
            description: text,
            name: user.name || user.email || 'Партнёр',
            email: user.email,
            screenshot: fileInput?.files?.[0],
          });

          partnerForm.reset();
          const fileLabelEl = partnerForm.querySelector<HTMLElement>('[data-file-label]');
          if (fileLabelEl) fileLabelEl.textContent = 'Прикрепить скриншот';

          successBanner.hidden = false;
          successBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          errorBanner.textContent = 'Не удалось отправить обращение. Попробуйте ещё раз.';
          errorBanner.hidden = false;
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Отправить обращение';
        }
      },
      { signal },
    );

    return () => {
      if (supportController === controller) supportController = null;
      controller.abort();
    };
  }

  const destroyChat = bindAdvertiserCampaignChat(root, signal);

  return () => {
    destroyChat();
    if (supportController === controller) supportController = null;
    controller.abort();
  };
}
