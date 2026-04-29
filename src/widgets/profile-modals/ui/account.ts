import { initProfileAvatarForm } from './account-avatar';
import { initProfileConfirmationForm } from './account-confirmation';
import { initProfilePasswordForm } from './account-password';

import type { InitProfileAccountSectionParams } from './account-types';

export function initProfileAccountModals(params: InitProfileAccountSectionParams): void {
  initProfilePasswordForm(params);
  initProfileAvatarForm(params);
  initProfileConfirmationForm(params);
}
