import { clearFormState, setFormMessage } from 'features/profile/lib/form';
import { updateAvatar } from 'features/profile/api/update-avatar';
import { showProfileFeedback } from 'shared/lib/toast';

import type { InitProfileAccountSectionParams } from './account-types';

export function initProfileAvatarForm({
  closeModalById,
  cropAvatar,
  getInitials,
  onStateChange,
  refreshSubmitStates,
  signal,
  state,
}: InitProfileAccountSectionParams): void {
  const avatarForm = document.getElementById('profile-avatar-form');
  if (!(avatarForm instanceof HTMLFormElement)) {
    return;
  }

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

      const result = await cropAvatar(file);
      if (!result) {
        fileInput.value = '';
        return;
      }

      try {
        pendingAvatarFile = new File([result.blob], file.name, { type: 'image/jpeg' });
        avatarForm.dataset.pendingAvatar = result.dataUrl;
        avatarForm.dataset.removeAvatar = 'false';
        if (urlInput instanceof HTMLInputElement) {
          urlInput.value = '';
        }
        applyAvatarPreview(result.dataUrl);
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
    const prevAvatar = state.avatar;
    state.avatar = pendingAvatar;

    if (pendingAvatarFile) {
      const fileToUpload = pendingAvatarFile;
      pendingAvatarFile = null;

      updateAvatar(fileToUpload)
        .then((profile) => {
          if (typeof profile.avatar_url === 'string') {
            state.avatar = profile.avatar_url;
            onStateChange(state);
          }
        })
        .catch(() => {
          state.avatar = prevAvatar;
          onStateChange(state);
          showProfileFeedback({
            title: 'Ошибка загрузки',
            description: 'Не удалось сохранить аватар. Попробуйте еще раз.',
            tone: 'warning',
          });
        });
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
