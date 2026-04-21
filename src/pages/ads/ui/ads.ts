import './ads.scss';
import { navigateTo } from 'app/navigation';
import { deleteAdCampaign, getAds, updateAdCampaign } from 'features/ads';
import type { AdCampaignStatus } from 'features/ads';
import type { AdItem } from 'features/ads/api/get-ads';
import { isOfflineErrorMessage } from 'shared/lib/request';
import { formatDate, formatPrice } from 'shared/lib/format';
import { renderTemplate } from 'shared/lib/render';
import { REQUEST_ERROR_EVENT_NAME } from 'widgets/request-error-modal';
import { initCampaignActionMenus } from 'widgets/ads-action-menu/ui/action-menu';
import { initAdsDatePicker } from 'widgets/ads-date-picker/ui/date-picker';
import type { CampaignDeleteModalDetail } from 'widgets/ads-delete-modal/ui/delete-modal';
import { initCampaignDeleteModal } from 'widgets/ads-delete-modal/ui/delete-modal';
import {
  CAMPAIGNS_PAGINATION_REFRESH_EVENT,
  initCampaignPagination,
} from 'widgets/ads-pagination/ui/pagination';
import adsPageTemplate from './ads.hbs';

let adsPageLifecycleController: AbortController | null = null;

type CampaignStatusKey = 'active' | 'stopped' | 'draft' | 'moderation';

interface CampaignTemplateRow {
  id: AdItem['id'];
  title: string;
  budget: string;
  budgetValue: number;
  goal: string;
  lastActionDate: string;
  statusKey: CampaignStatusKey;
  status: string;
  statusType: string;
  enabled: boolean;
}

interface CampaignStatusMeta {
  label: string;
  tone: 'working' | 'paused' | 'draft' | 'pending';
  enabled: boolean;
}

interface PendingStatusChange {
  campaignId: number;
  row: HTMLElement;
  toggle: HTMLInputElement;
  badge: HTMLElement;
  nextStatus: CampaignStatusKey;
}

const campaignStatusMap: Record<CampaignStatusKey, CampaignStatusMeta> = {
  active: {
    label: 'Активно',
    tone: 'working',
    enabled: true,
  },
  stopped: {
    label: 'Остановлено',
    tone: 'paused',
    enabled: false,
  },
  draft: {
    label: 'Черновик',
    tone: 'draft',
    enabled: false,
  },
  moderation: {
    label: 'На модерации',
    tone: 'pending',
    enabled: true,
  },
};

function mapBackendStatusToCampaignStatus(
  status?: AdCampaignStatus,
): CampaignStatusKey {
  if (status === 'working') {
    return 'active';
  }

  if (status === 'turned_off' || status === 'not_enough_money') {
    return 'stopped';
  }

  if (status === 'moderation' || status === 'rejected') {
    return 'moderation';
  }

  return 'draft';
}

function mapAdsToCampaigns(ads: AdItem[] = []): CampaignTemplateRow[] {
  return ads.map((ad) => {
    const statusKey = mapBackendStatusToCampaignStatus(ad.status);
    const statusMeta = campaignStatusMap[statusKey];

    return {
      id: ad.id,
      title: ad.title || 'Без названия',
      budget: typeof ad.price === 'number' ? formatPrice(ad.price) : '—',
      budgetValue: typeof ad.price === 'number' ? ad.price : 0,
      goal: ad.target_action || 'Цель не указана',
      lastActionDate: ad.created_at ? formatDate(ad.created_at) : '—',
      statusKey,
      status: statusMeta.label,
      statusType: statusMeta.tone,
      enabled: statusMeta.enabled,
    };
  });
}

function getNextStatus(
  currentStatus: CampaignStatusKey,
  enabled: boolean,
): CampaignStatusKey {
  if (enabled) {
    if (currentStatus === 'draft' || currentStatus === 'moderation') {
      return 'moderation';
    }

    return 'active';
  }

  if (currentStatus === 'draft' || currentStatus === 'moderation') {
    return 'draft';
  }

  return 'stopped';
}

function showCampaignsRequestError(title: string, message: string): void {
  window.dispatchEvent(
    new CustomEvent(REQUEST_ERROR_EVENT_NAME, {
      detail: {
        title,
        message,
        note:
          'В этом разделе могут идти технические работы. Как только сервис снова станет доступен, действие можно будет повторить.',
      },
    }),
  );
}

