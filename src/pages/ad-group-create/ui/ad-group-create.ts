import './ad-group-create.scss';
import { createAdGroup, type CreateAdGroupRequest, type GenderType } from 'features/ads/api/ad-groups';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import { initNativeSelectArrows } from 'shared/lib/native-select-arrow';
import {
  getRegionPayloadValue,
  getTopicPayloadValue,
} from 'features/ads/model/targeting';
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

  // Stub: устройства — toggleable
  root.querySelectorAll<HTMLButtonElement>('[data-agc-devices] [data-stub]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('agc__device--active');
    }, { signal });
  });

  // Stub: стратегия ставки — single select
  root.querySelectorAll<HTMLButtonElement>('[data-agc-bidding] [data-stub]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-agc-bidding] [data-stub]').forEach((b) =>
        b.classList.remove('agc__bid-option--active'),
      );
      btn.classList.add('agc__bid-option--active');
    }, { signal });
  });

  // Stub: площадки — toggleable
  root.querySelectorAll<HTMLButtonElement>('[data-agc-platforms] [data-stub]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('agc__platform--active');
    }, { signal });
  });

  // Stub: дни недели — toggleable
  root.querySelectorAll<HTMLButtonElement>('[data-agc-days] [data-stub]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('agc__day--active');
    }, { signal });
  });

  // Stub: тоггл "Круглосуточно"
  const allDayToggle = root.querySelector<HTMLElement>('.agc__schedule-allday .agc__toggle');
  allDayToggle?.addEventListener('click', () => {
    const checked = allDayToggle.getAttribute('aria-checked') === 'true';
    allDayToggle.setAttribute('aria-checked', checked ? 'false' : 'true');
  }, { signal });

  // Stub: чипы тегов — кликабельны, но в запрос не идут
  root.querySelectorAll<HTMLButtonElement>('[data-agc-tags] [data-stub]').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('agc__chip--active');
    }, { signal });
  });

  // Stub: режим сопоставления — переключается визуально
  root.querySelectorAll<HTMLLabelElement>('.agc__match-mode').forEach((mode) => {
    mode.addEventListener('click', () => {
      root.querySelectorAll('.agc__match-mode').forEach((m) => m.classList.remove('agc__match-mode--active'));
      mode.classList.add('agc__match-mode--active');
    }, { signal });
  });

  // Stub: тоггл расширения аудитории
  const toggle = root.querySelector<HTMLButtonElement>('.agc__toggle[data-stub]');
  toggle?.addEventListener('click', () => {
    const checked = toggle.getAttribute('aria-checked') === 'true';
    toggle.setAttribute('aria-checked', checked ? 'false' : 'true');
  }, { signal });

  const ageFromSelect = root.querySelector<HTMLSelectElement>('[name="age_from"]');
  const ageToSelect = root.querySelector<HTMLSelectElement>('[name="age_to"]');

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
  }

  ageFromSelect?.addEventListener('change', syncAgeRange, { signal });
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
