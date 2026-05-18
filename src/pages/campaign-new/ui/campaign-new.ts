import './campaign-new.scss';
import { createAdCampaign } from 'features/ads/api/create-ad-campaign';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import campaignNewTemplate from './campaign-new.hbs';

export async function renderCampaignNewPage(): Promise<string> {
  return renderTemplate(campaignNewTemplate, {});
}

export function CampaignNew(): VoidFunction {
  const root = document.querySelector<HTMLElement>('[data-cnew]');
  if (!root) return () => {};

  const controller = new AbortController();
  const { signal } = controller;

  root.querySelector<HTMLElement>('[data-cnew-back]')?.addEventListener('click', () => {
    navigateTo('/ads');
  }, { signal });

  const form       = root.querySelector<HTMLFormElement>('[data-cnew-form]');
  const submitBtn  = root.querySelector<HTMLButtonElement>('[data-cnew-submit]');
  const formError  = root.querySelector<HTMLElement>('[data-cnew-form-error]');
  const goalValue  = root.querySelector<HTMLInputElement>('[data-cnew-goal-value]');

  const DEFAULT_CPM_PRICE = 10000;

  // Выбор цели
  root.querySelectorAll<HTMLButtonElement>('[data-cnew-goals] [data-goal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-cnew-goals] [data-goal]').forEach((b) =>
        b.classList.remove('cnew__goal--active'),
      );
      btn.classList.add('cnew__goal--active');
      if (goalValue) goalValue.value = btn.dataset.goal ?? 'click';
    }, { signal });
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data         = new FormData(form);
    const name         = (data.get('name') as string).trim();
    const main_action  = (data.get('main_action') as 'look' | 'click') ?? 'click';
    const budgetRaw    = data.get('daily_budget') as string;
    const daily_budget = budgetRaw ? parseInt(budgetRaw, 10) : undefined;

    const nameError = root.querySelector<HTMLElement>('[data-cnew-error="name"]');
    const budgetError = root.querySelector<HTMLElement>('[data-cnew-error="daily_budget"]');
    if (nameError)   nameError.textContent = '';
    if (budgetError) budgetError.textContent = '';

    let hasError = false;
    if (!name) {
      if (nameError) nameError.textContent = 'Введите название кампании';
      hasError = true;
    }
    if (daily_budget === undefined) {
      if (budgetError) budgetError.textContent = 'Введите дневной бюджет';
      hasError = true;
    } else if (daily_budget < 100) {
      if (budgetError) budgetError.textContent = 'Минимальный бюджет — 100 ₽';
      hasError = true;
    }
    if (hasError) return;

    if (submitBtn) submitBtn.disabled = true;
    if (formError) formError.hidden = true;

    try {
      const { id } = await createAdCampaign({
        name,
        main_action,
        daily_budget,
        cpm_price: DEFAULT_CPM_PRICE,
      });
      navigateTo(`/ads/campaign?id=${id}`);
    } catch {
      if (formError) {
        formError.textContent = 'Не удалось создать кампанию. Попробуйте ещё раз.';
        formError.hidden = false;
      }
      if (submitBtn) submitBtn.disabled = false;
    }
  }, { signal });

  return () => controller.abort();
}
