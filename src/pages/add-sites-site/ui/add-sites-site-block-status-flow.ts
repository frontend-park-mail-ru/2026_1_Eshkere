import {
  partnerBlockStatusBadgeType,
  partnerBlockStatusRu,
  partnerBlockToggleChecked,
  updatePartnerBlockMeta,
} from 'features/sites';
import { REQUEST_ERROR_EVENT_NAME } from 'widgets/request-error-modal';

type PendingBlockStatusChange = {
  siteId: number;
  blockId: number;
  row: HTMLElement;
  toggle: HTMLInputElement;
  badge: HTMLElement;
  nextStatus: 'active' | 'inactive';
  blockLabel: string;
};

function showBlockStatusRequestError(title: string, message: string): void {
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

/** Модалка подтверждения смены статуса блока (как на списке площадок / кампаний). */
export function bindPartnerBlockStatusModal(signal: AbortSignal, siteId: number): void {
  if (!Number.isFinite(siteId) || siteId <= 0) {
    return;
  }

  const statusModal = document.getElementById('add-sites-site-block-status-modal');
  const statusModalTitle = document.getElementById('add-sites-site-block-status-modal-title');
  const statusModalText = document.getElementById('add-sites-site-block-status-modal-text');
  const statusModalNote = document.getElementById('add-sites-site-block-status-modal-note');
  const statusModalImage = document.getElementById(
    'add-sites-site-block-status-modal-image',
  ) as HTMLImageElement | null;
  const statusModalConfirm = document.getElementById(
    'add-sites-site-block-status-confirm',
  ) as HTMLButtonElement | null;
  const statusModalCancel = document.getElementById('add-sites-site-block-status-cancel');

  const pageRoot = document.querySelector<HTMLElement>('[data-add-sites-site]');
  if (
    !pageRoot ||
    !statusModal ||
    !statusModalTitle ||
    !statusModalText ||
    !statusModalNote ||
    !statusModalImage ||
    !statusModalConfirm
  ) {
    return;
  }

  let pending: PendingBlockStatusChange | null = null;

  const closeStatusModal = (): void => {
    statusModal.hidden = true;
    statusModalConfirm.removeAttribute('disabled');
    pending = null;
  };

  const openStatusModal = (next: PendingBlockStatusChange): void => {
    pending = next;
    const isEnabling = next.nextStatus === 'active';
    const nextLabel = partnerBlockStatusRu(next.nextStatus);

    statusModalTitle.textContent = isEnabling ? 'Включить блок' : 'Выключить блок';
    statusModalText.textContent = isEnabling
      ? `Блок «${next.blockLabel}» перейдёт в статус «${nextLabel}» и сможет участвовать в показах.`
      : `Блок «${next.blockLabel}» перейдёт в статус «${nextLabel}» и временно не будет участвовать в показах.`;
    statusModalNote.textContent = isEnabling
      ? 'После включения блок будет использовать актуальные настройки площадки.'
      : 'Вы сможете снова включить блок позже — настройки сохранятся.';
    statusModalConfirm.textContent = isEnabling ? 'Включить' : 'Выключить';
    statusModalImage.src = isEnabling
      ? '/img/News.png'
      : '/img/Delete%20Confirmation.png';
    statusModal.hidden = false;
  };

  pageRoot.querySelectorAll<HTMLElement>('.add-sites-site__row[data-block-id]').forEach((row) => {
    const toggle = row.querySelector<HTMLInputElement>('[data-block-status-toggle]');
    const badge = row.querySelector<HTMLElement>('[data-block-status-label]');
    if (!toggle || !badge) {
      return;
    }

    toggle.addEventListener(
      'change',
      () => {
        const blockId = Number(row.getAttribute('data-block-id') || '0');
        const prevCode = row.getAttribute('data-block-status')?.trim().toLowerCase() || 'inactive';
        const nextStatus: 'active' | 'inactive' = toggle.checked ? 'active' : 'inactive';

        if (partnerBlockToggleChecked(prevCode) === toggle.checked) {
          toggle.checked = partnerBlockToggleChecked(prevCode);
          return;
        }

        if (!Number.isFinite(blockId) || blockId <= 0) {
          toggle.checked = partnerBlockToggleChecked(prevCode);
          showBlockStatusRequestError(
            'Не удалось обновить блок',
            'Сейчас мы временно не можем изменить статус. Попробуйте повторить действие немного позже.',
          );
          return;
        }

        const blockLabel =
          row.querySelector('.add-sites-site__block-name')?.textContent?.trim() || 'Блок';

        toggle.checked = partnerBlockToggleChecked(prevCode);
        openStatusModal({
          siteId,
          blockId,
          row,
          toggle,
          badge,
          nextStatus,
          blockLabel,
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

      const { siteId: sid, blockId, row, toggle, badge, nextStatus } = pending;

      statusModalConfirm.setAttribute('disabled', 'true');

      try {
        const updated = await updatePartnerBlockMeta(sid, blockId, { status: nextStatus });
        const code = (updated.status ?? nextStatus).trim().toLowerCase() || 'inactive';
        row.setAttribute('data-block-status', code);
        badge.textContent = partnerBlockStatusRu(code);
        badge.className = `status-badge status-badge--${partnerBlockStatusBadgeType(code)}`;
        toggle.checked = partnerBlockToggleChecked(code);

        closeStatusModal();
      } catch {
        const prevCode = row.getAttribute('data-block-status')?.trim().toLowerCase() || 'inactive';
        toggle.checked = partnerBlockToggleChecked(prevCode);
        statusModalConfirm.removeAttribute('disabled');
        showBlockStatusRequestError(
          'Не удалось обновить блок',
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
