import './partner-register.scss';
import { renderTemplate } from 'shared/lib/render';
import { renderFormField, PasswordVisibilityToggles } from 'shared/ui/form-field/form-field';
import { renderButton } from 'shared/ui/button/button';
import { validateEmail, validatePhone, validatePassword, validateRepeatPassword, setFieldState, normalizePhone } from 'shared/validators';
import { initNativeSelectArrows } from 'shared/lib/native-select-arrow';
import {
  registerPartner,
  getPartnerCountries,
  getPartnerRegistrationRegions,
  getPartnerCooperationForms,
  getPartnerPayoutCurrencies,
  type DictionaryItem,
} from 'features/partner';
import { navigateTo } from 'shared/lib/navigation';
import partnerRegisterTemplate from './partner-register.hbs';

export async function renderPartnerRegisterPage(): Promise<string> {
  const [
    lastNameField,
    firstNameField,
    middleNameField,
    birthDateField,
    emailField,
    phoneField,
    passwordField,
    repeatPasswordField,
    submitButton,
    countries,
    cooperationForms,
    payoutCurrencies,
  ] = await Promise.all([
    renderFormField({ id: 'pr-last-name', name: 'lastName', type: 'text', label: 'Фамилия', placeholder: 'Иванов', required: true }),
    renderFormField({ id: 'pr-first-name', name: 'firstName', type: 'text', label: 'Имя', placeholder: 'Иван', required: true }),
    renderFormField({ id: 'pr-middle-name', name: 'middleName', type: 'text', label: 'Отчество', placeholder: 'Иванович' }),
    renderFormField({ id: 'pr-birth-date', name: 'birthDate', type: 'date', label: 'Дата рождения', required: true }),
    renderFormField({ id: 'pr-email', name: 'email', type: 'email', label: 'Электронная почта', placeholder: 'ivan@example.com', required: true }),
    renderFormField({ id: 'pr-phone', name: 'phone', type: 'text', label: 'Телефон', placeholder: '999 123 45 67', prefix: '+7', inputmode: 'numeric', maxlength: 13, required: true }),
    renderFormField({ id: 'pr-password', name: 'password', type: 'password', label: 'Пароль', placeholder: 'Минимум 6 символов', required: true }),
    renderFormField({ id: 'pr-repeat-password', name: 'repeatPassword', type: 'password', label: 'Повторите пароль', placeholder: 'Повторите пароль', required: true }),
    renderButton({ text: 'Зарегистрироваться как партнёр', type: 'submit', variant: 'primary' }),
    getPartnerCountries().catch(() => [] as DictionaryItem[]),
    getPartnerCooperationForms().catch(() => [] as DictionaryItem[]),
    getPartnerPayoutCurrencies().catch(() => [] as DictionaryItem[]),
  ]);

  return renderTemplate(partnerRegisterTemplate, {
    lastNameField,
    firstNameField,
    middleNameField,
    birthDateField,
    emailField,
    phoneField,
    passwordField,
    repeatPasswordField,
    submitButton,
    countries,
    cooperationForms,
    payoutCurrencies,
  });
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 8);
  const p4 = digits.slice(8, 10);
  return [p1, p2, p3, p4].filter(Boolean).join(' ');
}

function buildOptions(items: DictionaryItem[], selectedValue = ''): string {
  return items
    .map(
      (item) =>
        `<option value="${item.code}"${item.code === selectedValue ? ' selected' : ''}>${item.name}</option>`,
    )
    .join('');
}

async function populateRegions(select: HTMLSelectElement, countryCode: string): Promise<void> {
  select.innerHTML = '<option value="">— Загрузка —</option>';
  select.disabled = true;
  const regions = await getPartnerRegistrationRegions(countryCode).catch(() => []);
  select.disabled = false;
  select.innerHTML = regions.length
    ? buildOptions(regions)
    : '<option value="">— Выберите страну —</option>';
}

function setSelectError(select: HTMLSelectElement, message: string): void {
  const errorEl = select.closest('label')?.querySelector<HTMLElement>(`[data-error-for="${select.name}"]`);
  if (errorEl) errorEl.textContent = message;
  select.classList.toggle('ui-input--error', Boolean(message));
}

