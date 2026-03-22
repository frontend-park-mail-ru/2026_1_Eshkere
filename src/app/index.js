import './styles/main.scss';
import {renderRoute} from './router.js';
import {initializeAuthState} from '../shared/api/auth.js';

/**
 * Инициализирует состояние авторизации и первый рендер приложения.
 *
 * @return {Promise<void>} Завершение стартовой инициализации.
 */
async function bootstrapApp() {
  await initializeAuthState();
  await renderRoute();
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrapApp();
});

window.addEventListener('hashchange', () => {
  renderRoute();
});
