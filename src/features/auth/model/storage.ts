import { request } from 'shared/lib/request';

export interface AuthUser {
  id: number;
  email: string;
  phone: string;
  name?: string;
  balance?: number;
  avatar?: string;
  company?: string;
  city?: string;
  inn?: string;
  tariffKey?: 'basic' | 'pro' | 'business';
  accountStatus?: 'pending' | 'verified';
  contactHandle?: string;
  cardMasked?: string;
  lastTopUp?: string;
  passwordStatus?: string;
}

class AuthState {
  private readonly AUTH_KEY = 'ads_auth';
  private confirmedSession = false;

  constructor() {
    this.AUTH_KEY = 'ads_auth';
    this.confirmedSession = false;
  }

  public getCurrentUser(): AuthUser | null {
    return this.readStoredUser();
  }

  public isAuthenticated(): boolean {
    return this.confirmedSession;
  }

  public setAuthenticatedUser(user: AuthUser): void {
    this.writeStoredUser(user);
    this.confirmedSession = true;
  }

  public clearAuthState(): void {
    this.clearStoredAuth();
    this.confirmedSession = false;
  }

  public async hasActiveSession(): Promise<boolean> {
    if (!this.hasStoredAuth()) {
      this.confirmedSession = false;
      return false;
    }

    try {
      await request('/ads', { method: 'GET' });
      this.confirmedSession = true;
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('unauthorized') || message.includes('не авториз')) {
        this.clearAuthState();
        return false;
      }

      this.confirmedSession = this.hasStoredAuth();
      return this.confirmedSession;
    }
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(this.AUTH_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private writeStoredUser(user: AuthUser): void {
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(user));
  }

  private hasStoredAuth(): boolean {
    return Boolean(this.readStoredUser());
  }

  private clearStoredAuth(): void {
    localStorage.removeItem(this.AUTH_KEY);
  }
}

export const authState = new AuthState();
