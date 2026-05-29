import './subscription.scss';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import { showToast } from 'shared/lib/toast';
import { ApiRequestError } from 'shared/lib/request';
import { getSubscription, activateProFromBalance, type SubscriptionResponse } from 'features/subscription';
import { request } from 'shared/lib/request';
import subscriptionTemplate from './subscription.hbs';

function formatExpiry(isoDate: string | null): string | null {
  if (!isoDate) return null;
  try {
    return new Date(isoDate).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return null;
  }
}

function buildContext(subs: SubscriptionResponse) {
  const usagePercent = subs.max_campaigns > 0
    ? Math.min(100, Math.round((subs.used_campaigns / subs.max_campaigns) * 100))
    : 0;
  const isExpiredPro = subs.tariff === 'pro' && !subs.is_pro_active;

  return {
    isProActive:     subs.is_pro_active,
    isExpiredPro,
    currentTone:     subs.is_pro_active ? 'pro' : 'basic',
    usedCampaigns:   subs.used_campaigns,
    maxCampaigns:    subs.max_campaigns,
    usagePercent,
    tariffExpiresAt: subs.is_pro_active ? formatExpiry(subs.expires_at) : null,
  };
}

function buildErrorContext() {
  return buildContext({
    tariff: 'basic', is_pro_active: false, expires_at: null,
    max_campaigns: 5, used_campaigns: 0, price_rub: 0,
  });
}

export async function renderSubscriptionPage(): Promise<string> {
  try {
    const subs = await getSubscription();
    return renderTemplate(subscriptionTemplate, buildContext(subs));
  } catch {
    return renderTemplate(subscriptionTemplate, buildErrorContext());
  }
}

export function SubscriptionPage(): VoidFunction {
  const root = document.querySelector<HTMLElement>('[data-subscription-page]');
  if (!root) return () => {};

  const controller = new AbortController();
  const { signal } = controller;

  const payBtn      = root.querySelector<HTMLButtonElement>('[data-subs-pay]');
  const payLabel    = root.querySelector<HTMLElement>('[data-subs-pay-label]');
  const errorEl     = root.querySelector<HTMLElement>('[data-subs-error]');
  const insufficientEl = root.querySelector<HTMLElement>('[data-subs-insufficient]');

  payBtn?.addEventListener('click', () => {
    void (async () => {
      if (!payBtn) return;

      payBtn.disabled = true;
      payBtn.classList.add('is-loading');
      if (payLabel) payLabel.textContent = 'Оформляю...';
      if (errorEl)         errorEl.hidden = true;
      if (insufficientEl)  insufficientEl.hidden = true;

      try {
        const updated = await activateProFromBalance();

        // Обновляем профиль в фоне (баланс уменьшился)
        void request('/advertisers/me').catch(() => null);

        showToast('Pro активирован', `Тариф Pro активен. Лимит кампаний — ${updated.max_campaigns}.`, 'success');

        // Перерисовываем страницу с актуальными данными
        const html = await renderTemplate(subscriptionTemplate, buildContext(updated));
        const currentRoot = document.querySelector<HTMLElement>('[data-subscription-page]');
        if (currentRoot && !signal.aborted) currentRoot.outerHTML = html;
      } catch (err) {
        if (signal.aborted) return;

        payBtn.disabled = false;
        payBtn.classList.remove('is-loading');
        if (payLabel) payLabel.textContent = payLabel.dataset.label ?? 'Оформить Pro';

        if (err instanceof ApiRequestError && err.status === 402) {
          // Недостаточно средств — предлагаем пополнить
          if (insufficientEl) insufficientEl.hidden = false;
        } else {
          if (errorEl) {
            errorEl.textContent = 'Не удалось оформить подписку. Попробуйте ещё раз.';
            errorEl.hidden = false;
          }
          showToast('Ошибка', 'Не удалось оформить Pro. Попробуйте позже.', 'error');
        }
      }
    })();
  }, { signal });

  // SPA-навигация для кнопки "Пополнить баланс"
  root.querySelector<HTMLElement>('[data-subs-go-topup]')
    ?.addEventListener('click', () => navigateTo('/balance'), { signal });

  if (payLabel) payLabel.dataset.label = payLabel.textContent?.trim() ?? '';

  return () => controller.abort();
}
