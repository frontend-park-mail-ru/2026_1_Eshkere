import { PasswordVisibilityToggles } from 'shared/ui/form-field/form-field';
import {
  clearFormState,
  resetTwoStepForm,
  setSubmitting,
} from 'features/profile/lib/form';
import type {
  ProfileState,
  TariffKey,
  TariffMeta,
} from 'features/profile/model/types';
import { hideProfileFeedback } from 'shared/lib/toast';
import { closeModal, openModal } from 'shared/ui/modal/modal';
import { initProfileAccountModals } from './account';
import { initProfileBillingModals } from './billing';
import { initProfileContactModals } from './contact';

interface InitProfileModalsParams {
  cropAvatar: (file: File) => Promise<{ blob: Blob; dataUrl: string } | null>;
  getInitials: (firstName: string, lastName: string) => string;
  getTariffMeta: (tariffKey: TariffKey) => TariffMeta;
  onStateChange: (state: ProfileState) => void;
  populateForms: (state: ProfileState) => void;
  refreshSubmitStates: (state: ProfileState) => void;
  signal: AbortSignal;
  state: ProfileState;
}

const TWO_STEP_FORM_IDS = new Set([
  'profile-email-form',
  'profile-phone-form',
  'profile-payment-form',
  'profile-password-form',
]);

function resetProfileModalForm(form: HTMLFormElement): void {
  clearFormState(form);
  setSubmitting(form, false);

  if (TWO_STEP_FORM_IDS.has(form.id)) {
    resetTwoStepForm(form);
  }

  const emailInput = form.elements.namedItem('email');
  if (form.id === 'profile-email-form' && emailInput instanceof HTMLInputElement) {
    emailInput.value = '';
  }

  const phoneInput = form.elements.namedItem('phone');
  if (form.id === 'profile-phone-form' && phoneInput instanceof HTMLInputElement) {
    phoneInput.value = '';
  }
}

function bindModalOpenTriggers(
  openModal: (id: string) => void,
  signal: AbortSignal,
): void {
  const modalButtons: Array<{ selector: string; modalId: string }> = [
    { selector: '[data-open-profile-edit]', modalId: 'profile-edit-modal' },
    { selector: '[data-open-avatar-modal]', modalId: 'profile-avatar-modal' },
    { selector: '[data-open-password-modal]', modalId: 'profile-password-modal' },
    { selector: '[data-open-email-modal]', modalId: 'profile-email-modal' },
    { selector: '[data-open-phone-modal]', modalId: 'profile-phone-modal' },
    { selector: '[data-open-topup-modal]', modalId: 'profile-topup-modal' },
    { selector: '[data-open-tariff-modal]', modalId: 'profile-tariff-modal' },
    { selector: '[data-open-confirmation-modal]', modalId: 'profile-confirmation-modal' },
  ];

  modalButtons.forEach(({ selector, modalId }) => {
    document.querySelector(selector)?.addEventListener('click', () => openModal(modalId), { signal });
  });
}

export function initProfileModals({
  cropAvatar,
  getInitials,
  getTariffMeta,
  onStateChange,
  populateForms,
  refreshSubmitStates,
  signal,
  state,
}: InitProfileModalsParams): void {
  const modals = Array.from(document.querySelectorAll<HTMLElement>('.profile-modal'));

  const openModalById = (id: string): void => {
    populateForms(state);
    refreshSubmitStates(state);
    const modal = document.getElementById(id);
    if (!modal) {
      return;
    }

    const form = modal.querySelector('form');
    if (form instanceof HTMLFormElement) {
      resetProfileModalForm(form);
    }

    closeModal(modal);
    openModal(modal);
  };

  const closeCurrentModal = (modal: HTMLElement): void => {
    closeModal(modal);
  };

  const closeModalById = (id: string): void => {
    const modal = document.getElementById(id);
    if (modal instanceof HTMLElement) {
      closeCurrentModal(modal);
    }
  };

  bindModalOpenTriggers(openModalById, signal);
  document.querySelector('[data-profile-toast-close]')?.addEventListener('click', hideProfileFeedback, { signal });
  PasswordVisibilityToggles(document);

  modals.forEach((modal) => {
    modal.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((element) => {
      element.addEventListener('click', () => closeCurrentModal(modal), { signal });
    });
  });

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      modals.forEach((modal) => {
        if (modal.classList.contains('modal--open')) {
          closeCurrentModal(modal);
        }
      });
    },
    { signal },
  );

  initProfileContactModals({
    closeModalById,
    onStateChange,
    refreshSubmitStates,
    signal,
    state,
  });
  initProfileBillingModals({
    closeModalById,
    getTariffMeta,
    onStateChange,
    refreshSubmitStates,
    signal,
    state,
  });
  initProfileAccountModals({
    closeModalById,
    cropAvatar,
    getInitials,
    onStateChange,
    refreshSubmitStates,
    signal,
    state,
  });
}
