export type StatisticsPeriodKey = '7d' | '30d';

export interface CampaignStatisticsSeed {
  id?: string;
  title?: string;
  budgetValue?: number;
  goal?: string;
}

export interface StatisticsTimelinePoint {
  label: string;
  impressions: number;
  clicks: number;
  spend: number;
}

export interface StatisticsPlacementRow {
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
}

export interface StatisticsPeriodData {
  from: string;
  to: string;
  timeline: StatisticsTimelinePoint[];
  placements: StatisticsPlacementRow[];
  previousTotals: {
    impressions: number;
    clicks: number;
    spend: number;
  };
}

export interface CampaignStatisticsMock {
  id: string;
  campaignName: string;
  status: 'active' | 'paused' | 'draft';
  goal: string;
  format: string;
  audience: string;
  placementsLabel: string;
  headline: string;
  description: string;
  landingUrl: string;
  ctaLabel: string;
  periods: Record<StatisticsPeriodKey, StatisticsPeriodData>;
}

const DEFAULT_7D: StatisticsPeriodData = {
  from: '05.04.2026',
  to: '11.04.2026',
  timeline: [
    { label: 'Пн', impressions: 24200, clicks: 774, spend: 8900 },
    { label: 'Вт', impressions: 25150, clicks: 811, spend: 9300 },
    { label: 'Ср', impressions: 24780, clicks: 786, spend: 9050 },
    { label: 'Чт', impressions: 25810, clicks: 852, spend: 9540 },
    { label: 'Пт', impressions: 26340, clicks: 889, spend: 9820 },
    { label: 'Сб', impressions: 27560, clicks: 980, spend: 10680 },
    { label: 'Вс', impressions: 30360, clicks: 1126, spend: 12610 },
  ],
  placements: [
    { name: 'Лента', impressions: 94360, clicks: 3490, spend: 42100 },
    { name: 'Яндекс', impressions: 51160, clicks: 1586, spend: 18700 },
    { name: 'Партнёрская сеть', impressions: 38680, clicks: 1142, spend: 14100 },
  ],
  previousTotals: {
    impressions: 171400,
    clicks: 5840,
    spend: 69800,
  },
};

const DEFAULT_30D: StatisticsPeriodData = {
  from: '13.03.2026',
  to: '11.04.2026',
  timeline: [
    { label: '1 нед', impressions: 121300, clicks: 3880, spend: 45500 },
    { label: '2 нед', impressions: 132600, clicks: 4290, spend: 48800 },
    { label: '3 нед', impressions: 145200, clicks: 4780, spend: 53700 },
    { label: '4 нед', impressions: 158900, clicks: 5290, spend: 60400 },
  ],
  placements: [
    { name: 'Лента', impressions: 214800, clicks: 7610, spend: 89400 },
    { name: 'Яндекс', impressions: 143500, clicks: 4050, spend: 47600 },
    { name: 'Партнёрская сеть', impressions: 99800, clicks: 2610, spend: 32800 },
  ],
  previousTotals: {
    impressions: 401900,
    clicks: 12820,
    spend: 153800,
  },
};

export const DEFAULT_CAMPAIGN_STATISTICS_MOCK: CampaignStatisticsMock = {
  id: 'ad-1',
  campaignName: 'Конкурс Гусейна Гасанова',
  status: 'active',
  goal: 'Переход на сайт',
  format: 'Карточка в ленте',
  audience: 'Владельцы малого бизнеса и новые рекламодатели',
  placementsLabel: 'Лента, Яндекс и партнёрская сеть',
  headline: 'До 30% на запуск первой рекламной кампании',
  description:
    'Получите новые настройки продвижения, рекомендации по бюджету и быстрый старт без сложной настройки.',
  landingUrl: 'https://eshke.ru/promo/spring',
  ctaLabel: 'Запустить сейчас',
  periods: {
    '7d': DEFAULT_7D,
    '30d': DEFAULT_30D,
  },
};

