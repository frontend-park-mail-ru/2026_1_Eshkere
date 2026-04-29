import { clearFormState, setFieldError, setFormMessage, validateRequired, watchFormState } from 'features/profile/lib/form';
import { validatePassword, validateRepeatPassword } from 'shared/validators';
import { showProfileFeedback } from 'shared/lib/toast';

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
