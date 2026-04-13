import { formatPrice } from 'shared/lib/format';
import {
  DEFAULT_CAMPAIGN_STATISTICS_MOCK,
  type CampaignStatisticsMock,
  type CampaignStatisticsSeed,
  type StatisticsPeriodData,
  type StatisticsPeriodKey,
} from './mock';

export type StatisticsMetricKey =
  | 'impressions'
  | 'clicks'
  | 'ctr'
  | 'spend';

export interface CampaignStatisticsUiState {
  period: StatisticsPeriodKey;
  metric: StatisticsMetricKey;
}

interface Totals {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number;
}

interface DeltaSummary {
  value: number;
  tone: 'positive' | 'negative' | 'neutral';
  text: string;
}

interface ChartPointViewModel {
  x: string;
  y: string;
  valueLabel: string;
}

export interface CampaignStatisticsTemplateContext {
  campaignName: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'muted';
  periodLabel: string;
  selectedPeriodLabel: string;
  goal: string;
  dataStateLabel: string;
  ctaLabel: string;
  previewTitle: string;
  previewDescription: string;
  metrics: Array<{
    label: string;
    value: string;
    delta: string;
    tone: 'positive' | 'negative' | 'neutral';
  }>;
  periodOptions: Array<{
    value: StatisticsPeriodKey;
    label: string;
    active: boolean;
  }>;
  metricOptions: Array<{
    value: StatisticsMetricKey;
    label: string;
    active: boolean;
  }>;
  previewMeta: Array<{ label: string; value: string }>;
  contextNote: string;
  chartTitle: string;
  chartActionLabel: string;
  chartActionTarget: 'placements' | 'insights';
  chartSummary: Array<{ label: string; value: string }>;
  chart: {
    points: string;
    areaPath: string;
    dots: ChartPointViewModel[];
    labels: string[];
    gridLines: Array<{ y: string }>;
  };
  insights: Array<{
    label: string;
    value: string;
    text: string;
    tone: 'positive' | 'warning' | 'neutral';
  }>;
  placements: Array<{
    name: string;
    impressions: string;
    clicks: string;
    ctr: string;
    spend: string;
    cpc: string;
    share: string;
    highlight: boolean;
  }>;
}

function cloneDefaultMock(): CampaignStatisticsMock {
  return JSON.parse(
    JSON.stringify(DEFAULT_CAMPAIGN_STATISTICS_MOCK),
  ) as CampaignStatisticsMock;
}

