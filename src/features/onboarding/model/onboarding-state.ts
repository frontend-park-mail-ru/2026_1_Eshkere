import { localStorageService, LocalStorageKey } from 'shared/lib/local-storage';

export const onboardingState = {
  isCompleted(): boolean {
    return localStorageService.getItem(LocalStorageKey.OnboardingCompleted) === 'true';
  },

  markCompleted(): void {
    localStorageService.setItem(LocalStorageKey.OnboardingCompleted, 'true');
  },

  reset(): void {
    localStorageService.removeItem(LocalStorageKey.OnboardingCompleted);
  },
};
