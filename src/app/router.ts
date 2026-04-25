import { authState } from 'features/auth';
import { renderAdsPage, Ads } from 'pages/ads';
import { renderAppealsPage, Appeals } from 'pages/appeals';
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
import { renderHomePage, Home } from 'pages/home';
import { renderLoginPage, Login } from 'pages/login';
import { renderNotFoundPage } from 'pages/not-found';
import { renderModeratorQueuePage, ModeratorQueuePage } from 'pages/moderator-queue';
import { renderModeratorCasePage, ModeratorCasePage } from 'pages/moderator-case';
import { renderModeratorAppealsPage, ModeratorAppealsPage } from 'pages/moderator-appeals';
import { renderModeratorMessagesPage, ModeratorMessagesPage } from 'pages/moderator-messages';
import { renderModeratorPoliciesPage, ModeratorPoliciesPage } from 'pages/moderator-policies';
import { renderModeratorAuditPage, ModeratorAuditPage } from 'pages/moderator-audit';
import { renderProfilePage, Profile } from 'pages/profile';
import { renderRegisterPage, Register } from 'pages/register';
import { renderSupportIframePage, SupportIframe } from 'pages/support-iframe';
import { Navbar } from 'widgets/navbar';
import { getCurrentPath, navigateTo } from './navigation';
import {
  renderLayoutShell,
  updateDashboardLayoutSlots,
  initModeratorNavbar,
  updateModeratorLayoutSlots,
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
  requiresModerator?: boolean;
}

const routes: Record<string, RouteDefinition> = {
  '/': {
    render: renderHomePage,
    layout: 'public',
    init: Home,
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
  '/support-iframe': {
    render: renderSupportIframePage,
    layout: 'iframe',
    init: SupportIframe,
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
  '/appeals': {
    render: renderAppealsPage,
    layout: 'dashboard',
    init: Appeals,
    protected: true,
  },
  '/profile': {
    render: renderProfilePage,
    layout: 'dashboard',
    init: Profile,
    protected: true,
  },
  '/moderator': {
    render: renderModeratorQueuePage,
    layout: 'moderator',
    init: ModeratorQueuePage,
    protected: true,
    requiresModerator: true,
  },
  '/moderator/queue': {
    render: renderModeratorQueuePage,
    layout: 'moderator',
    init: ModeratorQueuePage,
    protected: true,
    requiresModerator: true,
  },
  '/moderator/case': {
    render: renderModeratorCasePage,
    layout: 'moderator',
    init: ModeratorCasePage,
    protected: true,
    requiresModerator: true,
  },
  '/moderator/appeals': {
    render: renderModeratorAppealsPage,
    layout: 'moderator',
    init: ModeratorAppealsPage,
    protected: true,
    requiresModerator: true,
  },
  '/moderator/messages': {
    render: renderModeratorMessagesPage,
    layout: 'moderator',
    init: ModeratorMessagesPage,
    protected: true,
    requiresModerator: true,
  },
  '/moderator/policies': {
    render: renderModeratorPoliciesPage,
    layout: 'moderator',
    init: ModeratorPoliciesPage,
    protected: true,
    requiresModerator: true,
  },
  '/moderator/audit': {
    render: renderModeratorAuditPage,
    layout: 'moderator',
    init: ModeratorAuditPage,
    protected: true,
    requiresModerator: true,
  },
};

let activeCleanup: RouteCleanup | null = null;
let renderRequestId = 0;
let currentLayoutKind: LayoutKind | null = null;

export async function renderRoute(): Promise<void> {
  renderRequestId += 1;
  const currentRequestId = renderRequestId;
  const previousCleanup = activeCleanup;
  activeCleanup = null;

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

  if (route.requiresModerator && !authState.canAccessModerator()) {
    navigateTo('/ads', { replace: true });
    return;
  }

  if (route.guestOnly && authState.isAuthenticated()) {
    navigateTo('/ads', { replace: true });
    return;
  }

  try {
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
    } else if (route.layout === 'moderator') {
      await updateModeratorLayoutSlots(path);
    }

    if (currentRequestId !== renderRequestId) {
      return;
    }

    const content = await route.render();

    if (currentRequestId !== renderRequestId) {
      return;
    }

    const outlet = document.getElementById('app-layout-outlet');

    if (!outlet) {
      throw new Error('app-layout-outlet not found');
    }

    outlet.innerHTML = content;

    const cleanups: RouteCleanup[] = [];

    if (typeof previousCleanup === 'function') {
      previousCleanup();
    }

    if (route.init) {
      const routeCleanup = route.init();
      if (typeof routeCleanup === 'function') {
        cleanups.push(routeCleanup);
      }
    }

    if (route.layout === 'public' || route.layout === 'dashboard') {
      const navbarCleanup = Navbar();
      if (typeof navbarCleanup === 'function') {
        cleanups.push(navbarCleanup);
      }
    } else if (route.layout === 'moderator') {
      const moderatorNavbarCleanup = initModeratorNavbar();
      if (typeof moderatorNavbarCleanup === 'function') {
        cleanups.push(moderatorNavbarCleanup);
      }
    }

    if (cleanups.length > 0) {
      activeCleanup = () => {
        cleanups.forEach((cleanup) => cleanup());
      };
    }
  } catch (error) {
    console.error(error);
    currentLayoutKind = null;
    app.innerHTML = '<h1>\u041e\u0448\u0438\u0431\u043a\u0430</h1><p>\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443</p>';
  }
}
