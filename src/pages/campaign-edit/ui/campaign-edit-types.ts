export type CtaKey = 'discount' | 'start' | 'details' | 'lead';

export interface CampaignEditHistoryItem {
  time: string;
  title: string;
  text: string;
}

export interface CampaignEditState {
  id: string;
  name: string;
  headline: string;
  description: string;
  cta: CtaKey;
  dailyBudget: number;
  period: string;
  status: string;
  updatedLabel: string;
  remainingBudget: number;
  ctr: number;
  moderationBadge: string;
  format: string;
  goal: string;
  placements: string;
  geography: string;
  creatives: number;
  baseline: {
    name: string;
    headline: string;
    description: string;
    cta: CtaKey;
    dailyBudget: number;
    period: string;
  };
  history: CampaignEditHistoryItem[];
}

export interface CampaignEditTemplateContext {
  moderationBadge: string;
  saveState: string;
  stats: Array<{ key: string; label: string; value: string }>;
  form: {
    name: string;
    headline: string;
    description: string;
    cta: string;
    dailyBudget: string;
    period: string;
  };
  preview: {
    headline: string;
    description: string;
    cta: string;
  };
  history: CampaignEditHistoryItem[];
  summary: Array<{ key: string; label: string; value: string }>;
  ctaOptions: Array<{ value: CtaKey; label: string; selected: boolean }>;
}
