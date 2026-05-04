import {
  partnerSiteStatusBadgeType,
  partnerSiteStatusRu,
  partnerSiteToggleChecked,
  partnerSiteToggleEditable,
  updatePartnerSite,
} from 'features/sites';
import { REQUEST_ERROR_EVENT_NAME } from 'widgets/request-error-modal';

type PendingSiteStatusChange = {
  siteId: number;
  row: HTMLElement;
  toggle: HTMLInputElement;
  badge: HTMLElement;
  nextStatus: 'active' | 'draft';
};

function showSitesRequestError(title: string, message: string): void {
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

export function bindPartnerSiteStatusModal(signal: AbortSignal): void {
  const statusModal = document.getElementById('add-sites-status-modal');
  const statusModalTitle = document.getElementById('add-sites-status-modal-title');
  const statusModalText = document.getElementById('add-sites-status-modal-text');
  const statusModalNote = document.getElementById('add-sites-status-modal-note');
  const statusModalImage = document.getElementById(
    'add-sites-status-modal-image',
  ) as HTMLImageElement | null;
  const statusModalConfirm = document.getElementById(
    'add-sites-status-confirm',
  ) as HTMLButtonElement | null;
  const statusModalCancel = document.getElementById('add-sites-status-cancel');

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

  let pending: PendingSiteStatusChange | null = null;

  const closeStatusModal = (): void => {
    statusModal.hidden = true;
    statusModalConfirm.removeAttribute('disabled');
    pending = null;
  };

  const openStatusModal = (next: PendingSiteStatusChange): void => {
    pending = next;
    const isEnabling = next.nextStatus === 'active';
    const nextLabel = partnerSiteStatusRu(next.nextStatus);

    statusModalTitle.textContent = isEnabling
      ? 'Включить сайт'
      : 'Выключить сайт';
    statusModalText.textContent = isEnabling
      ? `Площадка перейдёт в статус «${nextLabel}».`
      : `Площадка перейдёт в статус «${nextLabel}» и временно не будет участвовать в показах.`;
    statusModalNote.textContent = isEnabling
      ? 'После включения сайт будет доступен для рекламы с актуальными настройками блоков.'
      : 'Вы сможете снова включить сайт позже — настройки и блоки сохранятся.';
    statusModalConfirm.textContent = isEnabling ? 'Включить' : 'Выключить';
    statusModalImage.src = isEnabling
      ? '/img/News.png'
      : '/img/Delete%20Confirmation.png';
    statusModal.hidden = false;
  };

  document.querySelectorAll<HTMLElement>('.add-sites-page .campaign-row').forEach((row) => {
    const toggle = row.querySelector<HTMLInputElement>('[data-site-status-toggle]');
    const badge = row.querySelector<HTMLElement>('[data-site-status-label]');
    if (!toggle || !badge || toggle.disabled) {
      return;
    }

    toggle.addEventListener(
      'change',
      () => {
        const siteId = Number(row.dataset.siteId || '0');
        const prevCode = row.getAttribute('data-site-status')?.trim() || 'draft';

        if (!partnerSiteToggleEditable(prevCode)) {
          toggle.checked = partnerSiteToggleChecked(prevCode);
          return;
        }

        if (!Number.isFinite(siteId) || siteId <= 0) {
          toggle.checked = partnerSiteToggleChecked(prevCode);
          showSitesRequestError(
            'Не удалось обновить сайт',
            'Сейчас мы временно не можем изменить статус. Попробуйте повторить действие немного позже.',
          );
          return;
        }

        const nextStatus: 'active' | 'draft' = toggle.checked ? 'active' : 'draft';

        toggle.checked = partnerSiteToggleChecked(prevCode);
        openStatusModal({
          siteId,
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

      const { siteId, row, toggle, badge, nextStatus } = pending;
      const codeAfter = nextStatus;

      statusModalConfirm.setAttribute('disabled', 'true');

      try {
        const updated = await updatePartnerSite(siteId, { status: nextStatus });
        const code = (updated.status ?? '').trim() || codeAfter;

        row.setAttribute('data-site-status', code);
        badge.textContent = partnerSiteStatusRu(code);
        badge.className = `status-badge status-badge--${partnerSiteStatusBadgeType(code)}`;
        toggle.checked = partnerSiteToggleChecked(code);
        toggle.disabled = !partnerSiteToggleEditable(code);

        closeStatusModal();
      } catch {
        const prevCode = row.getAttribute('data-site-status')?.trim() || 'draft';
        toggle.checked = partnerSiteToggleChecked(prevCode);
        toggle.disabled = !partnerSiteToggleEditable(prevCode);
        statusModalConfirm.removeAttribute('disabled');
        showSitesRequestError(
          'Не удалось обновить сайт',
          'Сейчас мы временно не можем изменить статус. Попробуйте повторить действие немного позже.',
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