function sumPeriod(period: StatisticsPeriodData): Totals {
  const impressions = period.timeline.reduce(
    (total, point) => total + point.impressions,
    0,
  );
  const clicks = period.timeline.reduce((total, point) => total + point.clicks, 0);
  const spend = period.timeline.reduce((total, point) => total + point.spend, 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;

  return {
    impressions,
    clicks,
    ctr,
    spend,
    cpc,
  };
}

function delta(current: number, previous: number): DeltaSummary {
  if (previous <= 0) {
    return { value: 0, tone: 'neutral', text: 'без сравнения' };
  }

  const value = ((current - previous) / previous) * 100;

  if (Math.abs(value) < 0.1) {
    return { value, tone: 'neutral', text: 'без изменений' };
  }

  return {
    value,
    tone: value > 0 ? 'positive' : 'negative',
    text: `${value > 0 ? '+' : ''}${value.toFixed(1)}% к прошлому периоду`,
  };
}

function formatDelta(summary: DeltaSummary): string {
  return summary.text;
}

function formatMetricValue(key: StatisticsMetricKey, totals: Totals): string {
  if (key === 'impressions') {
    return totals.impressions.toLocaleString('ru-RU');
  }

  if (key === 'clicks') {
    return totals.clicks.toLocaleString('ru-RU');
  }

  if (key === 'ctr') {
    return `${totals.ctr.toFixed(1)}%`;
  }

  return formatPrice(Math.round(totals.spend));
}

function getStatusMeta(status: CampaignStatisticsMock['status']): {
  label: string;
  tone: 'success' | 'warning' | 'muted';
} {
  if (status === 'active') {
    return { label: 'Активна', tone: 'success' };
  }

  if (status === 'paused') {
    return { label: 'На паузе', tone: 'warning' };
  }

  return { label: 'Черновик', tone: 'muted' };
}

function deriveDataState(totals: Totals): string {
  if (totals.impressions < 50000) {
    return 'Данных пока мало, рекомендации предварительные.';
  }

  if (totals.ctr < 2) {
    return 'Трафик есть, но креативу не хватает вовлечения.';
  }

  return 'Статистика уже достаточна для управленческих решений.';
}

function buildChart(
  metric: StatisticsMetricKey,
  period: StatisticsPeriodData,
): CampaignStatisticsTemplateContext['chart'] {
  const chartHeight = 180;
  const chartBottom = 188;
  const chartLeft = 24;
  const chartRight = 336;
  const step =
    period.timeline.length > 1
      ? (chartRight - chartLeft) / (period.timeline.length - 1)
      : 0;

  const values = period.timeline.map((point) => {
    if (metric === 'impressions') {
      return point.impressions;
    }

    if (metric === 'clicks') {
      return point.clicks;
    }

    if (metric === 'ctr') {
      return point.impressions > 0 ? (point.clicks / point.impressions) * 100 : 0;
    }

    return point.spend;
  });

  const maxValue = Math.max(...values, 1);
  const toY = (value: number): number => chartBottom - (value / maxValue) * chartHeight;

  const dots = values.map((value, index) => ({
    x: String(chartLeft + step * index),
    y: toY(value).toFixed(1),
    valueLabel:
      metric === 'ctr'
        ? `${value.toFixed(1)}%`
        : metric === 'spend'
          ? formatPrice(Math.round(value))
          : Math.round(value).toLocaleString('ru-RU'),
  }));

  const points = dots.map((dot) => `${dot.x},${dot.y}`).join(' ');
  const areaPath = `M ${chartLeft} ${chartBottom} L ${points.replace(
    /,/g,
    ' ',
  )} L ${chartRight} ${chartBottom} Z`;

  return {
    points,
    areaPath,
    dots,
    labels: period.timeline.map((point) => point.label),
    gridLines: [0, 1, 2, 3].map((index) => ({
      y: String(28 + index * 52),
    })),
  };
}

function buildInsights(
  totals: Totals,
  period: StatisticsPeriodData,
): CampaignStatisticsTemplateContext['insights'] {
  const bestPlacement = [...period.placements]
    .map((item) => ({
      ...item,
      ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
      cpc: item.clicks > 0 ? item.spend / item.clicks : 0,
    }))
    .sort((left, right) => right.ctr - left.ctr)[0];

  const lastTwoPoints = period.timeline.slice(-2);
  const trendDown =
    lastTwoPoints.length === 2 &&
    lastTwoPoints[1].impressions > 0 &&
    lastTwoPoints[0].impressions > 0 &&
    lastTwoPoints[1].clicks / lastTwoPoints[1].impressions <
      lastTwoPoints[0].clicks / lastTwoPoints[0].impressions;

  return [
    {
      label: 'Что работает',
      value:
        totals.ctr >= 3
          ? 'Креатив держит сильный CTR'
          : 'Нужен более сильный оффер',
      text:
        totals.ctr >= 3
          ? `Средний CTR ${totals.ctr.toFixed(1)}%, выше порога для стабильного набора трафика.`
          : `CTR ${totals.ctr.toFixed(1)}%: стоит протестировать новый заголовок или CTA.`,
      tone: totals.ctr >= 3 ? 'positive' : 'warning',
    },
    {
      label: 'Лучший канал',
      value: bestPlacement.name,
      text: `Даёт ${bestPlacement.ctr.toFixed(1)}% CTR и ${formatPrice(
        Math.round(bestPlacement.cpc),
      )} за клик. Есть смысл усиливать этот канал первым.`,
      tone: 'positive',
    },
    {
      label: 'Что сделать дальше',
      value: trendDown ? 'Освежить креатив' : 'Масштабировать без резких правок',
      text: trendDown
        ? 'CTR просел на последних точках. Обновите оффер или визуал до того, как выгорит аудитория.'
        : 'Динамика ровная. Можно аккуратно увеличивать бюджет и не менять связку креатива.',
      tone: trendDown ? 'warning' : 'neutral',
    },
  ];
}

export function buildCampaignStatisticsContext(
  seed: CampaignStatisticsSeed | null,
  uiState: CampaignStatisticsUiState,
): CampaignStatisticsTemplateContext {
  const mock = cloneDefaultMock();

  if (seed?.id) {
    mock.id = seed.id;
  }

  if (seed?.title?.trim()) {
    mock.campaignName = seed.title.trim();
  }

  if (seed?.goal?.trim()) {
    mock.goal = seed.goal.trim();
  }

  if (typeof seed?.budgetValue === 'number' && Number.isFinite(seed.budgetValue)) {
    const spendScale = Math.max(seed.budgetValue / 74900, 0.5);

    (Object.keys(mock.periods) as StatisticsPeriodKey[]).forEach((periodKey) => {
      const period = mock.periods[periodKey];

      period.timeline = period.timeline.map((point) => ({
        ...point,
        impressions: Math.round(point.impressions * spendScale),
        clicks: Math.max(1, Math.round(point.clicks * spendScale)),
        spend: Math.max(1000, Math.round(point.spend * spendScale)),
      }));

      period.placements = period.placements.map((item) => ({
        ...item,
        impressions: Math.round(item.impressions * spendScale),
        clicks: Math.max(1, Math.round(item.clicks * spendScale)),
        spend: Math.max(1000, Math.round(item.spend * spendScale)),
      }));

      period.previousTotals = {
        impressions: Math.round(period.previousTotals.impressions * spendScale),
        clicks: Math.max(1, Math.round(period.previousTotals.clicks * spendScale)),
        spend: Math.max(1000, Math.round(period.previousTotals.spend * spendScale)),
      };
    });
  }

  const period = mock.periods[uiState.period];
  const totals = sumPeriod(period);
  const previousCtr =
    period.previousTotals.impressions > 0
      ? (period.previousTotals.clicks / period.previousTotals.impressions) * 100
      : 0;
  const previousCpc =
    period.previousTotals.clicks > 0
      ? period.previousTotals.spend / period.previousTotals.clicks
      : 0;

  const statusMeta = getStatusMeta(mock.status);

  const placementsWithMetrics = period.placements
    .map((item) => {
      const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
      const cpc = item.clicks > 0 ? item.spend / item.clicks : 0;
      return {
        ...item,
        ctr,
        cpc,
      };
    })
    .sort((left, right) => right.ctr - left.ctr);

  const bestPlacementName = placementsWithMetrics[0]?.name;

  return {
    campaignName: mock.campaignName,
    statusLabel: statusMeta.label,
    statusTone: statusMeta.tone,
    periodLabel: `${period.from} - ${period.to}`,
    selectedPeriodLabel:
      uiState.period === '7d' ? '7 дней' : '30 дней',
    goal: mock.goal,
    dataStateLabel: deriveDataState(totals),
    ctaLabel: mock.ctaLabel,
    previewTitle: mock.headline,
    previewDescription: mock.description,
    metrics: [
      {
        label: 'Показы',
        value: totals.impressions.toLocaleString('ru-RU'),
        delta: formatDelta(delta(totals.impressions, period.previousTotals.impressions)),
        tone: delta(totals.impressions, period.previousTotals.impressions).tone,
      },
      {
        label: 'Клики',
        value: totals.clicks.toLocaleString('ru-RU'),
        delta: formatDelta(delta(totals.clicks, period.previousTotals.clicks)),
        tone: delta(totals.clicks, period.previousTotals.clicks).tone,
      },
      {
        label: 'CTR',
        value: `${totals.ctr.toFixed(1)}%`,
        delta: formatDelta(delta(totals.ctr, previousCtr)),
        tone: delta(totals.ctr, previousCtr).tone,
      },
      {
        label: 'Расход',
        value: formatPrice(Math.round(totals.spend)),
        delta: formatDelta(delta(totals.spend, period.previousTotals.spend)),
        tone: delta(totals.spend, period.previousTotals.spend).tone,
      },
      {
        label: 'CPC',
        value: formatPrice(Math.round(totals.cpc)),
        delta: formatDelta(delta(totals.cpc, previousCpc)),
        tone: delta(totals.cpc, previousCpc).tone,
      },
    ],
    periodOptions: [
      { value: '7d', label: '7 дней', active: uiState.period === '7d' },
      { value: '30d', label: '30 дней', active: uiState.period === '30d' },
    ],
    metricOptions: [
      { value: 'impressions', label: 'Показы', active: uiState.metric === 'impressions' },
      { value: 'clicks', label: 'Клики', active: uiState.metric === 'clicks' },
      { value: 'ctr', label: 'CTR', active: uiState.metric === 'ctr' },
      { value: 'spend', label: 'Расход', active: uiState.metric === 'spend' },
    ],
    previewMeta: [
      { label: 'Формат', value: mock.format },
      { label: 'Цель', value: mock.goal },
      { label: 'Период', value: `${period.from} - ${period.to}` },
      { label: 'Площадки', value: mock.placementsLabel },
    ],
    contextNote: `Аудитория: ${mock.audience}. Лучший результат сейчас даёт ${
      bestPlacementName || 'основная площадка'
    }.`,
    chartTitle:
      uiState.metric === 'impressions'
        ? 'Динамика показов'
        : uiState.metric === 'clicks'
          ? 'Динамика кликов'
          : uiState.metric === 'ctr'
          ? 'Динамика CTR'
          : 'Динамика расхода',
    chartActionLabel:
      uiState.metric === 'spend'
        ? 'Подробнее о расходе'
        : uiState.metric === 'ctr'
          ? 'Подробнее по выводам'
          : 'Подробнее',
    chartActionTarget: uiState.metric === 'spend' ? 'placements' : 'insights',
    chartSummary: [
      {
        label: 'Текущая метрика',
        value: formatMetricValue(uiState.metric, totals),
      },
      {
        label: 'Период',
        value: uiState.period === '7d' ? 'Последние 7 дней' : 'Последние 30 дней',
      },
    ],
    chart: buildChart(uiState.metric, period),
    insights: buildInsights(totals, period),
    placements: placementsWithMetrics.map((item) => ({
      name: item.name,
      impressions: item.impressions.toLocaleString('ru-RU'),
      clicks: item.clicks.toLocaleString('ru-RU'),
      ctr: `${item.ctr.toFixed(1)}%`,
      spend: formatPrice(Math.round(item.spend)),
      cpc: formatPrice(Math.round(item.cpc)),
      share: `${((item.impressions / totals.impressions) * 100).toFixed(0)}% показов`,
      highlight: item.name === bestPlacementName,
    })),
  };
}
