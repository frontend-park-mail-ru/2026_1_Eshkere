import { initProfileEmailForm } from './contact-email';
import { initProfilePhoneForm } from './contact-phone';
import { initProfileEditForm } from './contact-profile';

import type { InitProfileContactSectionParams } from './contact-types';

export function initProfileContactModals(params: InitProfileContactSectionParams): void {
  initProfileEditForm(params);
  initProfileEmailForm(params);
  initProfilePhoneForm(params);
}
