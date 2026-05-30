import './ad-group-create.scss';
import { createAdGroup, type CreateAdGroupRequest, type GenderType } from 'features/ads/api/ad-groups';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import { initNativeSelectArrows } from 'shared/lib/native-select-arrow';
import {
  getRegionPayloadValue,
  getTopicPayloadValue,
} from 'features/ads/model/targeting';
import {
  computeAudienceForecast,
  formatClickRange,
  formatReachRange,
} from 'features/ads/lib/audience-forecast';
import adGroupCreateTemplate from './ad-group-create.hbs';

function getCampaignId(): number | null {
  const id = new URLSearchParams(window.location.search).get('campaignId');
  const parsed = id ? parseInt(id, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export async function renderAdGroupCreatePage(): Promise<string> {
  return renderTemplate(adGroupCreateTemplate, {});
}

export function AdGroupCreate(): VoidFunction {
  const campaignId = getCampaignId();
  const root = document.querySelector<HTMLElement>('[data-agc]');
  if (!root || !campaignId) return () => {};

  const controller = new AbortController();
  const { signal } = controller;

  initNativeSelectArrows({
    root,
    signal,
    selectSelector: '.agc__field--select > .agc__select',
    fieldSelector: '.agc__field--select',
  });

  root.querySelector<HTMLElement>('[data-agc-back]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign?id=${campaignId}`);
  }, { signal });

  const ageFromSelect = root.querySelector<HTMLSelectElement>('[name="age_from"]');
  const ageToSelect = root.querySelector<HTMLSelectElement>('[name="age_to"]');
  const genderSelect = root.querySelector<HTMLSelectElement>('[name="gender"]');
  const regionSelect = root.querySelector<HTMLSelectElement>('[name="region_id"]');
  const topicSelect = root.querySelector<HTMLSelectElement>('[name="topic_id"]');
  const reachEl = root.querySelector<HTMLElement>('[data-agc-reach]');
  const clicksEl = root.querySelector<HTMLElement>('[data-agc-clicks]');
  const widthEl = root.querySelector<HTMLElement>('[data-agc-width]');
  const qualityEl = root.querySelector<HTMLElement>('[data-agc-quality]');
  const reachBarEl = root.querySelector<HTMLElement>('[data-agc-reach-bar]');

  function updateAudienceForecast(): void {
    if (!ageFromSelect || !ageToSelect || !genderSelect || !regionSelect || !topicSelect) return;

    const forecast = computeAudienceForecast({
      ageFrom: parseInt(ageFromSelect.value, 10),
      ageTo: parseInt(ageToSelect.value, 10),
      gender: genderSelect.value,
      region: regionSelect.value,
      topic: topicSelect.value,
    });

    if (reachEl) reachEl.textContent = formatReachRange(forecast.reachMin, forecast.reachMax);
    if (clicksEl) clicksEl.textContent = formatClickRange(forecast.clicksMin, forecast.clicksMax);
    if (widthEl) widthEl.textContent = forecast.widthLabel;
    if (qualityEl) {
      qualityEl.textContent = forecast.qualityLabel;
      qualityEl.classList.remove('agc__reach-value--good', 'agc__reach-value--medium', 'agc__reach-value--low');
      qualityEl.classList.add(`agc__reach-value--${forecast.qualityTone}`);
    }
    if (reachBarEl) reachBarEl.style.width = `${forecast.barPercent}%`;
  }

  function syncAgeRange(): void {
    if (!ageFromSelect || !ageToSelect) return;
    const from = parseInt(ageFromSelect.value, 10);
    ageToSelect.querySelectorAll('option').forEach((opt) => {
      opt.disabled = parseInt(opt.value, 10) <= from;
    });
    if (parseInt(ageToSelect.value, 10) <= from) {
      const firstValid = Array.from(ageToSelect.options).find((o) => !o.disabled);
      if (firstValid) ageToSelect.value = firstValid.value;
    }
    updateAudienceForecast();
  }

  ageFromSelect?.addEventListener('change', syncAgeRange, { signal });
  ageToSelect?.addEventListener('change', updateAudienceForecast, { signal });
  genderSelect?.addEventListener('change', updateAudienceForecast, { signal });
  regionSelect?.addEventListener('change', updateAudienceForecast, { signal });
  topicSelect?.addEventListener('change', updateAudienceForecast, { signal });
  syncAgeRange();

  const form = root.querySelector<HTMLFormElement>('[data-agc-form]');
  const submitBtn = root.querySelector<HTMLButtonElement>('[data-agc-submit]');
  const formError = root.querySelector<HTMLElement>('[data-agc-form-error]');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = (data.get('name') as string).trim();

    const nameError = root.querySelector<HTMLElement>('[data-agc-error="name"]');
    if (nameError) nameError.textContent = '';

    if (!name) {
      if (nameError) nameError.textContent = 'Введите название группы';
      return;
    }

    const payload: CreateAdGroupRequest = {
      name,
      age_from:  parseInt(data.get('age_from') as string, 10),
      age_to:    parseInt(data.get('age_to') as string, 10),
      gender:    data.get('gender') as GenderType,
      region:    getRegionPayloadValue(data.get('region_id') as string),
      topic:     getTopicPayloadValue(data.get('topic_id') as string),
    };

    if (submitBtn) submitBtn.disabled = true;
    if (formError) formError.hidden = true;

    try {
      await createAdGroup(campaignId, payload);
      navigateTo(`/ads/campaign?id=${campaignId}`);
    } catch {
      if (formError) {
        formError.textContent = 'Не удалось создать группу. Попробуйте ещё раз.';
        formError.hidden = false;
      }
      if (submitBtn) submitBtn.disabled = false;
    }
  }, { signal });

  return () => controller.abort();
}
