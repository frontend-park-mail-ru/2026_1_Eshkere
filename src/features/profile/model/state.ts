import { authState } from 'features/auth';
import { getAds } from 'features/ads';
import { DEFAULT_PAYMENT_METHOD } from 'features/balance/model/state';
import { formatPhoneInput } from 'features/profile/lib/form';
import { request } from 'shared/lib/request';
import { formatDate, formatPrice } from 'shared/lib/format';
const LEGACY_DEFAULT_PAYMENT_METHODS = new Set([
  DEFAULT_PAYMENT_METHOD,
  'Корпоративная карта •••• 9024',
  'Безналичный счет компании',
]);

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
    firstName: parts[0] || '',
    lastName: '',
  };
}

function isEmailLike(value: string): boolean {
  return /.+@.+\..+/.test(value.trim());
}

function formatPhoneForDisplay(value: string): string {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  const formatted = formatPhoneInput(normalized);
  return formatted || normalized;
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
  return `${firstName[0] || 'Н'}${lastName[0] || 'П'}`.toUpperCase();
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
  let currentUser = authState.getCurrentUser() ?? {
    id: 0,
    email: '',
    phone: '',
    name: '',
    balance: 0,
  };

  try {
    const response = await request<{
      id: number;
      name?: string;
      email?: string;
      phone?: string;
      balance?: number;
    }>('/advertiser/me', { method: 'GET' });
    const profile = response.data;

    currentUser = {
      ...currentUser,
      id: typeof profile?.id === 'number' ? profile.id : currentUser.id,
      name: typeof profile?.name === 'string' ? profile.name : currentUser.name,
      email:
        typeof profile?.email === 'string' ? profile.email : currentUser.email,
      phone:
        typeof profile?.phone === 'string' ? profile.phone : currentUser.phone,
      balance:
        typeof profile?.balance === 'number'
          ? profile.balance
          : currentUser.balance,
    };

    authState.setAuthenticatedUser(currentUser);
  } catch {
    // На profile route уже есть проверка авторизации; если /me временно недоступен,
    // используем данные из локального состояния, чтобы не ломать рендер страницы.
  }

  const rawName = typeof currentUser.name === 'string' ? currentUser.name.trim() : '';
  const fullName = rawName && !isEmailLike(rawName) ? rawName : '';
  const { firstName, lastName } = splitFullName(fullName);
  const adsResult = await getAds();
  const activeCampaigns = adsResult.error ? 0 : adsResult.ads.length;
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
    email: currentUser.email || '',
    phone: formatPhoneForDisplay(currentUser.phone || ''),
    company: currentUser.company || '',
    city: currentUser.city || '',
    inn: currentUser.inn || '',
    balanceValue: typeof currentUser.balance === 'number' ? currentUser.balance : 0,
    tariffKey: currentUser.tariffKey || 'basic',
    accountStatus: currentUser.accountStatus || 'pending',
    activeCampaigns,
    lastAction: lastCampaign?.created_at ? formatDate(lastCampaign.created_at) : '—',
    contactHandle: currentUser.contactHandle || '',
    cardMasked:
      currentUser.cardMasked &&
      !LEGACY_DEFAULT_PAYMENT_METHODS.has(currentUser.cardMasked)
        ? currentUser.cardMasked
        : '',
    lastTopUp: currentUser.lastTopUp || '—',
    passwordStatus: currentUser.passwordStatus || 'Добавить',
  };
}

export function toTemplateContext(state: ProfileState): TemplateContext {
  const tariff = getTariffMeta(state.tariffKey);

  return {
    avatar: state.avatar,
    initials: getInitials(state.firstName, state.lastName),
    hasAvatar: Boolean(state.avatar),
    fullName: `${state.firstName} ${state.lastName}`.trim() || 'Новый профиль',
    role: 'Рекламодатель · Основной аккаунт',
    accountId: `ID ${authState.getCurrentUser()?.id || '—'}`,
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
