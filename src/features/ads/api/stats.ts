import { request } from 'shared/lib/request';

export interface StatsMetric {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number;
  partner_reward: number;
  platform_revenue: number;
}

export interface StatsPoint extends StatsMetric {
  date: string;
}

export interface StatsEntityRow extends StatsMetric {
  id: number;
  name: string;
}

export interface StatsPeriod {
  from: string;
  to: string;
}

export interface CampaignStatsResponse {
  period: StatsPeriod;
  totals: StatsMetric;
  previous_totals: StatsMetric;
  timeline: StatsPoint[];
  groups: StatsEntityRow[];
  placements: StatsEntityRow[];
  unavailable_metrics: Array<{ key: string; label: string; reason: string }>;
}

export interface GroupStatsResponse {
  period: StatsPeriod;
  totals: StatsMetric;
  previous_totals: StatsMetric;
  timeline: StatsPoint[];
  ads: StatsEntityRow[];
  placements: StatsEntityRow[];
  unavailable_metrics: Array<{ key: string; label: string; reason: string }>;
}

export interface AdStatsResponse {
  period: StatsPeriod;
  totals: StatsMetric;
  previous_totals: StatsMetric;
  timeline: StatsPoint[];
  placements: StatsEntityRow[];
  unavailable_metrics: Array<{ key: string; label: string; reason: string }>;
}

function buildQuery(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function periodDates(days: number): { from?: string; to?: string } {
  if (days === 0) return {};
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export async function getCampaignStats(
  campaignId: number,
  from?: string,
  to?: string,
): Promise<CampaignStatsResponse> {
  const res = await request<CampaignStatsResponse>(
    `/ad_campaigns/${campaignId}/stats${buildQuery(from, to)}`,
    { method: 'GET' },
  );
  return res.data;
}

export async function getGroupStats(
  campaignId: number,
  groupId: number,
  from?: string,
  to?: string,
): Promise<GroupStatsResponse> {
  const res = await request<GroupStatsResponse>(
    `/ad_campaigns/${campaignId}/ad_groups/${groupId}/stats${buildQuery(from, to)}`,
    { method: 'GET' },
  );
  return res.data;
}

export async function getAdStats(
  campaignId: number,
  groupId: number,
  adId: number,
  from?: string,
  to?: string,
): Promise<AdStatsResponse> {
  const res = await request<AdStatsResponse>(
    `/ad_campaigns/${campaignId}/ad_groups/${groupId}/ads/${adId}/stats${buildQuery(from, to)}`,
    { method: 'GET' },
  );
  return res.data;
}
