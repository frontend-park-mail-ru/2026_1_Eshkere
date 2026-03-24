import {request} from '../../../shared/lib/request.js';
import {clearStoredAuth, hasStoredAuth} from '../model/storage.js';
import {isSessionConfirmed, setSessionConfirmed} from '../model/session-flag.js';

export async function hasActiveSession() {
  if (!hasStoredAuth()) {
    setSessionConfirmed(false);
    return false;
  }

  try {
    await request('/ads', {method: 'GET'});
    setSessionConfirmed(true);
    return true;
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();

    if (
      message.includes('unauthorized') ||
      message.includes('не авториз')
    ) {
      clearStoredAuth();
      setSessionConfirmed(false);
      return false;
    }

    setSessionConfirmed(hasStoredAuth());
    return isSessionConfirmed();
  }
}