import type { ProfileState } from 'features/profile/model/types';

export interface InitProfileAccountSectionParams {
  closeModalById: (id: string) => void;
  cropAvatar: (file: File) => Promise<{ blob: Blob; dataUrl: string } | null>;
  getInitials: (firstName: string, lastName: string) => string;
  onStateChange: (state: ProfileState) => void;
  refreshSubmitStates: (state: ProfileState) => void;
  signal: AbortSignal;
  state: ProfileState;
}
