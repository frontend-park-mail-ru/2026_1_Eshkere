import { formatPrice } from 'shared/lib/format';
import { formatCardNumber } from 'shared/lib/payment-format';
import {
  parseAmountInput,
  validateAmountRange,
  validateCardCvv,
  validateCardExpiry,
  validateCardNumber,
} from 'shared/validators';
import { getBalanceState, persistBalanceState } from 'features/balance';
import {
  attachMaskedInput,
  clearFieldError,
  clearFormState,
  formatProfileCardExpiry,
  formatTopUpDate,
  getModalStep,
  setFieldError,
  setFormMessage,
  setStepState,
  setSubmitEnabled,
  validateConfirmationCode,
  validateRequired,
  watchFormState,
} from 'features/profile/lib/form';
import type {
  ProfileState,
  TariffKey,
  TariffMeta,
} from 'features/profile/model/types';
import { showProfileFeedback } from 'widgets/profile-feedback/ui/toast';

interface InitProfileBillingModalsParams {
  closeModalById: (id: string) => void;
  getTariffMeta: (tariffKey: TariffKey) => TariffMeta;
  onStateChange: (state: ProfileState) => void;
  refreshSubmitStates: (state: ProfileState) => void;
  signal: AbortSignal;
  state: ProfileState;
}

export function initProfileBillingModals({
  closeModalById,
  getTariffMeta,
  onStateChange,
  refreshSubmitStates,
  signal,
  state,
}: InitProfileBillingModalsParams): void {
  const paymentForm = document.getElementById('profile-payment-form');
  const topUpForm = document.getElementById('profile-topup-form');
  const tariffForm = document.getElementById('profile-tariff-form');

  if (paymentForm instanceof HTMLFormElement) {
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

    watchFormState(paymentForm, signal, () => {
      const cardNumber = String((paymentForm.elements.namedItem('cardNumber') as HTMLInputElement)?.value || '').trim();
      const expiryDate = String((paymentForm.elements.namedItem('expiryDate') as HTMLInputElement)?.value || '').trim();
      const holderName = String((paymentForm.elements.namedItem('holderName') as HTMLInputElement)?.value || '').trim();
      const cvv = String((paymentForm.elements.namedItem('cvv') as HTMLInputElement)?.value || '').trim();
      const code = String((paymentForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
      return getModalStep(paymentForm) === 'input' ? Boolean(cardNumber || expiryDate || holderName || cvv) : Boolean(code);
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

      state.balanceValue += amount;
      state.lastTopUp = formatTopUpDate(amount);
      const balanceState = getBalanceState();
      balanceState.balanceValue = state.balanceValue;
      balanceState.paymentMethod = state.cardMasked || '';
      persistBalanceState(balanceState);
      onStateChange(state);
      showProfileFeedback({
        title: 'Баланс пополнен',
        description: `На счет зачислено ${formatPrice(amount)}. Средства уже доступны для запуска кампаний.`,
      });
      closeModalById('profile-topup-modal');
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
      onStateChange(state);
      showProfileFeedback({
        title: 'Тариф обновлен',
        description: `Теперь активен тариф ${nextMeta.label}. Новые лимиты кабинета уже применены.`,
      });
      closeModalById('profile-tariff-modal');
    }, { signal });
  }
}
