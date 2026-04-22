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

export function getBudgetForecast(state: BuilderState): {
  reach: string;
  clicks: string;
  cpc: string;
  note: string;
  goalBadge: string;
} {
  const total = Math.max(state.totalBudget, state.dailyBudget);
  const reach = Math.round(total * 2.45);
  const clicksMin = Math.max(Math.round(total / 24), 1800);
  const clicksMax = clicksMin + Math.round(clicksMin * 0.36);
  const cpc = Math.max(Math.round(total / clicksMax), 12);

  return {
    reach: new Intl.NumberFormat('ru-RU').format(reach),
    clicks: `${new Intl.NumberFormat('ru-RU').format(clicksMin)} - ${new Intl.NumberFormat('ru-RU').format(clicksMax)}`,
    cpc: `${cpc} - ${cpc + 4} ₽`,
    note: `При текущих настройках система прогнозирует от ${new Intl.NumberFormat('ru-RU').format(clicksMin)} до ${new Intl.NumberFormat('ru-RU').format(clicksMax)} переходов за весь период кампании.`,
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
      ? 'Бюджет будет расходоваться активнее в первые дни. Хорошо для быстрого теста и скорого набора статистики.'
      : state.strategy === 'smart'
        ? 'Система будет гибко перераспределять открутку между днями в поиске более дешёвого результата.'
        : 'Открутка распределяется равномерно. Удобно для стабильного контроля расхода и частоты.';
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
        ? `Текущего лимита хватает примерно на ${coverageDays} дней. Этого достаточно, чтобы пройти запланированный период без резкого обрыва.`
        : `При текущем соотношении лимит закончится примерно через ${coverageDays} дн., а плановый период выглядит длиннее. Нужен больший общий бюджет или короче период.`;
  const warnings = [
    coverageDays < plannedDays
      ? 'Плановый период длиннее, чем позволяет общий лимит. Кампания может остановиться раньше срока.'
      : 'Соотношение периода и общего лимита выглядит рабочим.',
    state.totalBudget < state.dailyBudget * 7
      ? 'Общий лимит меньше недели открутки. Для устойчивой оценки кампании обычно нужен более длинный горизонт.'
      : 'Горизонт открутки выглядит достаточным для первого запуска.',
    state.strategy === 'aggressive'
      ? 'Агрессивная стратегия быстрее соберёт данные, но может поднять цену клика в начале.'
      : 'Текущая стратегия не выглядит рискованной по расходу.',
    state.dailyBudget < 3000
      ? 'Низкий дневной бюджет может замедлить обучение и дать менее стабильный прогноз.'
      : 'Дневной лимит достаточен, чтобы система набирала статистику без сильной задержки.',
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
