import './overview.scss';
import { getAds, getAdGroups, getAdsInGroup } from 'features/ads';
import type { AdCampaignStatus } from 'features/ads';
import type { AdItem } from 'features/ads/api/get-ads';
import { getBalanceState } from 'features/balance';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import overviewTemplate from './overview.hbs';

type Tone = 'success' | 'warning' | 'danger' | 'muted' | 'info';

interface CampaignOverview extends AdItem {
  groupCount: number;
  adCount: number;
}

interface OverviewStat {
  label: string;
  value: string;
  note: string;
  tone: Tone;
}

interface StatusItem {
  label: string;
  value: number;
  tone: Tone;
  width: number;
}

interface ActivityItem {
  title: string;
  meta: string;
  status: string;
  tone: Tone;
  href: string;
}

interface RecommendationItem {
  title: string;
  text: string;
  actionLabel: string;
  href: string;
  tone: Tone;
}

interface ChartPoint {
  label: string;
  value: number;
  height: number;
}

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  moderation: { label: 'На модерации', tone: 'warning' },
  working: { label: 'Активна', tone: 'success' },
  active: { label: 'Активна', tone: 'success' },
  rejected: { label: 'Отклонена', tone: 'danger' },
  not_enough_money: { label: 'Нет баланса', tone: 'warning' },
  turned_off: { label: 'Остановлена', tone: 'muted' },
  draft: { label: 'Черновик', tone: 'muted' },
};

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.max(0, value))} ₽`;
}

function pluralizeRu(value: number, one: string, few: string, many: string): string {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }

  return many;
}

function getStatusMeta(status?: AdCampaignStatus): { label: string; tone: Tone } {
  return STATUS_META[String(status || '')] ?? { label: 'Статус неизвестен', tone: 'muted' };
}

function formatGoal(action?: string): string {
  if (action === 'click') {
    return 'Переходы';
  }

  if (action === 'look') {
    return 'Показы';
  }

  return 'Цель не указана';
}

function getCampaignDailyBudget(campaign: AdItem): number {
  return typeof campaign.price === 'number' && campaign.price > 0 ? campaign.price : 0;
}

async function enrichCampaign(campaign: AdItem): Promise<CampaignOverview> {
  const campaignId = campaign.id;

  if (!campaignId) {
    return { ...campaign, groupCount: 0, adCount: 0 };
  }

  try {
    const groups = await getAdGroups(campaignId);
    const adCounts = await Promise.all(
      groups.groups.map(async (group) => {
        try {
          const ads = await getAdsInGroup(campaignId, group.id);
          return ads.ads.length;
        } catch {
          return 0;
        }
      }),
    );

    return {
      ...campaign,
      groupCount: groups.groups.length,
      adCount: adCounts.reduce((total, count) => total + count, 0),
    };
  } catch {
    return { ...campaign, groupCount: 0, adCount: 0 };
  }
}

function buildStats(campaigns: CampaignOverview[], balanceValue: number): OverviewStat[] {
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((item) =>
    ['working', 'active'].includes(String(item.status)),
  ).length;
  const moderationCampaigns = campaigns.filter((item) => item.status === 'moderation').length;
  const totalAds = campaigns.reduce((total, campaign) => total + campaign.adCount, 0);
  const dailyBudget = campaigns.reduce((total, campaign) => total + getCampaignDailyBudget(campaign), 0);
  const activeLabel = pluralizeRu(activeCampaigns, 'активная', 'активные', 'активных');

  return [
    {
      label: 'Баланс',
      value: formatPrice(balanceValue),
      note: dailyBudget > 0 ? `Хватит примерно на ${Math.floor(balanceValue / dailyBudget)} дн.` : 'Дневной расход не задан',
      tone: balanceValue > 0 ? 'success' : 'warning',
    },
    {
      label: 'Кампании',
      value: String(totalCampaigns),
      note: `${activeCampaigns} ${activeLabel}`,
      tone: totalCampaigns > 0 ? 'info' : 'muted',
    },
    {
      label: 'Объявления',
      value: String(totalAds),
      note: totalAds > 0 ? 'Во всех группах' : 'Пока нет объявлений',
      tone: totalAds > 0 ? 'success' : 'muted',
    },
    {
      label: 'Модерация',
      value: String(moderationCampaigns),
      note: moderationCampaigns > 0 ? 'Ожидают проверки' : 'Нет очереди',
      tone: moderationCampaigns > 0 ? 'warning' : 'success',
    },
  ];
}

function buildStatusItems(campaigns: CampaignOverview[]): StatusItem[] {
  const counters = campaigns.reduce<Record<string, number>>((acc, campaign) => {
    const key = String(campaign.status || 'unknown');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const max = Math.max(...Object.values(counters), 1);

  return Object.entries(counters).map(([status, value]) => {
    const meta = getStatusMeta(status as AdCampaignStatus);
    return {
      label: meta.label,
      value,
      tone: meta.tone,
      width: Math.max(12, Math.round((value / max) * 100)),
    };
  });
}

function buildChart(campaigns: CampaignOverview[]): ChartPoint[] {
  const activeCampaigns = campaigns.filter((item) =>
    ['working', 'active'].includes(String(item.status)),
  ).length;
  const groupCount = campaigns.reduce((total, campaign) => total + campaign.groupCount, 0);
  const totalAds = campaigns.reduce((total, campaign) => total + campaign.adCount, 0);
  const moderationCount = campaigns.filter((campaign) => campaign.status === 'moderation').length;
  const emptyGroups = campaigns.reduce(
    (total, campaign) => total + (campaign.groupCount > 0 && campaign.adCount === 0 ? campaign.groupCount : 0),
    0,
  );
  const values = [
    { label: 'Кампании', value: campaigns.length },
    { label: 'Активные', value: activeCampaigns },
    { label: 'Группы', value: groupCount },
    { label: 'Объявл.', value: totalAds },
    { label: 'Модер.', value: moderationCount },
    { label: 'Пустые', value: emptyGroups },
  ];
  const max = Math.max(...values.map((item) => item.value), 1);

  return values.map((item) => ({
    label: item.label,
    value: item.value,
    height: item.value > 0 ? Math.max(16, Math.round((item.value / max) * 100)) : 6,
  }));
}

function buildActivity(campaigns: CampaignOverview[]): ActivityItem[] {
  return campaigns.slice(0, 5).map((campaign) => {
    const meta = getStatusMeta(campaign.status);
    const groupLabel = pluralizeRu(campaign.groupCount, 'группа', 'группы', 'групп');
    const adLabel = pluralizeRu(campaign.adCount, 'объявление', 'объявления', 'объявлений');

    return {
      title: campaign.title || 'Кампания без названия',
      meta: `${campaign.groupCount} ${groupLabel} · ${campaign.adCount} ${adLabel} · ${formatGoal(campaign.main_action)}`,
      status: meta.label,
      tone: meta.tone,
      href: `/ads/campaign?id=${campaign.id}`,
    };
  });
}

function buildRecommendations(campaigns: CampaignOverview[], balanceValue: number): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];
  const hasCampaigns = campaigns.length > 0;
  const emptyCampaign = campaigns.find((campaign) => campaign.groupCount === 0 || campaign.adCount === 0);
  const moderationCount = campaigns.filter((campaign) => campaign.status === 'moderation').length;

  if (!hasCampaigns) {
    recommendations.push({
      title: 'Создайте первую кампанию',
      text: 'В кабинете пока нет активного рекламного флоу.',
      actionLabel: 'Создать',
      href: '/ads/create',
      tone: 'info',
    });
  }

  if (emptyCampaign?.id) {
    recommendations.push({
      title: 'Заполните структуру кампании',
      text: 'Есть кампания без группы или объявления.',
      actionLabel: 'Открыть',
      href: `/ads/campaign?id=${emptyCampaign.id}`,
      tone: 'warning',
    });
  }

  if (balanceValue <= 0) {
    recommendations.push({
      title: 'Пополните баланс',
      text: 'Запуск и продолжение показов зависят от доступных средств.',
      actionLabel: 'Баланс',
      href: '/balance',
      tone: 'danger',
    });
  }

  if (moderationCount > 0) {
    recommendations.push({
      title: 'Дождитесь модерации',
      text: `${moderationCount} ${pluralizeRu(moderationCount, 'кампания ожидает', 'кампании ожидают', 'кампаний ожидают')} проверки.`,
      actionLabel: 'Кампании',
      href: '/ads',
      tone: 'warning',
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      title: 'Кабинет в рабочем состоянии',
      text: 'Кампании заполнены, критических действий сейчас нет.',
      actionLabel: 'Список',
      href: '/ads',
      tone: 'success',
    });
  }

  return recommendations.slice(0, 3);
}

export async function renderOverviewPage(): Promise<string> {
  const [adsResult, balanceState] = await Promise.all([
    getAds(),
    Promise.resolve(getBalanceState()),
  ]);

  const campaigns = await Promise.all((adsResult.ads ?? []).map(enrichCampaign));
  const balanceValue = balanceState.balanceValue;
  const statusItems = buildStatusItems(campaigns);
  const recentCampaigns = buildActivity(campaigns);

  return renderTemplate(overviewTemplate, {
    stats: buildStats(campaigns, balanceValue),
    statusItems,
    hasStatuses: statusItems.length > 0,
    chart: buildChart(campaigns),
    recentCampaigns,
    hasRecentCampaigns: recentCampaigns.length > 0,
    recommendations: buildRecommendations(campaigns, balanceValue),
    loadError: adsResult.error ? adsResult.message : '',
    balance: formatPrice(balanceValue),
  });
}

export function Overview(): VoidFunction {
  const controller = new AbortController();
  const root = document.querySelector<HTMLElement>('[data-overview-page]');

  if (!root) {
    return () => controller.abort();
  }

  root.querySelectorAll<HTMLElement>('[data-overview-link]').forEach((link) => {
    link.addEventListener(
      'click',
      (event) => {
        const href = link.getAttribute('href');
        if (!href) {
          return;
        }

        event.preventDefault();
        navigateTo(href);
      },
      { signal: controller.signal },
    );
  });

  return () => controller.abort();
}
