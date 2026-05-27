import { formatPrice } from 'shared/lib/format';
import { authState, type AuthUser } from 'features/auth';
import {
  getCabinetEntryPath,
  getCabinetKind,
  getCabinetProfilePath,
} from 'shared/lib/cabinet';


function getUserInitials(user: AuthUser): string {
  const source =
    (typeof user.name === 'string' && user.name.trim()) ||
    (typeof user.email === 'string' && user.email.trim()) ||
    'Профиль';

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase() || 'ПР';
  }

  const compact = source.replace(/[^\p{L}\p{N}]/gu, '');
  return compact.slice(0, 2).toUpperCase() || 'ПР';
}

export function getNavbarTemplateContext(pathname: string) {
  const cabinet = getCabinetKind(pathname);
  const isAuth = authState.isAuthenticated();
  const currentUser: AuthUser =
    authState.getCurrentUser() ?? {
      id: 0,
      email: '',
      phone: '',
    };
  const user = {
    ...currentUser,
    name: currentUser.email || currentUser.name || 'Профиль',
    balance: typeof currentUser.balance === 'number' ? currentUser.balance : 0,
    balanceLabel: formatPrice(
      typeof currentUser.balance === 'number' ? currentUser.balance : 0,
    ),
    avatar: currentUser.avatar || '',
    hasAvatar: Boolean(currentUser.avatar),
    initials: getUserInitials(currentUser),
  };

  return {
    isLogin: pathname === '/login',
    isRegister: pathname === '/register',
    isAuthenticated: isAuth,
    cabinet: {
      advertiserHref: getCabinetEntryPath('advertiser'),
      partnerHref: getCabinetEntryPath('partner'),
      isAdvertiser: cabinet === 'advertiser',
      isPartner: cabinet === 'partner',
      profileHref: getCabinetProfilePath(cabinet),
      showAdvertiserWallet: cabinet === 'advertiser',
    },
    user,
    notifications: [],
  };
}
