import './button.scss';
import { renderTemplate } from 'shared/lib/render';
import buttonTemplate from './button.hbs';

/**
 * Рендерит переиспользуемый компонент кнопки.
 *
 * @param {Object} [options={}] Параметры кнопки.
 * @param {string} [options.text] Текст кнопки.
 * @param {string} [options.type] Тип кнопки.
 * @param {string} [options.href] URL ссылки, если нужен рендер как ссылки.
 * @param {string} [options.variant] Ключ визуального варианта.
 * @param {string} [options.className] Дополнительные CSS-классы.
 * @return {Promise<string>} Сгенерированная строка HTML.
 */

export interface RenderButtonOptions {
  text?: string;
  type?: string;
  href?: string;
  variant?: string;
  className?: string;
}

export async function renderButton(
  options: RenderButtonOptions = {},
): Promise<string> {
  return await renderTemplate(buttonTemplate, {
    text: options.text || 'Кнопка',
    type: options.type || 'button',
    href: options.href || '',
    variant: options.variant || 'primary',
    className: options.className || '',
  });
}
