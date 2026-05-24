import './support.scss';
import { getAds, type AdItem } from 'features/ads/api/get-ads';
import { listAppeals, createAppeal, getAppeal, type AppealResponse, type AppealCategory } from 'features/appeals';
import { authState } from 'entities/user';
import { LocalStorageKey, localStorageService } from 'shared/lib/local-storage';
import { getCurrentPath } from 'shared/lib/navigation';
import { isPartnerCabinet } from 'shared/lib/cabinet';
import { renderTemplate } from 'shared/lib/render';
import supportTemplate from './support.hbs';

interface SupportThreadMessage {
  author: 'user' | 'moderator';
  text: string;
  time: string;
}

interface SupportCampaign {
  id: number;
  title: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'muted';
  subtitle: string;
  moderatorMessage: string;
  isSelected: boolean;
  messages: SupportThreadMessage[];
}

interface SupportStorage {
  [campaignId: string]: SupportThreadMessage[];
}

const TOPIC_TO_CATEGORY: Record<string, AppealCategory> = {
  'Вопрос по модерации': 'question',
  'Креативы и текст': 'complaint',
  'Бюджет и списания': 'complaint',
  'Запуск кампании': 'question',
};

const PARTNER_TOPIC_TO_CATEGORY: Record<string, AppealCategory> = {
  'question': 'question',
  'complaint': 'complaint',
  'bug': 'bug',
  'suggestion': 'suggestion',
};

const APPEAL_STATUS_LABELS: Record<string, string> = {
  new: 'Новое',
  in_progress: 'В работе',
  resolved: 'Решено',
  closed: 'Закрыто',
};

