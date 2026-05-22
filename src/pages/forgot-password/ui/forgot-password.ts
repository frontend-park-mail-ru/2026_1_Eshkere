import './forgot-password.scss';
import 'shared/ui/modal/modal';
import { renderTemplate } from 'shared/lib/render';
import { renderFormField } from 'shared/ui/form-field/form-field';
import { renderButton } from 'shared/ui/button/button';
import { createAppeal } from 'features/appeals';
import { showToast } from 'shared/lib/toast';
import {
  setFieldState,
  validateEmail,
  validateEmailOrPhone,
} from 'shared/validators';
import forgotPasswordPageTemplate from './forgot-password.hbs';

/**
 * Рендерит страницу восстановления пароля.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */

type ForgotPasswordFormElement = HTMLFormElement & {
  readonly elements: HTMLFormControlsCollection & {
    identifier: HTMLInputElement;
    replyEmail: HTMLInputElement;
  };
};

export async function renderForgotPasswordPage(): Promise<string> {
  const restoreField = await renderFormField({
    id: 'forgot-password-identifier',
    name: 'identifier',
    type: 'text',
    label: 'Электронная почта или телефон',
    placeholder: 'Ваша почта или телефон',
    autocomplete: 'username',
    required: true,
  });

  const replyEmailField = await renderFormField({
    id: 'forgot-password-reply-email',
    name: 'replyEmail',
    type: 'email',
    label: 'Почта для ответа',
    placeholder: 'Куда отправить ответ',
    autocomplete: 'email',
    inputmode: 'email',
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
    href: '/login',
    variant: 'secondary',
  });

  return renderTemplate(forgotPasswordPageTemplate, {
    restoreField,
    replyEmailField,
    submitButton,
    helpButton,
    backButton,
  });
}

/**
 * Подключает валидацию и состояния интерфейса
 * для страницы восстановления пароля.
 *
 * @return {void}
 */
export function ForgotPassword(): void | VoidFunction {
  const publicLayout = document.querySelector('.public-layout');
  publicLayout?.classList.add('public-layout--auth');

  const el = document.getElementById('forgot-password-form');
  if (!(el instanceof HTMLFormElement)) {
    return () => {
      publicLayout?.classList.remove('public-layout--auth');
    };
  }
  const form = el as ForgotPasswordFormElement;

  const helpButton = form.querySelector('.forgot-password-help-button');
  const helpModal = document.getElementById('forgot-password-help-modal');
  const submitButton = form.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );
  const feedback = document.querySelector<HTMLElement>(
    '[data-forgot-password-feedback]',
  );
  const successPanel = document.querySelector<HTMLElement>(
    '[data-forgot-password-success]',
  );
  const modalCloseElements = helpModal
    ? helpModal.querySelectorAll('[data-modal-close]')
    : [];

  if (helpModal && helpModal.parentElement !== document.body) {
    document.body.appendChild(helpModal);
  }

  /**
   * Открывает модальное окно с подсказкой.
   *
   * @return {void}
   */
  function openHelpModal(): void {
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
  function closeHelpModal(): void {
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
  function validateIdentifierField(): boolean {
    const error = validateEmailOrPhone(form.elements.identifier.value);
    setFieldState(form, 'identifier', error);
    return !error;
  }

  /**
   * Проверяет почту, на которую поддержка сможет ответить по заявке.
   *
   * @return {boolean} Корректно ли заполнено поле.
   */
  function validateReplyEmailField(): boolean {
    const error = validateEmail(form.elements.replyEmail.value);
    setFieldState(form, 'replyEmail', error);
    return !error;
  }

  /**
   * Показывает ошибку отправки формы без сброса введенных данных.
   *
   * @param {string} message Текст ошибки.
   * @return {void}
   */
  function showSubmitError(message: string): void {
    if (!feedback) {
      showToast('Запрос не отправлен', message, 'error');
      return;
    }

    feedback.hidden = false;
    feedback.textContent = message;
  }

  form.elements.identifier.addEventListener('input', validateIdentifierField);
  form.elements.replyEmail.addEventListener('input', validateReplyEmailField);

  if (helpButton && helpModal) {
    helpButton.addEventListener('click', openHelpModal);
    modalCloseElements.forEach((element) => {
      element.addEventListener('click', closeHelpModal);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    feedback?.setAttribute('hidden', '');

    if (!validateIdentifierField() || !validateReplyEmailField()) {
      return;
    }

    const identifier = form.elements.identifier.value.trim();
    const replyEmail = form.elements.replyEmail.value.trim();

    form.setAttribute('aria-busy', 'true');
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      await createAppeal({
        category: 'question',
        title: 'Восстановление доступа',
        description: [
          'Пользователь запросил восстановление доступа.',
          `Идентификатор аккаунта: ${identifier}`,
          `Почта для ответа: ${replyEmail}`,
        ].join('\n'),
        name: 'Пользователь',
        email: replyEmail,
      });

      form.hidden = true;
      if (successPanel) {
        successPanel.hidden = false;
        successPanel
          .querySelector<HTMLElement>('[data-forgot-password-success-title]')
          ?.focus();
      }
      showToast(
        'Запрос принят',
        'Поддержка получила данные для восстановления доступа.',
        'success',
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Не удалось отправить запрос. Попробуйте еще раз.';
      showSubmitError(message);
    } finally {
      form.removeAttribute('aria-busy');
      if (submitButton && !form.hidden) {
        submitButton.disabled = false;
      }
    }
  });

  const handleEscape = (event: KeyboardEvent) => {
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
    publicLayout?.classList.remove('public-layout--auth');
  };
}
