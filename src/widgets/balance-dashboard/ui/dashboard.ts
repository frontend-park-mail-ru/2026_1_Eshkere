import { formatPrice } from 'shared/lib/format';
import { parseAmountInput, validateMinAmount } from 'shared/validators';
import { openTopupModal, type ToastController } from 'features/balance/lib/modal';
import { topUpBalance } from 'features/balance/api/topup';
import type {
  BalanceDashboardState,
  RecommendationRow,
} from 'features/balance/model/types';
import { closeModal, openModal } from 'shared/ui/modal/modal';

interface InitBalanceDashboardWidgetParams {
  autopayModal: HTMLElement | null;
  commitState: () => void;
  signal: AbortSignal;
  state: BalanceDashboardState;
  toast: ToastController;
  topupForm: HTMLFormElement | null;
  topupModal: HTMLElement | null;
}

function getAverageDailySpend(state: BalanceDashboardState): number {
  return Math.max(1, Math.round(state.monthlySpend / 30));
}

function getDaysLeft(state: BalanceDashboardState): number {
  return Math.max(
    1,
    Math.floor(state.balanceValue / getAverageDailySpend(state)),
  );
}

function getAutopayStatus(state: BalanceDashboardState): string {
  return state.autopayEnabled ? 'Настроено' : 'Выключено';
}

function getAutopayHeroLabel(state: BalanceDashboardState): string {
  return state.autopayEnabled ? 'Вкл' : 'Выкл';
}

function getAutopayNote(state: BalanceDashboardState): string {
  return state.autopayEnabled
    ? `Когда баланс опускается ниже ${formatPrice(state.autopayThreshold)}`
    : 'Автопополнение отключено';
}

function getPaymentMethodLabel(state: BalanceDashboardState): string {
  return state.paymentMethod || 'Не добавлен';
}

function getRecommendations(state: BalanceDashboardState): RecommendationRow[] {
  const daysLeft = getDaysLeft(state);
  const items: RecommendationRow[] = [];

  if (daysLeft <= 14) {
    items.push({
      title: 'Пополнить счет заранее',
      description: 'Чтобы активные кампании не остановились в пиковый день.',
      actionKey: 'topup',
    });
  }

  if (!state.autopayEnabled) {
    items.push({
      title: 'Включить автоплатеж',
      description: 'Резервное пополнение снизит риск остановки открутки.',
      actionKey: 'autopay',
    });
  } else {
    items.push({
      title: 'Проверить лимит автоплатежа',
      description:
        'Текущий лимит должен покрывать минимум несколько дней расхода.',
      actionKey: 'autopay',
    });
  }

  if (items.length < 2) {
    items.push({
      title: 'Пополнить счет заранее',
      description:
        'Дополнительный запас упростит масштабирование активных кампаний.',
      actionKey: 'topup',
    });
  }

  return items.slice(0, 2);
}

function createOperationNode(
  operation: BalanceDashboardState['operations'][number],
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'balance-table__row';

  const title = document.createElement('span');
  title.className = 'balance-table__operation';
  title.textContent = operation.title;

  const date = document.createElement('span');
  date.textContent = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(operation.date));

  const amount = document.createElement('strong');
  amount.className = 'balance-table__amount';
  amount.textContent = `${operation.amount >= 0 ? '+' : '−'}${formatPrice(
    Math.abs(operation.amount),
  )}`;

  const status = document.createElement('span');
  status.className = `balance-pill balance-pill--${operation.tone}`;
  status.textContent = operation.status;

  row.append(title, date, amount, status);
  return row;
}

function createEmptyOperationNode(): HTMLElement {
  const empty = document.createElement('div');
  empty.className = 'balance-table__empty';

  const image = document.createElement('img');
  image.className = 'balance-table__empty-image';
  image.src = '/img/No Results.png';
  image.alt = 'Операции не найдены';

  const title = document.createElement('strong');
  title.className = 'balance-table__empty-title';
  title.textContent = 'История операций пока пуста';

  const text = document.createElement('p');
  text.className = 'balance-table__empty-text';
  text.textContent = 'Здесь появятся пополнения, списания и возвраты по аккаунту.';

  empty.append(image, title, text);
  return empty;
}

