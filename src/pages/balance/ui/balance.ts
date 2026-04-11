import './balance.scss';
import 'shared/ui/modal/modal';
import { renderTemplate } from 'shared/lib/render';
import { createToastController } from 'features/balance/lib/modal';
import {
  getBalanceState,
  persistBalanceState,
} from 'features/balance/model/state';
import { bindModalShell, closeModal } from 'shared/ui/modal/modal';
import type { BalanceHistoryState } from 'features/balance/model/types';
import {
  initBalanceAutopayWidget,
  syncBalanceAutopayWidget,
} from 'widgets/balance-autopay';
import {
  initBalanceDashboardWidget,
  syncBalanceDashboardWidget,
} from 'widgets/balance-dashboard';
import {
  initBalanceHistoryWidget,
  syncBalanceHistoryWidget,
} from 'widgets/balance-history';
import {
  closeOpenBalanceSelects,
  initBalancePaymentWidget,
  syncBalancePaymentWidget,
} from 'widgets/balance-payment';
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

  const syncWidgets = (): void => {
    syncBalanceDashboardWidget(state);
    syncBalanceHistoryWidget(state, historyState);
    syncBalancePaymentWidget(state);
    syncBalanceAutopayWidget(state);
  };

  const commitState = (): void => {
    persistBalanceState(state);
    syncWidgets();
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
  commitState();

  initBalanceDashboardWidget({
    autopayModal,
    commitState,
    signal,
    state,
    toast,
    topupForm,
    topupModal,
  });
  initBalanceHistoryWidget({
    historyModal,
    historyState,
    signal,
    state,
    toast,
  });
  initBalancePaymentWidget({
    commitState,
    paymentAddForm,
    paymentAddModal,
    paymentForm,
    paymentModal,
    signal,
    state,
    toast,
  });
  initBalanceAutopayWidget({
    autopayForm,
    autopayModal,
    commitState,
    signal,
    state,
    toast,
  });

  [topupModal, historyModal, paymentModal, paymentAddModal, autopayModal]
    .filter((modal): modal is HTMLElement => modal instanceof HTMLElement)
    .forEach((modal) => {
      bindModalShell(modal, signal);
    });

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

      if (isOpenedModal(autopayModal)) {
        closeModal(autopayModal);
      }

      closeOpenBalanceSelects();
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
