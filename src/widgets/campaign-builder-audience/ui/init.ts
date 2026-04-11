import type {
  AudienceDetailKey,
  AudienceModalConfig,
  BuilderState,
  SavedAudiencePreset,
  ToastPayload,
} from 'features/campaign-builder/model/types';
import { initCampaignBuilderAudienceModal } from './modal';
import { initCampaignBuilderAudiencePresets } from './presets';

interface ProfileSelectionState {
  canSave: boolean;
  label: string;
  note: string;
  tone: 'warning' | 'success' | 'info';
}

interface InitCampaignBuilderAudienceControlsParams {
  cloneAudienceConfig: (
    value: BuilderState['audienceConfig'],
  ) => BuilderState['audienceConfig'];
  formatSavedAudienceSummary: (config: BuilderState['audienceConfig']) => string;
  getAudienceModalConfig: (key: AudienceDetailKey) => AudienceModalConfig;
  getProfileSelectionState: (profileTags: string[]) => ProfileSelectionState;
  getSavedAudiences: () => SavedAudiencePreset[];
  persistSavedAudiences: (items: SavedAudiencePreset[]) => void;
  persistState: (state: BuilderState) => void;
  renderSavedAudiencesList: (state: BuilderState) => void;
  showToast: (payload: ToastPayload) => void;
  signal: AbortSignal;
  state: BuilderState;
  syncBuilder: (state: BuilderState) => void;
}

export function initCampaignBuilderAudienceControls({
  cloneAudienceConfig,
  formatSavedAudienceSummary,
  getAudienceModalConfig,
  getProfileSelectionState,
  getSavedAudiences,
  persistSavedAudiences,
  persistState,
  renderSavedAudiencesList,
  showToast,
  signal,
  state,
  syncBuilder,
}: InitCampaignBuilderAudienceControlsParams): void {
  initCampaignBuilderAudiencePresets({
    cloneAudienceConfig,
    formatSavedAudienceSummary,
    getSavedAudiences,
    persistSavedAudiences,
    persistState,
    renderSavedAudiencesList,
    showToast,
    signal,
    state,
    syncBuilder,
  });

  initCampaignBuilderAudienceModal({
    getAudienceModalConfig,
    getProfileSelectionState,
    persistState,
    showToast,
    signal,
    state,
    syncBuilder,
  });
}
