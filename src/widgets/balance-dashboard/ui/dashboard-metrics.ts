import { formatPrice } from 'shared/lib/format';
import type {
  BalanceDashboardState,
  RecommendationRow,
} from 'features/balance/model/types';

export function getAverageDailySpend(state: BalanceDashboardState): number {
  return Math.max(1, Math.round(state.monthlySpend / 30));
}

export function getDaysLeft(state: BalanceDashboardState): number {
  return Math.max(
    1,
    Math.floor(state.balanceValue / getAverageDailySpend(state)),
  );
}

export function getAutopayStatus(state: BalanceDashboardState): string {
  return state.autopayEnabled ? 'Настроено' : 'Выключено';
}

export function getAutopayHeroLabel(state: BalanceDashboardState): string {
  return state.autopayEnabled ? 'Вкл' : 'Выкл';
}

export function getAutopayNote(state: BalanceDashboardState): string {
  return state.autopayEnabled
    ? `Когда баланс опускается ниже ${formatPrice(state.autopayThreshold)}`
    : 'Автопополнение отключено';
}

export function getPaymentMethodLabel(state: BalanceDashboardState): string {
  return state.paymentMethod || 'Не добавлен';
}

export function getRecommendations(
  state: BalanceDashboardState,
): RecommendationRow[] {
  const daysLeft = getDaysLeft(state);
  const items: RecommendationRow[] = [];

  if (daysLeft <= 14) {
    items.push({
      title: 'Пополнить счет заранее',
      description: 'Чтобы активные кампании не остановились в пиковый день.',
      actionKey: 'topup',
    });
  }

  if (!state.autopayEnabled) {
    items.push({
      title: 'Включить автоплатеж',
      description: 'Резервное пополнение снизит риск остановки открутки.',
      actionKey: 'autopay',
    });
  } else {
    items.push({
      title: 'Проверить лимит автоплатежа',
      description:
        'Текущий лимит должен покрывать минимум несколько дней расхода.',
      actionKey: 'autopay',
    });
  }

  if (items.length < 2) {
    items.push({
      title: 'Пополнить счет заранее',
      description:
        'Дополнительный запас упростит масштабирование активных кампаний.',
      actionKey: 'topup',
    });
  }

  return items.slice(0, 2);
}
