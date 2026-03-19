/**
 * Рендерит уже собранный Handlebars-шаблон.
 *
 * @param {Function} template Скомпилированная функция шаблона.
 * @param {Record<string, unknown>} [data={}] Контекст данных,
 *     передаваемый в шаблон.
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderTemplate(template, data = {}) {
  return template(data);
}
