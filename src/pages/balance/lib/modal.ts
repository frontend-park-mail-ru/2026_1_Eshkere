export interface ToastController {
  hide: () => void;
  show: (title: string, text: string) => void;
}

function clearToastText(): void {
  document
    .querySelector<HTMLElement>('[data-balance-toast-title]')
    ?.replaceChildren();
  document
    .querySelector<HTMLElement>('[data-balance-toast-text]')
    ?.replaceChildren();
}

export function createToastController(): ToastController {
  let toastTimer: number | null = null;

  const stopTimer = (): void => {
    if (toastTimer) {
      window.clearTimeout(toastTimer);
      toastTimer = null;
    }
  };

  const hide = (): void => {
    stopTimer();

    const toast = document.querySelector<HTMLElement>('[data-balance-toast]');
    if (!toast) {
      return;
    }

    toast.hidden = true;
    clearToastText();
  };

  const show = (title: string, text: string): void => {
    const toast = document.querySelector<HTMLElement>('[data-balance-toast]');
    const titleNode = document.querySelector<HTMLElement>(
      '[data-balance-toast-title]',
    );
    const textNode = document.querySelector<HTMLElement>(
      '[data-balance-toast-text]',
    );

    if (!toast || !titleNode || !textNode) {
      return;
    }

    titleNode.textContent = title;
    textNode.textContent = text;
    toast.hidden = false;

    stopTimer();
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
      toastTimer = null;
    }, 3200);
  };

  return { hide, show };
}

export function closeModal(modal: HTMLElement): void {
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('modal--open');
}

export function openModal(modal: HTMLElement): void {
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('modal--open');
}

export function openTopupModal(
  modal: HTMLElement,
  focusAmount = false,
): void {
  openModal(modal);

  if (!focusAmount) {
    return;
  }

  window.setTimeout(() => {
    const amountInput = modal.querySelector<HTMLInputElement>(
      'input[name="amount"]',
    );
    if (!amountInput) {
      return;
    }

    amountInput.focus();
    amountInput.select();
  }, 40);
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
