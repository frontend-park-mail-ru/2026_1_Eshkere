/**
 * Применяет состояние ошибки или успеха к полю формы.
 *
 * @param {HTMLFormElement} form Целевой элемент формы.
 * @param {string} fieldName Имя поля.
 * @param {string} [errorMessage=''] Текст сообщения об ошибке.
 * @return {void}
 */
export function setFieldState(
  form: HTMLFormElement,
  fieldName: string,
  errorMessage = '',
): void {
  const item = form.elements.namedItem(fieldName);
  const errorElement = form.querySelector(`[data-error-for="${fieldName}"]`);
  if (!errorElement || !item || item instanceof RadioNodeList) {
    return;
  }
  if (
    !(item instanceof HTMLInputElement) &&
    !(item instanceof HTMLTextAreaElement) &&
    !(item instanceof HTMLSelectElement)
  ) {
    return;
  }
  const input = item;

  input.classList.remove('ui-input--error', 'ui-input--success');

  if (errorMessage) {
    input.classList.add('ui-input--error');
    errorElement.textContent = errorMessage;
    return;
  }

  if (input.value.trim()) {
    input.classList.add('ui-input--success');
  }

  errorElement.textContent = '';
}
