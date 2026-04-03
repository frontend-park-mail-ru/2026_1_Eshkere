/**
 * Рендерит уже собранный Handlebars-шаблон.
 *
 * @param {Function} template Скомпилированная функция шаблона.
 * @param {Record<string, unknown>} [data={}] Контекст данных,
 *     передаваемый в шаблон.
 * @return {Promise<string>} Сгенерированная строка HTML.
 */

type TemplateFn = (data: Record<string, unknown>) => string;

export async function renderTemplate(
  template: TemplateFn,
  data: Record<string, unknown> = {},
): Promise<string> {
  return template(data);
}
