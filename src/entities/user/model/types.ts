export type TariffKey = 'basic' | 'pro' | 'business';
export type AccountStatus = 'pending' | 'verified';
export type UserType = 'advertiser' | 'partner';

export interface AuthUser {
  id: number;
  email: string;
  phone: string;
  name?: string;
<<<<<<< Updated upstream
  surname?: string;
=======
  userType?: UserType;
>>>>>>> Stashed changes
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
