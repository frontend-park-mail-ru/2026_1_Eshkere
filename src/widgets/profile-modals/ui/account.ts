import {
  normalizePhone,
  validateEmail,
  validateInn,
  validatePassword,
  validatePhone,
  validateRepeatPassword,
} from 'shared/validators';
import {
  attachMaskedInput,
  clearFormState,
  formatPhoneInput,
  readFileAsDataUrl,
  setFieldError,
  setFormMessage,
  validateRequired,
  watchFormState,
} from 'features/profile/lib/form';
import type { ProfileState } from 'features/profile/model/types';
import { updateAvatar } from 'features/profile/api/update-avatar';
import { showProfileFeedback } from 'widgets/profile-feedback/ui/toast';

interface InitProfileAccountModalsParams {
  closeModalById: (id: string) => void;
  getInitials: (firstName: string, lastName: string) => string;
  onStateChange: (state: ProfileState) => void;
  refreshSubmitStates: (state: ProfileState) => void;
  signal: AbortSignal;
  state: ProfileState;
}

export function initProfileAccountModals({
  closeModalById,
  getInitials,
  onStateChange,
  refreshSubmitStates,
  signal,
  state,
}: InitProfileAccountModalsParams): void {
  const passwordForm = document.getElementById('profile-password-form');
  const avatarForm = document.getElementById('profile-avatar-form');
  const confirmationForm = document.getElementById('profile-confirmation-form');

  if (passwordForm instanceof HTMLFormElement) {
    watchFormState(passwordForm, signal, () => {
      const currentPassword = String((passwordForm.elements.namedItem('currentPassword') as HTMLInputElement)?.value || '').trim();
      const newPassword = String((passwordForm.elements.namedItem('newPassword') as HTMLInputElement)?.value || '').trim();
      const repeatPassword = String((passwordForm.elements.namedItem('repeatPassword') as HTMLInputElement)?.value || '').trim();
      return Boolean(currentPassword || newPassword || repeatPassword);
    });

    passwordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(passwordForm);

      const formData = new FormData(passwordForm);
      const currentPassword = String(formData.get('currentPassword') || '');
      const newPassword = String(formData.get('newPassword') || '');
      const repeatPassword = String(formData.get('repeatPassword') || '');

      const errors = [
        ['currentPassword', validateRequired(currentPassword, 'Введите текущий пароль')],
        ['newPassword', validatePassword(newPassword)],
        ['repeatPassword', validateRepeatPassword(newPassword, repeatPassword)],
      ] as const;

      let hasErrors = false;
      errors.forEach(([field, message]) => {
        if (message) {
          hasErrors = true;
          setFieldError(passwordForm, field, message);
        }
      });

      if (currentPassword === 'wrongpass') {
        hasErrors = true;
        setFormMessage(passwordForm, '[data-form-error]', 'Текущий пароль введен неверно');
      }

      if (hasErrors) {
        if (!passwordForm.querySelector('[data-form-error]')?.textContent) {
          setFormMessage(passwordForm, '[data-form-error]', 'Не удалось обновить пароль. Проверьте форму');
        }
        return;
      }

      state.passwordStatus = 'Пароль обновлен';
      onStateChange(state);
      showProfileFeedback({
        title: 'Пароль обновлен',
        description: 'Используйте новый пароль при следующем входе в рекламный кабинет.',
      });
      closeModalById('profile-password-modal');
    }, { signal });
  }

  if (avatarForm instanceof HTMLFormElement) {
    const fileInput = avatarForm.elements.namedItem('avatarFile');
    const urlInput = avatarForm.elements.namedItem('avatarUrl');
    const preview = avatarForm.querySelector<HTMLElement>('[data-avatar-preview]');
    const previewImage = avatarForm.querySelector<HTMLImageElement>('[data-avatar-preview-image]');
    const previewInitials = avatarForm.querySelector<HTMLElement>('[data-avatar-preview-initials]');
    let pendingAvatarFile: File | null = null;

    const applyAvatarPreview = (value: string): void => {
      const hasAvatar = Boolean(value);
      if (previewImage) {
        previewImage.src = value || '';
        previewImage.hidden = !hasAvatar;
      }
      if (previewInitials) {
        previewInitials.hidden = hasAvatar;
        previewInitials.textContent = getInitials(state.firstName, state.lastName);
      }
      preview?.classList.toggle('profile-avatar-picker--image', hasAvatar);
    };

    if (fileInput instanceof HTMLInputElement) {
      fileInput.addEventListener('change', async () => {
        clearFormState(avatarForm);
        const file = fileInput.files?.[0];
        if (!file) {
          return;
        }
        if (!file.type.startsWith('image/')) {
          setFormMessage(avatarForm, '[data-form-error]', 'Выберите изображение в формате PNG, JPG или WebP');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setFormMessage(avatarForm, '[data-form-error]', 'Файл должен быть меньше 5 МБ');
          return;
        }

        try {
          const dataUrl = await readFileAsDataUrl(file);
          pendingAvatarFile = file;
          avatarForm.dataset.pendingAvatar = dataUrl;
          avatarForm.dataset.removeAvatar = 'false';
          if (urlInput instanceof HTMLInputElement) {
            urlInput.value = '';
          }
          applyAvatarPreview(dataUrl);
          refreshSubmitStates(state);
        } catch {
          setFormMessage(avatarForm, '[data-form-error]', 'Не удалось загрузить выбранный файл');
        }
      }, { signal });
    }

    if (urlInput instanceof HTMLInputElement) {
      urlInput.addEventListener('input', () => {
        clearFormState(avatarForm);
        const value = urlInput.value.trim();
        avatarForm.dataset.pendingAvatar = value;
        avatarForm.dataset.removeAvatar = value ? 'false' : 'true';
        applyAvatarPreview(value);
        refreshSubmitStates(state);
      }, { signal });
    }

    avatarForm.querySelector('[data-avatar-reset]')?.addEventListener('click', () => {
      clearFormState(avatarForm);
      pendingAvatarFile = null;
      avatarForm.dataset.pendingAvatar = '';
      avatarForm.dataset.removeAvatar = 'true';
      if (fileInput instanceof HTMLInputElement) {
        fileInput.value = '';
      }
      if (urlInput instanceof HTMLInputElement) {
        urlInput.value = '';
      }
      applyAvatarPreview('');
      refreshSubmitStates(state);
    }, { signal });

    avatarForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(avatarForm);

      const pendingAvatar = avatarForm.dataset.pendingAvatar || '';
      state.avatar = pendingAvatar;

      if (pendingAvatarFile) {
        updateAvatar(pendingAvatarFile)
          .then((profile) => {
            if (typeof profile.avatar_url === 'string') {
              state.avatar = profile.avatar_url;
              onStateChange(state);
            }
          })
          .catch(() => {});
        pendingAvatarFile = null;
      }

      onStateChange(state);
      showProfileFeedback({
        title: state.avatar ? 'Аватар обновлен' : 'Аватар удален',
        description: state.avatar
          ? 'Новая фотография сохранена и теперь отображается в профиле.'
          : 'Профиль снова использует инициалы вместо изображения.',
      });
      closeModalById('profile-avatar-modal');
    }, { signal });
  }

  if (confirmationForm instanceof HTMLFormElement) {
    attachMaskedInput(confirmationForm, 'phone', formatPhoneInput, signal);
    watchFormState(confirmationForm, signal, () => {
      const email = String((confirmationForm.elements.namedItem('email') as HTMLInputElement)?.value || '').trim();
      const phone = String((confirmationForm.elements.namedItem('phone') as HTMLInputElement)?.value || '').trim();
      const company = String((confirmationForm.elements.namedItem('company') as HTMLInputElement)?.value || '').trim();
      const inn = String((confirmationForm.elements.namedItem('inn') as HTMLInputElement)?.value || '').trim();
      return email !== state.email || phone !== state.phone || company !== state.company || inn !== state.inn || state.accountStatus !== 'verified';
    });

    confirmationForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormState(confirmationForm);

      const formData = new FormData(confirmationForm);
      const email = String(formData.get('email') || '').trim();
      const phone = String(formData.get('phone') || '').trim();
      const company = String(formData.get('company') || '').trim();
      const inn = String(formData.get('inn') || '').trim();

      const errors = [
        ['email', validateEmail(email)],
        ['phone', validatePhone(phone)],
        ['company', validateRequired(company, 'Введите название компании')],
        ['inn', validateInn(inn)],
      ] as const;

      let hasErrors = false;
      errors.forEach(([field, message]) => {
        if (message) {
          hasErrors = true;
          setFieldError(confirmationForm, field, message);
        }
      });

      if (email.includes('taken')) {
        hasErrors = true;
        setFieldError(confirmationForm, 'email', 'Этот email уже используется');
      }

      if (hasErrors) {
        setFormMessage(confirmationForm, '[data-form-error]', 'Заполните обязательные поля и повторите отправку');
        return;
      }

      if (email !== state.email || normalizePhone(phone) !== normalizePhone(state.phone)) {
        setFormMessage(
          confirmationForm,
          '[data-form-error]',
          'Email и телефон обновляются отдельно в блоке «Контакты» с подтверждением кода',
        );
        return;
      }

      state.company = company;
      state.inn = inn.replace(/\D/g, '');
      state.accountStatus = 'verified';
      onStateChange(state);
      showProfileFeedback({
        title: 'Аккаунт подтвержден',
        description: 'Контактные данные и реквизиты сохранены, статус аккаунта обновлен.',
      });
      closeModalById('profile-confirmation-modal');
    }, { signal });
  }
}
