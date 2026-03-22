import {renderTemplate} from '../../shared/lib/render.js';
import {renderPublicLayout} from '../../widgets/public-layout/public-layout.js';
import {isAuthenticated} from '../../shared/api/auth.js';
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
