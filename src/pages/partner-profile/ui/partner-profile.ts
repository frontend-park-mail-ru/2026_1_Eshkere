import '../../partner-overview/ui/partner-overview.scss';
import {
  getPartnerProfile,
  updatePartnerProfile,
  getPartnerCountries,
  getPartnerRegistrationRegions,
  getPartnerCooperationForms,
  getPartnerPayoutCurrencies,
  type DictionaryItem,
} from 'features/partner';
import { navigateTo } from 'shared/lib/navigation';
import { renderTemplate } from 'shared/lib/render';
import { normalizePhone } from 'shared/validators';
import partnerProfileTemplate from './partner-profile.hbs';

function formatMoney(value: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    currency: currency.trim() || 'RUB',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Math.max(0, value));
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 8);
  const p4 = digits.slice(8, 10);
  return [p1, p2, p3, p4].filter(Boolean).join(' ');
}

function buildSelectOptions(items: DictionaryItem[], selected: string): string {
  return items
    .map((item) => `<option value="${item.code}"${item.code === selected ? ' selected' : ''}>${item.name}</option>`)
    .join('');
}

async function populateRegions(
  select: HTMLSelectElement,
  countryCode: string,
  currentRegion?: string,
): Promise<void> {
  select.innerHTML = '<option value="">— Загрузка —</option>';
  select.disabled = true;
  const regions = await getPartnerRegistrationRegions(countryCode).catch(() => []);
  select.disabled = false;
  if (!regions.length) {
    select.innerHTML = '<option value="">— Выберите страну —</option>';
    return;
  }
  select.innerHTML = regions
    .map((r) => `<option value="${r.code}"${r.code === currentRegion ? ' selected' : ''}>${r.name}</option>`)
    .join('');
}

export async function renderPartnerProfilePage(): Promise<string> {
  const [profile, countries, cooperationForms, payoutCurrencies] = await Promise.all([
    getPartnerProfile().catch(() => null),
    getPartnerCountries().catch(() => [] as DictionaryItem[]),
    getPartnerCooperationForms().catch(() => [] as DictionaryItem[]),
    getPartnerPayoutCurrencies().catch(() => [] as DictionaryItem[]),
  ]);

  const fullName = [profile?.last_name, profile?.first_name, profile?.middle_name]
    .filter(Boolean)
    .join(' ');

  const cf = profile?.cooperation_form ?? '';
  const country = profile?.country_code ?? '';
  const cur = profile?.payout_currency ?? '';

  const cooperationFormLabel =
    cooperationForms.find((f) => f.code === cf)?.name || cf || 'Не указана';

  return await renderTemplate(partnerProfileTemplate, {
    balance:
      typeof profile?.balance === 'number'
        ? formatMoney(profile.balance, profile.payout_currency)
        : '—',
    birthDate: profile?.birth_date ?? '',
    cooperationFormLabel,
    cooperationFormOptions: buildSelectOptions(cooperationForms, cf),
    countryOptions: buildSelectOptions(countries, country),
    currency: cur || '—',
    payoutCurrencyOptions: buildSelectOptions(payoutCurrencies, cur),
    email: profile?.email ?? '—',
    firstName: profile?.first_name ?? '',
    fullName: fullName || 'Профиль партнёра',
    hasProfile: Boolean(profile),
    lastName: profile?.last_name ?? '',
    middleName: profile?.middle_name ?? '',
    phone: profile?.phone ?? '—',
    phoneRaw: profile?.phone ? formatPhoneDisplay(profile.phone) : '',
    regionCode: profile?.registration_region_code ?? '',
  });
}

export function PartnerProfile(): VoidFunction {
  const controller = new AbortController();
  const { signal } = controller;

  const root = document.querySelector<HTMLElement>('[data-partner-links]');
  root?.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    link.addEventListener(
      'click',
      (event) => {
        const href = link.getAttribute('href');
        if (!href) return;
        event.preventDefault();
        navigateTo(href);
      },
      { signal },
    );
  });

  const form = document.getElementById('partner-profile-form');
  if (!(form instanceof HTMLFormElement)) return () => controller.abort();

  const errorBanner = form.querySelector<HTMLElement>('[data-form-error]')!;
  const successBanner = form.querySelector<HTMLElement>('[data-form-success]')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]')!;

  const countrySelect = form.querySelector<HTMLSelectElement>('[name="countryCode"]')!;
  const regionSelect = form.querySelector<HTMLSelectElement>('[data-region-select]')!;

  const currentRegion = regionSelect.dataset.currentRegion ?? '';
  if (countrySelect.value) {
    populateRegions(regionSelect, countrySelect.value, currentRegion);
  }

  countrySelect.addEventListener(
    'change',
    () => populateRegions(regionSelect, countrySelect.value),
    { signal },
  );

  const phoneInput = form.querySelector<HTMLInputElement>('[name="phone"]');
  phoneInput?.addEventListener(
    'input',
    () => {
      if (!phoneInput) return;
      const digits = phoneInput.value.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);
      const p1 = digits.slice(0, 3);
      const p2 = digits.slice(3, 6);
      const p3 = digits.slice(6, 8);
      const p4 = digits.slice(8, 10);
      phoneInput.value = [p1, p2, p3, p4].filter(Boolean).join(' ');
    },
    { signal },
  );

  let isSubmitting = false;

  form.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();
      if (isSubmitting) return;

      errorBanner.hidden = true;
      successBanner.hidden = true;

      const el = form.elements as HTMLFormControlsCollection &
        Record<string, HTMLInputElement | HTMLSelectElement>;

      const lastName = (el['lastName'] as HTMLInputElement).value.trim();
      const firstName = (el['firstName'] as HTMLInputElement).value.trim();
      const middleName = (el['middleName'] as HTMLInputElement).value.trim();
      const birthDate = (el['birthDate'] as HTMLInputElement).value;
      const phone = (el['phone'] as HTMLInputElement).value;
      const countryCode = (el['countryCode'] as HTMLSelectElement).value;
      const registrationRegionCode = (el['registrationRegionCode'] as HTMLSelectElement).value;
      const cooperationForm = (el['cooperationForm'] as HTMLSelectElement).value;
      const payoutCurrency = (el['payoutCurrency'] as HTMLSelectElement).value;

      if (!lastName || !firstName) {
        errorBanner.textContent = 'Фамилия и имя обязательны';
        errorBanner.hidden = false;
        return;
      }

      isSubmitting = true;
      submitBtn.disabled = true;

      try {
        const result = await updatePartnerProfile({
          lastName,
          firstName,
          middleName: middleName || undefined,
          birthDate: birthDate || undefined,
          phone: phone ? normalizePhone(phone) : undefined,
          countryCode: countryCode || undefined,
          registrationRegionCode: registrationRegionCode || undefined,
          cooperationForm: cooperationForm || undefined,
          payoutCurrency: payoutCurrency || undefined,
        });

        if ('error' in result) {
          errorBanner.textContent = result.message;
          errorBanner.hidden = false;
          return;
        }

        successBanner.hidden = false;
      } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
      }
    },
    { signal },
  );

  return () => controller.abort();
}
