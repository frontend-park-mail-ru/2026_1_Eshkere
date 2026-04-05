import { MONTHS_RU_SHORT } from './constants/ru-months';

/**
 * Возвращает начало дня.
 *
 * @param {Date} date Исходная дата.
 * @return {Date} Дата без времени.
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Сдвигает дату на заданное число дней.
 *
 * @param {Date} date Исходная дата.
 * @param {number} days Число дней для сдвига.
 * @return {Date} Новая дата.
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

/**
 * Сдвигает дату на заданное число месяцев.
 *
 * @param {Date} date Исходная дата.
 * @param {number} months Число месяцев для сдвига.
 * @return {Date} Новая дата.
 */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

/**
 * Возвращает начало месяца.
 *
 * @param {Date} date Исходная дата.
 * @return {Date} Первый день месяца.
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Возвращает конец месяца.
 *
 * @param {Date} date Исходная дата.
 * @return {Date} Последний день месяца.
 */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Возвращает начало года.
 *
 * @param {Date} date Исходная дата.
 * @return {Date} Первый день года.
 */
export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

/**
 * Возвращает конец года.
 *
 * @param {Date} date Исходная дата.
 * @return {Date} Последний день года.
 */
export function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

/**
 * Возвращает начало недели.
 *
 * @param {Date} date Исходная дата.
 * @return {Date} Понедельник соответствующей недели.
 */
export function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(date, mondayOffset);
}

/**
 * Возвращает конец недели.
 *
 * @param {Date} date Исходная дата.
 * @return {Date} Воскресенье соответствующей недели.
 */
export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

/**
 * Проверяет, совпадают ли даты по дню.
 *
 * @param {Date} first Первая дата.
 * @param {Date} second Вторая дата.
 * @return {boolean} Совпадают ли даты по календарному дню.
 */
export function isSameDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

/**
 * Проверяет, попадает ли дата в диапазон включительно.
 *
 * @param {Date} date Проверяемая дата.
 * @param {Date} from Начало диапазона.
 * @param {Date} to Конец диапазона.
 * @return {boolean} Попадает ли дата в диапазон.
 */
export function isBetween(date: Date, from: Date, to: Date): boolean {
  return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
}

/**
 * Форматирует подпись диапазона дат.
 *
 * @param {Date} from Начальная дата.
 * @param {Date} to Конечная дата.
 * @return {string} Строка для интерфейса.
 */
export function formatRangeLabel(from: Date, to: Date): string {
  if (
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth() &&
    from.getDate() === to.getDate()
  ) {
    return (
      `${from.getDate()} ${MONTHS_RU_SHORT[from.getMonth()]} ` +
      `${from.getFullYear()}`
    );
  }

  const fromLabel = `${from.getDate()} ${MONTHS_RU_SHORT[from.getMonth()]}`;
  const toLabel =
    `${to.getDate()} ${MONTHS_RU_SHORT[to.getMonth()]} ` +
    `${to.getFullYear()}`;

  return `${fromLabel} - ${toLabel}`;
}

/**
 * Форматирует дату для поля диапазона.
 *
 * @param {Date} date Исходная дата.
 * @return {string} Дата в формате DD.MM.YYYY.
 */
export function formatRangeDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}
