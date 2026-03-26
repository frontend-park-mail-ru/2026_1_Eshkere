import { request } from '../../../shared/lib/request.js';
import { clearStoredAuth, hasStoredAuth, readStoredUser } from './storage.js';

let confirmedSession = false;

export function getCurrentUser() {
  return readStoredUser();
}

export function isAuthenticated() {
  return confirmedSession;
}

export function markAuthenticated() {
  confirmedSession = true;
}

export function clearAuthState() {
  clearStoredAuth();
  confirmedSession = false;
}

export async function initializeAuthState() {
  if (!hasStoredAuth()) {
    confirmedSession = false;
    return false;
  }

  const sessionIsActive = await hasActiveSession();

  if (!sessionIsActive) {
    clearAuthState();
  }

  return sessionIsActive;
}

export async function hasActiveSession() {
  if (!hasStoredAuth()) {
    confirmedSession = false;
    return false;
  }

  try {
    await request('/ads', { method: 'GET' });
    confirmedSession = true;
    return true;
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('unauthorized') || message.includes('не авториз')) {
      clearAuthState();
      return false;
    }

    confirmedSession = hasStoredAuth();
    return confirmedSession;
  }
}
