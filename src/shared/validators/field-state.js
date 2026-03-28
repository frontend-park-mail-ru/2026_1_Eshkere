/**
 * Применяет состояние ошибки или успеха к полю формы.
 *
 * @param {HTMLFormElement} form Целевой элемент формы.
 * @param {string} fieldName Имя поля.
 * @param {string} [errorMessage=''] Текст сообщения об ошибке.
 * @return {void}
 */
export function setFieldState(form, fieldName, errorMessage = '') {
  const input = form.elements[fieldName];
  const errorElement = form.querySelector(`[data-error-for="${fieldName}"]`);

  if (!input || !errorElement) {
    return;
  }

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
