import './profile.scss';
import 'shared/ui/modal/modal';
import { renderTemplate } from 'shared/lib/render';
import { PasswordVisibilityToggles } from 'shared/ui/form-field/form-field';
import { authState } from 'features/auth';
import { getAds } from 'features/ads';
import { formatDate, formatPrice } from 'shared/lib/format';
import {
  normalizePhone,
  validateEmail,
  validatePassword,
  validatePhone,
  validateRepeatPassword,
} from 'shared/validators';
import profileTemplate from './profile.hbs';

type TariffKey = 'basic' | 'pro' | 'business';
type AccountStatus = 'pending' | 'verified';

interface ProfileField {
  key: string;
  label: string;
  value: string;
}

interface TariffMeta {
  label: string;
  description: string;
  limit: number;
  price: string;
}

interface ProfileState {
  avatar: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  inn: string;
  balanceValue: number;
  tariffKey: TariffKey;
  accountStatus: AccountStatus;
  activeCampaigns: number;
  lastAction: string;
  contactHandle: string;
  cardMasked: string;
  lastTopUp: string;
  passwordStatus: string;
}

interface TemplateContext {
  avatar: string;
  initials: string;
  hasAvatar: boolean;
  fullName: string;
  role: string;
  accountId: string;
  memberSince: string;
  balance: string;
  tariff: string;
  tariffDescription: string;
  activeCampaigns: number;
  lastAction: string;
  profileFields: ProfileField[];
  contactHandle: string;
  cardMasked: string;
  lastTopUp: string;
  accountStatusLabel: string;
  accountStatusClass: string;
  accountActionText: string;
}

const TARIFFS: Record<TariffKey, TariffMeta> = {
  basic: {
    label: 'Basic',
    description: 'Базовый кабинет и до 5 активных кампаний',
    limit: 5,
    price: '990 ₽ / мес',
  },
  pro: {
    label: 'Pro',
    description: 'Расширенная аналитика и до 20 активных кампаний',
    limit: 20,
    price: '3 900 ₽ / мес',
  },
  business: {
    label: 'Business',
    description: 'Приоритетная поддержка и до 50 активных кампаний',
    limit: 50,
    price: '8 900 ₽ / мес',
  },
};

let profileLifecycleController: AbortController | null = null;
let feedbackTimer: number | null = null;

interface ToastPayload {
  title: string;
  description: string;
  tone?: 'success' | 'warning';
}

function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  return {
    firstName: parts[0] || 'Екатерина',
    lastName: 'Кузнецова',
  };
}

function isEmailLike(value: string): boolean {
  return /.+@.+\..+/.test(value.trim());
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || 'Е'}${lastName[0] || 'К'}`.toUpperCase();
}

function getTariffMeta(tariffKey: TariffKey): TariffMeta {
  return TARIFFS[tariffKey];
}

function getAccountStatusLabel(status: AccountStatus): string {
  return status === 'verified' ? 'Аккаунт подтвержден' : 'Требует подтверждения';
}

function getAccountActionText(status: AccountStatus): string {
  return status === 'verified' ? 'Обновить данные' : 'Подтвердить';
}

function buildProfileFields(state: ProfileState): ProfileField[] {
  return [
    { key: 'firstName', label: 'Имя', value: state.firstName },
    { key: 'lastName', label: 'Фамилия', value: state.lastName },
    { key: 'email', label: 'Электронная почта', value: state.email },
    { key: 'phone', label: 'Телефон', value: state.phone },
    { key: 'company', label: 'Компания', value: state.company },
    { key: 'city', label: 'Город', value: state.city },
  ];
}

async function getProfileState(): Promise<ProfileState> {
  const currentUser = authState.getCurrentUser() ?? {
    id: 4839014,
    email: 'ekaterina@eshke.ru',
    phone: '+7 999 123 45 67',
    name: 'Екатерина Кузнецова',
    balance: 48200,
  };
  const rawName = typeof currentUser.name === 'string' ? currentUser.name.trim() : '';
  const fullName = rawName && !isEmailLike(rawName) ? rawName : 'Екатерина Кузнецова';
  const { firstName, lastName } = splitFullName(fullName);
  const adsResult = await getAds();
  const activeCampaigns = adsResult.error ? 12 : adsResult.ads.length;
  const lastCampaign = adsResult.error
    ? null
    : [...adsResult.ads].sort((first, second) => {
      const firstTimestamp = new Date(first.created_at || 0).getTime();
      const secondTimestamp = new Date(second.created_at || 0).getTime();
      return secondTimestamp - firstTimestamp;
    })[0];

  return {
    avatar: currentUser.avatar || '',
    firstName,
    lastName,
    email: currentUser.email || 'ekaterina@eshke.ru',
    phone: currentUser.phone || '+7 999 123 45 67',
    company: currentUser.company || 'ООО «Эшке Медиа»',
    city: currentUser.city || 'Москва',
    inn: currentUser.inn || '7701234567',
    balanceValue: typeof currentUser.balance === 'number' ? currentUser.balance : 48200,
    tariffKey: currentUser.tariffKey || 'pro',
    accountStatus: currentUser.accountStatus || 'pending',
    activeCampaigns,
    lastAction: lastCampaign?.created_at ? formatDate(lastCampaign.created_at) : 'Сегодня',
    contactHandle: currentUser.contactHandle || '@chocaboy',
    cardMasked: currentUser.cardMasked || 'Банковская карта •••• 4481',
    lastTopUp: currentUser.lastTopUp || '12 марта 2026 · 15 000 ₽',
    passwordStatus: currentUser.passwordStatus || 'Сменить',
  };
}

function toTemplateContext(state: ProfileState): TemplateContext {
  const tariff = getTariffMeta(state.tariffKey);

  return {
    avatar: state.avatar,
    initials: getInitials(state.firstName, state.lastName),
    hasAvatar: Boolean(state.avatar),
    fullName: `${state.firstName} ${state.lastName}`,
    role: 'Рекламодатель · Основной аккаунт',
    accountId: `ID ${authState.getCurrentUser()?.id || 4839014}`,
    memberSince: 'С нами с 14 марта 2026',
    balance: formatPrice(state.balanceValue),
    tariff: tariff.label,
    tariffDescription: tariff.description,
    activeCampaigns: state.activeCampaigns,
    lastAction: state.lastAction,
    profileFields: buildProfileFields(state),
    contactHandle: state.contactHandle,
    cardMasked: state.cardMasked,
    lastTopUp: state.lastTopUp,
    accountStatusLabel: getAccountStatusLabel(state.accountStatus),
    accountStatusClass:
      state.accountStatus === 'verified'
        ? 'profile-hero__badge--success'
        : 'profile-hero__badge--warning',
    accountActionText: getAccountActionText(state.accountStatus),
  };
}

function updateTextContent(selector: string, value: string): void {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function updateTextContentAll(selector: string, value: string): void {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function syncAvatarView(state: ProfileState): void {
  const hasAvatar = Boolean(state.avatar);
  const avatarImage = document.querySelector<HTMLImageElement>('[data-profile-avatar-image]');
  const avatarInitials = document.querySelector<HTMLElement>('[data-profile-avatar-initials]');
  const avatarButton = document.querySelector<HTMLElement>('[data-profile-avatar-button]');

  if (avatarImage) {
    if (hasAvatar) {
      avatarImage.src = state.avatar;
      avatarImage.hidden = false;
    } else {
      avatarImage.src = '';
      avatarImage.hidden = true;
    }
  }

  if (avatarInitials) {
    avatarInitials.hidden = hasAvatar;
    avatarInitials.textContent = getInitials(state.firstName, state.lastName);
  }

  avatarButton?.classList.toggle('profile-hero__avatar--image', hasAvatar);
}

function persistUserState(state: ProfileState): void {
  const currentUser = authState.getCurrentUser();
  if (!currentUser) {
    return;
  }

  authState.setAuthenticatedUser({
    ...currentUser,
    name: `${state.firstName} ${state.lastName}`.trim(),
    email: state.email,
    phone: state.phone,
    balance: state.balanceValue,
    avatar: state.avatar || undefined,
    company: state.company,
    city: state.city,
    inn: state.inn,
    tariffKey: state.tariffKey,
    accountStatus: state.accountStatus,
    contactHandle: state.contactHandle,
    cardMasked: state.cardMasked,
    lastTopUp: state.lastTopUp,
    passwordStatus: state.passwordStatus,
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

function formatPhoneInput(value: string): string {
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

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)} / ${digits.slice(2, 4)}`;
}