const APPEAL_STATUS_TONES: Record<string, string> = {
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

function getStatusMeta(status: AdItem['status']): Pick<SupportCampaign, 'statusLabel' | 'statusTone' | 'subtitle' | 'moderatorMessage'> {
  if (status === 'rejected') {
    return {
      statusLabel: 'Отклонена',
      statusTone: 'danger',
      subtitle: 'Есть сообщение модератора',
      moderatorMessage:
        'Кампания не прошла проверку: уточните формулировку оффера и уберите обещания результата без подтверждения. После правок отправьте кампанию на повторную модерацию.',
    };
  }

  if (status === 'moderation') {
    return {
      statusLabel: 'На модерации',
      statusTone: 'warning',
      subtitle: 'Можно уточнить детали проверки',
      moderatorMessage:
        'Кампания находится на проверке. Если нужно добавить контекст по креативу или аудитории, отправьте сообщение в поддержку.',
    };
  }

  if (status === 'working') {
    return {
      statusLabel: 'Активна',
      statusTone: 'success',
      subtitle: 'Можно задать вопрос по работе кампании',
      moderatorMessage:
        'По этой кампании нет замечаний модератора. Опишите вопрос, и команда поддержки подскажет следующий шаг.',
    };
  }

  if (status === 'not_enough_money') {
    return {
      statusLabel: 'Нужен баланс',
      statusTone: 'warning',
      subtitle: 'Есть ограничение запуска',
      moderatorMessage:
        'Кампания готова к работе, но запуск ограничен балансом. Можно уточнить списания, прогноз бюджета или статус пополнения.',
    };
  }

  if (status === 'turned_off') {
    return {
      statusLabel: 'Остановлена',
      statusTone: 'muted',
      subtitle: 'Можно уточнить условия перезапуска',
      moderatorMessage:
        'Кампания остановлена. Поддержка поможет проверить настройки перед повторным запуском.',
    };
  }

  return {
    statusLabel: 'Черновик',
    statusTone: 'muted',
    subtitle: 'Можно спросить перед отправкой',
    moderatorMessage:
      'Черновик еще не отправлен на модерацию. Можно задать вопрос по требованиям к креативу, аудитории или тексту объявления.',
  };
}

function getStoredThreads(): SupportStorage {
  return localStorageService.getJson<SupportStorage>(LocalStorageKey.SupportThreads) ?? {};
}

function formatNow(topic: string): string {
  const now = new Date();
  const time = now.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `${topic} · ${time}`;
}

function mapCampaigns(ads: AdItem[]): SupportCampaign[] {
  const storedThreads = getStoredThreads();
  const selectedIndex = Math.max(
    0,
    ads.findIndex((ad) => ad.status === 'rejected' || ad.status === 'moderation'),
  );

  return ads.map((ad, index) => {
    const id = getCampaignId(ad, index);
    const statusMeta = getStatusMeta(ad.status);
    const storedMessages = storedThreads[String(id)] ?? [];

    return {
      id,
      title: ad.title || 'Без названия',
      ...statusMeta,
      isSelected: index === selectedIndex,
      messages: storedMessages,
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
    const openAppealsCount = backendAppeals.filter((a) => a.status === 'new' || a.status === 'in_progress').length;
    const resolvedAppealsCount = backendAppeals.filter((a) => a.status === 'resolved' || a.status === 'closed').length;

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

function persistMessage(campaignId: string, message: SupportThreadMessage): void {
  const storedThreads = getStoredThreads();
  storedThreads[campaignId] = [...(storedThreads[campaignId] ?? []), message];
  localStorageService.setJson(LocalStorageKey.SupportThreads, storedThreads);
}

function appendUserMessage(thread: HTMLElement, message: SupportThreadMessage): void {
  const list = thread.querySelector<HTMLElement>('[data-support-messages]');
  if (!list) return;

  const item = document.createElement('article');
  item.className = 'support-message support-message--user';
  item.innerHTML = `
    <span class="support-message__meta"></span>
    <p class="support-message__text"></p>
  `;
  item.querySelector<HTMLElement>('.support-message__meta')!.textContent = message.time;
  item.querySelector<HTMLElement>('.support-message__text')!.textContent = message.text;
  list.appendChild(item);
  item.scrollIntoView({ block: 'nearest' });
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

export function Support(): void | VoidFunction {
  if (supportController) {
    supportController.abort();
  }

  const root = document.querySelector<HTMLElement>('[data-support-page]');
  if (!root) return;

  const controller = new AbortController();
  supportController = controller;
  const { signal } = controller;

  // Прикрепление файла — для всех форм
  root.querySelectorAll<HTMLInputElement>('[data-support-screenshot]').forEach(bindFileLabel);

  // Раскрытие деталей обращений по клику
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

  // ── Партнёрская форма ─────────────────────────────────────────────────
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

  // ── Рекламодательский режим: треды по кампаниям ───────────────────────
  root.querySelectorAll<HTMLElement>('[data-support-campaign]').forEach((card) => {
    card.addEventListener(
      'click',
      () => {
        const campaignId = card.dataset.supportCampaign;
        if (campaignId) setActiveCampaign(root, campaignId);
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
        const campaignId = thread?.dataset.supportThread;
        const textarea = form.querySelector<HTMLTextAreaElement>('[data-support-message]');
        const select = form.querySelector<HTMLSelectElement>('[data-support-topic]');
        const fileInput = form.querySelector<HTMLInputElement>('[data-support-screenshot]');
        const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]');
        const value = textarea?.value.trim() ?? '';

        if (!thread || !campaignId || !textarea || !value) return;

        const topic = select?.value || 'Вопрос';
        const message: SupportThreadMessage = {
          author: 'user',
          text: value,
          time: formatNow(topic),
        };

        persistMessage(campaignId, message);
        appendUserMessage(thread, message);
        textarea.value = '';

        // Сбрасываем файл и его лейбл
        if (fileInput) {
          fileInput.value = '';
          const fileLabelEl = fileInput.parentElement?.querySelector<HTMLElement>('[data-file-label]');
          if (fileLabelEl) fileLabelEl.textContent = 'Прикрепить скриншот';
        }

        textarea.focus();

        const user = authState.getCurrentUser();
        if (!user) return;

        const category: AppealCategory = TOPIC_TO_CATEGORY[topic] ?? 'question';
        if (submitBtn) submitBtn.disabled = true;

        try {
          await createAppeal({
            category,
            title: topic.slice(0, 100),
            description: value,
            name: user.name || user.email || 'Рекламодатель',
            email: user.email,
            screenshot: fileInput?.files?.[0],
          });
        } catch {
          // Сообщение уже показано в UI — молча игнорируем ошибку
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      },
      { signal },
    );
  });

  return () => {
    if (supportController === controller) supportController = null;
    controller.abort();
  };
}
