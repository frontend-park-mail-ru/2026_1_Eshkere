import './moderator-audit.scss';
import { moderationAuditLog } from 'features/moderation/model/mock';
import { renderTemplate } from 'shared/lib/render';
import template from './moderator-audit.hbs';

export async function renderModeratorAuditPage(): Promise<string> {
  const actors = [...new Set(moderationAuditLog.map((i) => i.actor))];

  return renderTemplate(template, {
    items: moderationAuditLog,
    actors,
    stats: {
      total: moderationAuditLog.length,
      actors: actors.length,
    },
  });
}

export function ModeratorAuditPage(): VoidFunction {
  const root = document.querySelector<HTMLElement>('.moderator-audit-page');
  if (!root) return () => {};

  const entries = Array.from(root.querySelectorAll<HTMLElement>('[data-entry-id]'));
  const searchInput = root.querySelector<HTMLInputElement>('[data-audit-search]');
  const actorFilter = root.querySelector<HTMLSelectElement>('[data-audit-actor-filter]');
  const emptyState = root.querySelector<HTMLElement>('[data-audit-empty]');

  const renderState = (): void => {
    const query = searchInput?.value.trim().toLowerCase() ?? '';
    const actor = actorFilter?.value ?? 'all';
    let visibleCount = 0;

    entries.forEach((entry) => {
      const searchable = (entry.dataset.searchable ?? '').toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesActor = actor === 'all' || entry.dataset.actor === actor;
      const visible = matchesQuery && matchesActor;
      entry.hidden = !visible;
      if (visible) visibleCount++;
    });

    if (emptyState) emptyState.hidden = visibleCount > 0;
  };

  searchInput?.addEventListener('input', renderState);
  actorFilter?.addEventListener('change', renderState);

  renderState();
  return () => {};
}
