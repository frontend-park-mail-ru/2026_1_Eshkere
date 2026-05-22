import { getBalanceState } from 'features/balance';
import { formatPrice } from './format';

const SLOT_ID = 'app-global-alert-slot';
const DISMISS_KEY = 'global_balance_alert_dismiss';

type AlertLevel = 'critical' | 'depleted';

function getThresholds(): { warning: number; critical: number } {
  try {
    const raw = localStorage.getItem('notification_thresholds');
    if (!raw) return { warning: 500, critical: 100 };
    const data = JSON.parse(raw) as { warning?: number; critical?: number };
    return {
      warning: typeof data.warning === 'number' ? data.warning : 500,
      critical: typeof data.critical === 'number' ? data.critical : 100,
    };
  } catch {
    return { warning: 500, critical: 100 };
  }
}

function getLevel(balance: number): AlertLevel | null {
  if (balance <= 0) return 'depleted';
  const { critical } = getThresholds();
  if (balance < critical) return 'critical';
  return null;
}

function isDismissed(level: AlertLevel): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<string, string>;
    const at = data[level];
    if (!at) return false;
    // Критично сбрасывается за сессию (до закрытия вкладки)
    return at === 'session';
  } catch {
    return false;
  }
}

function dismiss(level: AlertLevel): void {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    data[level] = 'session';
    localStorage.setItem(DISMISS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function buildBanner(level: AlertLevel, balance: number): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = `global-balance-alert global-balance-alert--${level}`;
  wrap.dataset.globalBalanceAlert = level;

  const isCritical = level === 'critical';

  wrap.innerHTML = `
    <div class="global-balance-alert__inner">
      <div class="global-balance-alert__icon" aria-hidden="true"></div>
      <div class="global-balance-alert__body">
        <strong class="global-balance-alert__title">
          ${isCritical
            ? 'Критически низкий баланс — срочно пополните счёт!'
            : 'Баланс исчерпан — показ рекламы остановлен'}
        </strong>
        <span class="global-balance-alert__text">
          ${isCritical
            ? `На счёте осталось ${formatPrice(balance)}. Кампании будут приостановлены в ближайшие часы.`
            : 'На счёте 0 ₽. Все активные кампании приостановлены.'}
        </span>
      </div>
      <div class="global-balance-alert__actions">
        <a class="global-balance-alert__button" href="/balance">Пополнить баланс</a>
      </div>
      <button class="global-balance-alert__close" type="button" aria-label="Закрыть">×</button>
    </div>
  `;

  wrap.querySelector('.global-balance-alert__close')?.addEventListener('click', () => {
    dismiss(level);
    wrap.remove();
  });

  return wrap;
}

export function syncGlobalBalanceAlert(): void {
  const slot = document.getElementById(SLOT_ID);
  if (!slot) return;

  // На странице баланса своя детальная система уведомлений
  if (window.location.pathname === '/balance') {
    slot.innerHTML = '';
    return;
  }

  const state = getBalanceState();
  const level = getLevel(state.balanceValue);

  slot.innerHTML = '';

  if (!level || isDismissed(level)) return;

  slot.appendChild(buildBanner(level, state.balanceValue));
}
