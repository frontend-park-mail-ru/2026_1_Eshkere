import './support-iframe.scss';
import { authState } from 'features/auth';
import { request } from 'shared/lib/request';
import { renderTemplate } from 'shared/lib/render';
import { renderFormField } from 'shared/ui/form-field/form-field';
import { renderButton } from 'shared/ui/button/button';
import { setFieldState, validateEmail } from 'shared/validators';
import supportIframeTemplate from './support-iframe.hbs';

const MAX_APPEAL_TITLE_LENGTH = 100;
const utf8Encoder = new TextEncoder();

export async function renderSupportIframePage(): Promise<string> {
  const topicField = await renderFormField({
    id: 'support-topic',
    name: 'topic',
    type: 'text',
    label: 'Тема обращения',
    placeholder: 'Кратко опишите тему обращения',
    maxlength: MAX_APPEAL_TITLE_LENGTH,
    required: true,
  });

  const nameField = await renderFormField({
    id: 'support-name',
    name: 'name',
    type: 'text',
    label: 'Имя',
    placeholder: 'Ваше имя',
    required: true,
  });

  const contactEmailField = await renderFormField({
    id: 'support-contact-email',
    name: 'contactEmail',
    type: 'email',
    label: 'Почта для связи',
    placeholder: 'test@test.com',
    required: true,
  });

  const submitButton = await renderButton({
    text: 'Отправить обращение',
    type: 'submit',
    variant: 'primary',
    className: 'support-iframe-page__submit',
  });

  return renderTemplate(supportIframeTemplate, {
    topicField,
    nameField,
    contactEmailField,
    submitButton,
  });
}

