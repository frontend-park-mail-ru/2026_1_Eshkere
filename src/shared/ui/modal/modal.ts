import './modal.scss';

function moveModalToBody(modal: HTMLElement): void {
  if (modal.parentElement === document.body) {
    return;
  }

  if (modal.id) {
    const duplicatedModal = document.body.querySelector<HTMLElement>(
      `#${CSS.escape(modal.id)}`,
    );

    if (duplicatedModal && duplicatedModal !== modal) {
      duplicatedModal.remove();
    }
  }

  document.body.appendChild(modal);
}

export function closeModal(modal: HTMLElement): void {
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('modal--open');
}

export function openModal(modal: HTMLElement): void {
  moveModalToBody(modal);
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('modal--open');
}

export function bindModalShell(
  modal: HTMLElement,
  signal: AbortSignal,
): void {
  moveModalToBody(modal);

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
