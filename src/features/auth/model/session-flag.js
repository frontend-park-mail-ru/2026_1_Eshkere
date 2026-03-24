let confirmedSession = false;

export function isSessionConfirmed() {
  return confirmedSession;
}

export function setSessionConfirmed(value) {
  confirmedSession = Boolean(value);
}