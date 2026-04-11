export type BuilderMode = 'create' | 'edit';
export type StepKey = 'content' | 'audience' | 'budget' | 'publication';
export type CreativeKey = 'feed' | 'stories' | 'video';
export type MatchingMode = 'any' | 'balanced' | 'strict';
export type PriorityMode = 'primary' | 'secondary';
export type CreativeAssetKey =
  | 'feedVisual'
  | 'storyVisual'
  | 'mainVideo'
  | 'verticalVideo'
  | 'videoCover';
export type AudienceDetailKey = 'geo' | 'age' | 'profile' | 'exclusions' | 'interests';
export type AudienceChipKey = 'geo' | 'retail' | 'b2b' | 'lookalike';
export type StrategyKey = 'even' | 'aggressive' | 'smart';
export type GoalKey = 'website' | 'leads' | 'awareness';
export type FormatKey = 'feed-card' | 'stories' | 'video-15';

export interface BuilderAudienceConfig {
  cities: string[];
  ageRange: string;
  profileTags: string[];
  exclusions: string[];
  interests: string[];
  matchingMode: MatchingMode;
  expansionEnabled: boolean;
  profilePriority: PriorityMode;
  interestsPriority: PriorityMode;
}

export interface BuilderState {
  step: StepKey;
  name: string;
  format: FormatKey;
  goal: GoalKey;
  headline: string;
  description: string;
  cta: string;
  link: string;
  creative: CreativeKey;
  creativeAssets: Partial<Record<CreativeAssetKey, string>>;
  audienceChip: AudienceChipKey;
  audienceConfig: BuilderAudienceConfig;
  dailyBudget: number;
  totalBudget: number;
  period: string;
  strategy: StrategyKey;
}

export interface ToastPayload {
  title: string;
  description: string;
}

export interface AudienceSummary {
  cities: string;
  regionsLabel: string;
  reach: string;
  clicks: string;
  quality: string;
  qualityState: string;
  ageRange: string;
  profile: string;
  profileLabel: string;
  exclusions: string;
  interests: string;
  ctr?: string;
  breadth?: string;
  competition?: string;
  recommendationTitle?: string;
  recommendationText?: string;
}

export interface AudiencePresetSummary extends Omit<
  AudienceSummary,
  | 'ageRange'
  | 'profile'
  | 'profileLabel'
  | 'ctr'
  | 'breadth'
  | 'competition'
  | 'recommendationTitle'
  | 'recommendationText'
> {
  age: string;
}

export interface AudienceModalConfig {
  title: string;
  description: string;
  selectionType: 'single' | 'multiple';
  options: Array<{ value: string; label: string; description?: string }>;
}

export interface SavedAudiencePreset {
  id: string;
  name: string;
  summary: string;
  config: BuilderAudienceConfig;
}

export interface BuilderHealth {
  badge: string;
  title: string;
  text: string;
  isPositive: boolean;
}

export type FinalReviewCheckKey = 'content' | 'creative' | 'audience' | 'budget';

export interface FinalReviewCheck {
  title: string;
  text: string;
  status: string;
  success: boolean;
}

export interface FinalReviewData {
  status: BuilderHealth;
  content: FinalReviewCheck;
  creative: FinalReviewCheck;
  audience: FinalReviewCheck;
  budget: FinalReviewCheck;
}

export interface CampaignEditSeed {
  id: string;
  title: string;
  budgetValue: number;
  goal: string;
}

export type FieldKey =
  | 'name'
  | 'headline'
  | 'description'
  | 'cta'
  | 'link'
  | 'dailyBudget'
  | 'totalBudget'
  | 'period'
  | 'strategy';

export type FieldErrors = Partial<Record<FieldKey, string>>;

export interface BuilderModeConfig {
  title: string;
  subtitle: string;
  closeLabel: string;
  duplicateLabel: string;
  resetLabel: string;
  primaryActionLabel: string;
  saveStateFallback: string;
  reviewTitle: string;
  reviewReadyText: string;
  reviewPendingPrefix: string;
  lockedTitle: string;
  lockedDescription: string;
  submitSuccessTitle: string;
  submitSuccessDescription: string;
  submitValidationTitle: string;
}
