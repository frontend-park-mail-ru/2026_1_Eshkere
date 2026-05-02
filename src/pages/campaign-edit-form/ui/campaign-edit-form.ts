import '../../ad-group-create/ui/ad-group-create.scss';
import { getAds } from 'features/ads/api/get-ads';
import { updateAdCampaign } from 'features/ads/api/update-ad-campaign';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import campaignEditFormTemplate from './campaign-edit-form.hbs';

function getCampaignId(): number | null {
  const id = new URLSearchParams(window.location.search).get('id');
  const parsed = id ? parseInt(id, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export async function renderCampaignEditFormPage(): Promise<string> {
  const campaignId = getCampaignId();
  if (!campaignId) {
    return '<div style="padding:40px;text-align:center;color:var(--text-soft)">Кампания не найдена</div>';
  }

  const result = await getAds();
  const campaign = result.ads.find((a) => a.id === campaignId);
  if (!campaign) {
    return '<div style="padding:40px;text-align:center;color:var(--text-soft)">Кампания не найдена</div>';
  }

  return renderTemplate(campaignEditFormTemplate, {
    name: campaign.title ?? '',
    daily_budget: campaign.price ?? '',
    isClick: (campaign.main_action ?? 'click') === 'click',
  });
}

export function CampaignEditForm(): VoidFunction {
  const campaignId = getCampaignId();
  const root = document.querySelector<HTMLElement>('[data-cef]');
  if (!root || !campaignId) return () => {};

  const controller = new AbortController();
  const { signal } = controller;

  root.querySelector<HTMLElement>('[data-cef-back]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign?id=${campaignId}`);
  }, { signal });

  root.querySelectorAll<HTMLLabelElement>('.agc__bid-option').forEach((option) => {
    option.addEventListener('click', () => {
      root.querySelectorAll('.agc__bid-option').forEach((o) => o.classList.remove('agc__bid-option--active'));
      option.classList.add('agc__bid-option--active');
    }, { signal });
  });

  const form = root.querySelector<HTMLFormElement>('[data-cef-form]');
  const submitBtn = root.querySelector<HTMLButtonElement>('[data-cef-submit]');
  const formError = root.querySelector<HTMLElement>('[data-cef-error]');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = (data.get('name') as string).trim();
    const daily_budget = parseFloat(data.get('daily_budget') as string);
    const main_action = data.get('main_action') as 'click' | 'look';

    const nameError = root.querySelector<HTMLElement>('[data-cef-field-error="name"]');
    const budgetError = root.querySelector<HTMLElement>('[data-cef-field-error="daily_budget"]');
    if (nameError) nameError.textContent = '';
    if (budgetError) budgetError.textContent = '';

    let hasError = false;
    if (!name) {
      if (nameError) nameError.textContent = 'Введите название кампании';
      hasError = true;
    }
    if (!Number.isFinite(daily_budget) || daily_budget < 100) {
      if (budgetError) budgetError.textContent = 'Минимальный бюджет — 100 ₽';
      hasError = true;
    }
    if (hasError) return;

    if (submitBtn) submitBtn.disabled = true;
    if (formError) formError.hidden = true;

    try {
      await updateAdCampaign(campaignId, { name, daily_budget, main_action });
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
