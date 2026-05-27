import './forgot-password.scss';
import { renderTemplate } from 'shared/lib/render';
import {
  PasswordVisibilityToggles,
  renderFormField,
} from 'shared/ui/form-field/form-field';
import { renderButton } from 'shared/ui/button/button';
import {
  normalizePhone,
  setFieldState,
  validateEmailOrPhone,
  validatePassword,
  validateRepeatPassword,
} from 'shared/validators';
import {
  confirmPasswordReset,
  requestPasswordReset,
} from 'features/auth';
import { navigateTo } from 'shared/lib/navigation';
import forgotPasswordPageTemplate from './forgot-password.hbs';

type ResetStep = 'request' | 'code' | 'success';

type RequestFormElement = HTMLFormElement & {
  readonly elements: HTMLFormControlsCollection & {
    identifier: HTMLInputElement;
  };
};

type ConfirmFormElement = HTMLFormElement & {
  readonly elements: HTMLFormControlsCollection & {
    code: HTMLInputElement;
    newPassword: HTMLInputElement;
    repeatPassword: HTMLInputElement;
  };
};

function sanitizePasswordInput(value: string): string {
  return value.replace(/\s+/g, '');
}

function sanitizeCodeInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

function normalizeIdentifier(value: string): string {
  const trimmed = value.trim();
  return normalizePhone(trimmed) || trimmed.toLowerCase();
}

function setFeedback(
  node: HTMLElement | null,
  message: string,
  tone: 'info' | 'success' | 'error' = 'error',
): void {
  if (!node) {
    return;
  }

  node.textContent = message;
  node.hidden = !message;
  node.dataset.tone = tone;
}

/**
 * Рендерит страницу восстановления пароля.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderForgotPasswordPage(): Promise<string> {
  const identifierField = await renderFormField({
    id: 'forgot-password-identifier',
    name: 'identifier',
    type: 'text',
    label: 'Email или телефон',
    placeholder: 'name@example.com или +7 999 123 45 67',
    autocomplete: 'username',
    required: true,
  });

  const codeField = await renderFormField({
    id: 'forgot-password-code',
    name: 'code',
    type: 'text',
    label: 'Код из письма',
    placeholder: '123456',
    autocomplete: 'one-time-code',
    inputmode: 'numeric',
    maxlength: 6,
    className: 'forgot-password-code-input',
    required: true,
  });

  const newPasswordField = await renderFormField({
    id: 'forgot-password-new-password',
    name: 'newPassword',
    type: 'password',
    label: 'Новый пароль',
    placeholder: 'Минимум 6 символов',
    autocomplete: 'new-password',
    required: true,
  });

  const repeatPasswordField = await renderFormField({
    id: 'forgot-password-repeat-password',
    name: 'repeatPassword',
    type: 'password',
    label: 'Повторите пароль',
    placeholder: 'Повторите новый пароль',
    autocomplete: 'new-password',
    required: true,
  });

  const requestButton = await renderButton({
    text: 'Отправить код',
    type: 'submit',
    variant: 'primary',
  });

  const confirmButton = await renderButton({
    text: 'Сменить пароль',
    type: 'submit',
    variant: 'primary',
  });

  const backButton = await renderButton({
    text: 'Назад',
    href: '/login',
    variant: 'secondary',
  });

  const loginButton = await renderButton({
    text: 'Перейти ко входу',
    href: '/login',
    variant: 'primary',
    className: 'forgot-password-login-button',
  });

  return renderTemplate(forgotPasswordPageTemplate, {
    identifierField,
    codeField,
    newPasswordField,
    repeatPasswordField,
    requestButton,
    confirmButton,
    backButton,
    loginButton,
  });
}

/**
 * Подключает reset-password flow: request -> code -> success.
 *
 * @return {void}
 */
