import { authState } from 'features/auth';
import { renderAdsPage, Ads } from 'pages/ads';
import { renderBalancePage, Balance } from 'pages/balance';
import { renderCampaignCreatePage, CampaignCreate } from 'pages/campaign-create';
import {
  renderCampaignStatisticsPage,
  CampaignStatistics,
} from 'pages/campaign-statistics';
import {
  renderForgotPasswordPage,
  ForgotPassword,
} from 'pages/forgot-password';
import { renderHomePage } from 'pages/home';
import { renderLoginPage, Login } from 'pages/login';
import { renderNotFoundPage } from 'pages/not-found';
import { renderProfilePage, Profile } from 'pages/profile';
import { renderRegisterPage, Register } from 'pages/register';
import { Navbar } from 'widgets/navbar';
import { getCurrentPath, navigateTo } from './navigation';
import {
  renderLayoutShell,
  updateDashboardLayoutSlots,
  updatePublicNavbarSlot,
  type LayoutKind,
} from './render-with-layout';

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
    render: renderCampaignCreatePage,
    layout: 'dashboard',
    init: CampaignCreate,
    protected: true,
  },
  '/ads/statistics': {
    render: renderCampaignStatisticsPage,
    layout: 'dashboard',
    init: CampaignStatistics,
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
  const route: RouteDefinition = routes[path] ?? {
    render: renderNotFoundPage,
    layout: 'public',
  };

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
