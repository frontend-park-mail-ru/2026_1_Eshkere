import './subscription-modal.scss';
import { navigateTo } from 'shared/lib/navigation';
import { showToast } from 'shared/lib/toast';
import { ApiRequestError } from 'shared/lib/request';
import { markMotionUpdated, setupMotionEnhancements } from 'shared/lib/animations';
import { getSubscription, activateProFromBalance, type SubscriptionResponse } from 'features/subscription';

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return null; }
}

function usageBar(used: number, max: number): string {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return `
    <div class="sm__usage">
      <div class="sm__usage-head">
        <span class="sm__usage-label">Активные кампании</span>
        <strong class="sm__usage-value">${used} из ${max}</strong>
      </div>
      <div class="sm__usage-bar"><div class="sm__usage-fill" style="width:${pct}%"></div></div>
    </div>`;
}

function planCards(subs: SubscriptionResponse): string {
  const expiry = formatExpiry(subs.expires_at);
  const isExpiredPro = subs.tariff === 'pro' && !subs.is_pro_active;

  const expiredBanner = isExpiredPro ? `
    <div class="sm__expired">
      <strong>Подписка Pro истекла</strong>
      <p>Продлите Pro, чтобы восстановить доступ к расширенным функциям.</p>
    </div>` : '';

  const proBtn = subs.is_pro_active
    ? `<button class="sm__plan-btn sm__plan-btn--passive" disabled>Подключён</button>`
    : `<button class="sm__plan-btn sm__plan-btn--upgrade" data-sm-activate>
        <svg class="sm__spinner" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="40 60"/>
        </svg>
        <span data-sm-activate-label>${isExpiredPro ? 'Продлить Pro — 3 900 ₽' : 'Оформить Pro — 3 900 ₽'}</span>
      </button>
      <p class="sm__plan-note">Списывается с баланса кабинета</p>`;

  const proFooter = `<div class="sm__plan-footer">${proBtn}</div>`;

  return `
    ${expiredBanner}
    <div class="sm__plans">

      <div class="sm__plan ${!subs.is_pro_active ? 'sm__plan--current' : ''}">
        <div class="sm__plan-head">
          <span class="sm__plan-name">Basic</span>
          ${!subs.is_pro_active ? '<span class="sm__plan-badge">Текущий</span>' : ''}
        </div>
        <p class="sm__plan-price">0 ₽ <span>/ мес</span></p>
        <ul class="sm__features">
          <li class="sm__feature sm__feature--check">До 5 кампаний</li>
          <li class="sm__feature sm__feature--check">Стандартная модерация</li>
          <li class="sm__feature sm__feature--check">Email-уведомления</li>
          <li class="sm__feature sm__feature--dash">AI-генерация</li>
          <li class="sm__feature sm__feature--dash">Приоритетная модерация</li>
        </ul>
        <div class="sm__plan-footer">
          <button class="sm__plan-btn sm__plan-btn--passive" disabled>
            ${subs.is_pro_active ? 'После истечения Pro' : 'Текущий план'}
          </button>
        </div>
      </div>

      <div class="sm__plan sm__plan--pro ${subs.is_pro_active ? 'sm__plan--current' : ''}">
        <div class="sm__plan-head">
          <span class="sm__plan-name">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 17.4l-6.2 4.5 2.4-7.2L2 9.2h7.6L12 2z"/>
            </svg>
            Pro
          </span>
          ${subs.is_pro_active ? '<span class="sm__plan-badge sm__plan-badge--pro">Активен</span>' : ''}
        </div>
        <p class="sm__plan-price">3 900 ₽ <span>/ мес</span></p>
        ${expiry && subs.is_pro_active ? `<p class="sm__plan-expiry">Активен до ${expiry}</p>` : ''}
        <ul class="sm__features">
          <li class="sm__feature sm__feature--check">До 20 кампаний</li>
          <li class="sm__feature sm__feature--check sm__feature--pro">AI-генерация</li>
          <li class="sm__feature sm__feature--check">Приоритетная модерация</li>
          <li class="sm__feature sm__feature--check sm__feature--pro">Прогноз охвата и расхода</li>
        </ul>
        ${proFooter}
      </div>

    </div>
    <p class="sm__error" data-sm-error hidden></p>
    <p class="sm__insufficient" data-sm-insufficient hidden>
      Недостаточно средств на балансе.
      <button class="sm__topup-link" data-sm-go-balance type="button">Пополнить баланс</button>
    </p>`;
}

