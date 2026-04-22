import './moderator-policies.scss';
import { moderationPolicies } from 'features/moderation/model/mock';
import { renderTemplate } from 'shared/lib/render';
import template from './moderator-policies.hbs';

function getSeverityTone(severity: string): string {
  if (severity === 'Critical') return 'critical';
  if (severity === 'High') return 'high';
  return 'medium';
}

export async function renderModeratorPoliciesPage(): Promise<string> {
  const items = moderationPolicies.map((item) => ({
    ...item,
    severityTone: getSeverityTone(item.severity),
  }));

  const categories = [...new Set(moderationPolicies.map((i) => i.category))];

  return renderTemplate(template, {
    items,
    categories,
    stats: {
      critical: moderationPolicies.filter((i) => i.severity === 'Critical').length,
      high: moderationPolicies.filter((i) => i.severity === 'High').length,
      medium: moderationPolicies.filter((i) => i.severity === 'Medium').length,
    },
  });
}

export function ModeratorPoliciesPage(): VoidFunction {
  const root = document.querySelector<HTMLElement>('.moderator-policies-page');
  if (!root) return () => {};

  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-policy-code]'));
  const searchInput = root.querySelector<HTMLInputElement>('[data-policies-search]');
  const severityFilter = root.querySelector<HTMLSelectElement>('[data-policies-severity-filter]');
  const categoryFilter = root.querySelector<HTMLSelectElement>('[data-policies-category-filter]');
  const emptyState = root.querySelector<HTMLElement>('[data-policies-empty]');

  const renderState = (): void => {
    const query = searchInput?.value.trim().toLowerCase() ?? '';
    const severity = severityFilter?.value ?? 'all';
    const category = categoryFilter?.value ?? 'all';
    let visibleCount = 0;

    cards.forEach((card) => {
      const searchable = (card.dataset.searchable ?? '').toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesSeverity = severity === 'all' || card.dataset.severity === severity;
      const matchesCategory = category === 'all' || card.dataset.category === category;
      const visible = matchesQuery && matchesSeverity && matchesCategory;
      card.hidden = !visible;
      if (visible) visibleCount++;
    });

    if (emptyState) emptyState.hidden = visibleCount > 0;
  };

  searchInput?.addEventListener('input', renderState);
  severityFilter?.addEventListener('change', renderState);
  categoryFilter?.addEventListener('change', renderState);

  renderState();
  return () => {};
}
