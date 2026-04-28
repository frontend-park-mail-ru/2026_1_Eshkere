import { request } from 'shared/lib/request';
import { LocalStorageKey, localStorageService } from 'shared/lib/local-storage';
import type { AuthUser } from 'entities/user';

export type { AuthUser };

class AuthState {
  private confirmedSession = false;

  private readonly moderatorRoleNames = new Set([
    'moderator',
    'admin',
    'superadmin',
    'support',
    'reviewer',
    'compliance',
  ]);

  private readonly moderatorPermissionNames = new Set([
    'moderator:read',
    'moderator:write',
    'moderation:read',
    'moderation:write',
    'admin:all',
    'backoffice:access',
  ]);

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

  public syncDevModeratorAccessFromLocation(): void {
    if (typeof window === 'undefined' || !this.isLocalDevHost()) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const value = params.get('dev-moderator');

    if (value === '1') {
      localStorageService.setItem(LocalStorageKey.DevModeratorAccess, '1');
    }

    if (value === '0') {
      localStorageService.removeItem(LocalStorageKey.DevModeratorAccess);
    }
  }

  public canAccessModerator(): boolean {
    const user = this.readStoredUser();

    if (this.hasDevModeratorAccess()) {
      return true;
    }

    if (!user) {
      return false;
    }

    if (user.isModerator || user.isAdmin) {
      return true;
    }

    const normalizedRole = this.normalizeAccessKey(user.role);

    if (normalizedRole && this.moderatorRoleNames.has(normalizedRole)) {
      return true;
    }

    const hasRoleAccess = Array.isArray(user.roles)
      ? user.roles.some((role) => {
          const normalized = this.normalizeAccessKey(role);
          return Boolean(normalized) && this.moderatorRoleNames.has(normalized);
        })
      : false;

    if (hasRoleAccess) {
      return true;
    }

    return Array.isArray(user.permissions)
      ? user.permissions.some((permission) => {
          const normalized = this.normalizeAccessKey(permission);
          return (
            Boolean(normalized) && this.moderatorPermissionNames.has(normalized)
          );
        })
      : false;
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
      await request('/ad_campaigns', { method: 'GET' });
      this.confirmedSession = true;
      return true;
    } catch (error: unknown) {
      const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

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

  private normalizeAccessKey(value?: string): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  }

  private hasDevModeratorAccess(): boolean {
    if (!this.isLocalDevHost()) {
      return false;
    }

    return localStorageService.getItem(LocalStorageKey.DevModeratorAccess) === '1';
  }

  private isLocalDevHost(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const { hostname } = window.location;

    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1'
    );
  }

  private hasStoredAuth(): boolean {
    return Boolean(this.readStoredUser());
  }

  private clearStoredAuth(): void {
    localStorageService.removeItem(LocalStorageKey.AdsAuth);
  }
}

export const authState = new AuthState();
