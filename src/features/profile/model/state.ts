import { authState } from 'entities/user';
import { formatPhoneInput } from 'features/profile/lib/form';
import { request } from 'shared/lib/request';
import { formatPrice } from 'shared/lib/format';
import { getBalanceState } from 'features/balance';
interface CampaignsApiResponse {
  campaigns?: Array<{ id: number }>;
}


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
    description: 'До 5 активных кампаний, ручное создание и email-уведомления',
    limit: 5,
    price: '0 ₽ / мес',
  },
  pro: {
    label: 'Pro',
    description: 'До 20 кампаний, AI-генерация и приоритетная модерация',
    limit: 20,
    price: '3 900 ₽ / мес',
  },
  business: {
    label: 'Business',
    description: 'До 50 кампаний, приоритетная поддержка и расширенная аналитика',
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

function normalizeNamePart(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

// "noob" и "cheater" — внутренние значения бэкенда, маппим на basic
function normalizeTariffKey(raw: string | undefined): TariffKey | undefined {
  if (raw === 'pro')                          return 'pro';
  if (raw === 'business')                     return 'business';
  if (raw === 'basic' || raw === 'noob' || raw === 'cheater') return 'basic';
  return undefined;
}

export function getTariffMeta(tariffKey: TariffKey): TariffMeta {
  return TARIFFS[tariffKey] ?? TARIFFS.basic;
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
    surname: '',
    balance: 0,
  };

  try {
    const response = await request<{
      id: number;
      name?: string;
      surname?: string;
      email?: string;
      phone?: string;
      company?: string;
      city?: string;
      balance?: number;
      avatar_url?: string;
      created_at?: string;
      can_change_password?: boolean;
      tariff?: string;
      is_pro_active?: boolean;
      tariff_expires_at?: string | null;
    }>('/advertisers/me', { method: 'GET' });
    const profile = response.data;

    currentUser = {
      ...currentUser,
      id: typeof profile?.id === 'number' ? profile.id : currentUser.id,
      name: normalizeNamePart(profile?.name) || currentUser.name,
      surname: normalizeNamePart(profile?.surname) || currentUser.surname,
      email:
        typeof profile?.email === 'string' ? profile.email : currentUser.email,
      phone:
        typeof profile?.phone === 'string' ? profile.phone : currentUser.phone,
      company:
        typeof profile?.company === 'string' ? profile.company : currentUser.company,
      city:
        typeof profile?.city === 'string' ? profile.city : currentUser.city,
      balance:
        typeof profile?.balance === 'number'
          ? profile.balance
          : currentUser.balance,
      avatar:
        typeof profile?.avatar_url === 'string' ? profile.avatar_url : currentUser.avatar,
      canChangePassword:
        typeof profile?.can_change_password === 'boolean'
          ? profile.can_change_password
          : currentUser.canChangePassword,
      tariffKey: normalizeTariffKey(profile?.tariff) ?? currentUser.tariffKey,
      isProActive:
        typeof profile?.is_pro_active === 'boolean'
          ? profile.is_pro_active
          : currentUser.isProActive,
      tariffExpiresAt:
        profile?.tariff_expires_at !== undefined
          ? profile.tariff_expires_at
          : currentUser.tariffExpiresAt,
    };

    authState.setAuthenticatedUser(currentUser);
  } catch {
    // На profile route уже есть проверка авторизации; если /me временно недоступен,
    // используем данные из локального состояния, чтобы не ломать рендер страницы.
  }

  const firstName = normalizeNamePart(currentUser.name);
  const lastName = normalizeNamePart(currentUser.surname);
  let activeCampaigns = 0;

  try {
    const adsResponse = await request<CampaignsApiResponse>('/ad_campaigns', { method: 'GET' });
    activeCampaigns = (adsResponse.data.campaigns ?? []).length;
  } catch {
    // Используем значение по умолчанию
  }

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
    isProActive: currentUser.isProActive ?? false,
    tariffExpiresAt: currentUser.tariffExpiresAt ?? null,
    accountStatus: currentUser.accountStatus || 'pending',
    activeCampaigns,
    lastAction: '—',
    contactHandle: currentUser.contactHandle || '',
    cardMasked: getBalanceState().savedPaymentMethodTitle ?? 'Не привязана',
    lastTopUp: currentUser.lastTopUp || '—',
    passwordStatus: currentUser.passwordStatus || 'Добавить',
    canChangePassword: currentUser.canChangePassword !== false,
  };
}

function formatExpiryDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return null;
  }
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
    balance: formatPrice(state.balanceValue),
    tariff: tariff.label,
    tariffDescription: tariff.description,
    isProActive: state.isProActive,
    tariffExpiresAt: formatExpiryDate(state.tariffExpiresAt),
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
    canChangePassword: state.canChangePassword,
  };
}

export function persistUserState(state: ProfileState): void {
  const currentUser = authState.getCurrentUser();
  if (!currentUser) {
    return;
  }

  authState.setAuthenticatedUser({
    ...currentUser,
    name: state.firstName,
    surname: state.lastName,
    email: state.email,
    phone: state.phone,
    balance: state.balanceValue,
    avatar: state.avatar || undefined,
    company: state.company,
    city: state.city,
    inn: state.inn,
    tariffKey: state.tariffKey,
    isProActive: state.isProActive,
    tariffExpiresAt: state.tariffExpiresAt,
    accountStatus: state.accountStatus,
    contactHandle: state.contactHandle,
    cardMasked: state.cardMasked,
    lastTopUp: state.lastTopUp,
    passwordStatus: state.passwordStatus,
    canChangePassword: state.canChangePassword,
  });
}