function mapCampaignStatusToBackendStatus(
  status: CampaignStatusKey,
): AdCampaignStatus {
  if (status === 'active') {
    return 'working';
  }

  if (status === 'stopped') {
    return 'turned_off';
  }

  return 'moderation';
}

export async function renderAdsPage(): Promise<string> {
  const result = await getAds();
  const campaigns = mapAdsToCampaigns(result.ads);

  return renderTemplate(adsPageTemplate, {
    campaigns,
    hasCampaigns: campaigns.length > 0,
    loadError:
      result.error && !isOfflineErrorMessage(result.message)
        ? (result.message ?? '')
        : '',
  });
}

export function Ads(): void | VoidFunction {
  if (adsPageLifecycleController) {
    adsPageLifecycleController.abort();
  }

  const controller = new AbortController();
  adsPageLifecycleController = controller;
  const { signal } = controller;

  const logoutButton = document.getElementById('logout-button');
  const navbarLogoutButton = document.getElementById('navbar-logout-button');
  const statusModal = document.getElementById('campaigns-status-modal');
  const statusModalTitle = document.getElementById('campaigns-status-modal-title');
  const statusModalText = document.getElementById('campaigns-status-modal-text');
  const statusModalNote = document.getElementById('campaigns-status-modal-note');
  const statusModalImage = document.getElementById(
    'campaigns-status-modal-image',
  ) as HTMLImageElement | null;
  const statusModalConfirm = document.getElementById(
    'campaigns-status-confirm',
  ) as HTMLButtonElement | null;
  const statusModalCancel = document.getElementById('campaigns-status-cancel');
  const searchInput = document.getElementById(
    'campaigns-search',
  ) as HTMLInputElement | null;
  const loadErrorNode = document.querySelector<HTMLElement>(
    '[data-campaigns-load-error]',
  );

  let pendingStatusChange: PendingStatusChange | null = null;

  if (loadErrorNode?.textContent?.trim()) {
    window.dispatchEvent(
      new CustomEvent(REQUEST_ERROR_EVENT_NAME, {
        detail: {
          title: 'Не удалось загрузить объявления',
          message:
            'Список кампаний сейчас временно недоступен. Попробуйте обновить страницу или зайти немного позже.',
          note:
            'В этом разделе могут идти технические работы. Как только сервис снова станет доступен, кампании появятся автоматически.',
        },
      }),
    );
  }

  if (logoutButton && navbarLogoutButton) {
    logoutButton.addEventListener(
      'click',
      () => {
        navbarLogoutButton.click();
      },
      { signal },
    );
  }

  const closeStatusModal = () => {
    if (!statusModal) {
      return;
    }

    statusModal.hidden = true;
    statusModalConfirm?.removeAttribute('disabled');
    pendingStatusChange = null;
  };

  const openStatusModal = (pending: PendingStatusChange) => {
    if (
      !statusModal ||
      !statusModalTitle ||
      !statusModalText ||
      !statusModalNote ||
      !statusModalImage ||
      !statusModalConfirm
    ) {
      return;
    }

    pendingStatusChange = pending;

    const nextMeta = campaignStatusMap[pending.nextStatus];
    const isEnabling = nextMeta.enabled;

    statusModalTitle.textContent = isEnabling
      ? 'Включить кампанию'
      : 'Остановить кампанию';
    statusModalText.textContent = isEnabling
      ? `Кампания перейдет в статус "${nextMeta.label}".`
      : `Кампания перейдет в статус "${nextMeta.label}" и перестанет откручиваться.`;
    statusModalNote.textContent = isEnabling
      ? 'Если кампания была в черновике, она уйдет на модерацию перед запуском.'
      : 'Вы сможете вернуться позже и снова активировать кампанию без потери настроек.';
    statusModalConfirm.textContent = isEnabling ? 'Включить' : 'Остановить';
    statusModalImage.src = isEnabling
      ? '/img/News.png'
      : '/img/DeleteConfirmation-dark.png';
    statusModal.hidden = false;
  };

  document
    .querySelectorAll<HTMLElement>(
      '.campaigns-page__create-button, .campaigns-empty__create-button',
    )
    .forEach((button) => {
      button.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          navigateTo('/ads/create');
        },
        { signal },
      );
    });

  initAdsDatePicker(signal);
  initCampaignActionMenus(signal);
  initCampaignDeleteModal(signal, {
    onConfirm: async (detail: CampaignDeleteModalDetail) => {
      try {
        await deleteAdCampaign(detail.id);
        window.location.reload();
      } catch {
        showCampaignsRequestError(
          'Не удалось удалить кампанию',
          'Сейчас мы временно не можем удалить кампанию. Попробуйте повторить действие немного позже.',
        );
        throw new Error('delete failed');
      }
    },
  });
  initCampaignPagination(signal);

  const applySearch = (query: string): void => {
    const normalizedQuery = query.trim().toLowerCase();

    document.querySelectorAll<HTMLElement>('.campaign-row').forEach((row) => {
      const searchableText = [
        row.dataset.campaignTitle || '',
        row.dataset.campaignGoal || '',
        row.textContent || '',
      ]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      row.dataset.searchHidden =
        normalizedQuery && !searchableText.includes(normalizedQuery)
          ? 'true'
          : 'false';
    });

    document.dispatchEvent(new CustomEvent(CAMPAIGNS_PAGINATION_REFRESH_EVENT));
  };

  searchInput?.addEventListener(
    'input',
    () => {
      applySearch(searchInput.value);
    },
    { signal },
  );

  document.querySelectorAll<HTMLElement>('.campaign-row').forEach((row) => {
    const toggle = row.querySelector<HTMLInputElement>('.toggle input');
    const badge = row.querySelector<HTMLElement>('[data-campaign-status-badge]');

    if (!toggle || !badge) {
      return;
    }

    toggle.addEventListener(
      'change',
      () => {
        const campaignId = Number(row.dataset.campaignId || '0');
        const currentStatus =
          (row.dataset.statusKey as CampaignStatusKey | undefined) ?? 'active';
        const currentMeta = campaignStatusMap[currentStatus];
        const nextStatus = getNextStatus(currentStatus, toggle.checked);

        if (!Number.isFinite(campaignId) || campaignId <= 0) {
          toggle.checked = currentMeta.enabled;
          showCampaignsRequestError(
            'Не удалось обновить кампанию',
            'Сейчас мы временно не можем изменить статус кампании. Попробуйте повторить действие немного позже.',
          );
          return;
        }

        toggle.checked = currentMeta.enabled;
        openStatusModal({
          campaignId,
          row,
          toggle,
          badge,
          nextStatus,
        });
      },
      { signal },
    );
  });

  statusModalCancel?.addEventListener(
    'click',
    () => {
      closeStatusModal();
    },
    { signal },
  );

  statusModalConfirm?.addEventListener(
    'click',
    async () => {
      if (!pendingStatusChange) {
        closeStatusModal();
        return;
      }

      const { campaignId, row, toggle, badge, nextStatus } = pendingStatusChange;
      const statusMeta = campaignStatusMap[nextStatus];

      statusModalConfirm.setAttribute('disabled', 'true');

      try {
        await updateAdCampaign(campaignId, {
          status: mapCampaignStatusToBackendStatus(nextStatus),
        });

        row.dataset.statusKey = nextStatus;
        badge.textContent = statusMeta.label;
        badge.className = `status-badge status-badge--${statusMeta.tone}`;
        toggle.checked = statusMeta.enabled;

        closeStatusModal();
      } catch {
        toggle.checked =
          campaignStatusMap[
            (row.dataset.statusKey as CampaignStatusKey | undefined) ?? 'active'
          ].enabled;
        statusModalConfirm.removeAttribute('disabled');
        showCampaignsRequestError(
          'Не удалось обновить кампанию',
          'Сейчас мы временно не можем изменить статус кампании. Попробуйте повторить действие немного позже.',
        );
      }
    },
    { signal },
  );

  statusModal?.addEventListener(
    'click',
    (event) => {
      if (event.target === statusModal) {
        closeStatusModal();
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && statusModal && !statusModal.hidden) {
        closeStatusModal();
      }
    },
    { signal },
  );

  return () => {
    if (adsPageLifecycleController === controller) {
      adsPageLifecycleController = null;
    }
    controller.abort();
  };
}