export function ForgotPassword(): void | VoidFunction {
  const publicLayout = document.querySelector('.public-layout');
  publicLayout?.classList.add('public-layout--auth');

  const requestEl = document.getElementById('forgot-password-request-form');
  const confirmEl = document.getElementById('forgot-password-confirm-form');
  if (!(requestEl instanceof HTMLFormElement) || !(confirmEl instanceof HTMLFormElement)) {
    return () => {
      publicLayout?.classList.remove('public-layout--auth');
    };
  }

  const requestForm = requestEl as RequestFormElement;
  const confirmForm = confirmEl as ConfirmFormElement;
  const requestFeedback = document.querySelector<HTMLElement>('[data-reset-request-feedback]');
  const confirmFeedback = document.querySelector<HTMLElement>('[data-reset-confirm-feedback]');
  const identifierLabel = document.querySelector<HTMLElement>('[data-reset-identifier]');
  const resendButton = document.querySelector<HTMLButtonElement>('[data-reset-resend]');
  const backButton = document.querySelector<HTMLButtonElement>('[data-reset-back]');
  const loginButton = document.querySelector<HTMLAnchorElement>('.forgot-password-login-button');

  let identifier = '';
  let isRequesting = false;
  let isConfirming = false;

  PasswordVisibilityToggles(confirmForm);

  function setStep(step: ResetStep): void {
    document.querySelectorAll<HTMLElement>('[data-reset-step]').forEach((node) => {
      node.hidden = node.dataset.resetStep !== step;
    });

    if (step === 'request') {
      requestForm.elements.identifier.focus();
    }

    if (step === 'code') {
      confirmForm.elements.code.focus();
    }

    if (step === 'success') {
      document.querySelector<HTMLElement>('[data-reset-success-title]')?.focus();
    }
  }

  function validateIdentifierField(): boolean {
    const error = validateEmailOrPhone(requestForm.elements.identifier.value);
    setFieldState(requestForm, 'identifier', error);
    return !error;
  }

  function validateCodeField(): boolean {
    const error = /^\d{6}$/.test(confirmForm.elements.code.value.trim())
      ? ''
      : 'Введите 6-значный код';
    setFieldState(confirmForm, 'code', error);
    return !error;
  }

  function validateNewPasswordField(): boolean {
    const error = validatePassword(confirmForm.elements.newPassword.value);
    setFieldState(confirmForm, 'newPassword', error);
    return !error;
  }

  function validateRepeatPasswordField(): boolean {
    const error = validateRepeatPassword(
      confirmForm.elements.newPassword.value,
      confirmForm.elements.repeatPassword.value,
    );
    setFieldState(confirmForm, 'repeatPassword', error);
    return !error;
  }

  async function submitResetRequest(options: { quiet?: boolean } = {}): Promise<void> {
    if (isRequesting) {
      return;
    }

    const submitButton = requestForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    isRequesting = true;
    if (submitButton) submitButton.disabled = true;
    if (resendButton) resendButton.disabled = true;
    setFeedback(requestFeedback, '', 'info');
    if (!options.quiet) setFeedback(confirmFeedback, '', 'info');

    try {
      const result = await requestPasswordReset({ identifier });

      if (result.error) {
        const targetFeedback = options.quiet ? confirmFeedback : requestFeedback;
        setFeedback(targetFeedback ?? null, result.message, 'error');
        return;
      }

      if (identifierLabel) {
        identifierLabel.textContent = identifier;
      }

      if (loginButton) {
        loginButton.href = `/login?email=${encodeURIComponent(identifier)}`;
      }

      setFeedback(
        confirmFeedback,
        options.quiet
          ? 'Код отправлен ещё раз'
          : result.data.message || 'Если аккаунт существует, код для восстановления отправлен на почту',
        options.quiet ? 'success' : 'info',
      );
      setStep('code');
    } finally {
      isRequesting = false;
      if (submitButton) submitButton.disabled = false;
      if (resendButton) resendButton.disabled = false;
    }
  }

  requestForm.elements.identifier.addEventListener('input', () => {
    validateIdentifierField();
    setFeedback(requestFeedback, '', 'info');
  });

  confirmForm.elements.code.addEventListener('input', () => {
    confirmForm.elements.code.value = sanitizeCodeInput(confirmForm.elements.code.value);
    validateCodeField();
    setFeedback(confirmFeedback, '', 'info');
  });

  confirmForm.elements.newPassword.addEventListener('input', () => {
    confirmForm.elements.newPassword.value = sanitizePasswordInput(
      confirmForm.elements.newPassword.value,
    );
    validateNewPasswordField();
    validateRepeatPasswordField();
    setFeedback(confirmFeedback, '', 'info');
  });

  confirmForm.elements.repeatPassword.addEventListener('input', () => {
    confirmForm.elements.repeatPassword.value = sanitizePasswordInput(
      confirmForm.elements.repeatPassword.value,
    );
    validateRepeatPasswordField();
    setFeedback(confirmFeedback, '', 'info');
  });

  requestForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!validateIdentifierField()) {
      return;
    }

    identifier = normalizeIdentifier(requestForm.elements.identifier.value);
    void submitResetRequest();
  });

  confirmForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isConfirming) {
      return;
    }

    const isCodeValid = validateCodeField();
    const isPasswordValid = validateNewPasswordField();
    const isRepeatValid = validateRepeatPasswordField();
    if (!isCodeValid || !isPasswordValid || !isRepeatValid) {
      return;
    }

    const submitButton = confirmForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    isConfirming = true;
    if (submitButton) submitButton.disabled = true;
    setFeedback(confirmFeedback, '', 'info');

    try {
      const result = await confirmPasswordReset({
        identifier,
        code: confirmForm.elements.code.value,
        newPassword: confirmForm.elements.newPassword.value,
      });

      if (result.error) {
        const message = result.message.toLowerCase().includes('пароль')
          ? 'Пароль должен быть не короче 6 символов'
          : result.message;
        setFeedback(confirmFeedback, message, 'error');
        return;
      }

      setStep('success');
    } finally {
      isConfirming = false;
      if (submitButton) submitButton.disabled = false;
    }
  });

  resendButton?.addEventListener('click', () => {
    if (identifier) {
      void submitResetRequest({ quiet: true });
    }
  });

  backButton?.addEventListener('click', () => {
    setFeedback(confirmFeedback, '', 'info');
    setStep('request');
  });

  return () => {
    publicLayout?.classList.remove('public-layout--auth');
  };
}
