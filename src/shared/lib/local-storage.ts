export enum LocalStorageKey {
  AdsAuth = 'ads_auth',
  BalanceDashboardState = 'balance_dashboard_state',
  CampaignBuilderDraft = 'campaign_builder_draft',
  CampaignBuilderSavedAudiences = 'campaign_builder_saved_audiences',
  CampaignBuilderTemplate = 'campaign_builder_template',
  CampaignEditBuilderState = 'campaign_edit_builder_state',
  CampaignEditSeed = 'campaign_edit_seed',
  CampaignEditState = 'campaign_edit_state',
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createLocalStorageKey(
  key: LocalStorageKey,
  suffix: string,
): string {
  return `${key}:${suffix}`;
}

function getItem(key: LocalStorageKey | string): string | null {
  return getStorage()?.getItem(key) ?? null;
}

function getJson<T>(key: LocalStorageKey | string): T | null {
  const raw = getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setItem(key: LocalStorageKey | string, value: string): void {
  getStorage()?.setItem(key, value);
}

function setJson(key: LocalStorageKey | string, value: unknown): void {
  setItem(key, JSON.stringify(value));
}

function removeItem(key: LocalStorageKey | string): void {
  getStorage()?.removeItem(key);
}

export const localStorageService = {
  getItem,
  getJson,
  setItem,
  setJson,
  removeItem,
};
