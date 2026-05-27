import { updatePassword } from 'features/profile/api/update-profile';
import {
  clearFormState,
  getModalStep,
  setFieldError,
  setFormMessage,
  setStepState,
  setSubmitting,
  validateConfirmationCode,
  validateRequired,
  watchTwoStepFormState,
} from 'features/profile/lib/form';
import { validatePassword, validateRepeatPassword } from 'shared/validators';
import { showProfileFeedback } from 'shared/lib/toast';
import { ApiRequestError } from 'shared/lib/request';

import type { InitProfileAccountSectionParams } from './account-types';

function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx < 0) return email;
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx);
  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(2, local.length - 1))}${domain}`;
}

export function initProfilePasswordForm({
  closeModalById,
  onStateChange,
  refreshSubmitStates,
  signal,
  state,
}: InitProfileAccountSectionParams): void {
  const passwordForm = document.getElementById('profile-password-form');
  if (!(passwordForm instanceof HTMLFormElement)) {
    return;
  }

  // Pending passwords stored between steps
  let pendingCurrentPassword = '';
  let pendingNewPassword = '';

  watchTwoStepFormState(passwordForm, signal, () => {
    const currentPassword = String((passwordForm.elements.namedItem('currentPassword') as HTMLInputElement)?.value || '').trim();
    const newPassword = String((passwordForm.elements.namedItem('newPassword') as HTMLInputElement)?.value || '').trim();
    const repeatPassword = String((passwordForm.elements.namedItem('repeatPassword') as HTMLInputElement)?.value || '').trim();
    return Boolean(currentPassword || newPassword || repeatPassword);
  });

  passwordForm.querySelector('[data-resend-code]')?.addEventListener('click', () => {
    const maskedEmail = maskEmail(state.email || '');
    setFormMessage(passwordForm, '[data-form-success]', `Код повторно отправлен на ${maskedEmail}`);
  }, { signal });

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormState(passwordForm);

    // ── Шаг 1: валидация паролей → отправка кода ──────────────────────────────
    if (getModalStep(passwordForm) === 'input') {
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

      // Сохраняем пароли для второго шага
      pendingCurrentPassword = currentPassword;
      pendingNewPassword = newPassword;

      // Переходим к шагу подтверждения
      const maskedEmail = maskEmail(state.email || '');
      setStepState(passwordForm, 'confirm', maskedEmail);
      setFormMessage(passwordForm, '[data-form-success]', `Код отправлен на ${maskedEmail}`);
      refreshSubmitStates(state);
      return;
    }

    // ── Шаг 2: проверка кода → смена пароля ──────────────────────────────────
    const code = String(new FormData(passwordForm).get('code') || '').trim();
    const codeError = validateConfirmationCode(code);

    if (codeError) {
      setFieldError(passwordForm, 'code', codeError);
      setFormMessage(passwordForm, '[data-form-error]', 'Не удалось подтвердить изменение пароля');
      return;
    }

    setSubmitting(passwordForm, true);

    try {
      await updatePassword({ currentPassword: pendingCurrentPassword, newPassword: pendingNewPassword });

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
        // Откатываемся к первому шагу с ошибкой на поле пароля
        setStepState(passwordForm, 'input');
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
        setStepState(passwordForm, 'input');
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
