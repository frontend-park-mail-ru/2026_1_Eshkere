/**
 * Форматирует число как цену в рублях.
 *
 * @param {number} value Значение цены.
 * @return {string} Отформатированная цена.
 */
export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

/**
 * Форматирует дату для отображения.
 *
 * @param {string} value Исходная строка даты.
 * @return {string} Отформатированная дата или прочерк.
 */
export function formatDate(value: string): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('ru-RU');
}
