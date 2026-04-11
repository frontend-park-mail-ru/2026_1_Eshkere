import {
  type ToastController,
} from 'features/balance/lib/modal';
import {
  closeBalanceSelect,
  createPaymentMethodOption,
  openBalanceSelect,
  readPaymentMethodDraft,
  resetPaymentAddForm,
  sanitizePaymentAddInput,
  syncBalanceSelectValue,
  syncPaymentAddFormKind,
  validatePaymentMethodDraft,
} from 'features/balance/lib/payment';
import { DEFAULT_PAYMENT_METHOD } from 'features/balance/model/state';
import type {
  BalanceDashboardState,
  PaymentMethodOption,
} from 'features/balance/model/types';
import { closeModal, openModal } from 'shared/ui/modal/modal';

interface InitBalancePaymentWidgetParams {
  commitState: () => void;
  paymentAddForm: HTMLFormElement | null;
  paymentAddModal: HTMLElement | null;
  paymentForm: HTMLFormElement | null;
  paymentModal: HTMLElement | null;
  signal: AbortSignal;
  state: BalanceDashboardState;
  toast: ToastController;
}

function createPaymentMethodNode(
  method: PaymentMethodOption,
  selectedValue: string,
): HTMLElement {
  const label = document.createElement('label');
  label.className = 'balance-modal__method';

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'method';
  input.value = method.value;
  input.checked = method.value === selectedValue;

  const ui = document.createElement('span');
  ui.className = 'balance-modal__method-ui';

  const main = document.createElement('span');
  main.className = 'balance-modal__method-main';

  const title = document.createElement('strong');
  title.className = 'balance-modal__method-title';
  title.textContent = method.value;

  const caption = document.createElement('span');
  caption.className = 'balance-modal__method-caption';
  caption.textContent = method.caption;

  const note = document.createElement('span');
  note.className = 'balance-modal__method-note';
  note.textContent = method.note;

  main.append(title, caption);
  ui.append(main, note);
  label.append(input, ui);
  return label;
}

function focusPaymentAddField(modal: HTMLElement): void {
  window.setTimeout(() => {
    modal
      .querySelector<HTMLInputElement>('input[name="cardNumber"]')
      ?.focus();
  }, 40);
}

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
    methodsNode.replaceChildren(
      ...state.paymentMethods.map((method) =>
        createPaymentMethodNode(method, state.paymentMethod),
      ),
    );
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
    const fallback =
      [...paymentInputs].find(
        (input) => input.value === DEFAULT_PAYMENT_METHOD,
      ) ?? paymentInputs[0];

    if (fallback) {
      fallback.checked = true;
    }
  }
}

export function initBalancePaymentWidget({
  commitState,
  paymentAddForm,
  paymentAddModal,
  paymentForm,
  paymentModal,
  signal,
  state,
  toast,
}: InitBalancePaymentWidgetParams): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-open-payment]')
    .forEach((node) => {
      node.addEventListener(
        'click',
        () => {
          if (paymentModal instanceof HTMLElement) {
            openModal(paymentModal);
          }
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-balance-open-payment-add]')
    .forEach((node) => {
      node.addEventListener(
        'click',
        () => {
          if (paymentModal instanceof HTMLElement) {
            closeModal(paymentModal);
          }

          if (!(paymentAddModal instanceof HTMLElement) || !paymentAddForm) {
            return;
          }

          resetPaymentAddForm(paymentAddForm);
          openModal(paymentAddModal);
          focusPaymentAddField(paymentAddModal);
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-balance-select-trigger]')
    .forEach((trigger) => {
      trigger.addEventListener(
        'click',
        () => {
          const select = trigger.closest<HTMLElement>('[data-balance-select]');
          if (!select) {
            return;
          }

          if (select.classList.contains('is-open')) {
            closeBalanceSelect(select);
          } else {
            openBalanceSelect(select);
          }
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-balance-select-option]')
    .forEach((option) => {
      option.addEventListener(
        'click',
        () => {
          const select = option.closest<HTMLElement>('[data-balance-select]');
          const value = option.dataset.value || 'card';
          const label = option.dataset.label || option.textContent?.trim() || '';

          if (select) {
            syncBalanceSelectValue(select, value, label);
            closeBalanceSelect(select);
          }

          if (paymentAddForm) {
            syncPaymentAddFormKind(paymentAddForm);
          }
        },
        { signal },
      );
    });

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-balance-select]')) {
        return;
      }

      closeOpenBalanceSelects();
    },
    { signal },
  );

  if (paymentForm && paymentModal instanceof HTMLElement) {
    paymentForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        const methodInput = paymentForm.querySelector<HTMLInputElement>(
          'input[name="method"]:checked',
        );
        const errorNode = paymentForm.querySelector<HTMLElement>(
          '[data-balance-payment-error]',
        );
        const nextMethod = methodInput?.value?.trim() ?? '';

        if (errorNode) {
          errorNode.textContent = '';
        }

        if (!nextMethod) {
          if (errorNode) {
            errorNode.textContent =
              'Выберите способ оплаты, который станет основным.';
          }
          return;
        }

        state.paymentMethod = state.paymentMethods.some(
          (method) => method.value === nextMethod,
        )
          ? nextMethod
          : DEFAULT_PAYMENT_METHOD;

        commitState();
        closeModal(paymentModal);
        toast.show(
          'Способ оплаты обновлен',
          `${state.paymentMethod} теперь используется для пополнений и автоплатежа.`,
        );
      },
      { signal },
    );
  }

  if (!paymentAddForm || !(paymentAddModal instanceof HTMLElement)) {
    return;
  }

  syncPaymentAddFormKind(paymentAddForm);

  paymentAddForm.addEventListener(
    'input',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      sanitizePaymentAddInput(target);
    },
    { signal },
  );

  paymentAddForm.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      const errorNode = paymentAddForm.querySelector<HTMLElement>(
        '[data-balance-payment-add-error]',
      );
      const draft = readPaymentMethodDraft(paymentAddForm);
      const validationError = validatePaymentMethodDraft(draft);

      if (errorNode) {
        errorNode.textContent = '';
      }

      if (validationError) {
        if (errorNode) {
          errorNode.textContent = validationError;
        }
        return;
      }

      const method = createPaymentMethodOption(draft);

      state.paymentMethods = [method, ...state.paymentMethods];
      state.paymentMethod = method.value;

      commitState();
      resetPaymentAddForm(paymentAddForm);
      closeModal(paymentAddModal);

      if (paymentModal instanceof HTMLElement) {
        openModal(paymentModal);
      }

      toast.show(
        'Способ оплаты добавлен',
        `${method.value} добавлен в список и выбран основным.`,
      );
    },
    { signal },
  );
}
