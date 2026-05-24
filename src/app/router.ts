import { authState } from 'features/auth';
import { getCurrentPath, navigateTo } from 'shared/lib/navigation';
import {
  triggerPageEnter,
  setupReveal,
  setupMotionEnhancements,
} from 'shared/lib/animations';
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
type RouteRender = () => Promise<string>;
type PageModule = Record<string, unknown>;
type NavbarModule = typeof import('widgets/navbar');

interface LazyPage {
  render: RouteRender;
  init: RouteInit;
}

let navbarModulePromise: Promise<NavbarModule> | null = null;

async function initNavbar(): Promise<RouteCleanup | void> {
  navbarModulePromise ??= import(
    /* webpackChunkName: "widget-navbar" */ 'widgets/navbar'
  );
  const { Navbar } = await navbarModulePromise;
  return Navbar();
}

function createLazyPage<TModule extends PageModule>(
  loadPageModule: () => Promise<TModule>,
  selectRender: (pageModule: TModule) => RouteRender,
  selectInit?: (pageModule: TModule) => RouteInit,
): LazyPage {
  let pageModulePromise: Promise<TModule> | null = null;
  let activePageModule: TModule | null = null;

  const getPageModule = async (): Promise<TModule> => {
    pageModulePromise ??= loadPageModule();
    activePageModule = await pageModulePromise;
    return activePageModule;
  };

  return {
    render: async () => selectRender(await getPageModule())(),
    init: () => {
      if (!activePageModule || !selectInit) {
        return;
      }

      return selectInit(activePageModule)();
    },
  };
}

function createLazyRender<TModule extends PageModule>(
  loadPageModule: () => Promise<TModule>,
  selectRender: (pageModule: TModule) => RouteRender,
): RouteRender {
  return async () => selectRender(await loadPageModule())();
}

