export async function loadTemplate(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить шаблон: ${path}`);
  }

  return await response.text();
}

export async function renderTemplate(path, data = {}) {
  const templateSource = await loadTemplate(path);
  const template = Handlebars.compile(templateSource);
  return template(data);
}