import { formatPrice } from 'shared/lib/format';
import { parseAmountInput, validateMinAmount } from 'shared/validators';
import { openTopupModal, type ToastController } from 'features/balance/lib/modal';
import { topUpBalance } from 'features/balance/api/topup';
import type { BalanceDashboardState } from 'features/balance/model/types';
import { closeModal, openModal } from 'shared/ui/modal/modal';
import { syncBalanceDashboardWidget } from './dashboard-render';

interface InitBalanceDashboardWidgetParams {
  autopayModal: HTMLElement | null;
  commitState: () => void;
  signal: AbortSignal;
  state: BalanceDashboardState;
  toast: ToastController;
  topupForm: HTMLFormElement | null;
  topupModal: HTMLElement | null;
}

export function initBalanceDashboardWidget({
  autopayModal,
  commitState,
  signal,
  state,
  toast,
  topupForm,
  topupModal,
}: InitBalanceDashboardWidgetParams): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-amount]')
    .forEach((node) => {
      node.addEventListener(
        'click',
        () => {
          const amount = Number(node.dataset.balanceAmount || '0');
          if (amount > 0) {
            state.selectedAmount = amount;
            commitState();

            if (topupModal instanceof HTMLElement) {
              openTopupModal(topupModal);
            }
          }
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-balance-open-topup]')
    .forEach((node) => {
      node.addEventListener(
        'click',
        () => {
          if (topupModal instanceof HTMLElement) {
            openTopupModal(topupModal);
          }
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>(
      '[data-balance-open-topup-custom], [data-balance-modal-custom]',
    )
    .forEach((node) => {
      node.addEventListener(
        'click',
        () => {
          if (topupModal instanceof HTMLElement) {
            openTopupModal(topupModal, true);
          }
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-balance-modal-amount]')
    .forEach((node) => {
      node.addEventListener(
        'click',
        () => {
          const amount = Number(node.dataset.balanceModalAmount || '0');
          if (amount > 0) {
            state.selectedAmount = amount;
            commitState();
          }
        },
        { signal },
      );
    });

  document
    .querySelector<HTMLElement>('[data-balance-recommendations]')
    ?.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const recommendation = target.closest<HTMLElement>(
          '[data-balance-recommendation]',
        );
        if (!recommendation) {
          return;
        }

        const action = recommendation.dataset.balanceRecommendation;
        if (action === 'topup' && topupModal instanceof HTMLElement) {
          openTopupModal(topupModal);
        }

        if (action === 'autopay' && autopayModal instanceof HTMLElement) {
          openModal(autopayModal);
        }
      },
      { signal },
    );

  if (!topupForm || !(topupModal instanceof HTMLElement)) {
    return;
  }

  topupForm.addEventListener(
    'input',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.name !== 'amount') {
        return;
      }

      const nextAmount = parseAmountInput(target.value);
      state.selectedAmount = nextAmount > 0 ? nextAmount : 0;
      syncBalanceDashboardWidget(state);
    },
    { signal },
  );

  topupForm.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      const amountInput = topupForm.elements.namedItem('amount');
      const errorNode = topupForm.querySelector<HTMLElement>(
        '[data-balance-topup-error]',
      );
      const amount =
        amountInput instanceof HTMLInputElement
          ? parseAmountInput(amountInput.value)
          : 0;

      if (errorNode) {
        errorNode.textContent = '';
      }

      const amountError = validateMinAmount(
        amount,
        1000,
        'Минимальная сумма пополнения — 1 000 ₽.',
      );

      if (amountError) {
        if (errorNode) {
          errorNode.textContent = amountError;
        }
        return;
      }

      if (!state.paymentMethod) {
        if (errorNode) {
          errorNode.textContent =
            'Сначала добавьте способ оплаты в настройках баланса.';
        }
        return;
      }

      state.selectedAmount = amount;

      topUpBalance(amount)
        .then((result) => {
          state.balanceValue = result.balance;
          commitState();
        })
        .catch(() => {
          state.balanceValue += amount;
          commitState();
        });

      state.operations = [
        {
          id: `topup_${Date.now()}`,
          title: 'Пополнение с карты',
          date: new Date().toISOString(),
          amount,
          status: 'Успешно',
          tone: 'success',
          details: `Пополнение через ${state.paymentMethod}`,
        },
        ...state.operations,
      ];

      commitState();
      closeModal(topupModal);
      toast.show(
        'Баланс пополнен',
        `На счет зачислено ${formatPrice(amount)}. Средства уже доступны для запуска кампаний.`,
      );
    },
    { signal },
  );
}
