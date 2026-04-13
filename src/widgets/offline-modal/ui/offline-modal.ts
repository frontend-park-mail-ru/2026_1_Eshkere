import './offline-modal.scss';
import { closeModal, openModal } from 'shared/ui/modal/modal';

const OFFLINE_EVENT_NAME = 'app:offline-error';
const OFFLINE_MODAL_ID = 'offline-status-modal';

function ensureOfflineModal(): HTMLElement {
  const existing = document.getElementById(OFFLINE_MODAL_ID);
  if (existing instanceof HTMLElement) {
    return existing;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal offline-modal" id="${OFFLINE_MODAL_ID}" aria-hidden="true">
      <div class="modal__backdrop"></div>
      <div
        class="modal__content offline-modal__content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-modal-title"
      >
        <div class="modal__inner offline-modal__inner">
          <div class="offline-modal__hero">
            <img
              class="offline-modal__illustration"
              src="/img/Security.png"
              alt=""
            />
            <div class="offline-modal__copy">
              <h2 class="offline-modal__title" id="offline-modal-title">Нет интернета</h2>
              <p class="offline-modal__text">
                Сейчас приложение не может связаться с сервером.
                Последние доступные данные мы покажем из кэша, если они уже были загружены раньше.
              </p>
            </div>
          </div>

          <div class="offline-modal__note">
            Новые действия вроде создания, редактирования или удаления будут недоступны,
            пока соединение не восстановится.
          </div>

          <div class="offline-modal__actions">
            <button
              class="offline-modal__button offline-modal__button--secondary"
              type="button"
              data-offline-close
            >
              Понятно
            </button>
            <button
              class="offline-modal__button offline-modal__button--primary"
              type="button"
              data-offline-retry
            >
              Проверить снова
            </button>
          </div>
        </div>
      </div>
    </div>
  `.trim();

  const modal = wrapper.firstElementChild;
  if (!(modal instanceof HTMLElement)) {
    throw new Error('Failed to create offline modal');
  }

  document.body.appendChild(modal);
  return modal;
}

export function initOfflineModal(): void {
  const modal = ensureOfflineModal();
  const closeButton = modal.querySelector<HTMLElement>('[data-offline-close]');
  const retryButton = modal.querySelector<HTMLElement>('[data-offline-retry]');

  const hide = (): void => {
    closeModal(modal);
  };

  const show = (): void => {
    if (modal.getAttribute('aria-hidden') === 'false') {
      return;
    }

    openModal(modal);
  };

  closeButton?.addEventListener('click', hide);
  retryButton?.addEventListener('click', () => {
    if (navigator.onLine) {
      window.location.reload();
      return;
    }

    show();
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target === modal.querySelector('.modal__backdrop')) {
      hide();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      hide();
    }
  });

  window.addEventListener(OFFLINE_EVENT_NAME, show);
  window.addEventListener('offline', show);
  window.addEventListener('online', hide);
}
