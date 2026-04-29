import type { AudienceDetailKey, AudienceModalConfig, BuilderState, ToastPayload } from 'features/campaign-builder/model/types';
import type { ProfileSelectionState } from './modal-view';

export interface InitCampaignBuilderAudienceModalParams {
  getAudienceModalConfig: (key: AudienceDetailKey) => AudienceModalConfig;
  getProfileSelectionState: (profileTags: string[]) => ProfileSelectionState;
  persistState: (state: BuilderState) => void;
  showToast: (payload: ToastPayload) => void;
  signal: AbortSignal;
  state: BuilderState;
  syncBuilder: (state: BuilderState) => void;
}

export interface CampaignBuilderAudienceModalElements {
  audienceModal: HTMLElement | null;
  audienceModalOptions: HTMLElement | null;
  audienceModalSave: HTMLButtonElement | null;
  audienceModalSearch: HTMLInputElement | null;
  audienceModalSearchField: HTMLElement | null;
}

export interface CampaignBuilderAudienceModalRuntimeState {
  activeAudienceModal: AudienceDetailKey | null;
  currentAudienceSearch: string;
  audienceModalCloseTimer: number | null;
  draftAudienceConfig: BuilderState['audienceConfig'] | null;
}
