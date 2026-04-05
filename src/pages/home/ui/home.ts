import './home.scss';
import { renderTemplate } from 'shared/lib/render';
import { authState } from 'features/auth';
import homePageTemplate from './home.hbs';

/**
 * Рендерит публичную главную страницу.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderHomePage() {
  const authed = authState.isAuthenticated();

  return renderTemplate(homePageTemplate, {
    ctaHref: authed ? '/ads' : '/register',
    ctaText: authed ? 'Запустить рекламу' : 'Запустить рекламу',
  });
}
