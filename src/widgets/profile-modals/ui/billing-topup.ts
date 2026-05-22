import { createPayment } from 'features/balance/api/create-payment';
import {
  clearFieldError,
  clearFormState,
  setFieldError,
  setFormMessage,
  setSubmitEnabled,
  watchFormState,
} from 'features/profile/lib/form';
import { parseAmountInput, validateAmountRange } from 'shared/validators';

import type { InitProfileBillingSectionParams } from './billing-types';

export function initProfileBillingTopUpForm({
  signal,
}: InitProfileBillingSectionParams): void {
  const topUpForm = document.getElementById('profile-topup-form');
  if (!(topUpForm instanceof HTMLFormElement)) {
    return;
  }

  watchFormState(topUpForm, signal, () => {
    const amount = String(
      (topUpForm.elements.namedItem('amount') as HTMLInputElement)?.value || '',
    ).trim();
    return Boolean(amount);
  });

  topUpForm
    .querySelectorAll<HTMLButtonElement>('[data-quick-amount]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const amountInput = topUpForm.elements.namedItem('amount');
          if (amountInput instanceof HTMLInputElement) {
            amountInput.value = button.dataset.quickAmount || '';
          }
          clearFieldError(topUpForm, 'amount');
          setFormMessage(topUpForm, '[data-form-error]', '');
          setSubmitEnabled(topUpForm, true);
        },
        { signal },
      );
    });

  topUpForm.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      clearFormState(topUpForm);

      const formData = new FormData(topUpForm);
      const amountValue = String(formData.get('amount') || '');
      const amountError = validateAmountRange(amountValue, {
        requiredMessage: 'Введите сумму пополнения',
        min: 1000,
        minMessage: 'Минимальная сумма пополнения 1 000 ₽',
        max: 500000,
        maxMessage: 'Максимальная сумма пополнения 500 000 ₽',
      });

      if (amountError) {
        setFieldError(topUpForm, 'amount', amountError);
        setFormMessage(
          topUpForm,
          '[data-form-error]',
          'Укажите корректную сумму пополнения',
        );
        return;
      }

      const amount = parseAmountInput(amountValue);
      const submitButton =
        topUpForm.querySelector<HTMLButtonElement>('[type="submit"]');

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Переходим к оплате…';
      }

      createPayment(amount)
        .then(({ payment_url }) => {
          window.location.href = payment_url;
        })
        .catch(() => {
          setFormMessage(
            topUpForm,
            '[data-form-error]',
            'Не удалось создать платёж. Попробуйте позже.',
          );
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Перейти к оплате';
          }
        });
    },
    { signal },
  );
}
