import '../../ad-group-create/ui/ad-group-create.scss';
import { getAdGroups, updateAdGroup, type AdGroupResponse, type GenderType } from 'features/ads/api/ad-groups';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
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

  if (cachedGroup) {
    const g = cachedGroup;
    const setSelect = (name: string, value: string | number): void => {
      const el = root.querySelector<HTMLSelectElement>(`[name="${name}"]`);
      if (el) el.value = String(value);
    };
    setSelect('age_from', g.age_from);
    setSelect('age_to', g.age_to);
    setSelect('gender', g.gender);
    setSelect('region_id', g.region_id);
    setSelect('topic_id', g.topic_id);
  }

  root.querySelectorAll<HTMLButtonElement>('[data-agc-devices] [data-stub]').forEach((btn) => {
    btn.addEventListener('click', () => btn.classList.toggle('agc__device--active'), { signal });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-agc-bidding] [data-stub]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-agc-bidding] [data-stub]').forEach((b) => b.classList.remove('agc__bid-option--active'));
      btn.classList.add('agc__bid-option--active');
    }, { signal });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-agc-platforms] [data-stub]').forEach((btn) => {
    btn.addEventListener('click', () => btn.classList.toggle('agc__platform--active'), { signal });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-agc-days] [data-stub]').forEach((btn) => {
    btn.addEventListener('click', () => btn.classList.toggle('agc__day--active'), { signal });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-agc-tags] [data-stub]').forEach((chip) => {
    chip.addEventListener('click', () => chip.classList.toggle('agc__chip--active'), { signal });
  });

  root.querySelectorAll<HTMLLabelElement>('.agc__match-mode').forEach((mode) => {
    mode.addEventListener('click', () => {
      root.querySelectorAll('.agc__match-mode').forEach((m) => m.classList.remove('agc__match-mode--active'));
      mode.classList.add('agc__match-mode--active');
    }, { signal });
  });

  const toggle = root.querySelector<HTMLButtonElement>('.agc__toggle[data-stub]');
  toggle?.addEventListener('click', () => {
    const checked = toggle.getAttribute('aria-checked') === 'true';
    toggle.setAttribute('aria-checked', checked ? 'false' : 'true');
  }, { signal });

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
        region_id: parseInt(data.get('region_id') as string, 10),
        topic_id: parseInt(data.get('topic_id') as string, 10),
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
