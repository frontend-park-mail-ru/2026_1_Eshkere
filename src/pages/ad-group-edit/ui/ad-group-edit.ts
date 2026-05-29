import '../../ad-group-create/ui/ad-group-create.scss';
import { getAdGroups, updateAdGroup, type AdGroupResponse, type GenderType } from 'features/ads/api/ad-groups';
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
import adGroupEditTemplate from './ad-group-edit.hbs';

function getParams(): { campaignId: number | null; groupId: number | null } {
  const params = new URLSearchParams(window.location.search);
  const cId = parseInt(params.get('campaignId') ?? '', 10);
  const gId = parseInt(params.get('groupId') ?? '', 10);
  return {
    campaignId: Number.isFinite(cId) ? cId : null,
    groupId: Number.isFinite(gId) ? gId : null,
  };
}

let cachedGroup: AdGroupResponse | null = null;

export async function renderAdGroupEditPage(): Promise<string> {
  const { campaignId, groupId } = getParams();
  if (!campaignId || !groupId) {
    return '<div style="padding:40px;text-align:center;color:var(--text-soft)">Группа не найдена</div>';
  }

  const result = await getAdGroups(campaignId).catch(() => null);
  const group = result?.groups.find((g) => g.id === groupId) ?? null;
  cachedGroup = group;

  if (!group) {
    return '<div style="padding:40px;text-align:center;color:var(--text-soft)">Группа не найдена</div>';
  }

  return renderTemplate(adGroupEditTemplate, { name: group.name });
}

export function AdGroupEdit(): VoidFunction {
  const { campaignId, groupId } = getParams();
  const root = document.querySelector<HTMLElement>('[data-age]');
  if (!root || !campaignId || !groupId) return () => {};

  const controller = new AbortController();
  const { signal } = controller;

  initNativeSelectArrows({
    root,
    signal,
    selectSelector: '.agc__field--select > .agc__select',
    fieldSelector: '.agc__field--select',
  });

  if (cachedGroup) {
    const g = cachedGroup;
    const setSelect = (name: string, value: string | number): void => {
      const el = root.querySelector<HTMLSelectElement>(`[name="${name}"]`);
      if (el) el.value = String(value);
    };
    setSelect('age_from', g.age_from);
    setSelect('age_to', g.age_to);
    setSelect('gender', g.gender === 'man' ? 'male' : g.gender === 'woman' ? 'female' : g.gender);
    setSelect('region_id', getRegionPayloadValue(g.region ?? g.region_id));
    setSelect('topic_id', getTopicPayloadValue(g.topic ?? g.topic_id));
  }

  const ageFromSelect = root.querySelector<HTMLSelectElement>('[name="age_from"]');
  const ageToSelect = root.querySelector<HTMLSelectElement>('[name="age_to"]');
  const genderSelect = root.querySelector<HTMLSelectElement>('[name="gender"]');
  const regionSelect = root.querySelector<HTMLSelectElement>('[name="region_id"]');
  const topicSelect = root.querySelector<HTMLSelectElement>('[name="topic_id"]');
  const reachEl = root.querySelector<HTMLElement>('[data-age-reach]');
  const clicksEl = root.querySelector<HTMLElement>('[data-age-clicks]');
  const widthEl = root.querySelector<HTMLElement>('[data-age-width]');
  const qualityEl = root.querySelector<HTMLElement>('[data-age-quality]');
  const reachBarEl = root.querySelector<HTMLElement>('[data-age-reach-bar]');

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

  root.querySelector<HTMLElement>('[data-age-back]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign?id=${campaignId}`);
  }, { signal });

  const form = root.querySelector<HTMLFormElement>('[data-age-form]');
  const submitBtn = root.querySelector<HTMLButtonElement>('[data-age-submit]');
  const formError = root.querySelector<HTMLElement>('[data-age-form-error]');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = (data.get('name') as string).trim();
    const nameError = root.querySelector<HTMLElement>('[data-age-field-error="name"]');
    if (nameError) nameError.textContent = '';

    if (!name) {
      if (nameError) nameError.textContent = 'Введите название группы';
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (formError) formError.hidden = true;

    try {
      await updateAdGroup(campaignId, groupId, {
        name,
        age_from: parseInt(data.get('age_from') as string, 10),
        age_to: parseInt(data.get('age_to') as string, 10),
        gender: data.get('gender') as GenderType,
        region: getRegionPayloadValue(data.get('region_id') as string),
        topic: getTopicPayloadValue(data.get('topic_id') as string),
      });
      navigateTo(`/ads/campaign?id=${campaignId}`);
    } catch {
      if (formError) {
        formError.textContent = 'Не удалось сохранить изменения. Попробуйте ещё раз.';
        formError.hidden = false;
      }
      if (submitBtn) submitBtn.disabled = false;
    }
  }, { signal });

  return () => controller.abort();
}
