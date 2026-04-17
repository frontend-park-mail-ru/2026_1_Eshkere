import './profile.scss';
import 'shared/ui/modal/modal';
import { renderTemplate } from 'shared/lib/render';
import { getModalStep, setSubmitEnabled } from 'features/profile/lib/form';
import {
  getAccountActionText,
  getAccountStatusLabel,
  getInitials,
  getProfileState,
  getTariffMeta,
  persistUserState,
  toTemplateContext,
} from 'features/profile/model/state';
import type { ProfileState } from 'features/profile/model/types';
import { hideProfileFeedback } from 'widgets/profile-feedback/ui/toast';
import { populateProfileForms, refreshProfileFormStates } from 'widgets/profile-forms/ui/forms';
import { initProfileModals } from 'widgets/profile-modals/ui/modals';
import { syncProfileView } from 'widgets/profile-view/ui/view';
import { initProfileFeedLink } from 'widgets/profile-feed-link/ui/feed-link';
import profileTemplate from './profile.hbs';

export type {
  AccountStatus,
  ProfileState,
  TariffKey,
} from 'features/profile/model/types';

let profileLifecycleController: AbortController | null = null;

function getProfileFieldValue(fieldKey: string): string {
  const directFieldValue = document.querySelector(
    `[data-profile-field="${fieldKey}"][data-profile-field-value]`,
  );
  if (directFieldValue) {
    return directFieldValue.textContent || '';
  }

  const nestedFieldValue = document.querySelector(
    `[data-profile-field="${fieldKey}"] [data-profile-field-value]`,
  );
  return nestedFieldValue?.textContent || '';
}

function getFormFieldValue(
  formId: string,
  fieldName: string,
  fallback = '',
): string {
  const form = document.getElementById(formId);
  if (!(form instanceof HTMLFormElement)) {
    return fallback;
  }

  const field = form.elements.namedItem(fieldName);
  return field instanceof HTMLInputElement ? field.value.trim() || fallback : fallback;
}

function getTariffKeyFromDom(): ProfileState['tariffKey'] {
  const label = document.querySelector('[data-profile-tariff]')?.textContent?.trim();
  if (label === 'Basic') {
    return 'basic';
  }
  if (label === 'Business') {
    return 'business';
  }
  return 'pro';
}

function readProfileStateFromDom(): ProfileState {
  const avatarImage = document.querySelector<HTMLImageElement>('[data-profile-avatar-image]');
  const avatar = avatarImage?.hidden ? '' : avatarImage?.getAttribute('src') || '';

  return {
    avatar,
    firstName: getProfileFieldValue('firstName'),
    lastName: getProfileFieldValue('lastName'),
    email: getProfileFieldValue('email'),
    phone: getProfileFieldValue('phone'),
    company: getProfileFieldValue('company'),
    city: getProfileFieldValue('city'),
    inn: getFormFieldValue('profile-confirmation-form', 'inn', ''),
    balanceValue: Number((document.querySelector('[data-profile-balance]')?.textContent || '0').replace(/\D/g, '')),
    tariffKey: getTariffKeyFromDom(),
    accountStatus:
      document.querySelector('[data-profile-account-status]')?.textContent === 'Аккаунт подтвержден' ? 'verified' : 'pending',
    activeCampaigns: Number(document.querySelector('[data-profile-campaigns]')?.textContent || '0'),
    lastAction: document.querySelector('[data-profile-last-action]')?.textContent || '—',
    contactHandle: document.querySelector('.profile-support__link')?.textContent?.trim() || '',
    cardMasked: document.querySelector('[data-profile-card]')?.textContent || '',
    lastTopUp: document.querySelector('[data-profile-last-top-up]')?.textContent || '—',
    passwordStatus: document.querySelector('[data-profile-password-status]')?.textContent || 'Добавить',
  };
}

function syncProfileStateToView(state: ProfileState): void {
  syncProfileView({
    getAccountActionText,
    getAccountStatusLabel,
    getInitials,
    getTariffMeta,
    state,
  });
}

function populateForms(state: ProfileState): void {
  populateProfileForms({
    getInitials,
    state,
  });
}

function refreshModalSubmitStates(state: ProfileState): void {
  refreshProfileFormStates({
    getModalStep,
    setSubmitEnabled,
    state,
  });
}

export async function renderProfilePage(): Promise<string> {
  const state = await getProfileState();
  return renderTemplate(profileTemplate, toTemplateContext(state));
}

export function Profile(): VoidFunction | void {
  if (profileLifecycleController) {
    profileLifecycleController.abort();
  }

  const root = document.querySelector('.profile-page');
  if (!root) {
    return;
  }

  const controller = new AbortController();
  profileLifecycleController = controller;
  const state = readProfileStateFromDom();

  initProfileModals({
    getInitials,
    getTariffMeta,
    onStateChange: (nextState) => {
      persistUserState(nextState);
      syncProfileStateToView(nextState);
      refreshModalSubmitStates(nextState);
    },
    populateForms,
    refreshSubmitStates: refreshModalSubmitStates,
    signal: controller.signal,
    state,
  });

  initProfileFeedLink(controller.signal);

  populateForms(state);
  refreshModalSubmitStates(state);

  return () => {
    if (profileLifecycleController === controller) {
      profileLifecycleController = null;
    }
    hideProfileFeedback();
    controller.abort();
  };
}
