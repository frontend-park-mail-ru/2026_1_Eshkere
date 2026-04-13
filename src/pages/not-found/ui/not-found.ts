import './not-found.scss';
import { authState } from 'features/auth';
import { renderTemplate } from 'shared/lib/render';
import notFoundPageTemplate from './not-found.hbs';

export async function renderNotFoundPage(): Promise<string> {
  const isAuthenticated = authState.isAuthenticated();

  return renderTemplate(notFoundPageTemplate, {
    ctaHref: isAuthenticated ? '/ads' : '/',
    ctaText: isAuthenticated ? 'Вернуться в кампании' : 'На главную',
  });
}
