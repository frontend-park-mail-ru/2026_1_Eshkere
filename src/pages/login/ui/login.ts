import './login.scss';
import { renderTemplate } from 'shared/lib/render';
import {
  renderFormField,
  PasswordVisibilityToggles,
} from 'shared/ui/form-field/form-field';
import { renderButton } from 'shared/ui/button/button';
import {
  validateEmailOrPhone,
  validatePassword,
  setFieldState,
} from 'shared/validators';
import { loginUser } from 'features/auth';
import { navigateTo } from 'app/navigation';
import loginPageTemplate from './login.hbs';

/**
 * Удаляет пробелы из пароля при вводе.
 *
 * @param {string} value Исходное значение пароля.
 * @return {string} Нормализованное значение.
 */

type LoginFormElement = HTMLFormElement & {
  readonly elements: HTMLFormControlsCollection & {
    email: HTMLInputElement;
    password: HTMLInputElement;
  };
};

function sanitizePasswordInput(value: string): string {
  return value.replace(/\s+/g, '');
}

/**
 * Подсвечивает поле формы как ошибочное без вывода текста ошибки.
 *
 * @param {HTMLFormElement} form Элемент формы.
 * @param {string} fieldName Имя поля.
 * @return {void}
 */

function setFieldErrorHighlight(
  form: HTMLFormElement,
  fieldName: string,
): void {
  const input = form.elements.namedItem(fieldName);
  const errorElement = form.querySelector(`[data-error-for="${fieldName}"]`);

  if (!(input instanceof HTMLElement) || !errorElement) {
    return;
  }

  input.classList.remove('ui-input--success');
  input.classList.add('ui-input--error');
  errorElement.textContent = '';
}

/**
 * Рендерит содержимое страницы входа и оборачивает его в layout.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderLoginPage(): Promise<string> {
  const loginField = await renderFormField({
    id: 'login-email',
    name: 'email',
    type: 'text',
    label: 'Почта или телефон',
    placeholder: 'Ваша почта или телефон',
    required: true,
  });

  const passwordField = await renderFormField({
    id: 'login-password',
    name: 'password',
    type: 'password',
    label: 'Пароль',
    placeholder: 'Введите ваш пароль',
    required: true,
  });

  const submitButton = await renderButton({
    text: 'Продолжить',
    type: 'submit',
    variant: 'primary',
  });

  const registerLinkButton = await renderButton({
    text: 'Зарегистрироваться',
    href: '/register',
    variant: 'secondary',
  });

  return renderTemplate(loginPageTemplate, {
    loginField,
    passwordField,
    submitButton,
    registerLinkButton,
  });
}

/**
 * Подключает валидацию и обработчики submit для формы входа.
 *
 * @return {void}
 */
export function Login(): void | VoidFunction {
  const publicLayout = document.querySelector('.public-layout');
  publicLayout?.classList.add('public-layout--auth');

  const el = document.getElementById('login-form');
  if (!(el instanceof HTMLFormElement)) {
    return () => {
      publicLayout?.classList.remove('public-layout--auth');
    };
  }
  const form = el as LoginFormElement;

  PasswordVisibilityToggles(form);

  /**
   * Валидирует поле email или телефона.
   *
   * @return {boolean} Успешна ли валидация.
   */
  function validateLoginField(): boolean {
    const error = validateEmailOrPhone(form.elements.email.value);
    setFieldState(form, 'email', error);
    return !error;
  }

  /**
   * Валидирует поле пароля.
   *
   * @return {boolean} Успешна ли валидация.
   */
  function validatePasswordField(): boolean {
    const error = validatePassword(form.elements.password.value);
    setFieldState(form, 'password', error);
    return !error;
  }

  form.elements.email.addEventListener('input', validateLoginField);
  form.elements.password.addEventListener('input', () => {
    form.elements.password.value = sanitizePasswordInput(
      form.elements.password.value,
    );
    validatePasswordField();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const isLoginValid = validateLoginField();
    const isPasswordValid = validatePasswordField();

    if (!isLoginValid || !isPasswordValid) {
      return;
    }

    const result = await loginUser({
      identifier: form.elements.email.value,
      password: form.elements.password.value,
    });

    if (result.error) {
      setFieldErrorHighlight(form, 'email');
      setFieldState(form, 'password', result.message);
      return;
    }

    navigateTo('/ads', { replace: true });
  });

  return () => {
    publicLayout?.classList.remove('public-layout--auth');
  };
}
