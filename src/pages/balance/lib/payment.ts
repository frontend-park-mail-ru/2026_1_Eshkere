import type {
  PaymentMethodDraft,
  PaymentMethodKind,
  PaymentMethodOption,
} from '../model/types';

export const DEFAULT_PAYMENT_KIND: PaymentMethodKind = 'card';
export const DEFAULT_PAYMENT_KIND_LABEL = 'Личная банковская карта';

function getInputValue(form: HTMLFormElement, name: string): string {
  const input = form.elements.namedItem(name);
  return input instanceof HTMLInputElement ? input.value.trim() : '';
}

function getDigitsValue(form: HTMLFormElement, name: string): string {
  return getInputValue(form, name).replace(/\D/g, '');
}

export function formatCardNumberInput(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();
}

export function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function sanitizePaymentAddInput(target: HTMLInputElement): void {
  if (target.name === 'cardNumber') {
    target.value = formatCardNumberInput(target.value);
    return;
  }

  if (target.name === 'expiry') {
    target.value = formatExpiryInput(target.value);
    return;
  }

  if (target.name === 'cvc') {
    target.value = target.value.replace(/\D/g, '').slice(0, 3);
    return;
  }

  if (target.name === 'accountNumber') {
    target.value = target.value.replace(/\D/g, '').slice(0, 20);
    return;
  }

  if (target.name === 'inn') {
    target.value = target.value.replace(/\D/g, '').slice(0, 12);
    return;
  }

  if (target.name === 'bik') {
    target.value = target.value.replace(/\D/g, '').slice(0, 9);
  }
}

export function syncPaymentAddFormKind(form: HTMLFormElement): void {
  const kindInput = form.elements.namedItem('kind');
  const cardFields = form.querySelector<HTMLElement>(
    '[data-balance-payment-card-fields]',
  );
  const invoiceFields = form.querySelector<HTMLElement>(
    '[data-balance-payment-invoice-fields]',
  );
  const holderField = form.querySelector<HTMLElement>(
    '[data-balance-payment-holder-field]',
  );
  const aliasInput = form.querySelector<HTMLInputElement>(
    'input[name="alias"]',
  );

  const kind =
    kindInput instanceof HTMLInputElement
      ? (kindInput.value as PaymentMethodKind)
      : DEFAULT_PAYMENT_KIND;

  if (cardFields) {
    cardFields.hidden = kind === 'invoice';
  }

  if (invoiceFields) {
    invoiceFields.hidden = kind !== 'invoice';
  }

  if (holderField) {
    holderField.hidden = kind !== 'card';
  }

  if (aliasInput && document.activeElement !== aliasInput) {
    aliasInput.placeholder =
      kind === 'invoice'
        ? 'Например, Основной расчетный счет'
        : kind === 'corporate'
          ? 'Например, Карта команды маркетинга'
          : 'Например, Личная карта для пополнений';
  }
}

export function closeBalanceSelect(select: HTMLElement): void {
  select.classList.remove('is-open');

  select
    .querySelector<HTMLElement>('[data-balance-select-trigger]')
    ?.setAttribute('aria-expanded', 'false');

  const menu = select.querySelector<HTMLElement>('[data-balance-select-menu]');
  if (menu) {
    menu.hidden = true;
  }
}

export function openBalanceSelect(select: HTMLElement): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-select].is-open')
    .forEach((node) => {
      if (node !== select) {
        closeBalanceSelect(node);
      }
    });

  select.classList.add('is-open');
  select
    .querySelector<HTMLElement>('[data-balance-select-trigger]')
    ?.setAttribute('aria-expanded', 'true');

  const menu = select.querySelector<HTMLElement>('[data-balance-select-menu]');
  if (menu) {
    menu.hidden = false;
  }
}

