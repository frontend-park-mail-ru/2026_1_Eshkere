import './mobile-warning-modal.scss';
import { closeModal, openModal } from 'shared/ui/modal/modal';

const MODAL_ID = 'mobile-warning-modal';
const SESSION_KEY = 'mobile_warning_dismissed';
const MOBILE_BREAKPOINT = 1024;

function isMobileOrTablet(): boolean {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // sessionStorage недоступен
  }
}

function createModal(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal mobile-warning-modal" id="${MODAL_ID}" aria-hidden="true">
      <div class="modal__backdrop"></div>
      <div
        class="modal__content mobile-warning-modal__content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-warning-title"
      >
        <div class="modal__inner mobile-warning-modal__inner">
          <img
            class="mobile-warning-modal__illustration"
            src="/img/Bored.png"
            alt=""
            aria-hidden="true"
          />

          <div class="mobile-warning-modal__copy">
            <h2 class="mobile-warning-modal__title" id="mobile-warning-title">
              Лучше открыть на компьютере
            </h2>
            <p class="mobile-warning-modal__text">
              ЭшкеРеклама создана для работы на десктопе. На мобильных устройствах и планшетах часть функций может работать иначе.
            </p>
          </div>

          <div class="mobile-warning-modal__note">
            Вы можете продолжить прямо сейчас — но для создания кампаний, аналитики и полного интерфейса рекомендуем компьютер.
          </div>

          <div class="mobile-warning-modal__actions">
            <button
              class="mobile-warning-modal__button mobile-warning-modal__button--primary"
              type="button"
              data-mw-close
            >
              Понятно, продолжить
            </button>
          </div>
        </div>
      </div>
    </div>
  `.trim();

  const modal = wrapper.firstElementChild;
  if (!(modal instanceof HTMLElement)) {
    throw new Error('Failed to create mobile warning modal');
  }

  document.body.appendChild(modal);
  return modal;
}

export function initMobileWarningModal(): void {
  if (!isMobileOrTablet() || isDismissed()) {
    return;
  }

  const modal = createModal();

  const hide = (): void => {
    markDismissed();
    closeModal(modal);
  };

  modal.querySelector('[data-mw-close]')?.addEventListener('click', hide);

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

  openModal(modal);
}
