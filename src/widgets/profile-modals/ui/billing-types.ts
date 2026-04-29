import type { ProfileState, TariffKey, TariffMeta } from 'features/profile/model/types';

export interface InitProfileBillingSectionParams {
  closeModalById: (id: string) => void;
  getTariffMeta: (tariffKey: TariffKey) => TariffMeta;
  onStateChange: (state: ProfileState) => void;
  refreshSubmitStates: (state: ProfileState) => void;
  signal: AbortSignal;
  state: ProfileState;
}
