export const OPEN_CAMPAIGN_DELETE_MODAL_EVENT = 'campaigns:open-delete-modal';

export interface CampaignDeleteModalDetail {
  id: number;
  title: string;
}

interface InitCampaignDeleteModalOptions {
  onConfirm?: (detail: CampaignDeleteModalDetail) => Promise<void> | void;
}

export function initCampaignDeleteModal(
  signal: AbortSignal,
  options: InitCampaignDeleteModalOptions = {},
): void {
  const modal = document.getElementById('campaigns-delete-modal');
  const confirmButton = document.getElementById('campaigns-delete-confirm');
  const cancelButton = document.getElementById('campaigns-delete-cancel');
  const textNode = document.querySelector<HTMLElement>(
    '.campaigns-delete-modal__text',
  );

  if (!modal || !confirmButton || !cancelButton || !textNode) {
    return;
  }

  let pendingDetail: CampaignDeleteModalDetail | null = null;

  const close = (): void => {
    modal.hidden = true;
    pendingDetail = null;
    confirmButton.removeAttribute('disabled');
  };

  const open = (detail?: CampaignDeleteModalDetail): void => {
    pendingDetail = detail ?? null;
    textNode.textContent = detail?.title
      ? `Кампания «${detail.title}» будет удалена из списка. Это действие нельзя отменить.`
      : 'Кампания будет удалена из списка. Это действие нельзя отменить.';
    modal.hidden = false;
  };

  cancelButton.addEventListener('click', close, { signal });
  confirmButton.addEventListener(
    'click',
    async () => {
      if (!pendingDetail) {
        close();
        return;
      }

      confirmButton.setAttribute('disabled', 'true');

      try {
        await options.onConfirm?.(pendingDetail);
        close();
      } catch {
        confirmButton.removeAttribute('disabled');
      }
    },
    { signal },
  );

  modal.addEventListener(
    'click',
    (event) => {
      if (event.target === modal) {
        close();
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && !modal.hidden) {
        close();
      }
    },
    { signal },
  );

  document.addEventListener(
    OPEN_CAMPAIGN_DELETE_MODAL_EVENT,
    (event) => {
      const customEvent = event as CustomEvent<CampaignDeleteModalDetail>;
      open(customEvent.detail);
    },
    { signal },
  );
}
