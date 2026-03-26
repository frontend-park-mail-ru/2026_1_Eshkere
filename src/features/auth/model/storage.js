const AUTH_KEY = 'ads_auth';

/**
 * @typedef {Object} User
 * @property {string} [id]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [name]
 * @property {number} [balance]
 * @property {string} [avatar]
 */

export function readStoredUser() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeStoredUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function hasStoredAuth() {
  return Boolean(readStoredUser());
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_KEY);
}
