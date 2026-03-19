import {renderTemplate} from '../../assets/js/utils/render.js';
import {renderPublicLayout} from '../../layouts/public/public-layout.js';
import {isAuthenticated} from '../../assets/js/services/auth.service.js';
import homePageTemplate from './home.hbs';

/**
 * Рендерит публичную главную страницу.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderHomePage() {
  const authed = isAuthenticated();

  const content = await renderTemplate(homePageTemplate, {
    ctaHref: authed ? '#/ads' : '#/register',
    ctaText: authed ? 'Запустить рекламу' : 'Запустить рекламу',
  });

  return await renderPublicLayout(content, '/');
}
