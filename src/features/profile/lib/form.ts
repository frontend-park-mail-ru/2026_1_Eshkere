import { formatPrice } from 'shared/lib/format';
import { formatCardExpiry } from 'shared/lib/payment-format';

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (!digits) {
    return '';
  }

  let normalized = digits;
  if (normalized.startsWith('8')) {
    normalized = `7${normalized.slice(1)}`;
  } else if (normalized.startsWith('9')) {
    normalized = `7${normalized}`;
  }

  normalized = normalized.slice(0, 11);

  if (!normalized) {
    return '';
  }

  let formatted = '+7';

  if (normalized.length > 1) {
    formatted += ` ${normalized.slice(1, 4)}`;
  }
  if (normalized.length > 4) {
    formatted += ` ${normalized.slice(4, 7)}`;
  }
  if (normalized.length > 7) {
    formatted += ` ${normalized.slice(7, 9)}`;
  }
  if (normalized.length > 9) {
    formatted += ` ${normalized.slice(9, 11)}`;
  }

  return formatted.trim();
}

export function formatProfileCardExpiry(value: string): string {
  return formatCardExpiry(value, ' / ');
}

export function formatTopUpDate(amount: number): string {
  const now = new Date();
  const dateText = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  return `${dateText} · ${formatPrice(amount)}`;
}

export function validateRequired(value: string, message: string): string {
  return value.trim() ? '' : message;
}

export function validateConfirmationCode(value: string): string {
  if (!value.trim()) {
    return 'Введите код подтверждения';
  }

  if (value.trim() !== '123456') {
    return 'Неверный код подтверждения';
  }

  return '';
}

function getFieldContainer(
  form: HTMLFormElement,
  fieldName: string,
): HTMLElement | null {
  return form.querySelector<HTMLElement>(`[data-field="${fieldName}"]`);
}

function getSubmitButton(form: HTMLFormElement): HTMLButtonElement | null {
  return form.querySelector('button[type="submit"]');
}

export function setFieldError(
  form: HTMLFormElement,
  fieldName: string,
  message: string,
): void {
  const container = getFieldContainer(form, fieldName);
  const errorNode = form.querySelector<HTMLElement>(`[data-error-for="${fieldName}"]`);
  const input = form.elements.namedItem(fieldName);

  container?.classList.toggle('profile-modal__field--error', Boolean(message));
  if (errorNode) {
    errorNode.textContent = message;
  }
  if (input instanceof HTMLElement) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
}

export function clearFieldError(form: HTMLFormElement, fieldName: string): void {
  setFieldError(form, fieldName, '');
}

export function setFormMessage(
  form: HTMLFormElement,
  selector: '[data-form-error]' | '[data-form-success]',
  message: string,
): void {
  const node = form.querySelector<HTMLElement>(selector);
  if (node) {
    node.textContent = message;
    node.hidden = !message;
  }
}

export function clearFormState(form: HTMLFormElement): void {
  Array.from(form.querySelectorAll<HTMLElement>('[data-error-for]')).forEach((node) => {
    node.textContent = '';
  });
  Array.from(form.querySelectorAll<HTMLElement>('.profile-modal__field')).forEach((field) => {
    field.classList.remove('profile-modal__field--error');
  });
  setFormMessage(form, '[data-form-error]', '');
  setFormMessage(form, '[data-form-success]', '');
}

export function setSubmitting(
  form: HTMLFormElement,
  isSubmitting: boolean,
): void {
  Array.from(form.elements).forEach((element) => {
    if (element instanceof HTMLInputElement || element instanceof HTMLButtonElement) {
      element.disabled = isSubmitting;
    }
  });
}

export function setSubmitEnabled(
  form: HTMLFormElement,
  enabled: boolean,
): void {
  const submitButton = getSubmitButton(form);
  if (submitButton) {
    submitButton.disabled = !enabled;
  }
}

export function getModalStep(
  form: HTMLFormElement,
): 'input' | 'confirm' {
  return form.dataset.step === 'confirm' ? 'confirm' : 'input';
}

export function setStepState(
  form: HTMLFormElement,
  step: 'input' | 'confirm',
  confirmTarget = '',
): void {
  form.dataset.step = step;

  form.querySelectorAll<HTMLElement>('[data-step]').forEach((node) => {
    node.hidden = node.dataset.step !== step;
  });

  const target = form.querySelector<HTMLElement>('[data-confirm-target]');
  if (target && confirmTarget) {
    target.textContent = confirmTarget;
  }

  const submitButton = form.querySelector<HTMLElement>('[data-step-submit]');
  if (!submitButton) {
    return;
  }

  if (form.id === 'profile-email-form') {
    submitButton.textContent = step === 'input' ? 'Отправить код' : 'Подтвердить email';
  } else if (form.id === 'profile-phone-form') {
    submitButton.textContent = step === 'input' ? 'Отправить код' : 'Подтвердить телефон';
  } else if (form.id === 'profile-payment-form') {
    submitButton.textContent = step === 'input' ? 'Продолжить' : 'Сохранить карту';
  }
}

export function resetTwoStepForm(form: HTMLFormElement): void {
  form.dataset.pendingValue = '';
  setStepState(form, 'input');

  const codeInput = form.elements.namedItem('code');
  if (codeInput instanceof HTMLInputElement) {
    codeInput.value = '';
  }
}

export function attachMaskedInput(
  form: HTMLFormElement,
  fieldName: string,
  formatter: (value: string) => string,
  signal: AbortSignal,
): void {
  const input = form.elements.namedItem(fieldName);
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  input.addEventListener(
    'input',
    () => {
      input.value = formatter(input.value);
      clearFieldError(form, fieldName);
      setFormMessage(form, '[data-form-error]', '');
    },
    { signal },
  );
}

export function watchFormState(
  form: HTMLFormElement,
  signal: AbortSignal,
  computeEnabled: () => boolean,
): void {
  const refresh = (): void => setSubmitEnabled(form, computeEnabled());

  form.addEventListener('input', refresh, { signal });
  form.addEventListener('change', refresh, { signal });
  refresh();
}
