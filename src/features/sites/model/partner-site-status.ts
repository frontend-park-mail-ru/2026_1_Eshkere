/**
 * Коды статуса площадки с API (`PartnerSiteResponse.status`).
 */
export type PartnerSiteStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'rejected'
  | 'blocked'
  | 'archived';

const LABEL_RU: Record<PartnerSiteStatus, string> = {
  draft: 'Черновик',
  pending_review: 'На модерации',
  active: 'Активен',
  rejected: 'Отклонён',
  blocked: 'Заблокирован',
  archived: 'В архиве',
};

/** Как на странице кампаний: суффикс `.status-badge--*`. */
const BADGE_TYPE: Record<PartnerSiteStatus, string> = {
  draft: 'draft',
  pending_review: 'pending',
  active: 'working',
  rejected: 'danger',
  blocked: 'paused',
  archived: 'warning',
};

const KNOWN = new Set<string>(Object.keys(LABEL_RU));

const TOGGLE_EDITABLE = new Set<string>(['draft', 'active']);

function normalize(status: string | undefined): string {
  return (status ?? '').trim() || 'draft';
}

/** Русская подпись для UI. */
export function partnerSiteStatusRu(status: string | undefined): string {
  const key = normalize(status);
  if (KNOWN.has(key)) {
    return LABEL_RU[key as PartnerSiteStatus];
  }
  return key;
}

/** Вариант плашки как у кампаний (`status-badge--draft` и т.д.). */
export function partnerSiteStatusBadgeType(status: string | undefined): string {
  const key = normalize(status);
  if (KNOWN.has(key)) {
    return BADGE_TYPE[key as PartnerSiteStatus];
  }
  return 'draft';
}

export function partnerSiteToggleChecked(status: string | undefined): boolean {
  return normalize(status) === 'active';
}

export function partnerSiteToggleEditable(status: string | undefined): boolean {
  return TOGGLE_EDITABLE.has(normalize(status));
}
