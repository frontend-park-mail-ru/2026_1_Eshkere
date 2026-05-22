import {
  getAdGroups,
  getAds,
  getAdsInGroup,
  updateAdInGroup,
  type AdCampaignStatus,
} from 'features/ads';
import { showToast } from 'shared/lib/toast';
import { REQUEST_ERROR_EVENT_NAME } from 'widgets/request-error-modal';
import {
  campaignStatusMap,
  mapBackendStatusToCampaignStatus,
} from './ads-mappers';
import type {
  CampaignStatusKey,
  PendingStatusChange,
} from './ads-types';

type ToggleableAdStatus = Extract<AdCampaignStatus, 'working' | 'turned_off'>;

interface CampaignAdTarget {
  adId: number;
  groupId: number;
}

interface CampaignStatusAction {
  sourceStatus: ToggleableAdStatus;
  targetStatus: ToggleableAdStatus;
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

export function notifyCampaignsLoadError(loadErrorNode: HTMLElement | null): void {
  if (!loadErrorNode?.textContent?.trim()) {
    return;
  }

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

function isCampaignToggleStatus(status: string | undefined): status is 'active' | 'stopped' {
  return status === 'active' || status === 'stopped';
}

function getCampaignStatusAction(nextStatus: 'active' | 'stopped'): CampaignStatusAction {
  return nextStatus === 'active'
    ? { sourceStatus: 'turned_off', targetStatus: 'working' }
    : { sourceStatus: 'working', targetStatus: 'turned_off' };
}

function setCampaignRowStatus(
  row: HTMLElement,
  toggle: HTMLInputElement,
  badge: HTMLElement,
  status: CampaignStatusKey,
): void {
  const meta = campaignStatusMap[status];

  row.dataset.statusKey = status;
  badge.textContent = meta.label;
  badge.className = `status-badge status-badge--${meta.tone}`;
  toggle.checked = meta.enabled;
  toggle.disabled = !isCampaignToggleStatus(status);
}

async function refreshCampaignRowStatus(
  campaignId: number,
  row: HTMLElement,
  toggle: HTMLInputElement,
  badge: HTMLElement,
): Promise<boolean> {
  const result = await getAds();
  const campaign = result.ads.find((item) => item.id === campaignId);

  if (!campaign) {
    return false;
  }

  setCampaignRowStatus(
    row,
    toggle,
    badge,
    mapBackendStatusToCampaignStatus(campaign.status),
  );
  return true;
}

async function getCampaignAdTargets(
  campaignId: number,
  nextStatus: 'active' | 'stopped',
): Promise<CampaignAdTarget[]> {
  const action = getCampaignStatusAction(nextStatus);
  const groups = await getAdGroups(campaignId);
  const adsByGroup = await Promise.all(
    groups.groups.map(async (group) => ({
      groupId: group.id,
      ads: (await getAdsInGroup(campaignId, group.id)).ads,
    })),
  );

  return adsByGroup.flatMap(({ groupId, ads }) =>
    ads
      .filter((ad) => ad.status === action.sourceStatus)
      .map((ad) => ({ groupId, adId: ad.id })),
  );
}

async function updateCampaignAdsStatus(
  campaignId: number,
  targets: CampaignAdTarget[],
  nextStatus: 'active' | 'stopped',
): Promise<{ failed: number; updated: number }> {
  const action = getCampaignStatusAction(nextStatus);
  let updated = 0;
  let failed = 0;

  for (const target of targets) {
    try {
      await updateAdInGroup(campaignId, target.groupId, target.adId, {
        status: action.targetStatus,
      });
      updated += 1;
    } catch {
      failed += 1;
    }
  }

  return { failed, updated };
}

function getEmptyStatusChangeText(nextStatus: 'active' | 'stopped'): string {
  return nextStatus === 'active'
    ? 'В кампании нет остановленных объявлений, которые можно включить.'
    : 'В кампании нет активных объявлений, которые можно остановить.';
}

export function bindCampaignStatusModal(signal: AbortSignal): void {
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

  let pending: PendingStatusChange | null = null;

  const closeStatusModal = (): void => {
    statusModal.hidden = true;
    statusModalConfirm.removeAttribute('disabled');
    pending = null;
  };

  const openStatusModal = (next: PendingStatusChange): void => {
    pending = next;
    const isEnabling = next.nextStatus === 'active';

    statusModalTitle.textContent = isEnabling
      ? 'Включить кампанию'
      : 'Остановить кампанию';
    statusModalText.textContent = isEnabling
      ? 'Будут включены остановленные объявления, которые готовы к запуску.'
      : 'Будут остановлены активные объявления этой кампании.';
    statusModalNote.textContent =
      'Объявления на модерации и отклоненные объявления не изменятся.';
    statusModalConfirm.textContent = isEnabling ? 'Включить' : 'Остановить';
    statusModalImage.src = isEnabling
      ? '/img/News.png'
      : '/img/Delete%20Confirmation.png';
    statusModal.hidden = false;
  };

  document.querySelectorAll<HTMLElement>('.campaign-row').forEach((row) => {
    const toggle = row.querySelector<HTMLInputElement>('.toggle input');
    const badge = row.querySelector<HTMLElement>('[data-campaign-status-badge]');

    if (!toggle || !badge || toggle.disabled) {
      return;
    }

    toggle.addEventListener(
      'change',
      () => {
        const campaignId = Number(row.dataset.campaignId || '0');
        const currentStatus = row.dataset.statusKey;

        if (!isCampaignToggleStatus(currentStatus)) {
          toggle.checked = false;
          return;
        }

        if (!Number.isFinite(campaignId) || campaignId <= 0) {
          toggle.checked = campaignStatusMap[currentStatus].enabled;
          showCampaignsRequestError(
            'Не удалось обновить кампанию',
            'Не удалось определить кампанию для изменения статуса. Обновите страницу и повторите действие.',
          );
          return;
        }

        const nextStatus = toggle.checked ? 'active' : 'stopped';
        toggle.checked = campaignStatusMap[currentStatus].enabled;
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

  statusModalCancel?.addEventListener('click', closeStatusModal, { signal });

  statusModalConfirm.addEventListener(
    'click',
    async () => {
      if (!pending) {
        closeStatusModal();
        return;
      }

      const { campaignId, row, toggle, badge, nextStatus } = pending;
      const currentStatus = row.dataset.statusKey;

      statusModalConfirm.setAttribute('disabled', 'true');

      try {
        const targets = await getCampaignAdTargets(campaignId, nextStatus);

        if (targets.length === 0) {
          await refreshCampaignRowStatus(campaignId, row, toggle, badge).catch(() => false);
          closeStatusModal();
          showToast('Статус кампании не изменен', getEmptyStatusChangeText(nextStatus), 'warning');
          return;
        }

        const result = await updateCampaignAdsStatus(campaignId, targets, nextStatus);
        await refreshCampaignRowStatus(campaignId, row, toggle, badge).catch(() => false);
        closeStatusModal();

        if (result.updated === 0) {
          showCampaignsRequestError(
            'Не удалось обновить кампанию',
            'Не удалось изменить статусы объявлений. Попробуйте повторить действие немного позже.',
          );
          return;
        }

        if (result.failed > 0) {
          showToast(
            'Кампания обновлена частично',
            `Обновлено объявлений: ${result.updated}. Не удалось обновить: ${result.failed}.`,
            'warning',
          );
          return;
        }

        showToast(
          nextStatus === 'active' ? 'Кампания включена' : 'Кампания остановлена',
          `Обновлено объявлений: ${result.updated}.`,
        );
      } catch {
        if (isCampaignToggleStatus(currentStatus)) {
          toggle.checked = campaignStatusMap[currentStatus].enabled;
        }
        statusModalConfirm.removeAttribute('disabled');
        showCampaignsRequestError(
          'Не удалось обновить кампанию',
          'Не удалось получить объявления кампании для изменения статуса. Попробуйте повторить действие немного позже.',
        );
      }
    },
    { signal },
  );

  statusModal.addEventListener(
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
      if (event.key === 'Escape' && !statusModal.hidden) {
        closeStatusModal();
      }
    },
    { signal },
  );
}

export { showCampaignsRequestError };
