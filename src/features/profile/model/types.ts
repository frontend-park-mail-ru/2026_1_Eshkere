export type { TariffKey, AccountStatus } from 'entities/user';

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
  accountStatus: AccountStatus;
  activeCampaigns: number;
  lastAction: string;
  contactHandle: string;
  cardMasked: string;
  lastTopUp: string;
  passwordStatus: string;
}

export interface TemplateContext {
  avatar: string;
  initials: string;
  hasAvatar: boolean;
  fullName: string;
  role: string;
  accountId: string;
  memberSince: string;
  balance: string;
  tariff: string;
  tariffDescription: string;
  activeCampaigns: number;
  lastAction: string;
  profileFields: ProfileField[];
  contactHandle: string;
  cardMasked: string;
  lastTopUp: string;
  accountStatusLabel: string;
  accountStatusClass: string;
  accountActionText: string;
}

export type { ToastPayload } from 'shared/lib/toast';
