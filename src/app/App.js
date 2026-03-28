import { renderRoute } from './router.js';
import { authState } from 'features/auth';
import './styles/main.scss';

/**
 * Инициализирует состояние авторизации и первый рендер приложения.
 *
 * @return {Promise<void>} Завершение стартовой инициализации.
 */
export async function initApp() {
  await authState.hasActiveSession();
  await renderRoute();
}

window.addEventListener('hashchange', () => {
  renderRoute();
});
