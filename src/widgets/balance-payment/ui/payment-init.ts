import {
  type ToastController,
} from 'features/balance/lib/modal';
import {
  closeBalanceSelect,
  createPaymentMethodOption,
  openBalanceSelect,
  populatePaymentAddForm,
  readPaymentMethodDraft,
  resetPaymentAddForm,
  sanitizePaymentAddInput,
  syncBalanceSelectValue,
  syncPaymentAddFormKind,
  validatePaymentMethodDraft,
} from 'features/balance/lib/payment';
import { createFallbackPaymentMethodDraft } from 'features/balance/lib/payment-draft';
import type {
  BalanceDashboardState,
  PaymentMethodOption,
} from 'features/balance/model/types';
import { closeModal, openModal } from 'shared/ui/modal/modal';
import { closeOpenBalanceSelects } from './payment-sync';

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

function focusPaymentAddField(modal: HTMLElement): void {
  window.setTimeout(() => {
    modal
      .querySelector<HTMLInputElement>('input[name="cardNumber"]')
      ?.focus();
  }, 40);
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
  const paymentAddTitle = paymentAddModal?.querySelector<HTMLElement>(
    '[data-balance-payment-add-title]',
  );
  const paymentAddSubmitButton = paymentAddForm?.querySelector<HTMLButtonElement>(
    '[data-balance-payment-add-submit]',
  );

  const syncPaymentAddMode = (mode: 'create' | 'edit'): void => {
    if (paymentAddTitle) {
      paymentAddTitle.textContent =
        mode === 'edit'
          ? 'Редактировать способ оплаты'
          : 'Добавить способ оплаты';
    }

    if (paymentAddSubmitButton) {
      paymentAddSubmitButton.textContent =
        mode === 'edit' ? 'Сохранить' : 'Добавить';
    }
  };

  const openPaymentAddModal = (method?: PaymentMethodOption): void => {
    if (paymentModal instanceof HTMLElement) {
      closeModal(paymentModal);
    }

    if (!(paymentAddModal instanceof HTMLElement) || !paymentAddForm) {
      return;
    }

    if (method) {
      paymentAddForm.dataset.editingMethodId = method.id;
      populatePaymentAddForm(
        paymentAddForm,
        method.draft ?? createFallbackPaymentMethodDraft(method),
      );
      syncPaymentAddMode('edit');
    } else {
      delete paymentAddForm.dataset.editingMethodId;
      resetPaymentAddForm(paymentAddForm);
      syncPaymentAddMode('create');
    }

    openModal(paymentAddModal);
    focusPaymentAddField(paymentAddModal);
  };

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
          openPaymentAddModal();
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
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const actionButton = target.closest<HTMLElement>(
          '[data-payment-method-action]',
        );
        if (!actionButton) {
          return;
        }

        const methodId = actionButton.dataset.methodId ?? '';
        const method = state.paymentMethods.find((item) => item.id === methodId);
        if (!method) {
          return;
        }

        if (actionButton.dataset.paymentMethodAction === 'edit') {
          openPaymentAddModal(method);
          return;
        }

        state.paymentMethods = state.paymentMethods.filter(
          (item) => item.id !== method.id,
        );

        if (state.paymentMethod === method.value) {
          state.paymentMethod = state.paymentMethods[0]?.value ?? '';
        }

        commitState();
        toast.show(
          'Способ оплаты удален',
          `${method.value} больше не используется в кабинете.`,
        );
      },
      { signal },
    );

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
          : '';

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
  syncPaymentAddMode('create');

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
      const editingMethodId = paymentAddForm.dataset.editingMethodId;

      if (errorNode) {
        errorNode.textContent = '';
      }

      if (validationError) {
        if (errorNode) {
          errorNode.textContent = validationError;
        }
        return;
      }

      const previousMethod = editingMethodId
        ? state.paymentMethods.find((item) => item.id === editingMethodId)
        : null;
      const method = createPaymentMethodOption(
        draft,
        editingMethodId || undefined,
      );

      if (previousMethod) {
        state.paymentMethods = state.paymentMethods.map((item) =>
          item.id === editingMethodId ? method : item,
        );

        if (state.paymentMethod === previousMethod.value) {
          state.paymentMethod = method.value;
        }
      } else {
        state.paymentMethods = [method, ...state.paymentMethods];
        state.paymentMethod = method.value;
      }

      commitState();
      resetPaymentAddForm(paymentAddForm);
      delete paymentAddForm.dataset.editingMethodId;
      syncPaymentAddMode('create');
      closeModal(paymentAddModal);

      if (paymentModal instanceof HTMLElement) {
        openModal(paymentModal);
      }

      toast.show(
        previousMethod
          ? 'Способ оплаты обновлен'
          : 'Способ оплаты добавлен',
        previousMethod
          ? `${method.value} обновлен и готов к использованию.`
          : `${method.value} добавлен в список и выбран основным.`,
      );
    },
    { signal },
  );
}
