import { parseAmountInput, validateMinAmount } from 'shared/validators';
import { openTopupModal, type ToastController } from 'features/balance/lib/modal';
import { createPayment } from 'features/balance/api/create-payment';
import type { BalanceDashboardState } from 'features/balance/model/types';
import { markMotionUpdated } from 'shared/lib/animations';
import { closeModal, openModal } from 'shared/ui/modal/modal';
import { dismissAlert, syncBalanceDashboardWidget } from './dashboard-render';

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
            markMotionUpdated(node);
            commitState();

            if (topupModal instanceof HTMLElement) {
              markMotionUpdated(topupModal, 'motion-modal', 220);
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
            markMotionUpdated(node);
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

  document
    .querySelectorAll<HTMLElement>('[data-balance-alert-dismiss]')
    .forEach((btn) => {
      btn.addEventListener(
        'click',
        () => {
          const level = btn.dataset.balanceAlertDismiss;
          if (!level) return;
          dismissAlert(level);
          const alertEl = document.querySelector<HTMLElement>(
            `[data-balance-alert="${level}"]`,
          );
          if (alertEl) alertEl.hidden = true;
        },
        { signal },
      );
    });

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
      const submitButton = topupForm.querySelector<HTMLButtonElement>(
        '[type="submit"]',
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
          markMotionUpdated(errorNode, 'motion-invalid', 520);
        }
        markMotionUpdated(topupForm, 'motion-invalid', 520);
        return;
      }

      state.selectedAmount = amount;

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Переходим к оплате…';
      }

      createPayment(amount)
        .then(({ payment_url }) => {
          window.location.href = payment_url;
        })
        .catch(() => {
          if (errorNode) {
            errorNode.textContent =
              'Не удалось создать платёж. Попробуйте позже.';
            markMotionUpdated(errorNode, 'motion-invalid', 520);
          }
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Перейти к оплате';
          }
        });
    },
    { signal },
  );
}
