/**
 * Рендерит уже собранный Handlebars-шаблон.
 *
 * @param {Function} template Скомпилированная функция шаблона.
 * @param {Record<string, unknown>} [data={}] Контекст данных,
 *     передаваемый в шаблон.
 * @return {Promise<string>} Сгенерированная строка HTML.
 */

type TemplateFn = (data?: Record<string, unknown>) => string;

export async function renderTemplate<T extends object>(
  template: TemplateFn,
  data: T,
): Promise<string> {
  return template(data as Record<string, unknown>);
}

/**
 * Создает DOM-элемент из Handlebars-шаблона с одним корневым узлом.
 *
 * @param {Function} template Скомпилированная функция шаблона.
 * @param {Record<string, unknown>} [data={}] Контекст данных для шаблона.
 * @return {HTMLElement} Корневой HTML-элемент шаблона.
 */
export function renderElement<T extends object>(
  template: TemplateFn,
  data?: T,
): HTMLElement {
  const root = document.createElement('template');
  root.innerHTML = template(data as Record<string, unknown> | undefined).trim();

  const element = root.content.firstElementChild;
  if (!(element instanceof HTMLElement)) {
    throw new Error('Template must render a single root HTMLElement.');
  }

  return element;
}
