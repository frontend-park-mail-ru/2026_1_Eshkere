import { initNavigation } from 'shared/lib/navigation';
import { renderRoute } from './router';
import { authState } from 'features/auth';
import { initOfflineModal } from 'widgets/offline-modal';
import { initRequestErrorModal } from 'widgets/request-error-modal';
import { initMobileWarningModal } from 'widgets/mobile-warning-modal';
import { initSwUpdateToast } from 'widgets/sw-update-toast';
import { SW_UPDATE_EVENT } from 'shared/lib/events';
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
  initMobileWarningModal();
  initSwUpdateToast();
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
    const registration = await navigator.serviceWorker.register('/sw.js');
    watchForSwUpdate(registration);
  } catch (error) {
    console.error('Service worker registration failed', error);
  }
}

function watchForSwUpdate(registration: ServiceWorkerRegistration): void {
  const notifyUpdate = (): void => {
    window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT));
  };

  if (registration.waiting && navigator.serviceWorker.controller) {
    notifyUpdate();
    return;
  }

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) {
      return;
    }

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        notifyUpdate();
      }
    });
  });
}
