import { normalizePhone } from 'shared/validators';
import type { ProfileState } from 'features/profile/model/types';

interface PopulateProfileFormsParams {
  getInitials: (firstName: string, lastName: string) => string;
  state: ProfileState;
}

interface RefreshProfileFormStatesParams {
  getModalStep: (form: HTMLFormElement) => 'input' | 'confirm';
  setSubmitEnabled: (form: HTMLFormElement, enabled: boolean) => void;
  state: ProfileState;
}

export function populateProfileForms({
  getInitials,
  state,
}: PopulateProfileFormsParams): void {
  const editForm = document.getElementById('profile-edit-form');
  if (editForm instanceof HTMLFormElement) {
    (editForm.elements.namedItem('firstName') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.firstName,
    );
    (editForm.elements.namedItem('lastName') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.lastName,
    );
    (editForm.elements.namedItem('email') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.email,
    );
    (editForm.elements.namedItem('phone') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.phone,
    );
    (editForm.elements.namedItem('company') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.company,
    );
    (editForm.elements.namedItem('city') as HTMLInputElement | null)?.setAttribute(
      'value',
      state.city,
    );
    Array.from(editForm.elements).forEach((element) => {
      if (element instanceof HTMLInputElement) {
        element.value = element.getAttribute('value') || '';
      }
    });
  }

  const paymentForm = document.getElementById('profile-payment-form');
  if (paymentForm instanceof HTMLFormElement) {
    const cardNumber = paymentForm.elements.namedItem(
      'cardNumber',
    ) as HTMLInputElement | null;
    const expiryDate = paymentForm.elements.namedItem(
      'expiryDate',
    ) as HTMLInputElement | null;
    const holderName = paymentForm.elements.namedItem(
      'holderName',
    ) as HTMLInputElement | null;
    const cvv = paymentForm.elements.namedItem('cvv') as HTMLInputElement | null;

    if (cardNumber) {
      cardNumber.value = '';
    }
    if (expiryDate) {
      expiryDate.value = '';
    }
    if (holderName) {
      holderName.value =
        `${state.firstName.toUpperCase()} ${state.lastName.toUpperCase()}`;
    }
    if (cvv) {
      cvv.value = '';
    }
  }

  const passwordForm = document.getElementById('profile-password-form');
  if (passwordForm instanceof HTMLFormElement) {
    passwordForm.reset();
  }

  const avatarForm = document.getElementById('profile-avatar-form');
  if (avatarForm instanceof HTMLFormElement) {
    avatarForm.reset();
    avatarForm.dataset.pendingAvatar = state.avatar;
    avatarForm.dataset.removeAvatar = 'false';
    const image = avatarForm.querySelector<HTMLImageElement>('[data-avatar-preview-image]');
    const initials = avatarForm.querySelector<HTMLElement>('[data-avatar-preview-initials]');
    const preview = avatarForm.querySelector<HTMLElement>('[data-avatar-preview]');
    if (image) {
      image.src = state.avatar || '';
      image.hidden = !state.avatar;
    }
    if (initials) {
      initials.hidden = Boolean(state.avatar);
      initials.textContent = getInitials(state.firstName, state.lastName);
    }
    preview?.classList.toggle('profile-avatar-picker--image', Boolean(state.avatar));
  }

  const topUpForm = document.getElementById('profile-topup-form');
  if (topUpForm instanceof HTMLFormElement) {
    topUpForm.reset();
  }

  const tariffForm = document.getElementById('profile-tariff-form');
  if (tariffForm instanceof HTMLFormElement) {
    const target = tariffForm.elements.namedItem('nextTariff');
    if (target instanceof RadioNodeList) {
      target.value = state.tariffKey;
    }
  }

  const confirmationForm = document.getElementById('profile-confirmation-form');
  if (confirmationForm instanceof HTMLFormElement) {
    const email = confirmationForm.elements.namedItem(
      'email',
    ) as HTMLInputElement | null;
    const phone = confirmationForm.elements.namedItem(
      'phone',
    ) as HTMLInputElement | null;
    const company = confirmationForm.elements.namedItem(
      'company',
    ) as HTMLInputElement | null;
    const inn = confirmationForm.elements.namedItem('inn') as HTMLInputElement | null;

    if (email) {
      email.value = state.email;
    }
    if (phone) {
      phone.value = state.phone;
    }
    if (company) {
      company.value = state.company;
    }
    if (inn) {
      inn.value = state.inn;
    }
  }
}