function buildModal(content: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="sm" id="subscription-modal" role="dialog" aria-modal="true" aria-label="Тарифный план">
      <div class="sm__backdrop"></div>
      <div class="sm__dialog">
        <div class="sm__header">
          <div>
            <h2 class="sm__title">Тарифный план</h2>
            <p class="sm__subtitle">Управляйте подпиской кабинета.</p>
          </div>
          <button class="sm__close" type="button" aria-label="Закрыть" data-sm-close>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="sm__body" data-sm-body>${content}</div>
      </div>
    </div>`.trim();
  return wrap.firstElementChild as HTMLElement;
}

function loadingContent(): string {
  return `<div class="sm__loading">
    <svg class="sm__spinner" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="40 60"/>
    </svg>
    Загружаю данные подписки...
  </div>`;
}

export function openSubscriptionModal(): void {
  document.getElementById('subscription-modal')?.remove();

  const modal = buildModal(loadingContent());
  document.body.appendChild(modal);
  setupMotionEnhancements(modal);

  const close = (): void => modal.remove();

  modal.querySelector('[data-sm-close]')?.addEventListener('click', close);
  modal.querySelector('.sm__backdrop')?.addEventListener('click', close);
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });

  getSubscription().then((subs) => {
    const body = modal.querySelector<HTMLElement>('[data-sm-body]');
    if (!body) return;

    body.innerHTML = usageBar(subs.used_campaigns, subs.max_campaigns) + planCards(subs);
    setupMotionEnhancements(body);
    markMotionUpdated(body);

    // Activate Pro button
    const activateBtn   = body.querySelector<HTMLButtonElement>('[data-sm-activate]');
    const activateLabel = body.querySelector<HTMLElement>('[data-sm-activate-label]');
    const errorEl       = body.querySelector<HTMLElement>('[data-sm-error]');
    const insufficientEl = body.querySelector<HTMLElement>('[data-sm-insufficient]');

    activateBtn?.addEventListener('click', () => {
      void (async () => {
        if (!activateBtn) return;
        activateBtn.disabled = true;
        activateBtn.classList.add('is-loading');
        if (activateLabel) activateLabel.textContent = 'Оформляю...';
        if (errorEl) errorEl.hidden = true;
        if (insufficientEl) insufficientEl.hidden = true;

        try {
          const updated = await activateProFromBalance();
          showToast('Pro активирован', `Тариф Pro активен. Лимит кампаний — ${updated.max_campaigns}.`, 'success');
          body.innerHTML = usageBar(updated.used_campaigns, updated.max_campaigns) + planCards(updated);
          setupMotionEnhancements(body);
          markMotionUpdated(body);
        } catch (err) {
          activateBtn.disabled = false;
          activateBtn.classList.remove('is-loading');
          if (activateLabel) activateLabel.textContent = activateLabel.dataset.label ?? 'Оформить Pro';

          if (err instanceof ApiRequestError && err.status === 402) {
            if (insufficientEl) {
              insufficientEl.hidden = false;
              markMotionUpdated(insufficientEl, 'motion-invalid', 520);
            }
          } else {
            if (errorEl) {
              errorEl.textContent = 'Не удалось оформить подписку. Попробуйте ещё раз.';
              errorEl.hidden = false;
              markMotionUpdated(errorEl, 'motion-invalid', 520);
            }
          }
        }
      })();
    });

    body.querySelector('[data-sm-go-balance]')?.addEventListener('click', () => {
      close();
      navigateTo('/balance');
    });

    if (activateLabel) activateLabel.dataset.label = activateLabel.textContent?.trim() ?? '';
  }).catch(() => {
    const body = modal.querySelector<HTMLElement>('[data-sm-body]');
    if (body) {
      body.innerHTML = '<p class="sm__error">Не удалось загрузить данные подписки.</p>';
      markMotionUpdated(body, 'motion-invalid', 520);
    }
  });
}
