import './balance.scss';
import 'shared/ui/modal/modal';
import { formatPrice } from 'shared/lib/format';
import { renderTemplate } from 'shared/lib/render';
import {
  exportOperationsToCsv,
  getFilteredOperations,
} from 'pages/balance/lib/history';
import {
  bindModalShell,
  closeModal,
  createToastController,
  openModal,
  openTopupModal,
} from 'pages/balance/lib/modal';
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
} from 'pages/balance/lib/payment';
import {
  renderHistoryLog,
  syncBalanceView,
  syncHistoryControls,
} from 'pages/balance/lib/view';
import {
  DEFAULT_PAYMENT_METHOD,
  getBalanceState,
  persistBalanceState,
} from 'pages/balance/model/state';
import type {
  BalanceHistoryFilter,
  BalanceHistoryState,
} from 'pages/balance/model/types';
import balanceTemplate from './balance.hbs';

interface BalancePageElements {
  autopayForm: HTMLFormElement | null;
  autopayModal: HTMLElement | null;
  historyModal: HTMLElement | null;
  paymentAddForm: HTMLFormElement | null;
  paymentAddModal: HTMLElement | null;
  paymentForm: HTMLFormElement | null;
  paymentModal: HTMLElement | null;
  topupForm: HTMLFormElement | null;
  topupModal: HTMLElement | null;
}

let balancePageLifecycleController: AbortController | null = null;

function getPageElements(): BalancePageElements {
  return {
    topupModal: document.getElementById('balance-topup-modal'),
    paymentModal: document.getElementById('balance-payment-modal'),
    paymentAddModal: document.getElementById('balance-payment-add-modal'),
    historyModal: document.getElementById('balance-history-modal'),
    autopayModal: document.getElementById('balance-autopay-modal'),
    topupForm: document.getElementById(
      'balance-topup-form',
    ) as HTMLFormElement | null,
    paymentForm: document.getElementById(
      'balance-payment-form',
    ) as HTMLFormElement | null,
    paymentAddForm: document.getElementById(
      'balance-payment-add-form',
    ) as HTMLFormElement | null,
    autopayForm: document.getElementById(
      'balance-autopay-form',
    ) as HTMLFormElement | null,
  };
}

function closeAllModals(modals: Array<HTMLElement | null>): void {
  modals.forEach((modal) => {
    if (modal instanceof HTMLElement) {
      closeModal(modal);
    }
  });
}

function closeOpenSelects(): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-select].is-open')
    .forEach((select) => {
      closeBalanceSelect(select);
    });
}

function bindModalOpeners(
  selector: string,
  modal: HTMLElement | null,
  signal: AbortSignal,
  open: (node: HTMLElement) => void = openModal,
): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.addEventListener(
      'click',
      () => {
        if (modal instanceof HTMLElement) {
          open(modal);
        }
      },
      { signal },
    );
  });
}

function focusPaymentAddField(modal: HTMLElement): void {
  window.setTimeout(() => {
    modal
      .querySelector<HTMLInputElement>('input[name="cardNumber"]')
      ?.focus();
  }, 40);
}

function isOpenedModal(modal: HTMLElement | null): modal is HTMLElement {
  return (
    modal instanceof HTMLElement && modal.getAttribute('aria-hidden') === 'false'
  );
}

export async function renderBalancePage(): Promise<string> {
  return renderTemplate(balanceTemplate, {});
}

