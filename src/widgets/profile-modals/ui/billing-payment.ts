import { getBalanceState, persistBalanceState } from 'features/balance';
import {
  attachMaskedInput,
  clearFieldError,
  clearFormState,
  formatProfileCardExpiry,
  getNamedFormValue,
  getModalStep,
  setFieldError,
  setFormMessage,
  setStepState,
  validateConfirmationCode,
  validateRequired,
  watchTwoStepFormState,
} from 'features/profile/lib/form';
import { formatCardNumber } from 'shared/lib/payment-format';
import { validateCardCvv, validateCardExpiry, validateCardNumber } from 'shared/validators';
import { showProfileFeedback } from 'widgets/profile-feedback/ui/toast';

import type { InitProfileBillingSectionParams } from './billing-types';

export function initProfileBillingPaymentForm({
  closeModalById,
  onStateChange,
  refreshSubmitStates,
  signal,
  state,
}: InitProfileBillingSectionParams): void {
  const paymentForm = document.getElementById('profile-payment-form');
  if (!(paymentForm instanceof HTMLFormElement)) {
    return;
  }

  attachMaskedInput(paymentForm, 'cardNumber', formatCardNumber, signal);
  attachMaskedInput(paymentForm, 'expiryDate', formatProfileCardExpiry, signal);

  const cvvInput = paymentForm.elements.namedItem('cvv');
  if (cvvInput instanceof HTMLInputElement) {
    cvvInput.addEventListener('input', () => {
      cvvInput.value = cvvInput.value.replace(/\D/g, '').slice(0, 4);
      clearFieldError(paymentForm, 'cvv');
      setFormMessage(paymentForm, '[data-form-error]', '');
      refreshSubmitStates(state);
    }, { signal });
  }

  watchTwoStepFormState(paymentForm, signal, () => {
    const cardNumber = getNamedFormValue(paymentForm, 'cardNumber');
    const expiryDate = getNamedFormValue(paymentForm, 'expiryDate');
    const holderName = getNamedFormValue(paymentForm, 'holderName');
    const cvv = getNamedFormValue(paymentForm, 'cvv');
    return Boolean(cardNumber || expiryDate || holderName || cvv);
  });

  paymentForm.querySelector('[data-resend-code]')?.addEventListener('click', () => {
    showProfileFeedback({
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
        [
          'expiryDate',
          validateCardExpiry(expiryDate, {
            requireFuture: true,
            invalidFormatMessage: 'Введите срок действия в формате MM / YY',
            invalidMonthMessage: 'Укажите корректный месяц',
            expiredMessage: 'Срок действия карты уже истек',
          }),
        ],
        ['holderName', validateRequired(holderName, 'Введите имя держателя карты')],
        [
          'cvv',
          validateCardCvv(cvv, {
            message: 'Введите CVV из 3 или 4 цифр',
            maxLength: 4,
          }),
        ],
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

      paymentForm.dataset.pendingValue = `Банковская карта •••• ${digits.slice(-4)}`;
      setStepState(paymentForm, 'confirm', `•••• ${digits.slice(-4)}`);
      refreshSubmitStates(state);
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
    const balanceState = getBalanceState();
    const hasMethod = balanceState.paymentMethods.some(
      (method) => method.value === state.cardMasked,
    );
    if (!hasMethod && state.cardMasked) {
      balanceState.paymentMethods = [
        {
          id: `payment_profile_${Date.now()}`,
          kind: 'card',
          value: state.cardMasked,
          caption: 'Основной способ оплаты',
          badge: 'Личная',
        },
        ...balanceState.paymentMethods,
      ];
    }
    balanceState.paymentMethod = state.cardMasked || '';
    persistBalanceState(balanceState);
    onStateChange(state);
    showProfileFeedback({
      title: 'Карта сохранена',
      description: 'Новый способ оплаты добавлен и будет использоваться для следующих пополнений.',
    });
    closeModalById('profile-payment-modal');
  }, { signal });
}
