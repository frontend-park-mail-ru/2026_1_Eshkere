import { request } from 'shared/lib/request';
import { LocalStorageKey, localStorageService } from 'shared/lib/local-storage';

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
  private confirmedSession = false;

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
    return localStorageService.getJson<AuthUser>(LocalStorageKey.AdsAuth);
  }

  private writeStoredUser(user: AuthUser): void {
    localStorageService.setJson(LocalStorageKey.AdsAuth, user);
  }

  private hasStoredAuth(): boolean {
    return Boolean(this.readStoredUser());
  }

  private clearStoredAuth(): void {
    localStorageService.removeItem(LocalStorageKey.AdsAuth);
  }
}

export const authState = new AuthState();
