import { authState } from 'features/auth';

export function getHomeTemplateContext() {
  const authed = authState.isAuthenticated();

  return {
    ctaHref: authed ? '/ads' : '/register',
    ctaText: 'Запустить рекламу',
  };
}
