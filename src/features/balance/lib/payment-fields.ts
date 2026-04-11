import { getDigitsWithMax } from 'shared/lib/digits';
import { formatCardExpiry, formatCardNumber } from 'shared/lib/payment-format';
import type { PaymentMethodKind } from '../model/types';
import {
  DEFAULT_PAYMENT_KIND,
  DEFAULT_PAYMENT_KIND_LABEL,
  PAYMENT_ADD_ALIAS_PLACEHOLDERS,
} from './payment-constants';
import {
  closeBalanceSelect,
  syncBalanceSelectValue,
} from './payment-select';

function sanitizeDigitsValue(value: string, maxLength: number): string {
  return getDigitsWithMax(value, maxLength);
}

export function sanitizePaymentAddInput(target: HTMLInputElement): void {
  if (target.name === 'cardNumber') {
    target.value = formatCardNumber(target.value);
    return;
  }

  if (target.name === 'expiry') {
    target.value = formatCardExpiry(target.value);
    return;
  }

  if (target.name === 'cvc') {
    target.value = sanitizeDigitsValue(target.value, 3);
    return;
  }

  if (target.name === 'accountNumber') {
    target.value = sanitizeDigitsValue(target.value, 20);
    return;
  }

  if (target.name === 'inn') {
    target.value = sanitizeDigitsValue(target.value, 12);
    return;
  }

  if (target.name === 'bik') {
    target.value = sanitizeDigitsValue(target.value, 9);
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
    aliasInput.placeholder = PAYMENT_ADD_ALIAS_PLACEHOLDERS[kind];
  }
}

export function resetPaymentAddForm(form: HTMLFormElement): void {
  form.reset();

  const errorNode = form.querySelector<HTMLElement>(
    '[data-balance-payment-add-error]',
  );
  if (errorNode) {
    errorNode.textContent = '';
  }

  const kindSelect = form.querySelector<HTMLElement>(
    '[data-balance-select="kind"]',
  );
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
