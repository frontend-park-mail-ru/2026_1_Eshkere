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
import { hideProfileFeedback } from 'widgets/profile-feedback/ui/toast';
import { initProfileAccountModals } from './account';
import { initProfileBillingModals } from './billing';
import { initProfileContactModals } from './contact';

interface InitProfileModalsParams {
  getInitials: (firstName: string, lastName: string) => string;
  getTariffMeta: (tariffKey: TariffKey) => TariffMeta;
  onStateChange: (state: ProfileState) => void;
  populateForms: (state: ProfileState) => void;
  refreshSubmitStates: (state: ProfileState) => void;
  signal: AbortSignal;
  state: ProfileState;
}

export function initProfileModals({
  getInitials,
  getTariffMeta,
  onStateChange,
  populateForms,
  refreshSubmitStates,
  signal,
  state,
}: InitProfileModalsParams): void {
  const modals = Array.from(document.querySelectorAll<HTMLElement>('.profile-modal'));

  const openModal = (id: string): void => {
    populateForms(state);
    refreshSubmitStates(state);
    const modal = document.getElementById(id);
    if (!modal) {
      return;
    }

    const form = modal.querySelector('form');
    if (form instanceof HTMLFormElement) {
      clearFormState(form);
      setSubmitting(form, false);

      if (
        form.id === 'profile-email-form' ||
        form.id === 'profile-phone-form' ||
        form.id === 'profile-payment-form'
      ) {
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

    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeCurrentModal = (modal: HTMLElement): void => {
    modal.classList.remove('modal--open');
    modal.setAttribute('aria-hidden', 'true');
  };

  const closeModalById = (id: string): void => {
    const modal = document.getElementById(id);
    if (modal instanceof HTMLElement) {
      closeCurrentModal(modal);
    }
  };

  document.querySelector('[data-open-profile-edit]')?.addEventListener('click', () => openModal('profile-edit-modal'), { signal });
  document.querySelector('[data-open-avatar-modal]')?.addEventListener('click', () => openModal('profile-avatar-modal'), { signal });
  document.querySelector('[data-open-password-modal]')?.addEventListener('click', () => openModal('profile-password-modal'), { signal });
  document.querySelector('[data-open-email-modal]')?.addEventListener('click', () => openModal('profile-email-modal'), { signal });
  document.querySelector('[data-open-phone-modal]')?.addEventListener('click', () => openModal('profile-phone-modal'), { signal });
  document.querySelector('[data-open-payment-modal]')?.addEventListener('click', () => openModal('profile-payment-modal'), { signal });
  document.querySelector('[data-open-topup-modal]')?.addEventListener('click', () => openModal('profile-topup-modal'), { signal });
  document.querySelector('[data-open-tariff-modal]')?.addEventListener('click', () => openModal('profile-tariff-modal'), { signal });
  document.querySelector('[data-open-confirmation-modal]')?.addEventListener('click', () => openModal('profile-confirmation-modal'), { signal });
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
    getInitials,
    onStateChange,
    refreshSubmitStates,
    signal,
    state,
  });
}
