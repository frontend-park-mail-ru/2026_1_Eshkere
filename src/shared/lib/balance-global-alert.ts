import { getBalanceState } from 'features/balance';
import { getAds } from 'features/ads';
import { authState } from 'entities/user';
import { formatPrice } from './format';

const SLOT_ID = 'app-global-alert-slot';
const DISMISS_KEY = 'global_balance_alert_dismiss';
const BALANCE_ALERT_ACTIVITY_KEY = 'global_balance_alert_activity';

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

function getUserActivityKey(): string {
  const currentUser = authState.getCurrentUser();
  const userId =
    typeof currentUser?.id === 'number' && currentUser.id > 0
      ? String(currentUser.id)
      : 'guest';

  return `${BALANCE_ALERT_ACTIVITY_KEY}:${userId}`;
}

function markBalanceWasPositive(): void {
  try {
    localStorage.setItem(getUserActivityKey(), '1');
  } catch {
    // ignore
  }
}

function hadPositiveBalanceBefore(): boolean {
  try {
    return localStorage.getItem(getUserActivityKey()) === '1';
  } catch {
    return false;
  }
}

function hasLocalBalanceActivity(state: ReturnType<typeof getBalanceState>): boolean {
  return (
    state.monthlySpend > 0 ||
    state.moderationReserve > 0 ||
    state.operations.some((operation) => operation.amount !== 0)
  );
}

async function hasCampaignActivity(): Promise<boolean> {
  const result = await getAds();
  return result.ads.some((campaign) =>
    ['working', 'not_enough_money'].includes(String(campaign.status)),
  );
}

async function shouldShowLevel(
  level: AlertLevel,
  state: ReturnType<typeof getBalanceState>,
): Promise<boolean> {
  if (level !== 'depleted') {
    return true;
  }

  if (state.balanceValue > 0) {
    markBalanceWasPositive();
    return false;
  }

  if (hadPositiveBalanceBefore() || hasLocalBalanceActivity(state)) {
    return true;
  }

  try {
    return await hasCampaignActivity();
  } catch {
    return false;
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

export async function syncGlobalBalanceAlert(): Promise<void> {
  const slot = document.getElementById(SLOT_ID);
  if (!slot) return;

  // На странице баланса своя детальная система уведомлений
  if (window.location.pathname === '/balance') {
    slot.innerHTML = '';
    return;
  }

  const state = getBalanceState();
  if (state.balanceValue > 0) {
    markBalanceWasPositive();
  }

  const level = getLevel(state.balanceValue);

  slot.innerHTML = '';

  if (!level || isDismissed(level)) return;
  if (!(await shouldShowLevel(level, state))) return;

  slot.appendChild(buildBanner(level, state.balanceValue));
}
