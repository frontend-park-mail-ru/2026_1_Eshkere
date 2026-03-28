import { renderHomePage } from 'pages/home';
import { renderLoginPage, Login } from 'pages/login';
import {
  renderForgotPasswordPage,
  ForgotPassword,
} from 'pages/forgot-password';
import { renderRegisterPage, Register } from 'pages/register';
import { renderAdsPage, Ads } from 'pages/ads';
import { authState } from 'features/auth';
import { Navbar } from 'widgets/navbar';
import {
  renderLayoutShell,
  updatePublicNavbarSlot,
} from './render-with-layout.js';

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
    init: Login,
    guestOnly: true,
  },
  '/forgot-password': {
    render: renderForgotPasswordPage,
    layout: 'public',
    init: ForgotPassword,
    guestOnly: true,
  },
  '/register': {
    render: renderRegisterPage,
    layout: 'public',
    init: Register,
    guestOnly: true,
  },
  '/ads': {
    render: renderAdsPage,
    layout: 'dashboard',
    init: Ads,
    protected: true,
  },
};

let activeCleanup = null;
let renderRequestId = 0;
let currentLayoutKind = null;

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
    currentLayoutKind = null;
    return;
  }

  if (route.protected) {
    const sessionIsActive = await authState.hasActiveSession();

    if (!sessionIsActive) {
      location.hash = '#/login';
      return;
    }
  }

  if (route.guestOnly && authState.isAuthenticated()) {
    location.hash = '#/ads';
    return;
  }

  try {
    const content = await route.render();

    const needsShell =
      currentLayoutKind !== route.layout ||
      !document.getElementById('app-layout-outlet');

    if (needsShell) {
      app.innerHTML = await renderLayoutShell(route.layout, path);
      currentLayoutKind = route.layout;
    } else if (route.layout === 'public') {
      await updatePublicNavbarSlot(path);
    }

    if (currentRequestId !== renderRequestId) {
      return;
    }

    const outlet = document.getElementById('app-layout-outlet');

    if (!outlet) {
      throw new Error('app-layout-outlet not found');
    }

    outlet.innerHTML = content;

    const cleanups = [];

    if (route.init) {
      const routeCleanup = route.init();
      if (typeof routeCleanup === 'function') {
        cleanups.push(routeCleanup);
      }
    }

    const navbarCleanup = Navbar();
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
    currentLayoutKind = null;
    app.innerHTML = '<h1>Ошибка</h1><p>Не удалось загрузить страницу</p>';
  }
}