function createRecommendationNode(item: RecommendationRow): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'balance-actions__item';
  button.type = 'button';
  button.dataset.balanceRecommendation = item.actionKey;

  const title = document.createElement('strong');
  title.className = 'balance-actions__title';
  title.textContent = item.title;

  const description = document.createElement('span');
  description.className = 'balance-actions__text';
  description.textContent = item.description;

  button.append(title, description);
  return button;
}

function setText(selector: string, value: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.textContent = value;
  });
}

function renderOperations(state: BalanceDashboardState): void {
  const operationsBody = document.querySelector<HTMLElement>(
    '[data-balance-operations-body]',
  );
  if (!operationsBody) {
    return;
  }

  const visibleOperations = state.operations.slice(0, 6);

  operationsBody.replaceChildren(
    ...(visibleOperations.length
      ? visibleOperations.map((operation) => createOperationNode(operation))
      : [createEmptyOperationNode()]),
  );
}

function renderRecommendations(state: BalanceDashboardState): void {
  const recommendationsNode = document.querySelector<HTMLElement>(
    '[data-balance-recommendations]',
  );
  if (!recommendationsNode) {
    return;
  }

  recommendationsNode.replaceChildren(
    ...getRecommendations(state).map((item) => createRecommendationNode(item)),
  );
}

function syncQuickAmounts(state: BalanceDashboardState): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-amount]')
    .forEach((node) => {
      const amount = Number(node.dataset.balanceAmount || '0');
      node.classList.toggle(
        'balance-amount--active',
        amount === state.selectedAmount,
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-balance-modal-amount]')
    .forEach((node) => {
      const amount = Number(node.dataset.balanceModalAmount || '0');
      node.classList.toggle(
        'balance-modal__quick-button--active',
        amount === state.selectedAmount,
      );
    });
}

export function syncBalanceDashboardWidget(
  state: BalanceDashboardState,
): void {
  setText('[data-balance-stat="balance"]', formatPrice(state.balanceValue));
  setText('[data-balance-stat="reserve"]', formatPrice(state.moderationReserve));
  setText('[data-balance-stat="monthlySpend"]', formatPrice(state.monthlySpend));
  setText('[data-balance-stat="autopay"]', getAutopayHeroLabel(state));
  setText('[data-balance-payment-method]', getPaymentMethodLabel(state));
  setText('[data-balance-autopay-status]', getAutopayStatus(state));
  setText('[data-balance-autopay-note]', getAutopayNote(state));
  setText(
    '[data-balance-summary="dailySpend"]',
    formatPrice(getAverageDailySpend(state)),
  );
  setText('[data-balance-summary="daysLeft"]', `${getDaysLeft(state)} дней`);
  setText(
    '[data-balance-summary="autopayLimit"]',
    formatPrice(state.autopayLimit),
  );
  setText(
    '[data-balance-summary="vat"]',
    state.vatEnabled ? 'Включено' : 'Отключено',
  );
  setText('[data-balance-current-modal]', formatPrice(state.balanceValue));
  setText('[data-balance-topup-amount]', formatPrice(state.selectedAmount));
  setText(
    '[data-balance-next-balance]',
    formatPrice(state.balanceValue + state.selectedAmount),
  );
  setText('.navbar__balance', formatPrice(state.balanceValue));

  const topupInput = document.querySelector<HTMLInputElement>(
    '#balance-topup-form input[name="amount"]',
  );
  if (topupInput && document.activeElement !== topupInput) {
    topupInput.value = String(state.selectedAmount);
  }

  syncQuickAmounts(state);
  renderOperations(state);
  renderRecommendations(state);
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
