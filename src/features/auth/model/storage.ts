import { request } from 'shared/lib/request';

export type AuthUser = Record<string, unknown>;

class AuthState {
  private readonly AUTH_KEY = 'ads_auth';
  private confirmedSession = false;

  constructor() {
    this.AUTH_KEY = 'ads_auth';
    this.confirmedSession = false;
  }

  // public API
  getCurrentUser() {
    return this.#readStoredUser();
  }
  isAuthenticated() {
    return this.confirmedSession;
  }
  setAuthenticatedUser(user: AuthUser) {
    this.#writeStoredUser(user);
    this.confirmedSession = true;
  }
  clearAuthState() {
    this.#clearStoredAuth();
    this.confirmedSession = false;
  }

  async hasActiveSession() {
    if (!this.#hasStoredAuth()) {
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

      this.confirmedSession = this.#hasStoredAuth();
      return this.confirmedSession;
    }
  }

  // private
  #readStoredUser() {
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

  #writeStoredUser(user: AuthUser) {
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(user));
  }

  #hasStoredAuth() {
    return Boolean(this.#readStoredUser());
  }

  #clearStoredAuth() {
    localStorage.removeItem(this.AUTH_KEY);
  }
}

export const authState = new AuthState();
