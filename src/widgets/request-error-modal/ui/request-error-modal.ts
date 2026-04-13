import './request-error-modal.scss';
import { closeModal, openModal } from 'shared/ui/modal/modal';

export const REQUEST_ERROR_EVENT_NAME = 'app:request-error';
const REQUEST_ERROR_MODAL_ID = 'request-error-modal';

interface RequestErrorDetail {
  title?: string;
  message?: string;
  note?: string;
}

function ensureRequestErrorModal(): HTMLElement {
  const existing = document.getElementById(REQUEST_ERROR_MODAL_ID);
  if (existing instanceof HTMLElement) {
    return existing;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal request-error-modal" id="${REQUEST_ERROR_MODAL_ID}" aria-hidden="true">
      <div class="modal__backdrop"></div>
      <div
        class="modal__content request-error-modal__content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-error-modal-title"
      >
        <div class="modal__inner request-error-modal__inner">
          <div class="request-error-modal__hero">
            <div class="request-error-modal__copy">
              <h2 class="request-error-modal__title" id="request-error-modal-title">Раздел временно недоступен</h2>
              <p class="request-error-modal__text" data-request-error-message>
                Сейчас мы временно не можем показать данные. Попробуйте открыть раздел немного позже.
              </p>
            </div>
          </div>

          <div class="request-error-modal__note" data-request-error-note>
            В разделе могут идти технические работы или обновление сервиса. Основные функции вернутся сразу после завершения.
          </div>

          <div class="request-error-modal__actions">
            <button
              class="request-error-modal__button request-error-modal__button--secondary"
              type="button"
              data-request-error-close
            >
              Понятно
            </button>
            <button
              class="request-error-modal__button request-error-modal__button--primary"
              type="button"
              data-request-error-retry
            >
              Обновить
            </button>
          </div>
        </div>
      </div>
    </div>
  `.trim();

  const modal = wrapper.firstElementChild;
  if (!(modal instanceof HTMLElement)) {
    throw new Error('Failed to create request error modal');
  }

  document.body.appendChild(modal);
  return modal;
}

export function initRequestErrorModal(): void {
  const modal = ensureRequestErrorModal();
  const titleNode = modal.querySelector<HTMLElement>('#request-error-modal-title');
  const messageNode = modal.querySelector<HTMLElement>('[data-request-error-message]');
  const noteNode = modal.querySelector<HTMLElement>('[data-request-error-note]');
  const closeButton = modal.querySelector<HTMLElement>('[data-request-error-close]');
  const retryButton = modal.querySelector<HTMLElement>('[data-request-error-retry]');

  const hide = (): void => {
    closeModal(modal);
  };

  const show = (detail?: RequestErrorDetail): void => {
    if (titleNode) {
      titleNode.textContent = detail?.title || 'Раздел временно недоступен';
    }

    if (messageNode) {
      messageNode.textContent =
        detail?.message ||
        'Сейчас мы временно не можем показать данные. Попробуйте открыть раздел немного позже.';
    }

    if (noteNode) {
      noteNode.textContent =
        detail?.note ||
        'В разделе могут идти технические работы или обновление сервиса. Основные функции вернутся сразу после завершения.';
    }

    openModal(modal);
  };

  closeButton?.addEventListener('click', hide);
  retryButton?.addEventListener('click', () => {
    window.location.reload();
  });

  modal.addEventListener('click', (event) => {
    if (
      event.target === modal ||
      event.target === modal.querySelector('.modal__backdrop')
    ) {
      hide();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      modal.getAttribute('aria-hidden') === 'false'
    ) {
      hide();
    }
  });

  window.addEventListener(REQUEST_ERROR_EVENT_NAME, (event) => {
    const customEvent = event as CustomEvent<RequestErrorDetail>;
    show(customEvent.detail);
  });
}