function formatTopUpDate(amount: number): string {
  const now = new Date();
  const dateText = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  return `${dateText} · ${formatPrice(amount)}`;
}

function validateRequired(value: string, message: string): string {
  return value.trim() ? '' : message;
}

function validateCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length !== 16) {
    return 'Введите корректный номер карты';
  }

  return '';
}

function validateExpiry(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length !== 4) {
    return 'Введите срок действия в формате MM / YY';
  }

  const month = Number(digits.slice(0, 2));
  const year = Number(digits.slice(2, 4));

  if (month < 1 || month > 12) {
    return 'Укажите корректный месяц';
  }

  const today = new Date();
  const currentYear = today.getFullYear() % 100;
  const currentMonth = today.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return 'Срок действия карты уже истек';
  }

  return '';
}

function validateCvv(value: string): string {
  if (!/^\d{3,4}$/.test(value.trim())) {
    return 'Введите CVV из 3 или 4 цифр';
  }

  return '';
}

function validateAmount(value: string): string {
  const amount = Number(value.replace(/[^\d]/g, ''));

  if (!amount) {
    return 'Введите сумму пополнения';
  }

  if (amount < 100) {
    return 'Минимальная сумма пополнения 100 ₽';
  }

  if (amount > 500000) {
    return 'Максимальная сумма пополнения 500 000 ₽';
  }

  return '';
}

function validateInn(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return 'Введите ИНН компании';
  }

  if (digits.length !== 10 && digits.length !== 12) {
    return 'ИНН должен содержать 10 или 12 цифр';
  }

  return '';
}

function validateConfirmationCode(value: string): string {
  if (!value.trim()) {
    return 'Введите код подтверждения';
  }

  if (value.trim() !== '123456') {
    return 'Неверный код подтверждения';
  }

  return '';
}

function getFieldContainer(form: HTMLFormElement, fieldName: string): HTMLElement | null {
  return form.querySelector<HTMLElement>(`[data-field="${fieldName}"]`);
}

function getSubmitButton(form: HTMLFormElement): HTMLButtonElement | null {
  return form.querySelector('button[type="submit"]');
}

