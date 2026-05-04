/**
 * Коды статуса рекламного блока (`PartnerBlockResponse.status`).
 */
export type PartnerBlockStatus = 'active' | 'inactive';

const LABEL_RU: Record<PartnerBlockStatus, string> = {
  active: 'Активен',
  inactive: 'Выключен',
};

/** Класс плашки как у кампаний (`status-badge--*`). */
const BADGE_TYPE: Record<PartnerBlockStatus, string> = {
  active: 'working',
  inactive: 'draft',
};

const KNOWN = new Set<string>(Object.keys(LABEL_RU));

function normalize(status: string | undefined): string {
  return (status ?? '').trim().toLowerCase() || 'inactive';
}

/** Русская подпись для UI. */
export function partnerBlockStatusRu(status: string | undefined): string {
  const key = normalize(status);
  if (KNOWN.has(key)) {
    return LABEL_RU[key as PartnerBlockStatus];
  }
  return status?.trim() || '—';
}

export function partnerBlockStatusBadgeType(status: string | undefined): string {
  const key = normalize(status);
  if (KNOWN.has(key)) {
    return BADGE_TYPE[key as PartnerBlockStatus];
  }
  return 'draft';
}

export function partnerBlockToggleChecked(status: string | undefined): boolean {
  return normalize(status) === 'active';
}
