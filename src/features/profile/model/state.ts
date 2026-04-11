import { authState } from 'features/auth';
import { getAds } from 'features/ads';
import { formatDate, formatPrice } from 'shared/lib/format';
import type {
  AccountStatus,
  ProfileField,
  ProfileState,
  TariffKey,
  TariffMeta,
  TemplateContext,
} from './types';

const TARIFFS: Record<TariffKey, TariffMeta> = {
  basic: {
    label: 'Basic',
    description: 'Базовый кабинет и до 5 активных кампаний',
    limit: 5,
    price: '990 ₽ / мес',
  },
  pro: {
    label: 'Pro',
    description: 'Расширенная аналитика и до 20 активных кампаний',
    limit: 20,
    price: '3 900 ₽ / мес',
  },
  business: {
    label: 'Business',
    description: 'Приоритетная поддержка и до 50 активных кампаний',
    limit: 50,
    price: '8 900 ₽ / мес',
  },
};

function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  return {
    firstName: parts[0] || 'Екатерина',
    lastName: 'Кузнецова',
  };
}

function isEmailLike(value: string): boolean {
  return /.+@.+\..+/.test(value.trim());
}

function buildProfileFields(state: ProfileState): ProfileField[] {
  return [
    { key: 'firstName', label: 'Имя', value: state.firstName },
    { key: 'lastName', label: 'Фамилия', value: state.lastName },
    { key: 'email', label: 'Электронная почта', value: state.email },
    { key: 'phone', label: 'Телефон', value: state.phone },
    { key: 'company', label: 'Компания', value: state.company },
    { key: 'city', label: 'Город', value: state.city },
  ];
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || 'Е'}${lastName[0] || 'К'}`.toUpperCase();
}

export function getTariffMeta(tariffKey: TariffKey): TariffMeta {
  return TARIFFS[tariffKey];
}

export function getAccountStatusLabel(status: AccountStatus): string {
  return status === 'verified' ? 'Аккаунт подтвержден' : 'Требует подтверждения';
}

export function getAccountActionText(status: AccountStatus): string {
  return status === 'verified' ? 'Обновить данные' : 'Подтвердить';
}

export async function getProfileState(): Promise<ProfileState> {
  const currentUser = authState.getCurrentUser() ?? {
    id: 4839014,
    email: 'ekaterina@eshke.ru',
    phone: '+7 999 123 45 67',
    name: 'Екатерина Кузнецова',
    balance: 48200,
  };
  const rawName = typeof currentUser.name === 'string' ? currentUser.name.trim() : '';
  const fullName = rawName && !isEmailLike(rawName) ? rawName : 'Екатерина Кузнецова';
  const { firstName, lastName } = splitFullName(fullName);
  const adsResult = await getAds();
  const activeCampaigns = adsResult.error ? 12 : adsResult.ads.length;
  const lastCampaign = adsResult.error
    ? null
    : [...adsResult.ads].sort((first, second) => {
      const firstTimestamp = new Date(first.created_at || 0).getTime();
      const secondTimestamp = new Date(second.created_at || 0).getTime();
      return secondTimestamp - firstTimestamp;
    })[0];

  return {
    avatar: currentUser.avatar || '',
    firstName,
    lastName,
    email: currentUser.email || 'ekaterina@eshke.ru',
    phone: currentUser.phone || '+7 999 123 45 67',
    company: currentUser.company || 'ООО «Эшке Медиа»',
    city: currentUser.city || 'Москва',
    inn: currentUser.inn || '7701234567',
    balanceValue: typeof currentUser.balance === 'number' ? currentUser.balance : 48200,
    tariffKey: currentUser.tariffKey || 'pro',
    accountStatus: currentUser.accountStatus || 'pending',
    activeCampaigns,
    lastAction: lastCampaign?.created_at ? formatDate(lastCampaign.created_at) : 'Сегодня',
    contactHandle: currentUser.contactHandle || '@chocaboy',
    cardMasked: currentUser.cardMasked || 'Банковская карта •••• 4481',
    lastTopUp: currentUser.lastTopUp || '12 марта 2026 · 15 000 ₽',
    passwordStatus: currentUser.passwordStatus || 'Сменить',
  };
}

export function toTemplateContext(state: ProfileState): TemplateContext {
  const tariff = getTariffMeta(state.tariffKey);

  return {
    avatar: state.avatar,
    initials: getInitials(state.firstName, state.lastName),
    hasAvatar: Boolean(state.avatar),
    fullName: `${state.firstName} ${state.lastName}`,
    role: 'Рекламодатель · Основной аккаунт',
    accountId: `ID ${authState.getCurrentUser()?.id || 4839014}`,
    memberSince: 'С нами с 14 марта 2026',
    balance: formatPrice(state.balanceValue),
    tariff: tariff.label,
    tariffDescription: tariff.description,
    activeCampaigns: state.activeCampaigns,
    lastAction: state.lastAction,
    profileFields: buildProfileFields(state),
    contactHandle: state.contactHandle,
    cardMasked: state.cardMasked,
    lastTopUp: state.lastTopUp,
    accountStatusLabel: getAccountStatusLabel(state.accountStatus),
    accountStatusClass:
      state.accountStatus === 'verified'
        ? 'profile-hero__badge--success'
        : 'profile-hero__badge--warning',
    accountActionText: getAccountActionText(state.accountStatus),
  };
}

export function persistUserState(state: ProfileState): void {
  const currentUser = authState.getCurrentUser();
  if (!currentUser) {
    return;
  }

  authState.setAuthenticatedUser({
    ...currentUser,
    name: `${state.firstName} ${state.lastName}`.trim(),
    email: state.email,
    phone: state.phone,
    balance: state.balanceValue,
    avatar: state.avatar || undefined,
    company: state.company,
    city: state.city,
    inn: state.inn,
    tariffKey: state.tariffKey,
    accountStatus: state.accountStatus,
    contactHandle: state.contactHandle,
    cardMasked: state.cardMasked,
    lastTopUp: state.lastTopUp,
    passwordStatus: state.passwordStatus,
  });
}
