export function initCampaignDeleteModal(signal: AbortSignal): void {
  const modal = document.getElementById('campaigns-delete-modal');
  const confirmButton = document.getElementById('campaigns-delete-confirm');
  const cancelButton = document.getElementById('campaigns-delete-cancel');

  if (!modal || !confirmButton || !cancelButton) {
    return;
  }

  const close = (): void => {
    modal.hidden = true;
  };

  const open = (): void => {
    modal.hidden = false;
  };

  cancelButton.addEventListener('click', close, { signal });
  confirmButton.addEventListener('click', close, { signal });

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

  document.addEventListener('campaigns:open-delete-modal', open, { signal });
}
