import {hasActiveSession} from '../api/session.js';
import {setSessionConfirmed} from './session-flag.js';
import {
  clearStoredAuth,
  hasStoredAuth,
  readStoredUser,
} from './storage.js';
import {isSessionConfirmed} from './session-flag.js';

export function getCurrentUser() {
  return readStoredUser();
}

export function isAuthenticated() {
  return isSessionConfirmed();
}

export function clearAuthState() {
  clearStoredAuth();
  setSessionConfirmed(false);
}

export async function initializeAuthState() {
  if (!hasStoredAuth()) {
    setSessionConfirmed(false);
    return false;
  }

  const sessionIsActive = await hasActiveSession();

  if (!sessionIsActive) {
    clearAuthState();
  }

  return sessionIsActive;
}