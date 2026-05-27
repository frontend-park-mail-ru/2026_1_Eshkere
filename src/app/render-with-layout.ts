/**
 * @typedef {'public' | 'dashboard'} LayoutKind
 */
/**
 * Полная разметка лейаута без контента страницы (только оболочка).
 *
 * @param {LayoutKind} layout Вариант оболочки.
 * @param {string} [pathname='/'] Путь для navbar (только public).
 * @return {Promise<string>} HTML для #app.
 */

export type LayoutKind =
  | 'public'
  | 'advertiser-dashboard'
  | 'partner-dashboard'
  | 'moderator';

type PublicLayoutModule = typeof import('app/components/public-layout');
type DashboardLayoutModule = typeof import('app/components/dashboard-layout');
type ModeratorLayoutModule = typeof import('app/components/moderator-layout');

let publicLayoutModulePromise: Promise<PublicLayoutModule> | null = null;
let dashboardLayoutModulePromise: Promise<DashboardLayoutModule> | null = null;
let moderatorLayoutModulePromise: Promise<ModeratorLayoutModule> | null = null;

function loadPublicLayout(): Promise<PublicLayoutModule> {
  publicLayoutModulePromise ??= import(
    /* webpackChunkName: "layout-public" */ 'app/components/public-layout'
  );
  return publicLayoutModulePromise;
}

function loadDashboardLayout(): Promise<DashboardLayoutModule> {
  dashboardLayoutModulePromise ??= import(
    /* webpackChunkName: "layout-dashboard" */ 'app/components/dashboard-layout'
  );
  return dashboardLayoutModulePromise;
}

function loadModeratorLayout(): Promise<ModeratorLayoutModule> {
  moderatorLayoutModulePromise ??= import(
    /* webpackChunkName: "layout-moderator" */ 'app/components/moderator-layout'
  );
  return moderatorLayoutModulePromise;
}

export async function renderLayoutShell(
  layout: LayoutKind,
  pathname: string = '/',
): Promise<string> {
  if (
    layout === 'advertiser-dashboard' ||
    layout === 'partner-dashboard'
  ) {
    const { renderDashboardLayout } = await loadDashboardLayout();
    return renderDashboardLayout('', pathname);
  }
  if (layout === 'moderator') {
    const { renderModeratorLayout } = await loadModeratorLayout();
    return renderModeratorLayout('', pathname);
  }
  const { renderPublicLayout } = await loadPublicLayout();
  return renderPublicLayout('', pathname);
}

export async function updatePublicNavbarSlot(
  pathname: string = '/',
): Promise<void> {
  const { updatePublicNavbarSlot: updateSlot } = await loadPublicLayout();
  await updateSlot(pathname);
}

export async function updateDashboardLayoutSlots(
  pathname: string = '/ads',
): Promise<void> {
  const { updateDashboardLayoutSlots: updateSlots } = await loadDashboardLayout();
  await updateSlots(pathname);
}

export async function updateModeratorLayoutSlots(
  pathname: string = '/moderator',
): Promise<void> {
  const { updateModeratorLayoutSlots: updateSlots } = await loadModeratorLayout();
  await updateSlots(pathname);
}

export async function initModeratorNavbar(): Promise<VoidFunction | void> {
  const { initModeratorNavbar: initNavbar } = await loadModeratorLayout();
  return initNavbar();
}
