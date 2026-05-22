import { authState } from 'features/auth';
import { renderAdsPage, Ads } from 'pages/ads';
import { renderBalancePage, Balance } from 'pages/balance';
import {
  renderCampaignCreatePage,
  CampaignCreate,
} from 'pages/campaign-create';
import {
  renderForgotPasswordPage,
  ForgotPassword,
} from 'pages/forgot-password';
import { renderHomePage, Home } from 'pages/home';
import { renderLoginPage, Login } from 'pages/login';
import { renderNotFoundPage } from 'pages/not-found';
import { renderOverviewPage, Overview } from 'pages/overview';
import {
  renderModeratorQueuePage,
  ModeratorQueuePage,
} from 'pages/moderator-queue';
import {
  renderModeratorCasePage,
  ModeratorCasePage,
} from 'pages/moderator-case';
import {
  renderModeratorAppealsPage,
  ModeratorAppealsPage,
} from 'pages/moderator-appeals';
import {
  renderModeratorMessagesPage,
  ModeratorMessagesPage,
} from 'pages/moderator-messages';
import {
  renderModeratorPoliciesPage,
  ModeratorPoliciesPage,
} from 'pages/moderator-policies';
import {
  renderModeratorAuditPage,
  ModeratorAuditPage,
} from 'pages/moderator-audit';
import { renderProfilePage, Profile } from 'pages/profile';
import {
  renderCampaignWizardPage,
  CampaignWizard,
} from 'pages/campaign-wizard';
import { renderCampaignStatsPage, CampaignStats } from 'pages/campaign-stats';
import { renderGroupStatsPage, GroupStats } from 'pages/group-stats';
import { renderAdStatsPage, AdStats } from 'pages/ad-stats';
import {
  renderCampaignDetailPage,
  CampaignDetail,
} from 'pages/campaign-detail';
import { renderAdGroupCreatePage, AdGroupCreate } from 'pages/ad-group-create';
import { renderAdGroupEditPage, AdGroupEdit } from 'pages/ad-group-edit';
import { renderAdCreatePage, AdCreate } from 'pages/ad-create';
import { renderAdEditPage, AdEdit } from 'pages/ad-edit';
import {
  renderCampaignEditFormPage,
  CampaignEditForm,
} from 'pages/campaign-edit-form';
import { renderRegisterPage, Register } from 'pages/register';
import { renderAddSitesPage, AddSites } from 'pages/add-sites';
import {
  renderAddSitesCreatePage,
  AddSitesCreate,
} from 'pages/add-sites-create';
import { renderAddSitesBlockPage, AddSitesBlock } from 'pages/add-sites-block';
import { renderAddSitesSitePage, AddSitesSite } from 'pages/add-sites-site';
import {
  renderPartnerOverviewPage,
  PartnerOverview,
} from 'pages/partner-overview';
import { renderPartnerIncomePage, PartnerIncome } from 'pages/partner-income';
import {
  renderPartnerPayoutsPage,
  PartnerPayouts,
} from 'pages/partner-payouts';
import {
  renderPartnerProfilePage,
  PartnerProfile,
} from 'pages/partner-profile';
import { renderSupportPage, Support } from 'pages/support';
import { renderOfertaPage } from 'pages/oferta';
import { renderPrivacyPage } from 'pages/privacy';
import { Navbar } from 'widgets/navbar';
import { getCurrentPath, navigateTo } from 'shared/lib/navigation';
import { triggerPageEnter, setupReveal } from 'shared/lib/animations';
import { syncGlobalBalanceAlert } from 'shared/lib/balance-global-alert';
import { isAdvertiserCabinet } from 'shared/lib/cabinet';
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
  '/ads': {
    render: renderAdsPage,
    layout: 'advertiser-dashboard',
    init: Ads,
    protected: true,
  },
  '/advertiser/campaigns': {
    render: renderAdsPage,
    layout: 'advertiser-dashboard',
    init: Ads,
    protected: true,
  },
  '/overview': {
    render: renderOverviewPage,
    layout: 'advertiser-dashboard',
    init: Overview,
    protected: true,
  },
  '/advertiser/overview': {
    render: renderOverviewPage,
    layout: 'advertiser-dashboard',
    init: Overview,
    protected: true,
  },
  '/ads/create': {
    render: renderCampaignWizardPage,
    layout: 'advertiser-dashboard',
    init: CampaignWizard,
    protected: true,
  },
  '/advertiser/campaigns/create': {
    render: renderCampaignWizardPage,
    layout: 'advertiser-dashboard',
    init: CampaignWizard,
    protected: true,
  },
  '/ads/edit': {
    render: renderCampaignCreatePage,
    layout: 'advertiser-dashboard',
    init: CampaignCreate,
    protected: true,
  },
  '/advertiser/campaigns/edit': {
    render: renderCampaignCreatePage,
    layout: 'advertiser-dashboard',
    init: CampaignCreate,
    protected: true,
  },
  '/ads/stats/campaign': {
    render: renderCampaignStatsPage,
    layout: 'advertiser-dashboard',
    init: CampaignStats,
    protected: true,
  },
  '/advertiser/stats/campaign': {
    render: renderCampaignStatsPage,
    layout: 'advertiser-dashboard',
    init: CampaignStats,
    protected: true,
  },
  '/ads/stats/group': {
    render: renderGroupStatsPage,
    layout: 'advertiser-dashboard',
    init: GroupStats,
    protected: true,
  },
  '/advertiser/stats/group': {
    render: renderGroupStatsPage,
    layout: 'advertiser-dashboard',
    init: GroupStats,
    protected: true,
  },
  '/ads/stats/ad': {
    render: renderAdStatsPage,
    layout: 'advertiser-dashboard',
    init: AdStats,
    protected: true,
  },
  '/advertiser/stats/ad': {
    render: renderAdStatsPage,
    layout: 'advertiser-dashboard',
    init: AdStats,
    protected: true,
  },
  '/ads/campaign': {
    render: renderCampaignDetailPage,
    layout: 'advertiser-dashboard',
    init: CampaignDetail,
    protected: true,
  },
  '/advertiser/campaign': {
    render: renderCampaignDetailPage,
    layout: 'advertiser-dashboard',
    init: CampaignDetail,
    protected: true,
  },
  '/ads/campaign/edit': {
    render: renderCampaignEditFormPage,
    layout: 'advertiser-dashboard',
    init: CampaignEditForm,
    protected: true,
  },
  '/advertiser/campaign/edit': {
    render: renderCampaignEditFormPage,
    layout: 'advertiser-dashboard',
    init: CampaignEditForm,
    protected: true,
  },
  '/ads/group/create': {
    render: renderAdGroupCreatePage,
    layout: 'advertiser-dashboard',
    init: AdGroupCreate,
    protected: true,
  },
  '/advertiser/groups/create': {
    render: renderAdGroupCreatePage,
    layout: 'advertiser-dashboard',
    init: AdGroupCreate,
    protected: true,
  },
  '/ads/group/edit': {
    render: renderAdGroupEditPage,
    layout: 'advertiser-dashboard',
    init: AdGroupEdit,
    protected: true,
  },
  '/advertiser/groups/edit': {
    render: renderAdGroupEditPage,
    layout: 'advertiser-dashboard',
    init: AdGroupEdit,
    protected: true,
  },
  '/ads/ad/create': {
    render: renderAdCreatePage,
    layout: 'advertiser-dashboard',
    init: AdCreate,
    protected: true,
  },
  '/advertiser/ads/create': {
    render: renderAdCreatePage,
    layout: 'advertiser-dashboard',
    init: AdCreate,
    protected: true,
  },
  '/ads/ad/edit': {
    render: renderAdEditPage,
    layout: 'advertiser-dashboard',
    init: AdEdit,
    protected: true,
  },
  '/advertiser/ads/edit': {
    render: renderAdEditPage,
    layout: 'advertiser-dashboard',
    init: AdEdit,
    protected: true,
  },
  '/ads/statistics': {
    render: renderCampaignStatsPage,
    layout: 'advertiser-dashboard',
    init: CampaignStats,
    protected: true,
  },
  '/advertiser/statistics': {
    render: renderCampaignStatsPage,
    layout: 'advertiser-dashboard',
    init: CampaignStats,
    protected: true,
  },
  '/balance': {
    render: renderBalancePage,
    layout: 'advertiser-dashboard',
    init: Balance,
    protected: true,
  },
  '/advertiser/balance': {
    render: renderBalancePage,
    layout: 'advertiser-dashboard',
    init: Balance,
    protected: true,
  },
  '/add-sites': {
    render: renderAddSitesPage,
    layout: 'partner-dashboard',
    init: AddSites,
    protected: true,
  },
  '/partner/overview': {
    render: renderPartnerOverviewPage,
    layout: 'partner-dashboard',
    init: PartnerOverview,
    protected: true,
  },
  '/partner/sites': {
    render: renderAddSitesPage,
    layout: 'partner-dashboard',
    init: AddSites,
    protected: true,
  },
  '/add-sites/create': {
    render: renderAddSitesCreatePage,
    layout: 'partner-dashboard',
    init: AddSitesCreate,
    protected: true,
  },
  '/partner/sites/create': {
    render: renderAddSitesCreatePage,
    layout: 'partner-dashboard',
    init: AddSitesCreate,
    protected: true,
  },
  '/add-sites/block': {
    render: renderAddSitesBlockPage,
    layout: 'partner-dashboard',
    init: AddSitesBlock,
    protected: true,
  },
  '/partner/sites/block': {
    render: renderAddSitesBlockPage,
    layout: 'partner-dashboard',
    init: AddSitesBlock,
    protected: true,
  },
  '/add-sites/site': {
    render: renderAddSitesSitePage,
    layout: 'partner-dashboard',
    init: AddSitesSite,
    protected: true,
  },
  '/partner/income': {
    render: renderPartnerIncomePage,
    layout: 'partner-dashboard',
    init: PartnerIncome,
    protected: true,
  },
  '/partner/payouts': {
    render: renderPartnerPayoutsPage,
    layout: 'partner-dashboard',
    init: PartnerPayouts,
    protected: true,
  },
  '/partner/balance': {
    render: renderPartnerPayoutsPage,
    layout: 'partner-dashboard',
    init: PartnerPayouts,
    protected: true,
  },
  '/partner/sites/site': {
    render: renderAddSitesSitePage,
    layout: 'partner-dashboard',
    init: AddSitesSite,
    protected: true,
  },
  '/profile': {
    render: renderProfilePage,
    layout: 'advertiser-dashboard',
    init: Profile,
    protected: true,
  },
  '/advertiser/profile': {
    render: renderProfilePage,
    layout: 'advertiser-dashboard',
    init: Profile,
    protected: true,
  },
  '/partner/profile': {
    render: renderPartnerProfilePage,
    layout: 'partner-dashboard',
    init: PartnerProfile,
    protected: true,
  },
  '/support': {
    render: renderSupportPage,
    layout: 'advertiser-dashboard',
    init: Support,
    protected: true,
  },
  '/advertiser/support': {
    render: renderSupportPage,
    layout: 'advertiser-dashboard',
    init: Support,
    protected: true,
  },
  '/partner/support': {
    render: renderSupportPage,
    layout: 'partner-dashboard',
    init: Support,
    protected: true,
  },
  '/oferta': {
    render: renderOfertaPage,
    layout: 'public',
  },
  '/privacy': {
    render: renderPrivacyPage,
    layout: 'public',
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
    navigateTo('/advertiser/campaigns', { replace: true });
    return;
  }

  if (route.guestOnly && authState.isAuthenticated()) {
    navigateTo('/advertiser/overview', { replace: true });
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
    } else if (
      route.layout === 'advertiser-dashboard' ||
      route.layout === 'partner-dashboard'
    ) {
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
    triggerPageEnter(outlet);

    const cleanups: RouteCleanup[] = [setupReveal()];

    if (typeof previousCleanup === 'function') {
      previousCleanup();
    }

    if (route.init) {
      const routeCleanup = route.init();
      if (typeof routeCleanup === 'function') {
        cleanups.push(routeCleanup);
      }
    }

    if (route.layout === 'advertiser-dashboard' && isAdvertiserCabinet(path)) {
      syncGlobalBalanceAlert();
    }

    if (
      route.layout === 'public' ||
      route.layout === 'advertiser-dashboard' ||
      route.layout === 'partner-dashboard'
    ) {
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
    app.innerHTML =
      '<h1>\u041e\u0448\u0438\u0431\u043a\u0430</h1><p>\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443</p>';
  }
}
