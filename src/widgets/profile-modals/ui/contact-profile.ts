import { clearFormState, setFieldError, setFormMessage, validateRequired, watchFormState } from 'features/profile/lib/form';
import { updateProfile } from 'features/profile/api/update-profile';
import { showProfileFeedback } from 'widgets/profile-feedback/ui/toast';

import type { InitProfileContactSectionParams } from './contact-types';

export function initProfileEditForm({
  closeModalById,
  onStateChange,
  signal,
  state,
}: InitProfileContactSectionParams): void {
  const editProfileForm = document.getElementById('profile-edit-form');
  if (!(editProfileForm instanceof HTMLFormElement)) {
    return;
  }

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