export function refreshProfileFormStates({
  getModalStep,
  setSubmitEnabled,
  state,
}: RefreshProfileFormStatesParams): void {
  const editForm = document.getElementById('profile-edit-form');
  if (editForm instanceof HTMLFormElement) {
    const firstName = String((editForm.elements.namedItem('firstName') as HTMLInputElement)?.value || '').trim();
    const lastName = String((editForm.elements.namedItem('lastName') as HTMLInputElement)?.value || '').trim();
    const company = String((editForm.elements.namedItem('company') as HTMLInputElement)?.value || '').trim();
    const city = String((editForm.elements.namedItem('city') as HTMLInputElement)?.value || '').trim();

    setSubmitEnabled(
      editForm,
      firstName !== state.firstName ||
        lastName !== state.lastName ||
        company !== state.company ||
        city !== state.city,
    );
  }

  const emailForm = document.getElementById('profile-email-form');
  if (emailForm instanceof HTMLFormElement) {
    const email = String((emailForm.elements.namedItem('email') as HTMLInputElement)?.value || '').trim();
    const code = String((emailForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(
      emailForm,
      getModalStep(emailForm) === 'input'
        ? Boolean(email) && email !== state.email
        : Boolean(code),
    );
  }

  const phoneForm = document.getElementById('profile-phone-form');
  if (phoneForm instanceof HTMLFormElement) {
    const phone = String((phoneForm.elements.namedItem('phone') as HTMLInputElement)?.value || '').trim();
    const code = String((phoneForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(
      phoneForm,
      getModalStep(phoneForm) === 'input'
        ? Boolean(phone) && normalizePhone(phone) !== normalizePhone(state.phone)
        : Boolean(code),
    );
  }

  const paymentForm = document.getElementById('profile-payment-form');
  if (paymentForm instanceof HTMLFormElement) {
    const cardNumber = String((paymentForm.elements.namedItem('cardNumber') as HTMLInputElement)?.value || '').trim();
    const expiryDate = String((paymentForm.elements.namedItem('expiryDate') as HTMLInputElement)?.value || '').trim();
    const holderName = String((paymentForm.elements.namedItem('holderName') as HTMLInputElement)?.value || '').trim();
    const cvv = String((paymentForm.elements.namedItem('cvv') as HTMLInputElement)?.value || '').trim();
    const code = String((paymentForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(
      paymentForm,
      getModalStep(paymentForm) === 'input'
        ? Boolean(cardNumber || expiryDate || holderName || cvv)
        : Boolean(code),
    );
  }

  const passwordForm = document.getElementById('profile-password-form');
  if (passwordForm instanceof HTMLFormElement) {
    const currentPassword = String((passwordForm.elements.namedItem('currentPassword') as HTMLInputElement)?.value || '').trim();
    const newPassword = String((passwordForm.elements.namedItem('newPassword') as HTMLInputElement)?.value || '').trim();
    const repeatPassword = String((passwordForm.elements.namedItem('repeatPassword') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(passwordForm, Boolean(currentPassword || newPassword || repeatPassword));
  }

  const avatarForm = document.getElementById('profile-avatar-form');
  if (avatarForm instanceof HTMLFormElement) {
    const pendingAvatar = avatarForm.dataset.pendingAvatar || '';
    const removeAvatar = avatarForm.dataset.removeAvatar === 'true';
    setSubmitEnabled(
      avatarForm,
      pendingAvatar !== state.avatar || (removeAvatar && Boolean(state.avatar)),
    );
  }

  const topUpForm = document.getElementById('profile-topup-form');
  if (topUpForm instanceof HTMLFormElement) {
    const amount = String((topUpForm.elements.namedItem('amount') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(topUpForm, Boolean(amount));
  }

  const tariffForm = document.getElementById('profile-tariff-form');
  if (tariffForm instanceof HTMLFormElement) {
    const nextTariff = String((tariffForm.elements.namedItem('nextTariff') as RadioNodeList)?.value || '');
    setSubmitEnabled(tariffForm, Boolean(nextTariff) && nextTariff !== state.tariffKey);
  }

  const confirmationForm = document.getElementById('profile-confirmation-form');
  if (confirmationForm instanceof HTMLFormElement) {
    const email = String((confirmationForm.elements.namedItem('email') as HTMLInputElement)?.value || '').trim();
    const phone = String((confirmationForm.elements.namedItem('phone') as HTMLInputElement)?.value || '').trim();
    const company = String((confirmationForm.elements.namedItem('company') as HTMLInputElement)?.value || '').trim();
    const inn = String((confirmationForm.elements.namedItem('inn') as HTMLInputElement)?.value || '').trim();
    setSubmitEnabled(
      confirmationForm,
      email !== state.email ||
        phone !== state.phone ||
        company !== state.company ||
        inn !== state.inn ||
        state.accountStatus !== 'verified',
    );
  }
}
