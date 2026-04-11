import {
  exportOperationsToCsv,
  formatAmountWithSign,
  formatLongDate,
  getFilteredOperations,
} from 'features/balance/lib/history';
import type { ToastController } from 'features/balance/lib/modal';
import type {
  BalanceDashboardState,
  BalanceHistoryFilter,
  BalanceHistoryState,
} from 'features/balance/model/types';
import { openModal } from 'shared/ui/modal/modal';

interface InitBalanceHistoryWidgetParams {
  historyModal: HTMLElement | null;
  historyState: BalanceHistoryState;
  signal: AbortSignal;
  state: BalanceDashboardState;
  toast: ToastController;
}

function createHistoryLogNode(
  operation: BalanceDashboardState['operations'][number],
): HTMLElement {
  const row = document.createElement('article');
  row.className = 'balance-log__row';

  const main = document.createElement('div');
  main.className = 'balance-log__main';

  const title = document.createElement('strong');
  title.className = 'balance-log__title';
  title.textContent = operation.title;

  const details = document.createElement('p');
  details.className = 'balance-log__details';
  details.textContent = operation.details;

  const meta = document.createElement('span');
  meta.className = 'balance-log__meta';
  meta.textContent = formatLongDate(operation.date);

  main.append(title, details, meta);

  const side = document.createElement('div');
  side.className = 'balance-log__side';

  const amount = document.createElement('strong');
  amount.className = 'balance-log__amount';
  amount.textContent = formatAmountWithSign(operation.amount);

  const status = document.createElement('span');
  status.className = `balance-pill balance-pill--${operation.tone}`;
  status.textContent = operation.status;

  side.append(amount, status);
  row.append(main, side);
  return row;
}

function createEmptyHistoryNode(): HTMLElement {
  const empty = document.createElement('div');
  empty.className = 'balance-log__empty';
  empty.textContent = 'По текущему фильтру ничего не найдено.';
  return empty;
}

export function syncBalanceHistoryWidget(
  state: BalanceDashboardState,
  historyState: BalanceHistoryState,
): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-history-filter]')
    .forEach((button) => {
      button.classList.toggle(
        'is-active',
        button.dataset.balanceHistoryFilter === historyState.filter,
      );
    });

  const searchInput = document.querySelector<HTMLInputElement>(
    '[data-balance-history-search]',
  );
  if (searchInput && document.activeElement !== searchInput) {
    searchInput.value = historyState.query;
  }

  const historyBody = document.querySelector<HTMLElement>(
    '[data-balance-history-body]',
  );
  const countNode = document.querySelector<HTMLElement>(
    '[data-balance-history-count]',
  );
  const lastDateNode = document.querySelector<HTMLElement>(
    '[data-balance-history-last-date]',
  );

  if (!historyBody) {
    return;
  }

  const visibleOperations = getFilteredOperations(
    state.operations,
    historyState.filter,
    historyState.query,
  );

  historyBody.replaceChildren(
    ...(visibleOperations.length
      ? visibleOperations.map((operation) => createHistoryLogNode(operation))
      : [createEmptyHistoryNode()]),
  );

  if (countNode) {
    countNode.textContent = String(visibleOperations.length);
  }

  if (lastDateNode) {
    lastDateNode.textContent = visibleOperations.length
      ? formatLongDate(visibleOperations[0].date)
      : '—';
  }
}

export function initBalanceHistoryWidget({
  historyModal,
  historyState,
  signal,
  state,
  toast,
}: InitBalanceHistoryWidgetParams): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-open-history]')
    .forEach((node) => {
      node.addEventListener(
        'click',
        () => {
          if (historyModal instanceof HTMLElement) {
            openModal(historyModal);
          }
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
          syncBalanceHistoryWidget(state, historyState);
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
        syncBalanceHistoryWidget(state, historyState);
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
}
