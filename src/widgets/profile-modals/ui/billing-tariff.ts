import { clearFormState, setFormMessage, watchFormState } from 'features/profile/lib/form';
import type { TariffKey } from 'features/profile/model/types';
import { showProfileFeedback } from 'widgets/profile-feedback/ui/toast';

import type { InitProfileBillingSectionParams } from './billing-types';

export function initProfileBillingTariffForm({
  closeModalById,
  getTariffMeta,
  onStateChange,
  signal,
  state,
}: InitProfileBillingSectionParams): void {
  const tariffForm = document.getElementById('profile-tariff-form');
  if (!(tariffForm instanceof HTMLFormElement)) {
    return;
  }

  watchFormState(tariffForm, signal, () => {
    const nextTariff = String((tariffForm.elements.namedItem('nextTariff') as RadioNodeList)?.value || '');
    return Boolean(nextTariff) && nextTariff !== state.tariffKey;
  });

  tariffForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFormState(tariffForm);

    const formData = new FormData(tariffForm);
    const nextTariff = String(formData.get('nextTariff') || '') as TariffKey;

    if (!nextTariff) {
      setFormMessage(tariffForm, '[data-form-error]', 'Выберите тариф для перехода');
      return;
    }

    if (nextTariff === state.tariffKey) {
      setFormMessage(tariffForm, '[data-form-error]', 'Этот тариф уже активен');
      return;
    }

    const nextMeta = getTariffMeta(nextTariff);
    if (state.activeCampaigns > nextMeta.limit) {
      setFormMessage(tariffForm, '[data-form-error]', `Нельзя перейти на ${nextMeta.label}: лимит ${nextMeta.limit} кампаний, у вас ${state.activeCampaigns}`);
      return;
    }

    state.tariffKey = nextTariff;
    onStateChange(state);
    showProfileFeedback({
      title: 'Тариф обновлен',
      description: `Теперь активен тариф ${nextMeta.label}. Новые лимиты кабинета уже применены.`,
    });
    closeModalById('profile-tariff-modal');
  }, { signal });
}
