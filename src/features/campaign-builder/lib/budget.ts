import type { BuilderState } from '../model/types';

export function formatRubles(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

export function getBudgetPeriodDays(period: string): number {
  const normalized = period.trim().toLowerCase();
  const numericMatch = normalized.match(/(\d+)/);

  if (numericMatch) {
    return Math.max(1, Number(numericMatch[1]));
  }

  const directDaysMatch = normalized.match(/(\d+)\s*(дн|дней|день)/);

  if (directDaysMatch) {
    return Math.max(1, Number(directDaysMatch[1]));
  }

  if (normalized.includes('-')) {
    return 30;
  }

  return 14;
}

export function formatBudgetPeriod(days: number): string {
  return `${Math.max(1, Math.round(days))} дней`;
}

// CPM (₽ за 1000 показов) по стратегии
const CPM_BY_STRATEGY: Record<string, number> = {
  aggressive: 185,
  smart:      155,
  even:       125,
};

// CTR по цели кампании
const CTR_BY_GOAL: Record<string, number> = {
  awareness: 0.0008,
  website:   0.003,
  leads:     0.005,
};

export function getBudgetForecast(state: BuilderState): {
  reach: string;
  clicks: string;
  cpm: string;
  cpc: string;
  note: string;
  goalBadge: string;
} {
  const total = Math.max(state.totalBudget, state.dailyBudget);
  const baseCpm = CPM_BY_STRATEGY[state.strategy] ?? 155;
  const baseCtr = CTR_BY_GOAL[state.goal] ?? 0.003;

  const reach    = Math.max(1, Math.round((total / baseCpm) * 1000));
  const clicks   = Math.max(1, Math.round(reach * baseCtr));
  const cpcValue = Math.round(baseCpm / (baseCtr * 1000));

  const cpmMin    = Math.round(baseCpm * 0.83);
  const cpmMax    = Math.round(baseCpm * 1.17);
  const clicksMin = Math.round(clicks * 0.82);
  const clicksMax = Math.round(clicks * 1.18);
  const cpcMin    = Math.max(10, Math.round(cpcValue * 0.85));
  const cpcMax    = Math.round(cpcValue * 1.15);

  const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

  return {
    reach:  fmt(reach),
    clicks: `${fmt(clicksMin)} − ${fmt(clicksMax)}`,
    cpm:    `${cpmMin} − ${cpmMax} ₽`,
    cpc:    `${cpcMin} − ${cpcMax} ₽`,
    note:   `Деньги списываются за каждый показ (CPM ${cpmMin}–${cpmMax} ₽). Прогноз: ${fmt(clicksMin)}–${fmt(clicksMax)} переходов за период кампании.`,
    goalBadge:
      state.goal === 'website'
        ? 'CTR / CPC'
        : state.goal === 'leads'
          ? 'CPA / лиды'
          : 'Охват / CPM',
  };
}

export function getBudgetInsights(state: BuilderState): {
  paceLabel: string;
  paceNote: string;
  reserveLabel: string;
  reserveNote: string;
  warningTone: 'normal' | 'warning';
  warnings: string[];
} {
  const total = Math.max(state.totalBudget, state.dailyBudget);
  const coverageDays = Math.max(
    1,
    Math.round(total / Math.max(state.dailyBudget, 1)),
  );
  const plannedDays = getBudgetPeriodDays(state.period);
  const paceLabel =
    state.strategy === 'aggressive'
      ? 'Быстрый старт'
      : state.strategy === 'smart'
        ? 'Автооптимизация'
        : 'Ровный темп';
  const paceNote =
    state.strategy === 'aggressive'
      ? 'Бюджет расходуется активнее в первые дни — выше CPM, но быстрее набирается статистика.'
      : state.strategy === 'smart'
        ? 'Система гибко перераспределяет показы между днями, ища более дешёвый CPM.'
        : 'Открутка распределяется равномерно. Стабильный CPM и предсказуемый расход.';
  const reserveLabel =
    coverageDays >= plannedDays + 5
      ? 'Запас высокий'
      : coverageDays >= plannedDays
        ? 'Запас умеренный'
        : 'Запас низкий';
  const reserveNote =
    coverageDays >= plannedDays + 5
      ? `Бюджета хватает примерно на ${coverageDays} дней при плане на ${plannedDays}. Есть запас на тест и дообучение.`
      : coverageDays >= plannedDays
        ? `Текущего лимита хватает примерно на ${coverageDays} дней. Этого достаточно для запланированного периода.`
        : `При текущем дневном лимите бюджет закончится через ~${coverageDays} дн., план — ${plannedDays} дн. Нужен больший общий лимит или более короткий период.`;
  const warnings = [
    coverageDays < plannedDays
      ? 'Плановый период длиннее, чем позволяет общий лимит. Кампания может остановиться раньше срока.'
      : 'Соотношение периода и общего лимита выглядит рабочим.',
    state.totalBudget < state.dailyBudget * 7
      ? 'Общий лимит меньше недели открутки. Для устойчивой оценки кампании обычно нужен более длинный горизонт.'
      : 'Горизонт открутки выглядит достаточным для первого запуска.',
    state.strategy === 'aggressive'
      ? 'Ускоренный старт даёт больше показов в первые дни, но CPM обычно выше среднего.'
      : 'Текущая стратегия не выглядит рискованной по расходу.',
    state.dailyBudget < 3000
      ? 'Низкий дневной бюджет даёт мало показов в сутки — алгоритму сложнее обучиться быстро.'
      : 'Дневной лимит достаточен для стабильного набора статистики.',
  ];

  return {
    paceLabel,
    paceNote,
    reserveLabel,
    reserveNote,
    warningTone:
      coverageDays < plannedDays || state.totalBudget < state.dailyBudget * 7
        ? 'warning'
        : 'normal',
    warnings,
  };
}
