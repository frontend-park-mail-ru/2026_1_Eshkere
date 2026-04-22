import { initProfileBillingPaymentForm } from './billing-payment';
import { initProfileBillingTariffForm } from './billing-tariff';
import { initProfileBillingTopUpForm } from './billing-topup';

import type { InitProfileBillingSectionParams } from './billing-types';

export function initProfileBillingModals(params: InitProfileBillingSectionParams): void {
  initProfileBillingPaymentForm(params);
  initProfileBillingTopUpForm(params);
  initProfileBillingTariffForm(params);
}