export function PartnerRegister(): void | VoidFunction {
  const publicLayout = document.querySelector('.public-layout');
  publicLayout?.classList.add('public-layout--auth');

  const form = document.getElementById('partner-register-form');
  if (!(form instanceof HTMLFormElement)) {
    return () => publicLayout?.classList.remove('public-layout--auth');
  }

  PasswordVisibilityToggles(form);
  initNativeSelectArrows({
    root: form,
    selectSelector: '.partner-register-form__label--select > select.partner-register-form__select',
    fieldSelector: '.partner-register-form__label--select',
  });

  const countrySelect = form.querySelector<HTMLSelectElement>('[name="countryCode"]')!;
  const regionSelect = form.querySelector<HTMLSelectElement>('[name="registrationRegionCode"]')!;
  const errorBanner = form.querySelector<HTMLElement>('[data-form-error]')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]')!;

  if (countrySelect.value) {
    populateRegions(regionSelect, countrySelect.value);
  }

  countrySelect.addEventListener('change', () => {
    populateRegions(regionSelect, countrySelect.value);
    setSelectError(countrySelect, '');
  });

  const phoneInput = form.querySelector<HTMLInputElement>('[name="phone"]');
  phoneInput?.addEventListener('input', () => {
    phoneInput.value = formatPhoneInput(phoneInput.value);
  });

  let isSubmitting = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    errorBanner.hidden = true;

    const el = form.elements as HTMLFormControlsCollection & Record<string, HTMLInputElement | HTMLSelectElement>;

    const lastName = (el['lastName'] as HTMLInputElement).value.trim();
    const firstName = (el['firstName'] as HTMLInputElement).value.trim();
    const middleName = (el['middleName'] as HTMLInputElement).value.trim();
    const birthDate = (el['birthDate'] as HTMLInputElement).value;
    const email = (el['email'] as HTMLInputElement).value.trim();
    const phone = (el['phone'] as HTMLInputElement).value;
    const cooperationForm = (el['cooperationForm'] as HTMLSelectElement).value;
    const countryCode = (el['countryCode'] as HTMLSelectElement).value;
    const registrationRegionCode = (el['registrationRegionCode'] as HTMLSelectElement).value;
    const payoutCurrency = (el['payoutCurrency'] as HTMLSelectElement).value as 'RUB' | 'USD' | 'EUR';
    const password = (el['password'] as HTMLInputElement).value;
    const repeatPassword = (el['repeatPassword'] as HTMLInputElement).value;

    let valid = true;

    if (!lastName) { setFieldState(form, 'lastName', 'Введите фамилию'); valid = false; }
    else setFieldState(form, 'lastName', '');

    if (!firstName) { setFieldState(form, 'firstName', 'Введите имя'); valid = false; }
    else setFieldState(form, 'firstName', '');

    if (!birthDate) { setFieldState(form, 'birthDate', 'Укажите дату рождения'); valid = false; }
    else setFieldState(form, 'birthDate', '');

    const emailErr = validateEmail(email);
    setFieldState(form, 'email', emailErr);
    if (emailErr) valid = false;

    const phoneErr = validatePhone(phone);
    setFieldState(form, 'phone', phoneErr);
    if (phoneErr) valid = false;

    if (!cooperationForm) { setSelectError(form.querySelector<HTMLSelectElement>('[name="cooperationForm"]')!, 'Выберите форму сотрудничества'); valid = false; }
    if (!countryCode) { setSelectError(countrySelect, 'Выберите страну'); valid = false; }
    if (!registrationRegionCode) { setSelectError(regionSelect, 'Выберите регион'); valid = false; }

    const passErr = validatePassword(password);
    setFieldState(form, 'password', passErr);
    if (passErr) valid = false;

    const repeatErr = validateRepeatPassword(password, repeatPassword);
    setFieldState(form, 'repeatPassword', repeatErr);
    if (repeatErr) valid = false;

    if (!valid) return;

    isSubmitting = true;
    submitBtn.disabled = true;

    try {
      const result = await registerPartner({
        lastName,
        firstName,
        middleName: middleName || undefined,
        birthDate,
        email,
        phone: normalizePhone(phone),
        cooperationForm: cooperationForm as 'self_employed' | 'individual_entrepreneur' | 'legal_entity',
        countryCode,
        registrationRegionCode,
        payoutCurrency,
        password,
      });

      if ('error' in result) {
        errorBanner.textContent = result.message ?? '';
        errorBanner.hidden = false;
        return;
      }

      navigateTo('/partner/overview', { replace: true });
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
    }
  });

  return () => {
    publicLayout?.classList.remove('public-layout--auth');
  };
}
