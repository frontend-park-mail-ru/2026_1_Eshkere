import { renderHomePage } from '../pages/home';
import { renderLoginPage, initLoginPage } from '../pages/login';
import {
  renderForgotPasswordPage,
  initForgotPasswordPage,
} from '../pages/forgot-password';
import { renderRegisterPage, initRegisterPage } from '../pages/register';
import { renderAdsPage, initAdsPage } from '../pages/ads';
import { hasActiveSession, isAuthenticated } from '../features/auth';
import { initNavbar } from '../widgets/navbar';
import { renderWithLayout } from './render-with-layout.js';

/**
 * @typedef {import('./render-with-layout.js').LayoutKind} LayoutKind
 */

/**
 * @typedef {Object} RouteDefinition
 * @property {() => Promise<string>} render HTML только контента страницы.
 * @property {LayoutKind} layout
 * @property {() => (void|(() => void))} [init]
 * @property {boolean} [guestOnly]
 * @property {boolean} [protected]
 */

/** @type {Record<string, RouteDefinition>} */
const routes = {
  '/': {
    render: renderHomePage,
    layout: 'public',
  },
  '/login': {
    render: renderLoginPage,
    layout: 'public',
    init: initLoginPage,
    guestOnly: true,
  },
  '/forgot-password': {
    render: renderForgotPasswordPage,
    layout: 'public',
    init: initForgotPasswordPage,
    guestOnly: true,
  },
  '/register': {
    render: renderRegisterPage,
    layout: 'public',
    init: initRegisterPage,
    guestOnly: true,
  },
  '/ads': {
    render: renderAdsPage,
    layout: 'dashboard',
    init: initAdsPage,
    protected: true,
  },
};

let activeCleanup = null;
let renderRequestId = 0;

/**
 * Определяет текущий hash-маршрут и рендерит нужную страницу.
 *
 * @return {Promise<void>} Завершение рендера маршрута.
 */
export async function renderRoute() {
  renderRequestId += 1;
  const currentRequestId = renderRequestId;

  if (typeof activeCleanup === 'function') {
    activeCleanup();
    activeCleanup = null;
  }

  const app = document.getElementById('app');
  const path = location.hash.slice(1) || '/';
  const route = routes[path];

  if (!route) {
    app.innerHTML = '<h1>404</h1><p>Страница не найдена</p>';
    return;
  }

  if (route.protected) {
    const sessionIsActive = await hasActiveSession();

    if (!sessionIsActive) {
      location.hash = '#/login';
      return;
    }
  }

  if (route.guestOnly && isAuthenticated()) {
    location.hash = '#/ads';
    return;
  }

  try {
    const content = await route.render();
    const html = await renderWithLayout(route.layout, content, path);

    if (currentRequestId !== renderRequestId) {
      return;
    }

    app.innerHTML = html;

    const cleanups = [];

    if (route.init) {
      const routeCleanup = route.init();
      if (typeof routeCleanup === 'function') {
        cleanups.push(routeCleanup);
      }
    }

    const navbarCleanup = initNavbar();
    if (typeof navbarCleanup === 'function') {
      cleanups.push(navbarCleanup);
    }

    if (cleanups.length > 0) {
      activeCleanup = () => {
        cleanups.forEach((cleanup) => cleanup());
      };
    }
  } catch (error) {
    console.error(error);
    app.innerHTML = '<h1>Ошибка</h1><p>Не удалось загрузить страницу</p>';
  }
}
