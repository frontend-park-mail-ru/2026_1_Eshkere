export { updateProfile } from './api/update-profile';
export { updateAvatar } from './api/update-avatar';
export type { UpdateProfileParams, AdvertiserProfileResponse } from './api/update-profile';

export {
  clearFormState,
  clearFieldError,
  setFieldError,
  setFormMessage,
  validateRequired,
  watchFormState,
  formatPhoneInput,
  getModalStep,
  getNamedFormValue,
  setStepState,
  validateConfirmationCode,
  watchTwoStepFormState,
  getTwoStepSubmitEnabled,
  setSubmitEnabled,
  attachMaskedInput,
} from './lib/form';

export {
  getInitials,
  getTariffMeta,
  getAccountStatusLabel,
  getAccountActionText,
  toTemplateContext,
  persistUserState,
} from './model/state';
export type {
  ProfileState,
  ProfileField,
  TariffKey,
  TariffMeta,
  AccountStatus,
} from './model/types';
