import { updatePassword } from 'features/profile/api/update-profile';
import { clearFormState, setFieldError, setFormMessage, setSubmitting, validateRequired, watchFormState } from 'features/profile/lib/form';
import { validatePassword, validateRepeatPassword } from 'shared/validators';
import { showProfileFeedback } from 'shared/lib/toast';
import { ApiRequestError } from 'shared/lib/request';

import type { InitProfileAccountSectionParams } from './account-types';

export function initProfilePasswordForm({
  closeModalById,
  onStateChange,
  signal,
  state,
}: InitProfileAccountSectionParams): void {
  const passwordForm = document.getElementById('profile-password-form');
  if (!(passwordForm instanceof HTMLFormElement)) {
    return;
  }

  watchFormState(passwordForm, signal, () => {
    const currentPassword = String((passwordForm.elements.namedItem('currentPassword') as HTMLInputElement)?.value || '').trim();
    const newPassword = String((passwordForm.elements.namedItem('newPassword') as HTMLInputElement)?.value || '').trim();
    const repeatPassword = String((passwordForm.elements.namedItem('repeatPassword') as HTMLInputElement)?.value || '').trim();
    return Boolean(currentPassword || newPassword || repeatPassword);
  });

  passwordForm.addEventListener('submit', async (event) => {
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

    if (hasErrors) {
      if (!passwordForm.querySelector('[data-form-error]')?.textContent) {
        setFormMessage(passwordForm, '[data-form-error]', 'Не удалось обновить пароль. Проверьте форму');
      }
      return;
    }

    setSubmitting(passwordForm, true);

    try {
      await updatePassword({ currentPassword, newPassword });

      state.passwordStatus = 'Пароль обновлён';
      onStateChange(state);
      showProfileFeedback({
        title: 'Пароль обновлён',
        description: 'Используйте новый пароль при следующем входе в рекламный кабинет.',
      });
      passwordForm.reset();
      closeModalById('profile-password-modal');
    } catch (error: unknown) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setFieldError(passwordForm, 'currentPassword', 'Текущий пароль введен неверно');
        setFormMessage(passwordForm, '[data-form-error]', 'Текущий пароль введен неверно');
        return;
      }

      if (error instanceof ApiRequestError && error.status === 422) {
        setFormMessage(
          passwordForm,
          '[data-form-error]',
          'Смена пароля недоступна для аккаунтов, зарегистрированных через VK ID.',
        );
        return;
      }

      if (error instanceof ApiRequestError && error.status === 400) {
        setFieldError(passwordForm, 'newPassword', 'Новый пароль должен быть не короче 6 символов');
        setFormMessage(passwordForm, '[data-form-error]', 'Не удалось обновить пароль. Проверьте форму');
        return;
      }

      setFormMessage(passwordForm, '[data-form-error]', 'Не удалось обновить пароль. Попробуйте ещё раз.');
    } finally {
      setSubmitting(passwordForm, false);
    }
  }, { signal });
}
