import { formatPrice } from 'shared/lib/format';
import { authState, type AuthUser } from 'features/auth';

const navbarNotifications = [
  {
    tone: 'primary',
    title: 'Кампания "iPhone 14" набирает показы',
    text: 'За последние 24 часа CTR вырос. Есть смысл проверить площадки и бюджет.',
    time: '5 минут назад',
  },
  {
    tone: 'success',
    title: 'Баланс пополнен',
    text: 'На кабинет зачислено 20 000 ₽. Средств достаточно для активных кампаний.',
    time: 'Сегодня, 11:20',
  },
  {
    tone: 'neutral',
    title: 'Есть новая рекомендация',
    text: 'Система предлагает усилить Ленту: там сейчас лучший отклик по кампании.',
    time: 'Вчера, 18:40',
  },
] as const;

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
    user,
    notifications: navbarNotifications,
  };
}
