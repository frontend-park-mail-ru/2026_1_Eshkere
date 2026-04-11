export function createCampaignEditDeleteModalController() {
  const modal = document.querySelector<HTMLElement>('[data-edit-delete-modal]');

  return {
    close(): void {
      if (modal) {
        modal.hidden = true;
      }
    },
    open(): void {
      if (modal) {
        modal.hidden = false;
      }
    },
  };
}

export function initCampaignEditDeleteModal(
  signal: AbortSignal,
  close: () => void,
): void {
  const modal = document.querySelector<HTMLElement>('[data-edit-delete-modal]');

  if (!modal) {
    return;
  }

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
      if (event.key === 'Escape') {
        close();
      }
    },
    { signal },
  );
}
