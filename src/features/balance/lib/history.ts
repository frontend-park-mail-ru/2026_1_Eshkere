import { formatPrice } from 'shared/lib/format';
import type { BalanceHistoryFilter, BalanceOperation } from '../model/types';

export function formatLongDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatAmountWithSign(value: number): string {
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${formatPrice(Math.abs(value))}`;
}

function getOperationKind(
  operation: BalanceOperation,
): Exclude<BalanceHistoryFilter, 'all'> {
  if (
    operation.id.includes('refund') ||
    operation.title.toLowerCase().includes('возврат')
  ) {
    return 'refund';
  }

  if (operation.id.includes('charge') || operation.amount < 0) {
    return 'charge';
  }

  return 'topup';
}

export function getFilteredOperations(
  operations: BalanceOperation[],
  filter: BalanceHistoryFilter,
  query: string,
): BalanceOperation[] {
  const normalizedQuery = query.trim().toLowerCase();

  return operations.filter((operation) => {
    const matchesFilter =
      filter === 'all' || getOperationKind(operation) === filter;

    if (!matchesFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      operation.title,
      operation.details,
      operation.status,
      formatLongDate(operation.date),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function exportOperationsToCsv(operations: BalanceOperation[]): void {
  const header = ['Операция', 'Дата', 'Сумма', 'Статус', 'Комментарий'];
  const rows = operations.map((operation) => [
    operation.title,
    formatLongDate(operation.date),
    formatAmountWithSign(operation.amount),
    operation.status,
    operation.details,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\r\n');

  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `balance-history-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
