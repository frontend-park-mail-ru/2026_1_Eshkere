import type { AdCampaignStatus } from 'features/ads';
import type { AdItem } from 'features/ads/api/get-ads';
import { formatDate, formatPrice } from 'shared/lib/format';
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
};

export function mapBackendStatusToCampaignStatus(
  status?: AdCampaignStatus,
): CampaignStatusKey {
  if (status === 'working') {
    return 'active';
  }

  if (status === 'turned_off' || status === 'not_enough_money') {
    return 'stopped';
  }

  if (status === 'moderation' || status === 'rejected') {
    return 'moderation';
  }

  return 'draft';
}

export function mapAdsToCampaigns(ads: AdItem[] = []): CampaignTemplateRow[] {
  return ads.map((ad) => {
    const statusKey = mapBackendStatusToCampaignStatus(ad.status);
    const statusMeta = campaignStatusMap[statusKey];

    return {
      id: ad.id,
      title: ad.title || 'Без названия',
      budget: typeof ad.price === 'number' ? formatPrice(ad.price) : '—',
      budgetValue: typeof ad.price === 'number' ? ad.price : 0,
      goal: ad.target_action || 'Цель не указана',
      lastActionDate: ad.created_at ? formatDate(ad.created_at) : '—',
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
    if (currentStatus === 'draft' || currentStatus === 'moderation') {
      return 'moderation';
    }

    return 'active';
  }

  if (currentStatus === 'draft' || currentStatus === 'moderation') {
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