export function Balance(): void | VoidFunction {
  if (balancePageLifecycleController) {
    balancePageLifecycleController.abort();
  }

  if (!document.querySelector('.balance-page')) {
    return;
  }

  const controller = new AbortController();
  balancePageLifecycleController = controller;

  const { signal } = controller;
  const state = getBalanceState();
  const historyState: BalanceHistoryState = {
    filter: 'all',
    query: '',
  };
  const toast = createToastController();
  const {
    topupModal,
    paymentModal,
    paymentAddModal,
    historyModal,
    autopayModal,
    topupForm,
    paymentForm,
    paymentAddForm,
    autopayForm,
  } = getPageElements();

  const syncState = (): void => {
    persistBalanceState(state);
    syncBalanceView(state, historyState);
  };

  const syncHistory = (): void => {
    syncHistoryControls(historyState);
    renderHistoryLog(state, historyState);
  };

  const selectAmount = (amount: number): void => {
    state.selectedAmount = amount;
    syncState();
  };

  const logoutButton = document.getElementById('logout-button');
  const navbarLogoutButton = document.getElementById('navbar-logout-button');

  if (logoutButton && navbarLogoutButton) {
    logoutButton.addEventListener(
      'click',
      () => {
        navbarLogoutButton.click();
      },
      { signal },
    );
  }

  toast.hide();
  closeAllModals([
    topupModal,
    paymentModal,
    paymentAddModal,
    historyModal,
    autopayModal,
  ]);

  persistBalanceState(state);
  syncBalanceView(state, historyState);

  document
    .querySelectorAll<HTMLElement>('[data-balance-amount]')
    .forEach((node) => {
      node.addEventListener(
        'click',
        () => {
          const amount = Number(node.dataset.balanceAmount || '0');
          if (amount > 0) {
            selectAmount(amount);
          }
        },
        { signal },
      );
    });

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const modalAmountButton = target.closest<HTMLElement>(
        '[data-balance-modal-amount]',
      );
      if (modalAmountButton) {
        const amount = Number(
          modalAmountButton.dataset.balanceModalAmount || '0',
        );
        if (amount > 0) {
          selectAmount(amount);
        }
        return;
      }

      const recommendation = target.closest<HTMLElement>(
        '[data-balance-recommendation]',
      );
      if (recommendation) {
        const action = recommendation.dataset.balanceRecommendation;

        if (action === 'topup' && topupModal instanceof HTMLElement) {
          openTopupModal(topupModal);
        }

        if (action === 'autopay' && autopayModal instanceof HTMLElement) {
          openModal(autopayModal);
        }

        return;
      }

      if (target.closest('[data-balance-open-topup-custom]')) {
        if (topupModal instanceof HTMLElement) {
          openTopupModal(topupModal, true);
        }
        return;
      }

      if (target.closest('[data-balance-modal-custom]')) {
        if (topupModal instanceof HTMLElement) {
          openTopupModal(topupModal, true);
        }
        return;
      }

      if (target.closest('[data-balance-open-history]')) {
        if (historyModal instanceof HTMLElement) {
          openModal(historyModal);
        }
        return;
      }

      const selectTrigger = target.closest<HTMLElement>(
        '[data-balance-select-trigger]',
      );
      if (selectTrigger) {
        const select = selectTrigger.closest<HTMLElement>(
          '[data-balance-select]',
        );
        if (!select) {
          return;
        }

        if (select.classList.contains('is-open')) {
          closeBalanceSelect(select);
        } else {
          openBalanceSelect(select);
        }
        return;
      }

      const selectOption = target.closest<HTMLElement>(
        '[data-balance-select-option]',
      );
      if (selectOption) {
        const select = selectOption.closest<HTMLElement>(
          '[data-balance-select]',
        );
        const value = selectOption.dataset.value || 'card';
        const label =
          selectOption.dataset.label || selectOption.textContent?.trim() || '';

        if (select) {
          syncBalanceSelectValue(select, value, label);
          closeBalanceSelect(select);
        }

        if (paymentAddForm) {
          syncPaymentAddFormKind(paymentAddForm);
        }

        return;
      }

      if (!target.closest('[data-balance-select]')) {
        closeOpenSelects();
      }
    },
    { signal },
  );

  bindModalOpeners('[data-balance-open-topup]', topupModal, signal, (modal) =>
    openTopupModal(modal),
  );
  bindModalOpeners('[data-balance-open-autopay]', autopayModal, signal);
  bindModalOpeners('[data-balance-open-payment]', paymentModal, signal);

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
    .querySelectorAll<HTMLElement>('[data-balance-history-filter]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const nextFilter = button.dataset.balanceHistoryFilter as
            | BalanceHistoryFilter
            | undefined;

          historyState.filter = nextFilter || 'all';
          syncHistory();
        },
        { signal },
      );
    });

  document
    .querySelector<HTMLInputElement>('[data-balance-history-search]')
    ?.addEventListener(
      'input',
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }

        historyState.query = target.value;
        renderHistoryLog(state, historyState);
      },
      { signal },
    );

  document
    .querySelector<HTMLElement>('[data-balance-history-export]')
    ?.addEventListener(
      'click',
      () => {
        const operations = getFilteredOperations(
          state.operations,
          historyState.filter,
          historyState.query,
        );

        if (!operations.length) {
          toast.show(
            'Нет данных для экспорта',
            'Измените фильтр или поиск, чтобы выгрузить операции.',
          );
          return;
        }

        exportOperationsToCsv(operations);
        toast.show(
          'CSV сформирован',
          'Файл с историей операций уже скачивается.',
        );
      },
      { signal },
    );

  [topupModal, historyModal, paymentModal, paymentAddModal, autopayModal]
    .filter((modal): modal is HTMLElement => modal instanceof HTMLElement)
    .forEach((modal) => {
      bindModalShell(modal, signal);
    });

  if (topupForm && topupModal instanceof HTMLElement) {
    topupForm.addEventListener(
      'input',
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.name !== 'amount') {
          return;
        }

        const nextAmount = Number(target.value || '0');
        state.selectedAmount = nextAmount > 0 ? nextAmount : 0;
        syncBalanceView(state, historyState);
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
            ? Number(amountInput.value || '0')
            : 0;

        if (errorNode) {
          errorNode.textContent = '';
        }

        if (!amount || amount < 1000) {
          if (errorNode) {
            errorNode.textContent = 'Минимальная сумма пополнения — 1 000 ₽.';
          }
          return;
        }

        state.selectedAmount = amount;
        state.balanceValue += amount;
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

        syncState();
        closeModal(topupModal);
        toast.show(
          'Баланс пополнен',
          `На счет зачислено ${formatPrice(amount)}. Средства уже доступны для запуска кампаний.`,
        );
      },
      { signal },
    );
  }

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

        syncState();
        closeModal(paymentModal);
        toast.show(
          'Способ оплаты обновлен',
          `${state.paymentMethod} теперь используется для пополнений и автоплатежа.`,
        );
      },
      { signal },
    );
  }

  if (paymentAddForm && paymentAddModal instanceof HTMLElement) {
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

        syncState();
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

  if (autopayForm && autopayModal instanceof HTMLElement) {
    autopayForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        const enabledInput = autopayForm.elements.namedItem('enabled');
        const thresholdInput = autopayForm.elements.namedItem('threshold');
        const limitInput = autopayForm.elements.namedItem('limit');
        const errorNode = autopayForm.querySelector<HTMLElement>(
          '[data-balance-autopay-error]',
        );
        const enabled =
          enabledInput instanceof HTMLInputElement
            ? enabledInput.checked
            : false;
        const threshold =
          thresholdInput instanceof HTMLInputElement
            ? Number(thresholdInput.value || '0')
            : 0;
        const limit =
          limitInput instanceof HTMLInputElement
            ? Number(limitInput.value || '0')
            : 0;

        if (errorNode) {
          errorNode.textContent = '';
        }

        if (enabled && threshold < 1000) {
          if (errorNode) {
            errorNode.textContent =
              'Порог автоплатежа должен быть не меньше 1 000 ₽.';
          }
          return;
        }

        if (enabled && limit < threshold) {
          if (errorNode) {
            errorNode.textContent =
              'Лимит автоплатежа не может быть меньше порога.';
          }
          return;
        }

        state.autopayEnabled = enabled;
        state.autopayThreshold = Math.max(
          1000,
          threshold || state.autopayThreshold,
        );
        state.autopayLimit = Math.max(
          state.autopayThreshold,
          limit || state.autopayLimit,
        );

        syncState();
        closeModal(autopayModal);
        toast.show(
          'Настройки автоплатежа сохранены',
          enabled
            ? `Пополнение включится при падении ниже ${formatPrice(state.autopayThreshold)}.`
            : 'Автопополнение отключено. Контролируйте остаток вручную.',
        );
      },
      { signal },
    );
  }

  document.querySelector('[data-balance-toast-close]')?.addEventListener(
    'click',
    () => {
      toast.hide();
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (isOpenedModal(topupModal)) {
        closeModal(topupModal);
      }

      if (isOpenedModal(historyModal)) {
        closeModal(historyModal);
      }

      if (isOpenedModal(paymentModal)) {
        closeModal(paymentModal);
      }

      if (isOpenedModal(paymentAddModal)) {
        closeModal(paymentAddModal);
      }

      closeOpenSelects();

      if (isOpenedModal(autopayModal)) {
        closeModal(autopayModal);
      }
    },
    { signal },
  );

  return () => {
    toast.hide();

    if (balancePageLifecycleController === controller) {
      balancePageLifecycleController = null;
    }

    controller.abort();
  };
}
