import { getDigits } from 'shared/lib/digits';
import {
  validateBankAccountNumber,
  validateBik,
  validateCardCvv,
  validateCardExpiry,
  validateCardNumber,
  validateInn,
} from 'shared/validators';
import type {
  PaymentMethodDraft,
  PaymentMethodKind,
  PaymentMethodOption,
} from '../model/types';
import { DEFAULT_PAYMENT_KIND } from './payment-constants';

function getInputValue(form: HTMLFormElement, name: string): string {
  const input = form.elements.namedItem(name);
  return input instanceof HTMLInputElement ? input.value.trim() : '';
}

function getDigitsValue(form: HTMLFormElement, name: string): string {
  return getDigits(getInputValue(form, name));
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
    if (!draft.companyName || !draft.bankName) {
      return 'Для счета укажите организацию и банк.';
    }

    const innError = validateInn(draft.inn, {
      requiredMessage: 'Для счета укажите ИНН компании.',
      invalidLengthMessage:
        'Для счета укажите ИНН из 10 или 12 цифр.',
    });
    if (innError) {
      return innError;
    }

    const bikError = validateBik(draft.bik, {
      requiredMessage: 'Для счета укажите БИК банка.',
    });
    if (bikError) {
      return bikError;
    }

    const accountError = validateBankAccountNumber(draft.accountNumber, {
      requiredMessage: 'Для счета укажите расчетный счет.',
      invalidLengthMessage:
        'Расчетный счет для оплаты по счету должен содержать 20 цифр.',
    });
    if (accountError) {
      return accountError;
    }

    return null;
  }

  const cardNumberError = validateCardNumber(draft.cardNumber, {
    message: 'Введите полный номер карты из 16 цифр.',
  });
  if (cardNumberError) {
    return cardNumberError;
  }

  const expiryError = validateCardExpiry(draft.expiry, {
    invalidFormatMessage:
      'Укажите срок действия карты в формате MM/YY.',
    invalidMonthMessage:
      'Укажите срок действия карты в формате MM/YY.',
  });
  if (expiryError) {
    return expiryError;
  }

  const cvcError = validateCardCvv(draft.cvc, {
    message: 'CVC код должен содержать 3 цифры.',
  });
  if (cvcError) {
    return cvcError;
  }

  if (draft.kind === 'card' && !draft.holderName) {
    return 'Укажите имя держателя карты.';
  }

  return null;
}

export function createPaymentMethodOption(
  draft: PaymentMethodDraft,
  id = `payment_${Date.now()}`,
): PaymentMethodOption {
  if (draft.kind === 'invoice') {
    return {
      id,
      kind: draft.kind,
      value: draft.alias || `Счет ${draft.companyName}`,
      caption: `${draft.bankName}, р/с •••• ${draft.accountNumber.slice(-4)}`,
      badge: 'По счету',
      draft,
    };
  }

  return {
    id,
    kind: draft.kind,
    value: `${draft.alias || (draft.kind === 'corporate' ? 'Корпоративная карта' : 'Личная карта')} •••• ${draft.cardNumber.slice(-4)}`,
    caption:
      draft.kind === 'card'
        ? `${draft.holderName} · до ${draft.expiry}`
        : `Командная карта · до ${draft.expiry}`,
    badge:
      draft.kind === 'corporate'
        ? 'Корпоративная'
        : 'Личная',
    draft,
  };
}

function getFallbackCardDraft(kind: PaymentMethodKind): PaymentMethodDraft {
  return {
    kind,
    alias: '',
    cardNumber: kind === 'corporate' ? '5555555555550000' : '4111111111110000',
    expiry: '12/29',
    cvc: '123',
    holderName: kind === 'corporate' ? '' : 'CARD HOLDER',
    companyName: '',
    bankName: '',
    inn: '',
    bik: '',
    accountNumber: '',
  };
}

export function createFallbackPaymentMethodDraft(
  method: Partial<PaymentMethodOption>,
): PaymentMethodDraft {
  if (method.kind === 'invoice') {
    return {
      kind: 'invoice',
      alias: typeof method.value === 'string' ? method.value : '',
      cardNumber: '',
      expiry: '',
      cvc: '',
      holderName: '',
      companyName:
        typeof method.value === 'string' ? method.value : 'Организация',
      bankName:
        typeof method.caption === 'string' ? method.caption.split(',')[0] : '',
      inn: '7701234567',
      bik: '044525225',
      accountNumber: '40702810000000001234',
    };
  }

  const baseDraft = getFallbackCardDraft(
    method.kind === 'corporate' ? 'corporate' : 'card',
  );
  const last4Match =
    typeof method.value === 'string' ? method.value.match(/(\d{4})\s*$/) : null;

  return {
    ...baseDraft,
    alias:
      typeof method.value === 'string'
        ? method.value.replace(/\s*[•.]+\s*\d{4}\s*$/, '').trim()
        : '',
    cardNumber: `${baseDraft.cardNumber.slice(0, 12)}${last4Match?.[1] ?? baseDraft.cardNumber.slice(-4)}`,
    expiry:
      typeof method.caption === 'string'
        ? method.caption.match(/(\d{2}\/\d{2})/)?.[1] ?? baseDraft.expiry
        : baseDraft.expiry,
    holderName:
      method.kind === 'card' && typeof method.caption === 'string'
        ? method.caption.split('·')[0].trim()
        : baseDraft.holderName,
  };
}
