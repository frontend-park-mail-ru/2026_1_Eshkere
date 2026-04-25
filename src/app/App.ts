import { initNavigation } from './navigation';
import { renderRoute } from './router';
import { authState } from 'features/auth';
import { initOfflineModal } from 'widgets/offline-modal';
import { initRequestErrorModal } from 'widgets/request-error-modal';
import { initSupportFab } from 'widgets/support-fab';
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
  initOfflineModal();
  initRequestErrorModal();
  initSupportFab();
  await registerServiceWorker();
  authState.syncDevModeratorAccessFromLocation();
  await authState.hasActiveSession();
  await renderRoute();
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    return;
  }

  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (error) {
    console.error('Service worker registration failed', error);
  }
}
