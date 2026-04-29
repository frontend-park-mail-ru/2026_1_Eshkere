import './moderator-sidebar.scss';
import { renderTemplate } from 'shared/lib/render';
import moderatorSidebarTemplate from './moderator-sidebar.hbs';

export async function renderModeratorSidebar(pathname = '/moderator'): Promise<string> {
  return renderTemplate(moderatorSidebarTemplate, {
    isQueue:
      pathname === '/moderator' ||
      pathname === '/moderator/queue' ||
      pathname === '/moderator/case',
    isAppeals: pathname === '/moderator/appeals',
    isMessages: pathname === '/moderator/messages',
    isPolicies: pathname === '/moderator/policies',
    isAudit: pathname === '/moderator/audit',
  });
}