const homePage = createLazyPage(
  () => import(/* webpackChunkName: "page-home" */ 'pages/home'),
  (pageModule) => pageModule.renderHomePage,
  (pageModule) => pageModule.Home,
);
const loginPage = createLazyPage(
  () => import(/* webpackChunkName: "page-auth" */ 'pages/login'),
  (pageModule) => pageModule.renderLoginPage,
  (pageModule) => pageModule.Login,
);
const forgotPasswordPage = createLazyPage(
  () => import(/* webpackChunkName: "page-auth" */ 'pages/forgot-password'),
  (pageModule) => pageModule.renderForgotPasswordPage,
  (pageModule) => pageModule.ForgotPassword,
);
const registerPage = createLazyPage(
  () => import(/* webpackChunkName: "page-auth" */ 'pages/register'),
  (pageModule) => pageModule.renderRegisterPage,
  (pageModule) => pageModule.Register,
);
const partnerRegisterPage = createLazyPage(
  () => import(/* webpackChunkName: "page-partner-auth" */ 'pages/partner-register'),
  (pageModule) => pageModule.renderPartnerRegisterPage,
  (pageModule) => pageModule.PartnerRegister,
);
const adsPage = createLazyPage(
  () => import(/* webpackChunkName: "page-advertiser-campaigns" */ 'pages/ads'),
  (pageModule) => pageModule.renderAdsPage,
  (pageModule) => pageModule.Ads,
);
const campaignWizardPage = createLazyPage(
  () => import(/* webpackChunkName: "page-campaign-wizard" */ 'pages/campaign-wizard'),
  (pageModule) => pageModule.renderCampaignWizardPage,
  (pageModule) => pageModule.CampaignWizard,
);
const campaignCreatePage = createLazyPage(
  () => import(/* webpackChunkName: "page-campaign-create" */ 'pages/campaign-create'),
  (pageModule) => pageModule.renderCampaignCreatePage,
  (pageModule) => pageModule.CampaignCreate,
);
const campaignStatsPage = createLazyPage(
  () => import(/* webpackChunkName: "page-campaign-stats" */ 'pages/campaign-stats'),
  (pageModule) => pageModule.renderCampaignStatsPage,
  (pageModule) => pageModule.CampaignStats,
);
const groupStatsPage = createLazyPage(
  () => import(/* webpackChunkName: "page-group-stats" */ 'pages/group-stats'),
  (pageModule) => pageModule.renderGroupStatsPage,
  (pageModule) => pageModule.GroupStats,
);
const adStatsPage = createLazyPage(
  () => import(/* webpackChunkName: "page-ad-stats" */ 'pages/ad-stats'),
  (pageModule) => pageModule.renderAdStatsPage,
  (pageModule) => pageModule.AdStats,
);
const campaignDetailPage = createLazyPage(
  () => import(/* webpackChunkName: "page-campaign-detail" */ 'pages/campaign-detail'),
  (pageModule) => pageModule.renderCampaignDetailPage,
  (pageModule) => pageModule.CampaignDetail,
);
const campaignEditFormPage = createLazyPage(
  () => import(/* webpackChunkName: "page-campaign-edit" */ 'pages/campaign-edit-form'),
  (pageModule) => pageModule.renderCampaignEditFormPage,
  (pageModule) => pageModule.CampaignEditForm,
);
const adGroupCreatePage = createLazyPage(
  () => import(/* webpackChunkName: "page-ad-group-create" */ 'pages/ad-group-create'),
  (pageModule) => pageModule.renderAdGroupCreatePage,
  (pageModule) => pageModule.AdGroupCreate,
);
const adGroupEditPage = createLazyPage(
  () => import(/* webpackChunkName: "page-ad-group-edit" */ 'pages/ad-group-edit'),
  (pageModule) => pageModule.renderAdGroupEditPage,
  (pageModule) => pageModule.AdGroupEdit,
);
const adCreatePage = createLazyPage(
  () => import(/* webpackChunkName: "page-ad-create" */ 'pages/ad-create'),
  (pageModule) => pageModule.renderAdCreatePage,
  (pageModule) => pageModule.AdCreate,
);
const adEditPage = createLazyPage(
  () => import(/* webpackChunkName: "page-ad-edit" */ 'pages/ad-edit'),
  (pageModule) => pageModule.renderAdEditPage,
  (pageModule) => pageModule.AdEdit,
);
const overviewPage = createLazyPage(
  () => import(/* webpackChunkName: "page-overview" */ 'pages/overview'),
  (pageModule) => pageModule.renderOverviewPage,
  (pageModule) => pageModule.Overview,
);
const balancePage = createLazyPage(
  () => import(/* webpackChunkName: "page-balance" */ 'pages/balance'),
  (pageModule) => pageModule.renderBalancePage,
  (pageModule) => pageModule.Balance,
);
const profilePage = createLazyPage(
  () => import(/* webpackChunkName: "page-profile" */ 'pages/profile'),
  (pageModule) => pageModule.renderProfilePage,
  (pageModule) => pageModule.Profile,
);
const supportPage = createLazyPage(
  () => import(/* webpackChunkName: "page-support" */ 'pages/support'),
  (pageModule) => pageModule.renderSupportPage,
  (pageModule) => pageModule.Support,
);
const addSitesPage = createLazyPage(
  () => import(/* webpackChunkName: "page-partner-sites" */ 'pages/add-sites'),
  (pageModule) => pageModule.renderAddSitesPage,
  (pageModule) => pageModule.AddSites,
);
const addSitesCreatePage = createLazyPage(
  () => import(/* webpackChunkName: "page-partner-site-create" */ 'pages/add-sites-create'),
  (pageModule) => pageModule.renderAddSitesCreatePage,
  (pageModule) => pageModule.AddSitesCreate,
);
const addSitesBlockPage = createLazyPage(
  () => import(/* webpackChunkName: "page-partner-block" */ 'pages/add-sites-block'),
  (pageModule) => pageModule.renderAddSitesBlockPage,
  (pageModule) => pageModule.AddSitesBlock,
);
const addSitesSitePage = createLazyPage(
  () => import(/* webpackChunkName: "page-partner-site" */ 'pages/add-sites-site'),
  (pageModule) => pageModule.renderAddSitesSitePage,
  (pageModule) => pageModule.AddSitesSite,
);
const addSitesBlockEditPage = createLazyPage(
  () => import(/* webpackChunkName: "page-partner-block-edit" */ 'pages/add-sites-block-edit'),
  (pageModule) => pageModule.renderAddSitesBlockEditPage,
  (pageModule) => pageModule.AddSitesBlockEdit,
);
const partnerOverviewPage = createLazyPage(
  () => import(/* webpackChunkName: "page-partner-overview" */ 'pages/partner-overview'),
  (pageModule) => pageModule.renderPartnerOverviewPage,
  (pageModule) => pageModule.PartnerOverview,
);
const partnerIncomePage = createLazyPage(
  () => import(/* webpackChunkName: "page-partner-income" */ 'pages/partner-income'),
  (pageModule) => pageModule.renderPartnerIncomePage,
  (pageModule) => pageModule.PartnerIncome,
);
const partnerPayoutsPage = createLazyPage(
  () => import(/* webpackChunkName: "page-partner-payouts" */ 'pages/partner-payouts'),
  (pageModule) => pageModule.renderPartnerPayoutsPage,
  (pageModule) => pageModule.PartnerPayouts,
);
const partnerProfilePage = createLazyPage(
  () => import(/* webpackChunkName: "page-partner-profile" */ 'pages/partner-profile'),
  (pageModule) => pageModule.renderPartnerProfilePage,
  (pageModule) => pageModule.PartnerProfile,
);
const moderatorQueuePage = createLazyPage(
  () => import(/* webpackChunkName: "page-moderator" */ 'pages/moderator-queue'),
  (pageModule) => pageModule.renderModeratorQueuePage,
  (pageModule) => pageModule.ModeratorQueuePage,
);
const moderatorCasePage = createLazyPage(
  () => import(/* webpackChunkName: "page-moderator" */ 'pages/moderator-case'),
  (pageModule) => pageModule.renderModeratorCasePage,
  (pageModule) => pageModule.ModeratorCasePage,
);
const moderatorAppealsPage = createLazyPage(
  () => import(/* webpackChunkName: "page-moderator" */ 'pages/moderator-appeals'),
  (pageModule) => pageModule.renderModeratorAppealsPage,
  (pageModule) => pageModule.ModeratorAppealsPage,
);
const moderatorMessagesPage = createLazyPage(
  () => import(/* webpackChunkName: "page-moderator" */ 'pages/moderator-messages'),
  (pageModule) => pageModule.renderModeratorMessagesPage,
  (pageModule) => pageModule.ModeratorMessagesPage,
);
const moderatorPoliciesPage = createLazyPage(
  () => import(/* webpackChunkName: "page-moderator" */ 'pages/moderator-policies'),
  (pageModule) => pageModule.renderModeratorPoliciesPage,
  (pageModule) => pageModule.ModeratorPoliciesPage,
);
const moderatorAuditPage = createLazyPage(
  () => import(/* webpackChunkName: "page-moderator" */ 'pages/moderator-audit'),
  (pageModule) => pageModule.renderModeratorAuditPage,
  (pageModule) => pageModule.ModeratorAuditPage,
);

