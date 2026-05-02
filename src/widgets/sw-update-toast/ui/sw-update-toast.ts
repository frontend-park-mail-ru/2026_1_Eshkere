import './sw-update-toast.scss';
import { SW_UPDATE_EVENT } from 'shared/lib/events';

const TOAST_ID = 'sw-update-toast';

function ensureToast(): HTMLElement {
  const existing = document.getElementById(TOAST_ID);
  if (existing instanceof HTMLElement) {
    return existing;
  }

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.className = 'sw-update-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.hidden = true;
  toast.innerHTML = `
    <div class="sw-update-toast__body">
      <span class="sw-update-toast__text">Доступна новая версия приложения</span>
      <button class="sw-update-toast__button" type="button" data-sw-update>
        Обновить
      </button>
    </div>
  `.trim();

  document.body.appendChild(toast);
  return toast;
}

function applyUpdate(): void {
  if (!navigator.serviceWorker.controller) {
    window.location.reload();
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  }, { once: true });

  navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
}

export function initSwUpdateToast(): void {
  const toast = ensureToast();
  const button = toast.querySelector<HTMLElement>('[data-sw-update]');

  button?.addEventListener('click', () => {
    button.setAttribute('disabled', 'true');
    applyUpdate();
  });

  window.addEventListener(SW_UPDATE_EVENT, () => {
    toast.hidden = false;
  });
}
