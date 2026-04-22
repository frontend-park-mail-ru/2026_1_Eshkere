import { attachMaskedInput, clearFormState, formatPhoneInput, setFieldError, setFormMessage, validateRequired, watchFormState } from 'features/profile/lib/form';
import { normalizePhone, validateEmail, validateInn, validatePhone } from 'shared/validators';
import { showProfileFeedback } from 'widgets/profile-feedback/ui/toast';

import type { InitProfileAccountSectionParams } from './account-types';

export function initProfileConfirmationForm({
  closeModalById,
  onStateChange,
  signal,
  state,
}: InitProfileAccountSectionParams): void {
  const confirmationForm = document.getElementById('profile-confirmation-form');
  if (!(confirmationForm instanceof HTMLFormElement)) {
    return;
  }

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
