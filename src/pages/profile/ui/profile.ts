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
import profileTemplate from './profile.hbs';

export type {
  AccountStatus,
  ProfileState,
  TariffKey,
} from 'features/profile/model/types';

let profileLifecycleController: AbortController | null = null;

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
    firstName:
      document.querySelector('[data-profile-field="firstName"] [data-profile-field-value]')?.textContent || 'Екатерина',
    lastName:
      document.querySelector('[data-profile-field="lastName"] [data-profile-field-value]')?.textContent || 'Кузнецова',
    email:
      document.querySelector('[data-profile-field="email"] [data-profile-field-value]')?.textContent || 'ekaterina@eshke.ru',
    phone:
      document.querySelector('[data-profile-field="phone"] [data-profile-field-value]')?.textContent || '+7 999 123 45 67',
    company:
      document.querySelector('[data-profile-field="company"] [data-profile-field-value]')?.textContent || 'ООО «Эшке Медиа»',
    city:
      document.querySelector('[data-profile-field="city"] [data-profile-field-value]')?.textContent || 'Москва',
    inn: getFormFieldValue('profile-confirmation-form', 'inn', '7701234567'),
    balanceValue: Number((document.querySelector('[data-profile-balance]')?.textContent || '48200').replace(/\D/g, '')),
    tariffKey: getTariffKeyFromDom(),
    accountStatus:
      document.querySelector('[data-profile-account-status]')?.textContent === 'Аккаунт подтвержден' ? 'verified' : 'pending',
    activeCampaigns: Number(document.querySelector('[data-profile-campaigns]')?.textContent || '12'),
    lastAction: document.querySelector('[data-profile-last-action]')?.textContent || 'Сегодня',
    contactHandle: document.querySelector('.profile-support__link')?.textContent?.trim() || '@chocaboy',
    cardMasked: document.querySelector('[data-profile-card]')?.textContent || 'Банковская карта •••• 4481',
    lastTopUp: document.querySelector('[data-profile-last-top-up]')?.textContent || '12 марта 2026 · 15 000 ₽',
    passwordStatus: document.querySelector('[data-profile-password-status]')?.textContent || 'Сменить',
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
