import type { BalanceDashboardState } from 'features/balance/model/types';
import { closeBalanceSelect } from 'features/balance/lib/payment';
import { createPaymentMethodNode } from './payment-methods';

export function closeOpenBalanceSelects(): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-select].is-open')
    .forEach((select) => {
      closeBalanceSelect(select);
    });
}

export function syncBalancePaymentWidget(
  state: BalanceDashboardState,
): void {
  const methodsNode = document.querySelector<HTMLElement>(
    '[data-balance-payment-methods]',
  );

  if (methodsNode) {
    if (!state.paymentMethods.length) {
      const emptyNode = document.createElement('p');
      emptyNode.className = 'balance-modal__hint';
      emptyNode.textContent = 'Способы оплаты еще не добавлены.';
      methodsNode.replaceChildren(emptyNode);
    } else {
      methodsNode.replaceChildren(
        ...state.paymentMethods.map((method) =>
          createPaymentMethodNode(method, state.paymentMethod),
        ),
      );
    }
  }

  const paymentInputs = document.querySelectorAll<HTMLInputElement>(
    '#balance-payment-form input[name="method"]',
  );
  if (!paymentInputs.length) {
    return;
  }

  let hasMatch = false;

  paymentInputs.forEach((input) => {
    const isCurrent = input.value === state.paymentMethod;
    input.checked = isCurrent;
    hasMatch = hasMatch || isCurrent;
  });

  if (!hasMatch) {
    const fallback = paymentInputs[0];

    if (fallback) {
      fallback.checked = true;
    }
  }
}
