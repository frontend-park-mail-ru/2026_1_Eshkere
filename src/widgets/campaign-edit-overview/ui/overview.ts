import { formatPrice } from 'shared/lib/format';

interface CampaignEditHistoryItem {
  time: string;
  title: string;
  text: string;
}

interface CampaignEditSummaryItem {
  key: string;
  label: string;
  value: string;
}

interface CampaignEditOverviewState {
  ctaLabel: string;
  ctr: number;
  description: string;
  dirty: boolean;
  headline: string;
  history: CampaignEditHistoryItem[];
  moderationBadge: string;
  remainingBudget: number;
  summary: CampaignEditSummaryItem[];
  updatedLabel: string;
}

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) {
    node.textContent = value;
  }
}

function renderHistory(history: CampaignEditHistoryItem[]): void {
  const historyRoot = document.querySelector<HTMLElement>('[data-edit-history]');
  if (!historyRoot) {
    return;
  }

  historyRoot.innerHTML = history
    .map(
      (item) => `
        <article class="campaign-edit__history-item">
          <span class="campaign-edit__history-time">${item.time}</span>
          <div class="campaign-edit__history-copy">
            <strong class="campaign-edit__history-title">${item.title}</strong>
            <p class="campaign-edit__history-text">${item.text}</p>
          </div>
        </article>
      `,
    )
    .join('');
}

function renderSummary(summary: CampaignEditSummaryItem[]): void {
  const summaryRoot = document.querySelector<HTMLElement>('[data-edit-summary]');
  if (!summaryRoot) {
    return;
  }

  summaryRoot.innerHTML = summary
    .map(
      (item) => `
        <div class="campaign-edit__summary-row">
          <span class="campaign-edit__summary-key">${item.label}</span>
          <strong class="campaign-edit__summary-value" data-edit-summary-value="${item.key}">
            ${item.value}
          </strong>
        </div>
      `,
    )
    .join('');
}

export function syncCampaignEditOverview(
  state: CampaignEditOverviewState,
): void {
  setText('[data-edit-preview="headline"]', state.headline);
  setText('[data-edit-preview="description"]', state.description);
  setText('[data-edit-preview="cta"]', state.ctaLabel);
  setText('[data-edit-stat="updated"]', state.updatedLabel);
  setText('[data-edit-stat="budget"]', formatPrice(state.remainingBudget));
  setText('[data-edit-stat="ctr"]', `${state.ctr.toFixed(1)}%`);
  setText('[data-edit-moderation-badge]', state.moderationBadge);

  const saveStateNode = document.querySelector<HTMLElement>(
    '[data-edit-save-state]',
  );
  if (saveStateNode) {
    saveStateNode.textContent = state.dirty
      ? 'Есть несохранённые изменения'
      : 'Черновик сохранён';
    saveStateNode.dataset.state = state.dirty ? 'dirty' : 'saved';
  }

  renderHistory(state.history);
  renderSummary(state.summary);
}
