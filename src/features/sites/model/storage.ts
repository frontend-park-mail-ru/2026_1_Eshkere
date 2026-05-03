import { LocalStorageKey } from 'shared/lib/local-storage';
import { localStorageService } from 'shared/lib/local-storage';

/** Значение `status` = суффикс класса `status-badge--*`. */
export type PartnerSiteStatus =
  | 'draft'
  | 'pending'
  | 'danger'
  | 'warning'
  | 'paused'
  | 'working';

export interface StoredPartnerSite {
  id: number;
  domain: string;
  site_name: string;
  created_at: string;
  updated_at: string;
  status: PartnerSiteStatus | string;
  listing_enabled: boolean;
}

const KEY = LocalStorageKey.Sites;

const STATUS_LABEL_RU: Record<PartnerSiteStatus, string> = {
  draft: 'Черновик',
  pending: 'На модерации',
  danger: 'Отклонён',
  warning: 'Нет средств',
  paused: 'Остановлен',
  working: 'Активен',
};

const SITE_STATUS_BADGES = new Set<string>(Object.keys(STATUS_LABEL_RU));

const TOGGLE_ON_STATUSES = new Set<string>(['pending', 'working']);

export function partnerSiteStatusLabelRu(status: string): string {
  return STATUS_LABEL_RU[status as PartnerSiteStatus] ?? status;
}

/** Для шаблона: неизвестное значение → `draft`. */
export function partnerSiteStatusBadgeVariant(status: string): string {
  return SITE_STATUS_BADGES.has(status) ? status : 'draft';
}

export function partnerSiteToggleChecked(status: string): boolean {
  return TOGGLE_ON_STATUSES.has(status);
}

export function getSites(): StoredPartnerSite[] {
  const raw = localStorageService.getJson<unknown>(KEY);
  return Array.isArray(raw) ? (raw as StoredPartnerSite[]) : [];
}

export function setSiteListingEnabled(siteId: number, listing_enabled: boolean): void {
  const sites = getSites();
  const idx = sites.findIndex((s) => s.id === siteId);
  if (idx === -1) {
    return;
  }
  const next = [...sites];
  next[idx] = {
    ...next[idx],
    listing_enabled,
    updated_at: new Date().toISOString(),
  };
  localStorageService.setJson(KEY, next);
}
