import { updateAdCampaign } from 'features/ads';
import { REQUEST_ERROR_EVENT_NAME } from 'widgets/request-error-modal';
import { campaignStatusMap, mapCampaignStatusToBackendStatus } from './ads-mappers';
import type { PendingStatusChange } from './ads-types';

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

  let pendingStatusChange: PendingStatusChange | null = null;

  const closeStatusModal = () => {
    statusModal.hidden = true;
    statusModalConfirm.removeAttribute('disabled');
    pendingStatusChange = null;
  };

  const openStatusModal = (pending: PendingStatusChange) => {
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
        const currentStatus = row.dataset.statusKey;
        const currentMeta =
          campaignStatusMap[(currentStatus as keyof typeof campaignStatusMap) ?? 'active'];
        const nextStatus =
          toggle.checked
            ? currentStatus === 'draft' || currentStatus === 'moderation'
              ? 'moderation'
              : 'active'
            : currentStatus === 'draft' || currentStatus === 'moderation'
              ? 'draft'
              : 'stopped';

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

  statusModalCancel?.addEventListener('click', closeStatusModal, { signal });

  statusModalConfirm.addEventListener(
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
            (row.dataset.statusKey as keyof typeof campaignStatusMap) ?? 'active'
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
