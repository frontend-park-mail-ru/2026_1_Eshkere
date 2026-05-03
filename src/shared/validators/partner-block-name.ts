/** Совпадает с ограничением поля в UI и типичным лимитом API. */
export const PARTNER_BLOCK_NAME_MAX_LEN = 120;

/**
 * Название рекламного блока: не пустое после trim, длина не больше лимита.
 *
 * @param value Строка из поля ввода.
 * @return Пустая строка при успехе или текст ошибки.
 */
export function validatePartnerBlockName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Введите название блока';
  }
  if (value.length > PARTNER_BLOCK_NAME_MAX_LEN) {
    return `Не более ${PARTNER_BLOCK_NAME_MAX_LEN} символов`;
  }
  return '';
}
