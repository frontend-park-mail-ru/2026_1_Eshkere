import './modal.scss';

export function closeModal(modal: HTMLElement): void {
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('modal--open');
}

export function openModal(modal: HTMLElement): void {
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('modal--open');
}

export function bindModalShell(
  modal: HTMLElement,
  signal: AbortSignal,
): void {
  modal.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((node) => {
    node.addEventListener(
      'click',
      () => {
        closeModal(modal);
      },
      { signal },
    );
  });

  modal.addEventListener(
    'click',
    (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    },
    { signal },
  );
}
