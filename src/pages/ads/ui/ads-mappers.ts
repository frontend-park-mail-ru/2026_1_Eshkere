import type { AdCampaignStatus } from 'features/ads';
import type { AdItem } from 'features/ads/api/get-ads';
import { formatPrice } from 'shared/lib/format';
import type {
  CampaignStatusKey,
  CampaignStatusMeta,
  CampaignTemplateRow,
} from './ads-types';

export const campaignStatusMap: Record<CampaignStatusKey, CampaignStatusMeta> = {
  active: {
    label: 'Активно',
    tone: 'working',
    enabled: true,
  },
  stopped: {
    label: 'Остановлено',
    tone: 'paused',
    enabled: false,
  },
  draft: {
    label: 'Черновик',
    tone: 'draft',
    enabled: false,
  },
  moderation: {
    label: 'На модерации',
    tone: 'pending',
    enabled: true,
  },
  rejected: {
    label: 'Отклонено',
    tone: 'danger',
    enabled: false,
  },
  notEnoughMoney: {
    label: 'Нет средств',
    tone: 'warning',
    enabled: false,
  },
};

export function mapBackendStatusToCampaignStatus(
  status?: AdCampaignStatus,
): CampaignStatusKey {
  if (status === 'working') {
    return 'active';
  }

  if (status === 'turned_off') {
    return 'stopped';
  }

  if (status === 'not_enough_money') {
    return 'notEnoughMoney';
  }

  if (status === 'rejected') {
    return 'rejected';
  }

  if (status === 'moderation') {
    return 'moderation';
  }

  return 'draft';
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

function formatCampaignGoal(action?: string): string {
  if (action === 'click') {
    return 'Переходы';
  }

  if (action === 'look') {
    return 'Показы';
  }

  return 'Не указана';
}

function getComposition(ad: AdItem): Pick<
  CampaignTemplateRow,
  'composition' | 'compositionType'
> {
  if (!ad.compositionLoaded) {
    return {
      composition: 'Откройте детали',
      compositionType: 'muted',
    };
  }

  const groupCount = ad.groupCount ?? 0;
  const adCount = ad.adCount ?? 0;

  if (groupCount <= 0) {
    return {
      composition: 'Нет групп',
      compositionType: 'warning',
    };
  }

  const groupText = `${groupCount} ${pluralizeRu(groupCount, 'группа', 'группы', 'групп')}`;

  if (adCount <= 0) {
    return {
      composition: `${groupText} · нет объявлений`,
      compositionType: 'warning',
    };
  }

  const adText = `${adCount} ${pluralizeRu(adCount, 'объявление', 'объявления', 'объявлений')}`;

  return {
    composition: `${groupText} · ${adText}`,
    compositionType: 'ready',
  };
}

export function mapAdsToCampaigns(ads: AdItem[] = []): CampaignTemplateRow[] {
  return ads.map((ad) => {
    const statusKey = mapBackendStatusToCampaignStatus(ad.status);
    const statusMeta = campaignStatusMap[statusKey];
    const composition = getComposition(ad);

    return {
      id: ad.id,
      title: ad.title || 'Без названия',
      budget:
        typeof ad.price === 'number' && ad.price > 0
          ? formatPrice(ad.price)
          : 'Не задан',
      budgetValue: typeof ad.price === 'number' ? ad.price : 0,
      goal: ad.target_action || formatCampaignGoal(ad.main_action),
      composition: composition.composition,
      compositionType: composition.compositionType,
      statusKey,
      status: statusMeta.label,
      statusType: statusMeta.tone,
      enabled: statusMeta.enabled,
    };
  });
}

export function getNextStatus(
  currentStatus: CampaignStatusKey,
  enabled: boolean,
): CampaignStatusKey {
  if (enabled) {
    if (
      currentStatus === 'draft' ||
      currentStatus === 'moderation' ||
      currentStatus === 'rejected' ||
      currentStatus === 'notEnoughMoney'
    ) {
      return 'moderation';
    }

    return 'active';
  }

  if (
    currentStatus === 'draft' ||
    currentStatus === 'moderation' ||
    currentStatus === 'rejected' ||
    currentStatus === 'notEnoughMoney'
  ) {
    return 'draft';
  }

  return 'stopped';
}

export function mapCampaignStatusToBackendStatus(
  status: CampaignStatusKey,
): AdCampaignStatus {
  if (status === 'active') {
    return 'working';
  }

  if (status === 'stopped') {
    return 'turned_off';
  }

  return 'moderation';
}
