import { localStorageService, LocalStorageKey } from 'shared/lib/local-storage';

export const onboardingState = {
  isCompleted(): boolean {
    return localStorageService.getItem(LocalStorageKey.OnboardingCompleted) === 'true';
  },

  markCompleted(): void {
    localStorageService.setItem(LocalStorageKey.OnboardingCompleted, 'true');
    localStorageService.removeItem(LocalStorageKey.OnboardingPendingStep);
  },

  reset(): void {
    localStorageService.removeItem(LocalStorageKey.OnboardingCompleted);
    localStorageService.removeItem(LocalStorageKey.OnboardingPendingStep);
  },

  savePendingStep(step: number): void {
    localStorageService.setItem(LocalStorageKey.OnboardingPendingStep, String(step));
  },

  getPendingStep(): number | null {
    const raw = localStorageService.getItem(LocalStorageKey.OnboardingPendingStep);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  },

  clearPendingStep(): void {
    localStorageService.removeItem(LocalStorageKey.OnboardingPendingStep);
  },
};
