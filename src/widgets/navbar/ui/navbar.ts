import './navbar.scss';
import { renderTemplate } from 'shared/lib/render';
import navbarTemplate from './navbar.hbs';
import { initNavbarNotifications } from './navbar-notifications';
import { initNavbarProfileMenu } from './navbar-profile';
import { initNavbarTheme } from './navbar-theme';
import { getNavbarTemplateContext } from './navbar-view-model';

let navbarLifecycleController: AbortController | null = null;

/**
 * Рендерит публичную навигационную панель.
 *
 * @param {string} [pathname="/"] - Активный путь приложения.
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderNavbar(pathname = '/'): Promise<string> {
  return await renderTemplate(
    navbarTemplate,
    getNavbarTemplateContext(pathname),
  );
}

/**
 * Подключает обработчик выхода и верхнее меню профиля.
 *
 * @return {void}
 */
export function Navbar(): VoidFunction {
  if (navbarLifecycleController) {
    navbarLifecycleController.abort();
  }

  const controller = new AbortController();
  navbarLifecycleController = controller;
  const { signal } = controller;

  const navbar = document.querySelector('.navbar');
  const notificationsModal = document.getElementById('navbar-notifications-modal');
  const logoutModal = document.getElementById('navbar-logout-modal');

  if (logoutModal && logoutModal.parentElement !== document.body) {
    document.body.appendChild(logoutModal);
  }

  if (notificationsModal && notificationsModal.parentElement !== document.body) {
    document.body.appendChild(notificationsModal);
  }

  if (navbar) {
    const syncScrollState = () => {
      navbar.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    syncScrollState();
    window.addEventListener('scroll', syncScrollState, {
      passive: true,
      signal,
    });
  }

  let closeNotifications = () => {};
  const profile = initNavbarProfileMenu(signal, () => closeNotifications());
  const notifications = initNavbarNotifications(signal, profile.closeMenu);
  closeNotifications = notifications.closeNotifications;

  initNavbarTheme(signal);

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        !target.closest('.navbar__actions-user')
      ) {
        notifications.closeNotifications();
        profile.closeMenu();
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        notifications.closeNotifications();
        profile.closeMenu();
        profile.closeLogoutModal();
        notifications.closeNotificationsModal();
      }
    },
    { signal },
  );

  return () => {
    if (navbarLifecycleController === controller) {
      navbarLifecycleController = null;
    }
    controller.abort();
  };
}
