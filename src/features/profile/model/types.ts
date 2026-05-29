import type { AccountStatus, TariffKey } from 'entities/user';

export type { AccountStatus, TariffKey };

export interface ProfileField {
  key: string;
  label: string;
  value: string;
}

export interface TariffMeta {
  label: string;
  description: string;
  limit: number;
  price: string;
}

export interface ProfileState {
  avatar: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  inn: string;
  balanceValue: number;
  tariffKey: TariffKey;
  isProActive: boolean;
  tariffExpiresAt: string | null;
  accountStatus: AccountStatus;
  activeCampaigns: number;
  lastAction: string;
  contactHandle: string;
  cardMasked: string;
  lastTopUp: string;
  passwordStatus: string;
  canChangePassword: boolean;
}

export interface TemplateContext {
  avatar: string;
  initials: string;
  hasAvatar: boolean;
  fullName: string;
  role: string;
  accountId: string;
  balance: string;
  tariff: string;
  tariffDescription: string;
  isProActive: boolean;
  tariffExpiresAt: string | null;
  activeCampaigns: number;
  lastAction: string;
  profileFields: ProfileField[];
  contactHandle: string;
  cardMasked: string;
  lastTopUp: string;
  accountStatusLabel: string;
  accountStatusClass: string;
  accountActionText: string;
  canChangePassword: boolean;
}

export type { ToastPayload } from 'shared/lib/toast';