export function syncBalanceSelectValue(
  select: HTMLElement,
  value: string,
  label: string,
): void {
  const key = select.dataset.balanceSelect;
  const valueNode = key
    ? select.querySelector<HTMLElement>(`[data-balance-select-value="${key}"]`)
    : null;
  const inputNode = key
    ? select.querySelector<HTMLInputElement>(
        `[data-balance-select-input="${key}"]`,
      )
    : null;

  if (valueNode) {
    valueNode.textContent = label;
  }

  if (inputNode) {
    inputNode.value = value;
  }

  select
    .querySelectorAll<HTMLElement>('[data-balance-select-option]')
    .forEach((option) => {
      const isActive = option.dataset.value === value;
      option.classList.toggle('balance-modal__select-option--active', isActive);
    });
}

export function readPaymentMethodDraft(
  form: HTMLFormElement,
): PaymentMethodDraft {
  const kindInput = form.elements.namedItem('kind');

  return {
    kind:
      kindInput instanceof HTMLInputElement
        ? (kindInput.value as PaymentMethodKind)
        : DEFAULT_PAYMENT_KIND,
    alias: getInputValue(form, 'alias'),
    cardNumber: getDigitsValue(form, 'cardNumber'),
    expiry: getInputValue(form, 'expiry'),
    cvc: getDigitsValue(form, 'cvc'),
    holderName: getInputValue(form, 'holderName'),
    companyName: getInputValue(form, 'companyName'),
    bankName: getInputValue(form, 'bankName'),
    inn: getDigitsValue(form, 'inn'),
    bik: getDigitsValue(form, 'bik'),
    accountNumber: getDigitsValue(form, 'accountNumber'),
  };
}

export function validatePaymentMethodDraft(
  draft: PaymentMethodDraft,
): string | null {
  if (draft.kind === 'invoice') {
    if (
      !draft.companyName ||
      !draft.bankName ||
      draft.accountNumber.length !== 20
    ) {
      return 'Для счета укажите организацию, банк и расчетный счет из 20 цифр.';
    }

    if (!(draft.inn.length === 10 || draft.inn.length === 12)) {
      return 'Для счета укажите ИНН из 10 или 12 цифр.';
    }

    if (draft.bik.length !== 9) {
      return 'БИК должен содержать 9 цифр.';
    }

    return null;
  }

  const [monthValue] = draft.expiry.split('/');
  const month = Number(monthValue || '0');

  if (draft.cardNumber.length < 16) {
    return 'Введите полный номер карты из 16 цифр.';
  }

  if (!draft.expiry || draft.expiry.length !== 5 || month < 1 || month > 12) {
    return 'Укажите срок действия карты в формате MM/YY.';
  }

  if (draft.cvc.length !== 3) {
    return 'CVC код должен содержать 3 цифры.';
  }

  if (draft.kind === 'card' && !draft.holderName) {
    return 'Укажите имя держателя карты.';
  }

  return null;
}

export function createPaymentMethodOption(
  draft: PaymentMethodDraft,
): PaymentMethodOption {
  const id = `payment_${Date.now()}`;

  if (draft.kind === 'invoice') {
    return {
      id,
      kind: draft.kind,
      value: draft.alias || `Счет ${draft.companyName}`,
      caption: `${draft.bankName}, р/с •••• ${draft.accountNumber.slice(-4)}`,
      note: 'Безналично',
    };
  }

  return {
    id,
    kind: draft.kind,
    value: `${draft.alias || (draft.kind === 'corporate' ? 'Корпоративная карта' : 'Личная карта')} •••• ${draft.cardNumber.slice(-4)}`,
    caption:
      draft.kind === 'card'
        ? draft.holderName
        : 'Корпоративная карта команды',
    note: draft.kind === 'corporate' ? `до ${draft.expiry}` : 'Личная карта',
  };
}

export function resetPaymentAddForm(form: HTMLFormElement): void {
  form.reset();

  const errorNode = form.querySelector<HTMLElement>(
    '[data-balance-payment-add-error]',
  );
  if (errorNode) {
    errorNode.textContent = '';
  }

  const kindSelect = form.querySelector<HTMLElement>('[data-balance-select="kind"]');
  if (kindSelect) {
    syncBalanceSelectValue(
      kindSelect,
      DEFAULT_PAYMENT_KIND,
      DEFAULT_PAYMENT_KIND_LABEL,
    );
    closeBalanceSelect(kindSelect);
  }

  syncPaymentAddFormKind(form);
}
