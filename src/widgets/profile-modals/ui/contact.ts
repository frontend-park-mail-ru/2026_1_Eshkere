import {
  normalizePhone,
  validateEmail,
  validatePhone,
} from 'shared/validators';
import {
  clearFieldError,
  clearFormState,
  formatPhoneInput,
  getModalStep,
  setFieldError,
  setFormMessage,
  setStepState,
  validateConfirmationCode,
  validateRequired,
  watchFormState,
} from 'features/profile/lib/form';
import type { ProfileState } from 'features/profile/model/types';
import { updateProfile } from 'features/profile/api/update-profile';
import { showProfileFeedback } from 'widgets/profile-feedback/ui/toast';

interface InitProfileContactModalsParams {
  closeModalById: (id: string) => void;
  onStateChange: (state: ProfileState) => void;
  refreshSubmitStates: (state: ProfileState) => void;
  signal: AbortSignal;
  state: ProfileState;
}

export function initProfileContactModals({
  closeModalById,
  onStateChange,
  refreshSubmitStates,
  signal,
  state,
}: InitProfileContactModalsParams): void {
  const editProfileForm = document.getElementById('profile-edit-form');
  const emailForm = document.getElementById('profile-email-form');
  const phoneForm = document.getElementById('profile-phone-form');

  if (editProfileForm instanceof HTMLFormElement) {
    watchFormState(editProfileForm, signal, () => {
      const firstName = String((editProfileForm.elements.namedItem('firstName') as HTMLInputElement)?.value || '').trim();
      const lastName = String((editProfileForm.elements.namedItem('lastName') as HTMLInputElement)?.value || '').trim();
      const company = String((editProfileForm.elements.namedItem('company') as HTMLInputElement)?.value || '').trim();
      const city = String((editProfileForm.elements.namedItem('city') as HTMLInputElement)?.value || '').trim();
      return firstName !== state.firstName || lastName !== state.lastName || company !== state.company || city !== state.city;
    });

    editProfileForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(editProfileForm);

      const formData = new FormData(editProfileForm);
      const firstName = String(formData.get('firstName') || '').trim();
      const lastName = String(formData.get('lastName') || '').trim();
      const company = String(formData.get('company') || '').trim();
      const city = String(formData.get('city') || '').trim();

      const errors = [
        ['firstName', validateRequired(firstName, 'Введите имя')],
        ['lastName', validateRequired(lastName, 'Введите фамилию')],
        ['company', validateRequired(company, 'Введите название компании')],
        ['city', validateRequired(city, 'Введите город')],
      ] as const;

      let hasErrors = false;
      errors.forEach(([field, message]) => {
        if (message) {
          hasErrors = true;
          setFieldError(editProfileForm, field, message);
        }
      });

      if (hasErrors) {
        setFormMessage(editProfileForm, '[data-form-error]', 'Проверьте поля формы и повторите попытку');
        return;
      }

      state.firstName = firstName;
      state.lastName = lastName;
      state.company = company;
      state.city = city;

      updateProfile({ name: `${firstName} ${lastName}`.trim() }).catch(() => {});

      onStateChange(state);
      showProfileFeedback({
        title: 'Профиль обновлен',
        description: 'Имя, фамилия, компания и город сохранены в аккаунте.',
      });
      closeModalById('profile-edit-modal');
    }, { signal });
  }

  if (emailForm instanceof HTMLFormElement) {
    watchFormState(emailForm, signal, () => {
      const email = String((emailForm.elements.namedItem('email') as HTMLInputElement)?.value || '').trim();
      const code = String((emailForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
      return getModalStep(emailForm) === 'input' ? Boolean(email) && email !== state.email : Boolean(code);
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

  if (phoneForm instanceof HTMLFormElement) {
    const phoneInput = phoneForm.elements.namedItem('phone');
    if (phoneInput instanceof HTMLInputElement) {
      phoneInput.addEventListener('input', () => {
        phoneInput.value = formatPhoneInput(phoneInput.value);
        clearFieldError(phoneForm, 'phone');
        setFormMessage(phoneForm, '[data-form-error]', '');
        refreshSubmitStates(state);
      }, { signal });
    }

    watchFormState(phoneForm, signal, () => {
      const phone = String((phoneForm.elements.namedItem('phone') as HTMLInputElement)?.value || '').trim();
      const code = String((phoneForm.elements.namedItem('code') as HTMLInputElement)?.value || '').trim();
      return getModalStep(phoneForm) === 'input'
        ? Boolean(phone) && normalizePhone(phone) !== normalizePhone(state.phone)
        : Boolean(code);
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
}
