import { getBalanceState } from 'features/balance';
import type { DeliveryAlertLevel } from 'features/balance/model/types';

const SLOT_ID = 'app-global-alert-slot';
const DISMISS_KEY = 'global_balance_alert_dismiss';

type BannerStyle = 'critical' | 'depleted';

const LEVEL_TO_STYLE: Partial<Record<DeliveryAlertLevel, BannerStyle>> = {
  at_risk: 'critical',
  partially_stopped: 'critical',
  fully_stopped: 'depleted',
};

function isDismissed(level: DeliveryAlertLevel): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<string, string>;
    return data[level] === 'session';
  } catch {
    return false;
  }
}

function dismiss(level: DeliveryAlertLevel): void {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    data[level] = 'session';
    localStorage.setItem(DISMISS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function buildBanner(
  style: BannerStyle,
  level: DeliveryAlertLevel,
  title: string,
  message: string,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = `global-balance-alert global-balance-alert--${style}`;
  wrap.dataset.globalBalanceAlert = level;

  wrap.innerHTML = `
    <div class="global-balance-alert__inner">
      <div class="global-balance-alert__icon" aria-hidden="true"></div>
      <div class="global-balance-alert__body">
        <strong class="global-balance-alert__title"></strong>
        <span class="global-balance-alert__text"></span>
      </div>
      <div class="global-balance-alert__actions">
        <a class="global-balance-alert__button" href="/balance">Пополнить баланс</a>
      </div>
      <button class="global-balance-alert__close" type="button" aria-label="Закрыть">×</button>
    </div>
  `;

  const titleEl = wrap.querySelector<HTMLElement>('.global-balance-alert__title');
  const textEl = wrap.querySelector<HTMLElement>('.global-balance-alert__text');
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = message;

  wrap.querySelector('.global-balance-alert__close')?.addEventListener('click', () => {
    dismiss(level);
    wrap.remove();
  });

  return wrap;
}

export async function syncGlobalBalanceAlert(): Promise<void> {
  const slot = document.getElementById(SLOT_ID);
  if (!slot) return;

  if (window.location.pathname === '/balance') {
    slot.innerHTML = '';
    return;
  }

  const state = getBalanceState();
  const { deliveryAlert } = state;

  slot.innerHTML = '';

  if (!deliveryAlert) return;

  const style = LEVEL_TO_STYLE[deliveryAlert.level];
  if (!style) return;

  if (isDismissed(deliveryAlert.level)) return;

  slot.appendChild(
    buildBanner(style, deliveryAlert.level, deliveryAlert.title, deliveryAlert.message),
  );
}
