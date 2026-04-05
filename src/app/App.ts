import { renderRoute } from './router';
import { authState } from 'features/auth';
import './styles/main.scss';

/**
 * Инициализирует состояние авторизации и первый рендер приложения.
 *
 * @return {Promise<void>} Завершение стартовой инициализации.
 */
export async function initApp(): Promise<void> {
  await authState.hasActiveSession();
  await renderRoute();
}

window.addEventListener('hashchange', () => {
  renderRoute();
});
