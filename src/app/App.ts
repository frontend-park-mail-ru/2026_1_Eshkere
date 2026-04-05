import { initNavigation } from './navigation';
import { renderRoute } from './router';
import { authState } from 'features/auth';
import './styles/main.scss';

/**
 * Инициализирует состояние авторизации и первый рендер приложения.
 *
 * @return {Promise<void>} Завершение стартовой инициализации.
 */
export async function initApp(): Promise<void> {
  initNavigation(() => {
    void renderRoute();
  });
  await registerServiceWorker();
  await authState.hasActiveSession();
  await renderRoute();
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (error) {
    console.error('Service worker registration failed', error);
  }
}
