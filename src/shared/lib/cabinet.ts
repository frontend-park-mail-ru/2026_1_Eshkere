export type CabinetKind = 'advertiser' | 'partner';

const partnerPrefixes = ['/partner', '/add-sites'];

export function getCabinetKind(pathname: string): CabinetKind {
  return partnerPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
    ? 'partner'
    : 'advertiser';
}

export function isAdvertiserCabinet(pathname: string): boolean {
  return getCabinetKind(pathname) === 'advertiser';
}

export function isPartnerCabinet(pathname: string): boolean {
  return getCabinetKind(pathname) === 'partner';
}

export function getCabinetEntryPath(cabinet: CabinetKind): string {
  return cabinet === 'partner' ? '/partner/overview' : '/advertiser/overview';
}

export function getCabinetProfilePath(cabinet: CabinetKind): string {
  return cabinet === 'partner' ? '/partner/profile' : '/advertiser/profile';
}

export function getCabinetSupportPath(cabinet: CabinetKind): string {
  return cabinet === 'partner' ? '/partner/support' : '/advertiser/support';
}
