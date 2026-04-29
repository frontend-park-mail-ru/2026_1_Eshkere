import { getBalanceState, persistBalanceState, topUpBalance } from 'features/balance';
import {
  clearFieldError,
  clearFormState,
  formatTopUpDate,
  setFieldError,
  setFormMessage,
  setSubmitEnabled,
  watchFormState,
} from 'features/profile/lib/form';
import { formatPrice } from 'shared/lib/format';
import { parseAmountInput, validateAmountRange } from 'shared/validators';
import { showProfileFeedback } from 'shared/lib/toast';

import type { InitProfileBillingSectionParams } from './billing-types';

export function initProfileBillingTopUpForm({
  closeModalById,
  onStateChange,
  signal,
  state,
}: InitProfileBillingSectionParams): void {
  const topUpForm = document.getElementById('profile-topup-form');
  if (!(topUpForm instanceof HTMLFormElement)) {
    return;
  }

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
    const amountError = validateAmountRange(amountValue, {
      requiredMessage: 'Введите сумму пополнения',
      min: 100,
      minMessage: 'Минимальная сумма пополнения 100 ₽',
      max: 500000,
      maxMessage: 'Максимальная сумма пополнения 500 000 ₽',
    });

    if (amountError) {
      setFieldError(topUpForm, 'amount', amountError);
      setFormMessage(topUpForm, '[data-form-error]', 'Укажите корректную сумму пополнения');
      return;
    }

    const amount = parseAmountInput(amountValue);
    if (amount > 200000) {
      setFormMessage(topUpForm, '[data-form-error]', 'Суммы выше 200 000 ₽ требуют ручного подтверждения менеджером');
      return;
    }

    const applyTopUp = (newBalance: number): void => {
      state.balanceValue = newBalance;
      state.lastTopUp = formatTopUpDate(amount);
      const balanceState = getBalanceState();
      balanceState.balanceValue = newBalance;
      balanceState.paymentMethod = state.cardMasked || '';
      persistBalanceState(balanceState);
      onStateChange(state);
      showProfileFeedback({
        title: 'Баланс пополнен',
        description: `На счет зачислено ${formatPrice(amount)}. Средства уже доступны для запуска кампаний.`,
      });
      closeModalById('profile-topup-modal');
    };

    topUpBalance(amount)
      .then((result) => {
        applyTopUp(result.balance);
      })
      .catch(() => {
        applyTopUp(state.balanceValue + amount);
      });
  }, { signal });
}
