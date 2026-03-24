import './forgot-password.scss';
import {renderTemplate} from '../../shared/lib/render.js';
import {renderPublicLayout} from '../../widgets/public-layout/public-layout.js';
import {renderFormField} from '../../shared/ui/form-field/form-field.js';
import {renderButton} from '../../shared/ui/button/button.js';
import {
  setFieldState,
  validateEmailOrPhone,
} from '../../shared/lib/validators.js';
import forgotPasswordPageTemplate from './forgot-password.hbs';

/**
 * Рендерит страницу восстановления пароля.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderForgotPasswordPage() {
  const restoreField = await renderFormField({
    id: 'forgot-password-identifier',
    name: 'identifier',
    type: 'text',
    label: 'Электронная почта или телефон',
    placeholder: 'Ваша почта или телефон',
    required: true,
  });

  const submitButton = await renderButton({
    text: 'Отправить',
    type: 'submit',
    variant: 'primary',
  });

  const helpButton = await renderButton({
    text: 'Помощь',
    type: 'button',
    variant: 'secondary',
    className: 'forgot-password-help-button',
  });

  const backButton = await renderButton({
    text: 'Назад',
    href: '#/login',
    variant: 'secondary',
  });

  const content = await renderTemplate(
      forgotPasswordPageTemplate,
      {
        restoreField,
        submitButton,
        helpButton,
        backButton,
      },
  );

  return await renderPublicLayout(content, '/forgot-password');
}

/**
 * Подключает валидацию и состояния интерфейса
 * для страницы восстановления пароля.
 *
 * @return {void}
 */
export function initForgotPasswordPage() {
  const form = document.getElementById('forgot-password-form');

  if (!form) {
    return;
  }

  const formPanel = document.querySelector('[data-forgot-password-form]');
  const helpButton = form.querySelector('.forgot-password-help-button');
  const helpModal = document.getElementById('forgot-password-help-modal');
  const modalCloseElements = helpModal ?
    helpModal.querySelectorAll('[data-modal-close]') :
    [];

  if (helpModal && helpModal.parentElement !== document.body) {
    document.body.appendChild(helpModal);
  }

  /**
   * Открывает модальное окно с подсказкой.
   *
   * @return {void}
   */
  function openHelpModal() {
    if (!helpModal) {
      return;
    }

    helpModal.classList.add('modal--open');
    helpModal.setAttribute('aria-hidden', 'false');
  }

  /**
   * Закрывает модальное окно с подсказкой.
   *
   * @return {void}
   */
  function closeHelpModal() {
    if (!helpModal) {
      return;
    }

    helpModal.classList.remove('modal--open');
    helpModal.setAttribute('aria-hidden', 'true');
  }

  /**
   * Валидирует поле с почтой или телефоном.
   *
   * @return {boolean} Корректно ли заполнено поле.
   */
  function validateIdentifierField() {
    const error = validateEmailOrPhone(form.elements.identifier.value);
    setFieldState(form, 'identifier', error);
    return !error;
  }

  form.elements.identifier.addEventListener('input', validateIdentifierField);

  if (helpButton && helpModal) {
    helpButton.addEventListener('click', openHelpModal);
    modalCloseElements.forEach((element) => {
      element.addEventListener('click', closeHelpModal);
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!validateIdentifierField() || !formPanel) {
      return;
    }
  });

  const handleEscape = (event) => {
    if (event.key === 'Escape') {
      closeHelpModal();
    }
  };

  document.addEventListener('keydown', handleEscape);

  return () => {
    if (helpModal && helpModal.parentElement === document.body) {
      helpModal.remove();
    }

    document.removeEventListener('keydown', handleEscape);
  };
}
