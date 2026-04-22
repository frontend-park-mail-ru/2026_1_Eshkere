import './moderator-layout.scss';
import { renderTemplate } from 'shared/lib/render';
import {
  renderModeratorNavbar,
  initModeratorNavbar,
} from 'widgets/moderator-navbar/ui/moderator-navbar';
import { renderModeratorSidebar } from 'widgets/moderator-sidebar/ui/moderator-sidebar';
import moderatorLayoutTemplate from './moderator-layout.hbs';

export async function renderModeratorLayout(
  content: string,
  pathname: string = '/moderator',
): Promise<string> {
  const navbar = await renderModeratorNavbar(pathname);
  const sidebar = await renderModeratorSidebar(pathname);
  const isCaseView = pathname === '/moderator/case';

  return renderTemplate(moderatorLayoutTemplate, {
    navbar,
    sidebar,
    content,
    isCaseView,
  });
}

export async function updateModeratorLayoutSlots(
  pathname: string = '/moderator',
): Promise<void> {
  const layoutRoot = document.querySelector<HTMLElement>('.moderator-layout');
  const navbarSlot = document.getElementById('app-moderator-navbar-slot');
  const sidebarSlot = document.getElementById('app-moderator-sidebar-slot');
  const isCaseView = pathname === '/moderator/case';

  layoutRoot?.classList.toggle('moderator-layout--case-view', isCaseView);

  if (navbarSlot) {
    navbarSlot.innerHTML = await renderModeratorNavbar(pathname);
  }

  if (sidebarSlot) {
    sidebarSlot.innerHTML = await renderModeratorSidebar(pathname);
  }
}

export { initModeratorNavbar };
