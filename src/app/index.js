import {renderRoute} from './router.js';
import {initializeAuthState} from '../shared/api/auth.js';

/**
 * Инициализирует состояние авторизации и первый рендер приложения.
 *
 * @return {Promise<void>} Завершение стартовой инициализации.
 */
export async function initApp() {
  await initializeAuthState();
  await renderRoute();
}

window.addEventListener('hashchange', () => {
  renderRoute();
});