export function SupportIframe(): void | VoidFunction {
  const pageRoot = document.querySelector<HTMLElement>('[data-support-iframe-page]');
  const form = document.getElementById('support-iframe-form');
  if (!(form instanceof HTMLFormElement)) {
    return;
  }
  const successBlock = document.getElementById('support-iframe-success');
  const successResetButton = document.querySelector<HTMLElement>('[data-support-success-reset]');

  const setSuccessState = (shown: boolean): void => {
    if (pageRoot) {
      pageRoot.classList.toggle('support-iframe-page--success', shown);
    }
    form.hidden = shown;
    if (successBlock instanceof HTMLElement) {
      successBlock.hidden = !shown;
    }
  };

  const guestOnlyNodes = Array.from(
    form.querySelectorAll<HTMLElement>('[data-support-guest-only]'),
  );
  let externalUserName = '';
  let externalUserEmail = '';

  const applyAuthState = (isAuthenticated: boolean): void => {
    form.dataset['isAuthenticated'] = isAuthenticated ? '1' : '0';
    guestOnlyNodes.forEach((node) => {
      node.hidden = isAuthenticated;
    });
  };

  const onMessage = (event: MessageEvent): void => {
    if (event.origin !== window.location.origin) {
      return;
    }

    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    const payload = event.data as {
      type?: string;
      isAuthenticated?: unknown;
      userName?: unknown;
      userEmail?: unknown;
    };
    if (payload.type !== 'support:auth-state') {
      return;
    }

    externalUserName =
      typeof payload.userName === 'string' ? payload.userName.trim() : '';
    externalUserEmail =
      typeof payload.userEmail === 'string' ? payload.userEmail.trim() : '';
    applyAuthState(Boolean(payload.isAuthenticated));
  };

  window.addEventListener('message', onMessage);
  applyAuthState(authState.isAuthenticated() || Boolean(authState.getCurrentUser()));

  const setCustomControlState = (
    control: HTMLElement | null,
    hasError: boolean,
  ): void => {
    if (!control) {
      return;
    }
    control.classList.toggle('support-iframe-page__control--error', hasError);
    control.classList.toggle('support-iframe-page__control--success', !hasError);
  };

  const validateTopicField = (): boolean => {
    const input = form.elements.namedItem('topic');
    if (!(input instanceof HTMLInputElement)) {
      return false;
    }
    const value = input.value.trim();
    const valueBytes = utf8Encoder.encode(value).length;
    const error = !value
      ? 'Укажите тему обращения'
      : valueBytes > MAX_APPEAL_TITLE_LENGTH
        ? `Максимум ${MAX_APPEAL_TITLE_LENGTH} байт`
        : '';
    setFieldState(form, 'topic', error);
    return !error;
  };

  const validateContactEmailField = (): boolean => {
    const input = form.elements.namedItem('contactEmail');
    if (!(input instanceof HTMLInputElement)) {
      return false;
    }

    const error = validateEmail(input.value);
    setFieldState(form, 'contactEmail', error);
    return !error;
  };

  const validateNameField = (): boolean => {
    const input = form.elements.namedItem('name');
    if (!(input instanceof HTMLInputElement)) {
      return false;
    }
    const error = input.value.trim() ? '' : 'Введите имя';
    setFieldState(form, 'name', error);
    return !error;
  };

  const validateCategoryField = (): boolean => {
    const input = form.elements.namedItem('category');
    if (!(input instanceof HTMLSelectElement)) {
      return false;
    }
    const hasValue = Boolean(input.value.trim());
    setCustomControlState(input, !hasValue);
    return hasValue;
  };

  const validateDescriptionField = (): boolean => {
    const input = form.elements.namedItem('description');
    if (!(input instanceof HTMLTextAreaElement)) {
      return false;
    }

    const errorElement = form.querySelector<HTMLElement>('[data-error-for="description"]');
    const hasValue = Boolean(input.value.trim());
    setCustomControlState(input, !hasValue);
    if (errorElement) {
      errorElement.textContent = hasValue ? '' : 'Опишите проблему подробнее';
    }
    return hasValue;
  };

  const topicInput = form.elements.namedItem('topic');
  if (topicInput instanceof HTMLInputElement) {
    topicInput.addEventListener('input', validateTopicField);
  }

  const contactEmailInput = form.elements.namedItem('contactEmail');

  if (contactEmailInput instanceof HTMLInputElement) {
    contactEmailInput.addEventListener('input', validateContactEmailField);
  }

  const nameInput = form.elements.namedItem('name');
  if (nameInput instanceof HTMLInputElement) {
    nameInput.addEventListener('input', validateNameField);
  }

  const categoryInput = form.elements.namedItem('category');
  if (categoryInput instanceof HTMLSelectElement) {
    categoryInput.addEventListener('change', validateCategoryField);
  }

  const descriptionInput = form.elements.namedItem('description');
  if (descriptionInput instanceof HTMLTextAreaElement) {
    descriptionInput.addEventListener('input', validateDescriptionField);
  }

  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  let isSubmitting = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const isAuthenticated = form.dataset['isAuthenticated'] === '1';
    const currentUser = authState.getCurrentUser();
    const isTopicValid = validateTopicField();
    const isCategoryValid = validateCategoryField();
    const isDescriptionValid = validateDescriptionField();
    const isNameValid = isAuthenticated ? true : validateNameField();
    const isContactEmailValid = isAuthenticated ? true : validateContactEmailField();

    if (
      !isTopicValid ||
      !isCategoryValid ||
      !isDescriptionValid ||
      !isNameValid ||
      !isContactEmailValid
    ) {
      return;
    }

    const category = categoryInput instanceof HTMLSelectElement ? categoryInput.value : '';
    const topic = topicInput instanceof HTMLInputElement ? topicInput.value.trim() : '';
    const description =
      descriptionInput instanceof HTMLTextAreaElement
        ? descriptionInput.value.trim()
        : '';

    const fallbackName = nameInput instanceof HTMLInputElement ? nameInput.value.trim() : '';
    const fallbackEmail =
      contactEmailInput instanceof HTMLInputElement ? contactEmailInput.value.trim() : '';
    const name = isAuthenticated
      ? (externalUserName || currentUser?.name?.trim() || 'Пользователь')
      : fallbackName;
    const email = isAuthenticated
      ? (externalUserEmail || currentUser?.email?.trim() || fallbackEmail)
      : fallbackEmail;

    if (!name) {
      if (!isAuthenticated) {
        setFieldState(form, 'name', 'Введите имя');
      }
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      if (!isAuthenticated) {
        setFieldState(form, 'contactEmail', emailError);
      }
      return;
    }

    const body = new FormData();
    body.append('category', category);
    body.append('title', topic);
    body.append('description', description);
    body.append('name', name);
    body.append('email', email);

    try {
      isSubmitting = true;
      if (submitButton) {
        submitButton.disabled = true;
      }

      await request('/appeal', {
        method: 'POST',
        body,
      });

      form.reset();
      setCustomControlState(categoryInput as HTMLElement, false);
      setCustomControlState(descriptionInput as HTMLElement, false);
      setSuccessState(true);
    } catch (error) {
      console.error('Failed to send support appeal', error);
    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });

  successResetButton?.addEventListener('click', () => {
    setSuccessState(false);
  });

  setSuccessState(false);

  return () => {
    window.removeEventListener('message', onMessage);
  };
}
