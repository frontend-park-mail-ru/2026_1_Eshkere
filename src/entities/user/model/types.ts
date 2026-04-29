export type TariffKey = 'basic' | 'pro' | 'business';
export type AccountStatus = 'pending' | 'verified';

export interface AuthUser {
  id: number;
  email: string;
  phone: string;
  name?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  isModerator?: boolean;
  isAdmin?: boolean;
  balance?: number;
  avatar?: string;
  company?: string;
  city?: string;
  inn?: string;
  tariffKey?: TariffKey;
  accountStatus?: AccountStatus;
  contactHandle?: string;
  cardMasked?: string;
  lastTopUp?: string;
  passwordStatus?: string;
}
