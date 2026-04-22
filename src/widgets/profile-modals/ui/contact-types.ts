import type { ProfileState } from 'features/profile/model/types';

export interface InitProfileContactSectionParams {
  closeModalById: (id: string) => void;
  onStateChange: (state: ProfileState) => void;
  refreshSubmitStates: (state: ProfileState) => void;
  signal: AbortSignal;
  state: ProfileState;
}