const renderHomePage = homePage.render;
const Home = homePage.init;
const renderLoginPage = loginPage.render;
const Login = loginPage.init;
const renderForgotPasswordPage = forgotPasswordPage.render;
const ForgotPassword = forgotPasswordPage.init;
const renderRegisterPage = registerPage.render;
const Register = registerPage.init;
const renderPartnerRegisterPage = partnerRegisterPage.render;
const PartnerRegister = partnerRegisterPage.init;
const renderAdsPage = adsPage.render;
const Ads = adsPage.init;
const renderCampaignWizardPage = campaignWizardPage.render;
const CampaignWizard = campaignWizardPage.init;
const renderCampaignCreatePage = campaignCreatePage.render;
const CampaignCreate = campaignCreatePage.init;
const renderCampaignStatsPage = campaignStatsPage.render;
const CampaignStats = campaignStatsPage.init;
const renderGroupStatsPage = groupStatsPage.render;
const GroupStats = groupStatsPage.init;
const renderAdStatsPage = adStatsPage.render;
const AdStats = adStatsPage.init;
const renderCampaignDetailPage = campaignDetailPage.render;
const CampaignDetail = campaignDetailPage.init;
const renderCampaignEditFormPage = campaignEditFormPage.render;
const CampaignEditForm = campaignEditFormPage.init;
const renderAdGroupCreatePage = adGroupCreatePage.render;
const AdGroupCreate = adGroupCreatePage.init;
const renderAdGroupEditPage = adGroupEditPage.render;
const AdGroupEdit = adGroupEditPage.init;
const renderAdCreatePage = adCreatePage.render;
const AdCreate = adCreatePage.init;
const renderAdEditPage = adEditPage.render;
const AdEdit = adEditPage.init;
const renderOverviewPage = overviewPage.render;
const Overview = overviewPage.init;
const renderBalancePage = balancePage.render;
const Balance = balancePage.init;
const renderProfilePage = profilePage.render;
const Profile = profilePage.init;
const renderSupportPage = supportPage.render;
const Support = supportPage.init;
const renderAddSitesPage = addSitesPage.render;
const AddSites = addSitesPage.init;
const renderAddSitesCreatePage = addSitesCreatePage.render;
const AddSitesCreate = addSitesCreatePage.init;
const renderAddSitesBlockPage = addSitesBlockPage.render;
const AddSitesBlock = addSitesBlockPage.init;
const renderAddSitesSitePage = addSitesSitePage.render;
const AddSitesSite = addSitesSitePage.init;
const renderPartnerOverviewPage = partnerOverviewPage.render;
const PartnerOverview = partnerOverviewPage.init;
const renderPartnerIncomePage = partnerIncomePage.render;
const PartnerIncome = partnerIncomePage.init;
const renderPartnerPayoutsPage = partnerPayoutsPage.render;
const PartnerPayouts = partnerPayoutsPage.init;
const renderPartnerProfilePage = partnerProfilePage.render;
const PartnerProfile = partnerProfilePage.init;
const renderModeratorQueuePage = moderatorQueuePage.render;
const ModeratorQueuePage = moderatorQueuePage.init;
const renderModeratorCasePage = moderatorCasePage.render;
const ModeratorCasePage = moderatorCasePage.init;
const renderModeratorAppealsPage = moderatorAppealsPage.render;
const ModeratorAppealsPage = moderatorAppealsPage.init;
const renderModeratorMessagesPage = moderatorMessagesPage.render;
const ModeratorMessagesPage = moderatorMessagesPage.init;
const renderModeratorPoliciesPage = moderatorPoliciesPage.render;
const ModeratorPoliciesPage = moderatorPoliciesPage.init;
const renderModeratorAuditPage = moderatorAuditPage.render;
const ModeratorAuditPage = moderatorAuditPage.init;
const renderOfertaPage = createLazyRender(
  () => import(/* webpackChunkName: "page-legal" */ 'pages/oferta'),
  (pageModule) => pageModule.renderOfertaPage,
);
const renderPrivacyPage = createLazyRender(
  () => import(/* webpackChunkName: "page-legal" */ 'pages/privacy'),
  (pageModule) => pageModule.renderPrivacyPage,
);
const renderNotFoundPage = createLazyRender(
  () => import(/* webpackChunkName: "page-not-found" */ 'pages/not-found'),
  (pageModule) => pageModule.renderNotFoundPage,
);

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
  '/partner/register': {
    render: renderPartnerRegisterPage,
    layout: 'public',
    init: PartnerRegister,
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
  '/partner/sites/block-edit': {
    render: addSitesBlockEditPage.render,
    layout: 'partner-dashboard',
    init: addSitesBlockEditPage.init,
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
    setupMotionEnhancements(outlet);

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
      const navbarCleanup = await initNavbar();
      if (typeof navbarCleanup === 'function') {
        cleanups.push(navbarCleanup);
      }
    } else if (route.layout === 'moderator') {
      const moderatorNavbarCleanup = await initModeratorNavbar();
      if (typeof moderatorNavbarCleanup === 'function') {
        cleanups.push(moderatorNavbarCleanup);
      }
    }

    setupMotionEnhancements(document);

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
