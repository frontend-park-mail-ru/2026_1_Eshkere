import './adblock-notice-modal.scss';
import { LocalStorageKey, localStorageService } from 'shared/lib/local-storage';
import { closeModal, openModal } from 'shared/ui/modal/modal';

const MODAL_ID = 'adblock-notice-modal';
const OPEN_DELAY_MS = 350;
const OPEN_RETRY_DELAY_MS = 400;

function wasShown(): boolean {
  return localStorageService.getItem(LocalStorageKey.AdBlockNoticeShown) === '1';
}

function markShown(): void {
  localStorageService.setItem(LocalStorageKey.AdBlockNoticeShown, '1');
}

function hasOpenedModal(): boolean {
  return document.querySelector('.modal.modal--open') !== null;
}

function ensureModal(): HTMLElement {
  const existing = document.getElementById(MODAL_ID);
  if (existing instanceof HTMLElement) {
    return existing;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal adblock-notice-modal" id="${MODAL_ID}" aria-hidden="true">
      <div class="modal__backdrop" data-adblock-notice-close></div>
      <div
        class="modal__content adblock-notice-modal__content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adblock-notice-title"
      >
        <div class="modal__inner adblock-notice-modal__inner">
          <div class="adblock-notice-modal__icon" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 3 4.5 6.4v5.3c0 4.4 3 7.6 7.5 9.3 4.5-1.7 7.5-4.9 7.5-9.3V6.4L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              <path d="M8.6 12h6.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>

          <div class="adblock-notice-modal__copy">
            <h2 class="adblock-notice-modal__title" id="adblock-notice-title">
              Отключите AdBlock для сайта
            </h2>
            <p class="adblock-notice-modal__text">
              Eshkereklama работает с рекламными объявлениями и аналитикой. Блокировщики рекламы могут скрывать превью, мешать загрузке изображений и ломать часть функций кабинета.
            </p>
          </div>

          <div class="adblock-notice-modal__note">
            Добавьте eshkereklama.ru в исключения AdBlock, чтобы интерфейс рекламного кабинета работал стабильно.
          </div>

          <button
            class="adblock-notice-modal__button"
            type="button"
            data-adblock-notice-close
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  `.trim();

  const modal = wrapper.firstElementChild;
  if (!(modal instanceof HTMLElement)) {
    throw new Error('Failed to create adblock notice modal');
  }

  document.body.appendChild(modal);
  return modal;
}

export function initAdBlockNoticeModal(): void {
  if (wasShown()) {
    return;
  }

  const modal = ensureModal();

  const hide = (): void => {
    closeModal(modal);
  };

  modal.querySelectorAll('[data-adblock-notice-close]').forEach((node) => {
    node.addEventListener('click', hide);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      hide();
    }
  });

  const show = (): void => {
    if (hasOpenedModal()) {
      window.setTimeout(show, OPEN_RETRY_DELAY_MS);
      return;
    }

    markShown();
    openModal(modal);
  };

  window.setTimeout(show, OPEN_DELAY_MS);
}
