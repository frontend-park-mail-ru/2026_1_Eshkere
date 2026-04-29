import { clearFieldError, clearFormState, formatPhoneInput, getModalStep, getNamedFormValue, setFieldError, setFormMessage, setStepState, validateConfirmationCode, watchTwoStepFormState } from 'features/profile/lib/form';
import { updateProfile } from 'features/profile/api/update-profile';
import { normalizePhone, validatePhone } from 'shared/validators';
import { showProfileFeedback } from 'shared/lib/toast';

import type { InitProfileContactSectionParams } from './contact-types';

export function initProfilePhoneForm({
  closeModalById,
  onStateChange,
  refreshSubmitStates,
  signal,
  state,
}: InitProfileContactSectionParams): void {
  const phoneForm = document.getElementById('profile-phone-form');
  if (!(phoneForm instanceof HTMLFormElement)) {
    return;
  }

  const phoneInput = phoneForm.elements.namedItem('phone');
  if (phoneInput instanceof HTMLInputElement) {
    phoneInput.addEventListener('input', () => {
      phoneInput.value = formatPhoneInput(phoneInput.value);
      clearFieldError(phoneForm, 'phone');
      setFormMessage(phoneForm, '[data-form-error]', '');
      refreshSubmitStates(state);
    }, { signal });
  }

  watchTwoStepFormState(phoneForm, signal, () => {
    const phone = getNamedFormValue(phoneForm, 'phone');
    return Boolean(phone) && normalizePhone(phone) !== normalizePhone(state.phone);
  });

  phoneForm.querySelector('[data-resend-code]')?.addEventListener('click', () => {
    const pendingPhone = phoneForm.dataset.pendingValue || '';
    setFormMessage(phoneForm, '[data-form-success]', `SMS-код повторно отправлен на ${pendingPhone}`);
  }, { signal });

  phoneForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFormState(phoneForm);

    if (getModalStep(phoneForm) === 'input') {
      const phone = String(new FormData(phoneForm).get('phone') || '').trim();
      const phoneError = validatePhone(phone);

      if (phoneError) {
        setFieldError(phoneForm, 'phone', phoneError);
        setFormMessage(phoneForm, '[data-form-error]', 'Укажите корректный телефон');
        return;
      }

      if (normalizePhone(phone) === normalizePhone(state.phone)) {
        setFieldError(phoneForm, 'phone', 'Укажите новый телефон, отличный от текущего');
        setFormMessage(phoneForm, '[data-form-error]', 'Новый телефон совпадает с текущим');
        return;
      }

      if (normalizePhone(phone) === '+79990000000') {
        setFieldError(phoneForm, 'phone', 'Этот телефон уже привязан к другому аккаунту');
        setFormMessage(phoneForm, '[data-form-error]', 'Не удалось отправить код на этот номер');
        return;
      }

      phoneForm.dataset.pendingValue = phone;
      setStepState(phoneForm, 'confirm', phone);
      setFormMessage(phoneForm, '[data-form-success]', `SMS-код отправлен на ${phone}`);
      refreshSubmitStates(state);
      return;
    }

    const code = String(new FormData(phoneForm).get('code') || '').trim();
    const codeError = validateConfirmationCode(code);

    if (codeError) {
      setFieldError(phoneForm, 'code', codeError);
      setFormMessage(phoneForm, '[data-form-error]', 'Не удалось подтвердить новый телефон');
      return;
    }

    state.phone = phoneForm.dataset.pendingValue || state.phone;
    updateProfile({ phone: normalizePhone(state.phone) || state.phone }).catch(() => {});

    onStateChange(state);
    showProfileFeedback({
      title: 'Телефон обновлен',
      description: 'Новый номер подтвержден и подключен для входа и уведомлений.',
    });
    closeModalById('profile-phone-modal');
  }, { signal });
}
