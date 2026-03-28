import {
  renderPublicLayout,
  updatePublicNavbarSlot,
} from 'app/components/public-layout';
import { renderDashboardLayout } from 'app/components/dashboard-layout';
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
export async function renderLayoutShell(layout, pathname = '/') {
  if (layout === 'dashboard') {
    return renderDashboardLayout('');
  }
  return renderPublicLayout('', pathname);
}
export { updatePublicNavbarSlot };