function setFieldError(form: HTMLFormElement, fieldName: string, message: string): void {
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

function clearFieldError(form: HTMLFormElement, fieldName: string): void {
  setFieldError(form, fieldName, '');
}

function setFormMessage(
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

function clearFormState(form: HTMLFormElement): void {
  Array.from(form.querySelectorAll<HTMLElement>('[data-error-for]')).forEach((node) => {
    node.textContent = '';
  });
  Array.from(form.querySelectorAll<HTMLElement>('.profile-modal__field')).forEach((field) => {
    field.classList.remove('profile-modal__field--error');
  });
  setFormMessage(form, '[data-form-error]', '');
  setFormMessage(form, '[data-form-success]', '');
}

function setSubmitting(form: HTMLFormElement, isSubmitting: boolean): void {
  Array.from(form.elements).forEach((element) => {
    if (element instanceof HTMLInputElement || element instanceof HTMLButtonElement) {
      element.disabled = isSubmitting;
    }
  });
}

function setSubmitEnabled(form: HTMLFormElement, enabled: boolean): void {
  const submitButton = getSubmitButton(form);
  if (submitButton) {
    submitButton.disabled = !enabled;
  }
}

function showPageFeedback({title, description, tone = 'success'}: ToastPayload): void {
  const toast = document.querySelector<HTMLElement>('[data-profile-toast]');
  const titleNode = document.querySelector<HTMLElement>('[data-profile-toast-title]');
  const textNode = document.querySelector<HTMLElement>('[data-profile-toast-text]');
  if (!toast || !titleNode || !textNode) {
    return;
  }

  toast.classList.toggle('profile-toast--success', tone === 'success');
  toast.classList.toggle('profile-toast--warning', tone === 'warning');
  titleNode.textContent = title;
  textNode.textContent = description;
  toast.hidden = false;

  if (feedbackTimer) {
    window.clearTimeout(feedbackTimer);
  }

  feedbackTimer = window.setTimeout(() => {
    toast.hidden = true;
    titleNode.textContent = '';
    textNode.textContent = '';
  }, 3500);
}

function hidePageFeedback(): void {
  const toast = document.querySelector<HTMLElement>('[data-profile-toast]');
  const titleNode = document.querySelector<HTMLElement>('[data-profile-toast-title]');
  const textNode = document.querySelector<HTMLElement>('[data-profile-toast-text]');

  if (feedbackTimer) {
    window.clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }

  if (toast) {
    toast.hidden = true;
  }
  if (titleNode) {
    titleNode.textContent = '';
  }
  if (textNode) {
    textNode.textContent = '';
  }
}

function getModalStep(form: HTMLFormElement): 'input' | 'confirm' {
  return form.dataset.step === 'confirm' ? 'confirm' : 'input';
}

function setStepState(
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

function resetTwoStepForm(form: HTMLFormElement): void {
  form.dataset.pendingValue = '';
  setStepState(form, 'input');

  const codeInput = form.elements.namedItem('code');
  if (codeInput instanceof HTMLInputElement) {
    codeInput.value = '';
  }
}

function attachMaskedInput(
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
    {signal},
  );
}

function watchFormState(
  form: HTMLFormElement,
  signal: AbortSignal,
  computeEnabled: () => boolean,
): void {
  const refresh = (): void => setSubmitEnabled(form, computeEnabled());

  form.addEventListener('input', refresh, {signal});
  form.addEventListener('change', refresh, {signal});
  refresh();
}

function syncProfileStateToView(state: ProfileState): void {
  const tariff = getTariffMeta(state.tariffKey);
  const fullName = `${state.firstName} ${state.lastName}`;
  const accountStatusLabel = getAccountStatusLabel(state.accountStatus);

  updateTextContent('[data-profile-full-name]', fullName);
  updateTextContent('[data-profile-balance]', formatPrice(state.balanceValue));
  updateTextContent('[data-profile-tariff]', tariff.label);
  updateTextContent('[data-profile-tariff-description]', tariff.description);
  updateTextContent('[data-profile-campaigns]', String(state.activeCampaigns));
  updateTextContent('[data-profile-last-action]', state.lastAction);
  updateTextContent('[data-profile-card]', state.cardMasked);
  updateTextContent('[data-profile-last-top-up]', state.lastTopUp);
  updateTextContent('[data-profile-password-status]', state.passwordStatus);
  updateTextContentAll('[data-profile-account-status]', accountStatusLabel);

  document.querySelectorAll<HTMLElement>('[data-profile-account-badge]').forEach((badge) => {
    badge.classList.toggle('profile-hero__badge--success', state.accountStatus === 'verified');
    badge.classList.toggle('profile-hero__badge--warning', state.accountStatus !== 'verified');
  });

  document
    .querySelectorAll<HTMLElement>('.profile-security__status[data-profile-account-status]')
    .forEach((node) => {
      node.classList.toggle('profile-security__status--warning', state.accountStatus !== 'verified');
    });

  const accountActionText = getAccountActionText(state.accountStatus);
  document
    .querySelectorAll<HTMLElement>('[data-profile-confirmation-button-label]')
    .forEach((node) => {
      node.textContent = accountActionText;
    });

  document.querySelectorAll<HTMLElement>('[data-profile-field]').forEach((field) => {
    const key = field.dataset.profileField;
    if (!key) {
      return;
    }

    const valueNode = field.matches('[data-profile-field-value]')
      ? field
      : field.querySelector<HTMLElement>('[data-profile-field-value]');
    const nextValue = state[key as keyof ProfileState];

    if (valueNode && typeof nextValue === 'string') {
      valueNode.textContent = nextValue;
    }
  });

  syncAvatarView(state);
}

function populateForms(state: ProfileState): void {
  const editForm = document.getElementById('profile-edit-form');
  if (editForm instanceof HTMLFormElement) {
    (editForm.elements.namedItem('firstName') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.firstName,
    );
    (editForm.elements.namedItem('lastName') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.lastName,
    );
    (editForm.elements.namedItem('email') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.email,
    );
    (editForm.elements.namedItem('phone') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.phone,
    );
    (editForm.elements.namedItem('company') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.company,
    );
    (editForm.elements.namedItem('city') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.city,
    );
    Array.from(editForm.elements).forEach((element) => {
      if (element instanceof HTMLInputElement) {
        element.value = element.getAttribute('value') || '';
      }
    });
  }

  const paymentForm = document.getElementById('profile-payment-form');
  if (paymentForm instanceof HTMLFormElement) {
    (paymentForm.elements.namedItem('cardNumber') as HTMLInputElement | null).value = '';
    (paymentForm.elements.namedItem('expiryDate') as HTMLInputElement | null).value = '';
    (paymentForm.elements.namedItem('holderName') as HTMLInputElement | null).value =
      `${state.firstName.toUpperCase()} ${state.lastName.toUpperCase()}`;
    (paymentForm.elements.namedItem('cvv') as HTMLInputElement | null).value = '';
  }

  const passwordForm = document.getElementById('profile-password-form');
  if (passwordForm instanceof HTMLFormElement) {
    passwordForm.reset();
  }

  const avatarForm = document.getElementById('profile-avatar-form');
  if (avatarForm instanceof HTMLFormElement) {
    avatarForm.reset();
    avatarForm.dataset.pendingAvatar = state.avatar;
    avatarForm.dataset.removeAvatar = 'false';
    const image = avatarForm.querySelector<HTMLImageElement>('[data-avatar-preview-image]');
    const initials = avatarForm.querySelector<HTMLElement>('[data-avatar-preview-initials]');
    const preview = avatarForm.querySelector<HTMLElement>('[data-avatar-preview]');
    if (image) {
      image.src = state.avatar || '';
      image.hidden = !state.avatar;
    }
    if (initials) {
      initials.hidden = Boolean(state.avatar);
      initials.textContent = getInitials(state.firstName, state.lastName);
    }
    preview?.classList.toggle('profile-avatar-picker--image', Boolean(state.avatar));
  }

  const topUpForm = document.getElementById('profile-topup-form');
  if (topUpForm instanceof HTMLFormElement) {
    topUpForm.reset();
  }

  const tariffForm = document.getElementById('profile-tariff-form');
  if (tariffForm instanceof HTMLFormElement) {
    const target = tariffForm.elements.namedItem('nextTariff');
    if (target instanceof RadioNodeList) {
      target.value = state.tariffKey;
    }
  }

  const confirmationForm = document.getElementById('profile-confirmation-form');
  if (confirmationForm instanceof HTMLFormElement) {
    (confirmationForm.elements.namedItem('email') as HTMLInputElement | null).value = state.email;
    (confirmationForm.elements.namedItem('phone') as HTMLInputElement | null).value = state.phone;
    (confirmationForm.elements.namedItem('company') as HTMLInputElement | null).value =
      state.company;
    (confirmationForm.elements.namedItem('inn') as HTMLInputElement | null).value = state.inn;
  }
}

function refreshModalSubmitStates(state: ProfileState): void {
  const editForm = document.getElementById('profile-edit-form');
  if (editForm instanceof HTMLFormElement) {
    const firstName = String((editForm.elements.namedItem('firstName') as HTMLInputElement)?.value || '').trim();
    const lastName = String((editForm.elements.namedItem('lastName') as HTMLInputElement)?.value || '').trim();
    const company = String((editForm.elements.namedItem('company') as HTMLInputElement)?.value || '').trim();
    const city = String((editForm.elements.namedItem('city') as HTMLInputElement)?.value || '').trim();

    setSubmitEnabled(
      editForm,
      firstName !== state.firstName ||
        lastName !== state.lastName ||
        company !== state.company ||
        city !== state.city,
    );
  }


  const emailForm = document.getElementById('profile-email-form');
  if (emailForm instanceof HTMLFormElement) {
    const email = String((emailForm.elements.namedItem('email') as HTMLInputElement)?.value || '').trim();
    const code = String((emailForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(
      emailForm,
      getModalStep(emailForm) === 'input' ? Boolean(email) && email !== state.email : Boolean(code),
    );
  }

  const phoneForm = document.getElementById('profile-phone-form');
  if (phoneForm instanceof HTMLFormElement) {
    const phone = String((phoneForm.elements.namedItem('phone') as HTMLInputElement)?.value || '').trim();
    const code = String((phoneForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(
      phoneForm,
      getModalStep(phoneForm) === 'input'
        ? Boolean(phone) && normalizePhone(phone) !== normalizePhone(state.phone)
        : Boolean(code),
    );
  }

  const paymentForm = document.getElementById('profile-payment-form');
  if (paymentForm instanceof HTMLFormElement) {
    const cardNumber = String((paymentForm.elements.namedItem('cardNumber') as HTMLInputElement)?.value || '').trim();
    const expiryDate = String((paymentForm.elements.namedItem('expiryDate') as HTMLInputElement)?.value || '').trim();
    const holderName = String((paymentForm.elements.namedItem('holderName') as HTMLInputElement)?.value || '').trim();
    const cvv = String((paymentForm.elements.namedItem('cvv') as HTMLInputElement)?.value || '').trim();
    const code = String((paymentForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(
      paymentForm,
      getModalStep(paymentForm) === 'input'
        ? Boolean(cardNumber || expiryDate || holderName || cvv)
        : Boolean(code),
    );
  }

  const passwordForm = document.getElementById('profile-password-form');
  if (passwordForm instanceof HTMLFormElement) {
    const currentPassword = String((passwordForm.elements.namedItem('currentPassword') as HTMLInputElement)?.value || '').trim();
    const newPassword = String((passwordForm.elements.namedItem('newPassword') as HTMLInputElement)?.value || '').trim();
    const repeatPassword = String((passwordForm.elements.namedItem('repeatPassword') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(passwordForm, Boolean(currentPassword || newPassword || repeatPassword));
  }

  const avatarForm = document.getElementById('profile-avatar-form');
  if (avatarForm instanceof HTMLFormElement) {
    const pendingAvatar = avatarForm.dataset.pendingAvatar || '';
    const removeAvatar = avatarForm.dataset.removeAvatar === 'true';
    setSubmitEnabled(avatarForm, pendingAvatar !== state.avatar || (removeAvatar && Boolean(state.avatar)));
  }

  const topUpForm = document.getElementById('profile-topup-form');
  if (topUpForm instanceof HTMLFormElement) {
    const amount = String((topUpForm.elements.namedItem('amount') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(topUpForm, Boolean(amount));
  }

  const tariffForm = document.getElementById('profile-tariff-form');
  if (tariffForm instanceof HTMLFormElement) {
    const nextTariff = String((tariffForm.elements.namedItem('nextTariff') as RadioNodeList)?.value || '');
    setSubmitEnabled(tariffForm, Boolean(nextTariff) && nextTariff !== state.tariffKey);
  }

  const confirmationForm = document.getElementById('profile-confirmation-form');
  if (confirmationForm instanceof HTMLFormElement) {
    const email = String((confirmationForm.elements.namedItem('email') as HTMLInputElement)?.value || '').trim();
    const phone = String((confirmationForm.elements.namedItem('phone') as HTMLInputElement)?.value || '').trim();
    const company = String((confirmationForm.elements.namedItem('company') as HTMLInputElement)?.value || '').trim();
    const inn = String((confirmationForm.elements.namedItem('inn') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(
      confirmationForm,
      email !== state.email ||
        phone !== state.phone ||
        company !== state.company ||
        inn !== state.inn ||
        state.accountStatus !== 'verified',
    );
  }
}
export async function renderProfilePage(): Promise<string> {
  const state = await getProfileState();
  return renderTemplate(profileTemplate, toTemplateContext(state));
}

export function Profile(): VoidFunction | void {
  if (profileLifecycleController) {
    profileLifecycleController.abort();
  }

  const root = document.querySelector('.profile-page');
  if (!root) {
    return;
  }

  const controller = new AbortController();
  profileLifecycleController = controller;
  const { signal } = controller;

  const state: ProfileState = {
    firstName:
      document.querySelector('[data-profile-field="firstName"] [data-profile-field-value]')?.textContent || 'Екатерина',
    lastName:
      document.querySelector('[data-profile-field="lastName"] [data-profile-field-value]')?.textContent || 'Кузнецова',
    email:
      document.querySelector('[data-profile-field="email"] [data-profile-field-value]')?.textContent || 'ekaterina@eshke.ru',
    phone:
      document.querySelector('[data-profile-field="phone"] [data-profile-field-value]')?.textContent || '+7 999 123 45 67',
    company:
      document.querySelector('[data-profile-field="company"] [data-profile-field-value]')?.textContent || 'ООО «Эшке Медиа»',
    city:
      document.querySelector('[data-profile-field="city"] [data-profile-field-value]')?.textContent || 'Москва',
    inn: '7701234567',
    balanceValue: Number((document.querySelector('[data-profile-balance]')?.textContent || '48200').replace(/\D/g, '')),
    tariffKey: 'pro',
    accountStatus:
      document.querySelector('[data-profile-account-status]')?.textContent === 'Аккаунт подтвержден' ? 'verified' : 'pending',
    activeCampaigns: Number(document.querySelector('[data-profile-campaigns]')?.textContent || '12'),
    lastAction: document.querySelector('[data-profile-last-action]')?.textContent || 'Сегодня',
    contactHandle: '@chocaboy',
    cardMasked: document.querySelector('[data-profile-card]')?.textContent || 'Банковская карта •••• 4481',
    lastTopUp: document.querySelector('[data-profile-last-top-up]')?.textContent || '12 марта 2026 · 15 000 ₽',
  };

  const modals = Array.from(document.querySelectorAll<HTMLElement>('.profile-modal'));

  const openModal = (id: string): void => {
    populateForms(state);
    refreshModalSubmitStates(state);
    const modal = document.getElementById(id);
    if (!modal) {
      return;
    }

    const form = modal.querySelector('form');
    if (form instanceof HTMLFormElement) {
      clearFormState(form);
      setSubmitting(form, false);

      if (form.id === 'profile-email-form' || form.id === 'profile-phone-form' || form.id === 'profile-payment-form') {
        resetTwoStepForm(form);
      }

      const emailInput = form.elements.namedItem('email');
      if (form.id === 'profile-email-form' && emailInput instanceof HTMLInputElement) {
        emailInput.value = '';
      }

      const phoneInput = form.elements.namedItem('phone');
      if (form.id === 'profile-phone-form' && phoneInput instanceof HTMLInputElement) {
        phoneInput.value = '';
      }
    }

    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeCurrentModal = (modal: HTMLElement): void => {
    modal.classList.remove('modal--open');
    modal.setAttribute('aria-hidden', 'true');
  };

  document.querySelector('[data-open-profile-edit]')?.addEventListener('click', () => openModal('profile-edit-modal'), { signal });
  document.querySelector('[data-open-avatar-modal]')?.addEventListener('click', () => openModal('profile-avatar-modal'), { signal });
  document.querySelector('[data-open-password-modal]')?.addEventListener('click', () => openModal('profile-password-modal'), { signal });
  document.querySelector('[data-open-email-modal]')?.addEventListener('click', () => openModal('profile-email-modal'), { signal });
  document.querySelector('[data-open-phone-modal]')?.addEventListener('click', () => openModal('profile-phone-modal'), { signal });
  document.querySelector('[data-open-payment-modal]')?.addEventListener('click', () => openModal('profile-payment-modal'), { signal });
  document.querySelector('[data-open-topup-modal]')?.addEventListener('click', () => openModal('profile-topup-modal'), { signal });
  document.querySelector('[data-open-tariff-modal]')?.addEventListener('click', () => openModal('profile-tariff-modal'), { signal });
  document.querySelector('[data-open-confirmation-modal]')?.addEventListener('click', () => openModal('profile-confirmation-modal'), { signal });
  document.querySelector('[data-profile-toast-close]')?.addEventListener('click', hidePageFeedback, { signal });
  PasswordVisibilityToggles(document);

  modals.forEach((modal) => {
    modal.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((element) => {
      element.addEventListener('click', () => closeCurrentModal(modal), { signal });
    });
  });

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      modals.forEach((modal) => {
        if (modal.classList.contains('modal--open')) {
          closeCurrentModal(modal);
        }
      });
    },
    { signal },
  );

  const editProfileForm = document.getElementById('profile-edit-form');
  const emailForm = document.getElementById('profile-email-form');
  const phoneForm = document.getElementById('profile-phone-form');
  const paymentForm = document.getElementById('profile-payment-form');
  const passwordForm = document.getElementById('profile-password-form');
  const avatarForm = document.getElementById('profile-avatar-form');
  const topUpForm = document.getElementById('profile-topup-form');
  const tariffForm = document.getElementById('profile-tariff-form');
  const confirmationForm = document.getElementById('profile-confirmation-form');

  if (editProfileForm instanceof HTMLFormElement) {
    watchFormState(editProfileForm, signal, () => {
      const firstName = String((editProfileForm.elements.namedItem('firstName') as HTMLInputElement)?.value || '').trim();
      const lastName = String((editProfileForm.elements.namedItem('lastName') as HTMLInputElement)?.value || '').trim();
      const company = String((editProfileForm.elements.namedItem('company') as HTMLInputElement)?.value || '').trim();
      const city = String((editProfileForm.elements.namedItem('city') as HTMLInputElement)?.value || '').trim();
      return firstName !== state.firstName || lastName !== state.lastName || company !== state.company || city !== state.city;
    });

    editProfileForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(editProfileForm);

      const formData = new FormData(editProfileForm);
      const firstName = String(formData.get('firstName') || '').trim();
      const lastName = String(formData.get('lastName') || '').trim();
      const company = String(formData.get('company') || '').trim();
      const city = String(formData.get('city') || '').trim();

      const errors = [
        ['firstName', validateRequired(firstName, 'Введите имя')],
        ['lastName', validateRequired(lastName, 'Введите фамилию')],
        ['company', validateRequired(company, 'Введите название компании')],
        ['city', validateRequired(city, 'Введите город')],
      ] as const;

      let hasErrors = false;
      errors.forEach(([field, message]) => {
        if (message) {
          hasErrors = true;
          setFieldError(editProfileForm, field, message);
        }
      });

      if (hasErrors) {
        setFormMessage(editProfileForm, '[data-form-error]', 'Проверьте поля формы и повторите попытку');
        return;
      }

      state.firstName = firstName;
      state.lastName = lastName;
      state.company = company;
      state.city = city;
      persistUserState(state);
      syncProfileStateToView(state);
      refreshModalSubmitStates(state);
      showPageFeedback({
        title: 'Профиль обновлен',
        description: 'Имя, фамилия, компания и город сохранены в аккаунте.',
      });

      const modal = document.getElementById('profile-edit-modal');
      if (modal instanceof HTMLElement) {
        closeCurrentModal(modal);
      }
    }, { signal });
  }
  if (emailForm instanceof HTMLFormElement) {
    watchFormState(emailForm, signal, () => {
      const email = String((emailForm.elements.namedItem('email') as HTMLInputElement)?.value || '').trim();
      const code = String((emailForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
      return getModalStep(emailForm) === 'input' ? Boolean(email) && email !== state.email : Boolean(code);
    });

    emailForm.querySelector('[data-resend-code]')?.addEventListener('click', () => {
      const pendingEmail = emailForm.dataset.pendingValue || '';
      setFormMessage(emailForm, '[data-form-success]', 'Код повторно отправлен на ' + pendingEmail);
    }, { signal });

    emailForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(emailForm);

      if (getModalStep(emailForm) === 'input') {
        const email = String(new FormData(emailForm).get('email') || '').trim();
        const emailError = validateEmail(email);

        if (emailError) {
          setFieldError(emailForm, 'email', emailError);
          setFormMessage(emailForm, '[data-form-error]', 'Укажите корректный email');
          return;
        }

        if (email === state.email) {
          setFieldError(emailForm, 'email', 'Укажите новый email, отличный от текущего');
          setFormMessage(emailForm, '[data-form-error]', 'Новый email совпадает с текущим');
          return;
        }

        if (email.includes('taken')) {
          setFieldError(emailForm, 'email', 'Этот email уже используется');
          setFormMessage(emailForm, '[data-form-error]', 'Не удалось отправить код на этот email');
          return;
        }

        emailForm.dataset.pendingValue = email;
        setStepState(emailForm, 'confirm', email);
        setFormMessage(emailForm, '[data-form-success]', 'Код отправлен на ' + email);
        refreshModalSubmitStates(state);
        return;
      }

      const code = String(new FormData(emailForm).get('code') || '').trim();
      const codeError = validateConfirmationCode(code);

      if (codeError) {
        setFieldError(emailForm, 'code', codeError);
        setFormMessage(emailForm, '[data-form-error]', 'Не удалось подтвердить новый email');
        return;
      }

      state.email = emailForm.dataset.pendingValue || state.email;
      persistUserState(state);
      syncProfileStateToView(state);
      refreshModalSubmitStates(state);
      showPageFeedback({
        title: 'Email обновлен',
        description: 'Новый адрес подтвержден и теперь используется для входа и уведомлений.',
      });

      const modal = document.getElementById('profile-email-modal');
      if (modal instanceof HTMLElement) {
        closeCurrentModal(modal);
      }
    }, { signal });
  }

  if (phoneForm instanceof HTMLFormElement) {
    const phoneInput = phoneForm.elements.namedItem('phone');
    if (phoneInput instanceof HTMLInputElement) {
      phoneInput.addEventListener('input', () => {
        phoneInput.value = formatPhoneInput(phoneInput.value);
        clearFieldError(phoneForm, 'phone');
        setFormMessage(phoneForm, '[data-form-error]', '');
        refreshModalSubmitStates(state);
      }, { signal });
    }

    watchFormState(phoneForm, signal, () => {
      const phone = String((phoneForm.elements.namedItem('phone') as HTMLInputElement)?.value || '').trim();
      const code = String((phoneForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
      return getModalStep(phoneForm) === 'input'
        ? Boolean(phone) && normalizePhone(phone) !== normalizePhone(state.phone)
        : Boolean(code);
    });

    phoneForm.querySelector('[data-resend-code]')?.addEventListener('click', () => {
      const pendingPhone = phoneForm.dataset.pendingValue || '';
      setFormMessage(phoneForm, '[data-form-success]', 'SMS-код повторно отправлен на ' + pendingPhone);
    }, { signal });

    phoneForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(phoneForm);

      if (getModalStep(phoneForm) === 'input') {
        const phone = String(new FormData(phoneForm).get('phone') || '').trim();
        const phoneError = validatePhone(phone);

        if (phoneError) {
          setFieldError(phoneForm, 'phone', phoneError);
          setFormMessage(phoneForm, '[data-form-error]', 'Укажите корректный телефон');
          return;
        }

        if (normalizePhone(phone) === normalizePhone(state.phone)) {
          setFieldError(phoneForm, 'phone', 'Укажите новый телефон, отличный от текущего');
          setFormMessage(phoneForm, '[data-form-error]', 'Новый телефон совпадает с текущим');
          return;
        }

        if (normalizePhone(phone) === '+79990000000') {
          setFieldError(phoneForm, 'phone', 'Этот телефон уже привязан к другому аккаунту');
          setFormMessage(phoneForm, '[data-form-error]', 'Не удалось отправить код на этот номер');
          return;
        }

        phoneForm.dataset.pendingValue = phone;
        setStepState(phoneForm, 'confirm', phone);
        setFormMessage(phoneForm, '[data-form-success]', 'SMS-код отправлен на ' + phone);
        refreshModalSubmitStates(state);
        return;
      }

      const code = String(new FormData(phoneForm).get('code') || '').trim();
      const codeError = validateConfirmationCode(code);

      if (codeError) {
        setFieldError(phoneForm, 'code', codeError);
        setFormMessage(phoneForm, '[data-form-error]', 'Не удалось подтвердить новый телефон');
        return;
      }

      state.phone = phoneForm.dataset.pendingValue || state.phone;
      persistUserState(state);
      syncProfileStateToView(state);
      refreshModalSubmitStates(state);
      showPageFeedback({
        title: 'Телефон обновлен',
        description: 'Новый номер подтвержден и подключен для входа и уведомлений.',
      });

      const modal = document.getElementById('profile-phone-modal');
      if (modal instanceof HTMLElement) {
        closeCurrentModal(modal);
      }
    }, { signal });
  }

  if (paymentForm instanceof HTMLFormElement) {
    attachMaskedInput(paymentForm, 'cardNumber', formatCardNumber, signal);
    attachMaskedInput(paymentForm, 'expiryDate', formatExpiry, signal);

    const cvvInput = paymentForm.elements.namedItem('cvv');
    if (cvvInput instanceof HTMLInputElement) {
      cvvInput.addEventListener('input', () => {
        cvvInput.value = cvvInput.value.replace(/\D/g, '').slice(0, 4);
        clearFieldError(paymentForm, 'cvv');
        setFormMessage(paymentForm, '[data-form-error]', '');
        refreshModalSubmitStates(state);
      }, { signal });
    }

    watchFormState(paymentForm, signal, () => {
      const cardNumber = String((paymentForm.elements.namedItem('cardNumber') as HTMLInputElement)?.value || '').trim();
      const expiryDate = String((paymentForm.elements.namedItem('expiryDate') as HTMLInputElement)?.value || '').trim();
      const holderName = String((paymentForm.elements.namedItem('holderName') as HTMLInputElement)?.value || '').trim();
      const cvv = String((paymentForm.elements.namedItem('cvv') as HTMLInputElement)?.value || '').trim();
      const code = String((paymentForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
      return getModalStep(paymentForm) === 'input' ? Boolean(cardNumber || expiryDate || holderName || cvv) : Boolean(code);
    });

    paymentForm.querySelector('[data-resend-code]')?.addEventListener('click', () => {
      showPageFeedback({
        title: 'Код отправлен повторно',
        description: 'Проверьте SMS или push-уведомление банка и введите код подтверждения.',
      });
    }, { signal });

    paymentForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(paymentForm);

      if (getModalStep(paymentForm) === 'input') {
        const formData = new FormData(paymentForm);
        const cardNumber = String(formData.get('cardNumber') || '');
        const expiryDate = String(formData.get('expiryDate') || '');
        const holderName = String(formData.get('holderName') || '').trim();
        const cvv = String(formData.get('cvv') || '');

        const errors = [
          ['cardNumber', validateCardNumber(cardNumber)],
          ['expiryDate', validateExpiry(expiryDate)],
          ['holderName', validateRequired(holderName, 'Введите имя держателя карты')],
          ['cvv', validateCvv(cvv)],
        ] as const;

        let hasErrors = false;
        errors.forEach(([field, message]) => {
          if (message) {
            hasErrors = true;
            setFieldError(paymentForm, field, message);
          }
        });

        const digits = cardNumber.replace(/\D/g, '');
        if (digits.startsWith('2200')) {
          hasErrors = true;
          setFormMessage(paymentForm, '[data-form-error]', 'Банк отклонил привязку этой карты');
        }

        if (hasErrors) {
          if (!paymentForm.querySelector('[data-form-error]')?.textContent) {
            setFormMessage(paymentForm, '[data-form-error]', 'Не удалось проверить данные карты');
          }
          return;
        }

        paymentForm.dataset.pendingValue = 'Банковская карта •••• ' + digits.slice(-4);
        setStepState(paymentForm, 'confirm', '•••• ' + digits.slice(-4));
        refreshModalSubmitStates(state);
        return;
      }

      const code = String(new FormData(paymentForm).get('code') || '').trim();
      const codeError = validateConfirmationCode(code);

      if (codeError) {
        setFieldError(paymentForm, 'code', codeError);
        setFormMessage(paymentForm, '[data-form-error]', 'Не удалось подтвердить новую карту');
        return;
      }

      state.cardMasked = paymentForm.dataset.pendingValue || state.cardMasked;
      persistUserState(state);
      syncProfileStateToView(state);
      refreshModalSubmitStates(state);
      showPageFeedback({
        title: 'Карта сохранена',
        description: 'Новый способ оплаты добавлен и будет использоваться для следующих пополнений.',
      });

      const modal = document.getElementById('profile-payment-modal');
      if (modal instanceof HTMLElement) {
        closeCurrentModal(modal);
      }
    }, { signal });
  }
  if (passwordForm instanceof HTMLFormElement) {
    watchFormState(passwordForm, signal, () => {
      const currentPassword = String((passwordForm.elements.namedItem('currentPassword') as HTMLInputElement)?.value || '').trim();
      const newPassword = String((passwordForm.elements.namedItem('newPassword') as HTMLInputElement)?.value || '').trim();
      const repeatPassword = String((passwordForm.elements.namedItem('repeatPassword') as HTMLInputElement)?.value || '').trim();
      return Boolean(currentPassword || newPassword || repeatPassword);
    });

    passwordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(passwordForm);

      const formData = new FormData(passwordForm);
      const currentPassword = String(formData.get('currentPassword') || '');
      const newPassword = String(formData.get('newPassword') || '');
      const repeatPassword = String(formData.get('repeatPassword') || '');

      const errors = [
        ['currentPassword', validateRequired(currentPassword, 'Введите текущий пароль')],
        ['newPassword', validatePassword(newPassword)],
        ['repeatPassword', validateRepeatPassword(newPassword, repeatPassword)],
      ] as const;

      let hasErrors = false;
      errors.forEach(([field, message]) => {
        if (message) {
          hasErrors = true;
          setFieldError(passwordForm, field, message);
        }
      });

      if (currentPassword === 'wrongpass') {
        hasErrors = true;
        setFormMessage(passwordForm, '[data-form-error]', 'Текущий пароль введен неверно');
      }

      if (hasErrors) {
        if (!passwordForm.querySelector('[data-form-error]')?.textContent) {
          setFormMessage(passwordForm, '[data-form-error]', 'Не удалось обновить пароль. Проверьте форму');
        }
        return;
      }

      state.passwordStatus = 'Пароль обновлен';
      persistUserState(state);
      syncProfileStateToView(state);
      refreshModalSubmitStates(state);
      showPageFeedback({
        title: 'Пароль обновлен',
        description: 'Используйте новый пароль при следующем входе в рекламный кабинет.',
      });

      const modal = document.getElementById('profile-password-modal');
      if (modal instanceof HTMLElement) {
        closeCurrentModal(modal);
      }
    }, { signal });
  }

  if (avatarForm instanceof HTMLFormElement) {
    const fileInput = avatarForm.elements.namedItem('avatarFile');
    const urlInput = avatarForm.elements.namedItem('avatarUrl');
    const preview = avatarForm.querySelector<HTMLElement>('[data-avatar-preview]');
    const previewImage = avatarForm.querySelector<HTMLImageElement>('[data-avatar-preview-image]');
    const previewInitials = avatarForm.querySelector<HTMLElement>('[data-avatar-preview-initials]');

    const applyAvatarPreview = (value: string): void => {
      const hasAvatar = Boolean(value);
      if (previewImage) {
        previewImage.src = value || '';
        previewImage.hidden = !hasAvatar;
      }
      if (previewInitials) {
        previewInitials.hidden = hasAvatar;
        previewInitials.textContent = getInitials(state.firstName, state.lastName);
      }
      preview?.classList.toggle('profile-avatar-picker--image', hasAvatar);
    };

    if (fileInput instanceof HTMLInputElement) {
      fileInput.addEventListener('change', async () => {
        clearFormState(avatarForm);
        const file = fileInput.files?.[0];
        if (!file) {
          return;
        }
        if (!file.type.startsWith('image/')) {
          setFormMessage(avatarForm, '[data-form-error]', 'Выберите изображение в формате PNG, JPG или WebP');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setFormMessage(avatarForm, '[data-form-error]', 'Файл должен быть меньше 5 МБ');
          return;
        }

        try {
          const dataUrl = await readFileAsDataUrl(file);
          avatarForm.dataset.pendingAvatar = dataUrl;
          avatarForm.dataset.removeAvatar = 'false';
          if (urlInput instanceof HTMLInputElement) {
            urlInput.value = '';
          }
          applyAvatarPreview(dataUrl);
          refreshModalSubmitStates(state);
        } catch {
          setFormMessage(avatarForm, '[data-form-error]', 'Не удалось загрузить выбранный файл');
        }
      }, { signal });
    }

    if (urlInput instanceof HTMLInputElement) {
      urlInput.addEventListener('input', () => {
        clearFormState(avatarForm);
        const value = urlInput.value.trim();
        avatarForm.dataset.pendingAvatar = value;
        avatarForm.dataset.removeAvatar = value ? 'false' : 'true';
        applyAvatarPreview(value);
        refreshModalSubmitStates(state);
      }, { signal });
    }

    avatarForm.querySelector('[data-avatar-reset]')?.addEventListener('click', () => {
      clearFormState(avatarForm);
      avatarForm.dataset.pendingAvatar = '';
      avatarForm.dataset.removeAvatar = 'true';
      if (fileInput instanceof HTMLInputElement) {
        fileInput.value = '';
      }
      if (urlInput instanceof HTMLInputElement) {
        urlInput.value = '';
      }
      applyAvatarPreview('');
      refreshModalSubmitStates(state);
    }, { signal });

    avatarForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(avatarForm);

      const pendingAvatar = avatarForm.dataset.pendingAvatar || '';
      state.avatar = pendingAvatar;
      persistUserState(state);
      syncProfileStateToView(state);
      refreshModalSubmitStates(state);
      showPageFeedback({
        title: state.avatar ? 'Аватар обновлен' : 'Аватар удален',
        description: state.avatar
          ? 'Новая фотография сохранена и теперь отображается в профиле.'
          : 'Профиль снова использует инициалы вместо изображения.',
      });

      const modal = document.getElementById('profile-avatar-modal');
      if (modal instanceof HTMLElement) {
        closeCurrentModal(modal);
      }
    }, { signal });
  }

  if (topUpForm instanceof HTMLFormElement) {
    watchFormState(topUpForm, signal, () => {
      const amount = String((topUpForm.elements.namedItem('amount') as HTMLInputElement)?.value || '').trim();
      return Boolean(amount);
    });

    topUpForm.querySelectorAll<HTMLButtonElement>('[data-quick-amount]').forEach((button) => {
      button.addEventListener('click', () => {
        const amountInput = topUpForm.elements.namedItem('amount');
        if (amountInput instanceof HTMLInputElement) {
          amountInput.value = button.dataset.quickAmount || '';
        }
        clearFieldError(topUpForm, 'amount');
        setFormMessage(topUpForm, '[data-form-error]', '');
        setSubmitEnabled(topUpForm, true);
      }, { signal });
    });

    topUpForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(topUpForm);

      const formData = new FormData(topUpForm);
      const amountValue = String(formData.get('amount') || '');
      const amountError = validateAmount(amountValue);

      if (amountError) {
        setFieldError(topUpForm, 'amount', amountError);
        setFormMessage(topUpForm, '[data-form-error]', 'Укажите корректную сумму пополнения');
        return;
      }

      const amount = Number(amountValue.replace(/[^\d]/g, ''));
      if (amount > 200000) {
        setFormMessage(topUpForm, '[data-form-error]', 'Суммы выше 200 000 ₽ требуют ручного подтверждения менеджером');
        return;
      }

      state.balanceValue += amount;
      state.lastTopUp = formatTopUpDate(amount);
      persistUserState(state);
      syncProfileStateToView(state);
      refreshModalSubmitStates(state);
      showPageFeedback({
        title: 'Баланс пополнен',
        description: `На счет зачислено ${formatPrice(amount)}. Средства уже доступны для запуска кампаний.`,
      });

      const modal = document.getElementById('profile-topup-modal');
      if (modal instanceof HTMLElement) {
        closeCurrentModal(modal);
      }
    }, { signal });
  }

  if (tariffForm instanceof HTMLFormElement) {
    watchFormState(tariffForm, signal, () => {
      const nextTariff = String((tariffForm.elements.namedItem('nextTariff') as RadioNodeList)?.value || '');
      return Boolean(nextTariff) && nextTariff !== state.tariffKey;
    });

    tariffForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(tariffForm);

      const formData = new FormData(tariffForm);
      const nextTariff = String(formData.get('nextTariff') || '') as TariffKey;

      if (!nextTariff) {
        setFormMessage(tariffForm, '[data-form-error]', 'Выберите тариф для перехода');
        return;
      }

      if (nextTariff === state.tariffKey) {
        setFormMessage(tariffForm, '[data-form-error]', 'Этот тариф уже активен');
        return;
      }

      const nextMeta = getTariffMeta(nextTariff);
      if (state.activeCampaigns > nextMeta.limit) {
        setFormMessage(tariffForm, '[data-form-error]', `Нельзя перейти на ${nextMeta.label}: лимит ${nextMeta.limit} кампаний, у вас ${state.activeCampaigns}`);
        return;
      }

      state.tariffKey = nextTariff;
      persistUserState(state);
      syncProfileStateToView(state);
      refreshModalSubmitStates(state);
      showPageFeedback({
        title: 'Тариф обновлен',
        description: `Теперь активен тариф ${nextMeta.label}. Новые лимиты кабинета уже применены.`,
      });

      const modal = document.getElementById('profile-tariff-modal');
      if (modal instanceof HTMLElement) {
        closeCurrentModal(modal);
      }
    }, { signal });
  }

  if (confirmationForm instanceof HTMLFormElement) {
    attachMaskedInput(confirmationForm, 'phone', formatPhoneInput, signal);
    watchFormState(confirmationForm, signal, () => {
      const email = String((confirmationForm.elements.namedItem('email') as HTMLInputElement)?.value || '').trim();
      const phone = String((confirmationForm.elements.namedItem('phone') as HTMLInputElement)?.value || '').trim();
      const company = String((confirmationForm.elements.namedItem('company') as HTMLInputElement)?.value || '').trim();
      const inn = String((confirmationForm.elements.namedItem('inn') as HTMLInputElement)?.value || '').trim();
      return email !== state.email || phone !== state.phone || company !== state.company || inn !== state.inn || state.accountStatus !== 'verified';
    });

    confirmationForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(confirmationForm);

      const formData = new FormData(confirmationForm);
      const email = String(formData.get('email') || '').trim();
      const phone = String(formData.get('phone') || '').trim();
      const company = String(formData.get('company') || '').trim();
      const inn = String(formData.get('inn') || '').trim();

      const errors = [
        ['email', validateEmail(email)],
        ['phone', validatePhone(phone)],
        ['company', validateRequired(company, 'Введите название компании')],
        ['inn', validateInn(inn)],
      ] as const;

      let hasErrors = false;
      errors.forEach(([field, message]) => {
        if (message) {
          hasErrors = true;
          setFieldError(confirmationForm, field, message);
        }
      });

      if (email.includes('taken')) {
        hasErrors = true;
        setFieldError(confirmationForm, 'email', 'Этот email уже используется');
      }

      if (hasErrors) {
        setFormMessage(confirmationForm, '[data-form-error]', 'Заполните обязательные поля и повторите отправку');
        return;
      }

      if (email !== state.email || normalizePhone(phone) !== normalizePhone(state.phone)) {
        setFormMessage(
          confirmationForm,
          '[data-form-error]',
          'Email и телефон обновляются отдельно в блоке «Контакты» с подтверждением кода',
        );
        return;
      }

      state.company = company;
      state.inn = inn.replace(/\D/g, '');
      state.accountStatus = 'verified';
      persistUserState(state);
      syncProfileStateToView(state);
      refreshModalSubmitStates(state);
      showPageFeedback({
        title: 'Аккаунт подтвержден',
        description: 'Контактные данные и реквизиты сохранены, статус аккаунта обновлен.',
      });

      const modal = document.getElementById('profile-confirmation-modal');
      if (modal instanceof HTMLElement) {
        closeCurrentModal(modal);
      }
    }, { signal });
  }

  populateForms(state);
  refreshModalSubmitStates(state);

  return () => {
    if (profileLifecycleController === controller) {
      profileLifecycleController = null;
    }
    if (feedbackTimer) {
      window.clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
    controller.abort();
  };
}
