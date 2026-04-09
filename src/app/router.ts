import { renderHomePage } from 'pages/home';
import { renderLoginPage, Login } from 'pages/login';
import {
  renderForgotPasswordPage,
  ForgotPassword,
} from 'pages/forgot-password';
import { renderRegisterPage, Register } from 'pages/register';
import { renderAdsPage, Ads } from 'pages/ads';
import { renderBalancePage, Balance } from 'pages/balance';
import { renderCampaignCreatePage, CampaignCreate } from 'pages/campaign-create';
import { renderCampaignEditPage, CampaignEdit } from 'pages/campaign-edit';
import { renderProfilePage, Profile } from 'pages/profile';
import { authState } from 'features/auth';
import { Navbar } from 'widgets/navbar';
import { getCurrentPath, navigateTo } from './navigation';
import {
  renderLayoutShell,
  updateDashboardLayoutSlots,
  updatePublicNavbarSlot,
  type LayoutKind,
} from './render-with-layout';
/**
 * @typedef {import('./render-with-layout').LayoutKind} LayoutKind
 */

/**
 * @typedef {Object} RouteDefinition
 * @property {() => Promise<string>} render HTML только контента страницы.
 * @property {LayoutKind} layout
 * @property {function(): (void|VoidFunction)} [init]
 * @property {boolean} [guestOnly]
 * @property {boolean} [protected]
 */

/** @type {Record<string, RouteDefinition>} */

type RouteCleanup = VoidFunction;
type RouteInit = () => void | RouteCleanup;

interface RouteDefinition {
  render: () => Promise<string>;
  layout: LayoutKind;
  init?: RouteInit;
  guestOnly?: boolean;
  protected?: boolean;
}

const routes: Record<string, RouteDefinition> = {
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
  '/ads/create': {
    render: renderCampaignCreatePage,
    layout: 'dashboard',
    init: CampaignCreate,
    protected: true,
  },
  '/ads/edit': {
    render: renderCampaignEditPage,
    layout: 'dashboard',
    init: CampaignEdit,
    protected: true,
  },
  '/balance': {
    render: renderBalancePage,
    layout: 'dashboard',
    init: Balance,
    protected: true,
  },
  '/profile': {
    render: renderProfilePage,
    layout: 'dashboard',
    init: Profile,
    protected: true,
  },
};

let activeCleanup: RouteCleanup | null = null;
let renderRequestId = 0;
let currentLayoutKind: LayoutKind | null = null;

/**
 * Определяет текущий pathname-маршрут и рендерит нужную страницу.
 *
 * @return {Promise<void>} Завершение рендера маршрута.
 */
export async function renderRoute(): Promise<void> {
  renderRequestId += 1;
  const currentRequestId = renderRequestId;

  if (typeof activeCleanup === 'function') {
    activeCleanup();
    activeCleanup = null;
  }

  const app = document.getElementById('app');
  if (!app) {
    return;
  }

  const path = getCurrentPath();
  const route = routes[path];

  if (!route) {
    app.innerHTML = '<h1>404</h1><p>Страница не найдена</p>';
    currentLayoutKind = null;
    return;
  }

  if (route.protected) {
    const sessionIsActive = await authState.hasActiveSession();

    if (!sessionIsActive) {
      navigateTo('/login', { replace: true });
      return;
    }
  }

  if (route.guestOnly && authState.isAuthenticated()) {
    navigateTo('/ads', { replace: true });
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
    } else if (route.layout === 'dashboard') {
      await updateDashboardLayoutSlots(path);
    }

    if (currentRequestId !== renderRequestId) {
      return;
    }

    const outlet = document.getElementById('app-layout-outlet');

    if (!outlet) {
      throw new Error('app-layout-outlet not found');
    }

    outlet.innerHTML = content;

    const cleanups: RouteCleanup[] = [];

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
