import { syncCampaignEditCtaSelect } from 'widgets/campaign-edit-cta/ui/cta-select';
import { syncCampaignEditOverview } from 'widgets/campaign-edit-overview/ui/overview';
import type { CampaignEditState } from './campaign-edit-types';
import { getCtaLabel } from './campaign-edit-state';
import { createChangeSummary } from './campaign-edit-view-model';

export function syncCampaignEdit(
  state: CampaignEditState,
  dirty: boolean,
): void {
  syncCampaignEditOverview({
    ctaLabel: getCtaLabel(state.cta),
    ctr: state.ctr,
    description: state.description,
    dirty,
    headline: state.headline,
    history: state.history,
    moderationBadge: state.moderationBadge,
    remainingBudget: state.remainingBudget,
    summary: createChangeSummary(state),
    updatedLabel: state.updatedLabel,
  });
  syncCampaignEditCtaSelect(state.cta, getCtaLabel);
}
