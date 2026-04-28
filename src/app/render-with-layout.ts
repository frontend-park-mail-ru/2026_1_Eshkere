import {
  renderPublicLayout,
  updatePublicNavbarSlot,
} from 'app/components/public-layout';
import {
  renderDashboardLayout,
  updateDashboardLayoutSlots,
} from 'app/components/dashboard-layout';
import {
  initModeratorNavbar,
  renderModeratorLayout,
  updateModeratorLayoutSlots,
} from 'app/components/moderator-layout';
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

export type LayoutKind = 'public' | 'dashboard' | 'moderator';

export async function renderLayoutShell(
  layout: LayoutKind,
  pathname: string = '/',
): Promise<string> {
  if (layout === 'dashboard') {
    return renderDashboardLayout('', pathname);
  }
  if (layout === 'moderator') {
    return renderModeratorLayout('', pathname);
  }
  return renderPublicLayout('', pathname);
}
export { updatePublicNavbarSlot };
export { updateDashboardLayoutSlots };
export { updateModeratorLayoutSlots };
export { initModeratorNavbar };
