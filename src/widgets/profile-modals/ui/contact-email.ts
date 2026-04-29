import { clearFormState, getModalStep, getNamedFormValue, setFieldError, setFormMessage, setStepState, validateConfirmationCode, watchTwoStepFormState } from 'features/profile/lib/form';
import { updateProfile } from 'features/profile/api/update-profile';
import { validateEmail } from 'shared/validators';
import { showProfileFeedback } from 'shared/lib/toast';

import type { InitProfileContactSectionParams } from './contact-types';

export function initProfileEmailForm({
  closeModalById,
  onStateChange,
  refreshSubmitStates,
  signal,
  state,
}: InitProfileContactSectionParams): void {
  const emailForm = document.getElementById('profile-email-form');
  if (!(emailForm instanceof HTMLFormElement)) {
    return;
  }

  watchTwoStepFormState(emailForm, signal, () => {
    const email = getNamedFormValue(emailForm, 'email');
    return Boolean(email) && email !== state.email;
  });

  emailForm.querySelector('[data-resend-code]')?.addEventListener('click', () => {
    const pendingEmail = emailForm.dataset.pendingValue || '';
    setFormMessage(emailForm, '[data-form-success]', `Код повторно отправлен на ${pendingEmail}`);
  }, { signal });

  emailForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFormState(emailForm);

    if (getModalStep(emailForm) === 'input') {
      const email = String(new FormData(emailForm).get('email') || '').trim();
      const emailError = validateEmail(email);

      if (emailError) {
        setFieldError(emailForm, 'email', emailError);
        setFormMessage(emailForm, '[data-form-error]', 'Укажите корректный email');
        return;
      }

      if (email === state.email) {
        setFieldError(emailForm, 'email', 'Укажите новый email, отличный от текущего');
        setFormMessage(emailForm, '[data-form-error]', 'Новый email совпадает с текущим');
        return;
      }

      if (email.includes('taken')) {
        setFieldError(emailForm, 'email', 'Этот email уже используется');
        setFormMessage(emailForm, '[data-form-error]', 'Не удалось отправить код на этот email');
        return;
      }

      emailForm.dataset.pendingValue = email;
      setStepState(emailForm, 'confirm', email);
      setFormMessage(emailForm, '[data-form-success]', `Код отправлен на ${email}`);
      refreshSubmitStates(state);
      return;
    }

    const code = String(new FormData(emailForm).get('code') || '').trim();
    const codeError = validateConfirmationCode(code);

    if (codeError) {
      setFieldError(emailForm, 'code', codeError);
      setFormMessage(emailForm, '[data-form-error]', 'Не удалось подтвердить новый email');
      return;
    }

    state.email = emailForm.dataset.pendingValue || state.email;
    updateProfile({ email: state.email }).catch(() => {});

    onStateChange(state);
    showProfileFeedback({
      title: 'Email обновлен',
      description: 'Новый адрес подтвержден и теперь используется для входа и уведомлений.',
    });
    closeModalById('profile-email-modal');
  }, { signal });
}
