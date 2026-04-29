import type { AdItem } from 'features/ads/api/get-ads';

export type CampaignStatusKey = 'active' | 'stopped' | 'draft' | 'moderation';

export interface CampaignTemplateRow {
  id: AdItem['id'];
  title: string;
  budget: string;
  budgetValue: number;
  goal: string;
  lastActionDate: string;
  statusKey: CampaignStatusKey;
  status: string;
  statusType: string;
  enabled: boolean;
}

export interface CampaignStatusMeta {
  label: string;
  tone: 'working' | 'paused' | 'draft' | 'pending';
  enabled: boolean;
}

export interface PendingStatusChange {
  campaignId: number;
  row: HTMLElement;
  toggle: HTMLInputElement;
  badge: HTMLElement;
  nextStatus: CampaignStatusKey;
}
