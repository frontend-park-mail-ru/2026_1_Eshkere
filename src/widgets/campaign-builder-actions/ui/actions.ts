import { LocalStorageKey, localStorageService } from 'shared/lib/local-storage';
import type { BuilderState, StepKey, ToastPayload } from 'features/campaign-builder/model/types';

interface ValidationResult {
  description?: string;
  ok: boolean;
  step?: StepKey;
  title?: string;
}

interface InitCampaignBuilderActionsParams {
  getModeConfig: () => {
    lockedDescription: string;
    lockedTitle: string;
    submitSuccessDescription: string;
    submitSuccessTitle: string;
    submitValidationTitle: string;
  };
  hideToast: () => void;
  persistEditSeedFromState: (state: BuilderState) => void;
  persistState: (state: BuilderState) => void;
  resetState: () => BuilderState;
  setStep: (step: StepKey) => void;
  showToast: (payload: ToastPayload) => void;
  signal: AbortSignal;
  state: BuilderState;
  submitBuilder?: (state: BuilderState) => Promise<void>;
  syncBuilder: (state: BuilderState) => void;
  syncSaveState: () => void;
  validateBuilder: (state: BuilderState) => ValidationResult;
}

export function initCampaignBuilderActions({
  getModeConfig,
  hideToast,
  persistEditSeedFromState,
  persistState,
  resetState,
  setStep,
  showToast,
  signal,
  state,
  submitBuilder,
  syncBuilder,
  syncSaveState,
  validateBuilder,
}: InitCampaignBuilderActionsParams): void {
  const closeMoreMenu = (): void => {
    const menu = document.querySelector<HTMLElement>('[data-builder-more-menu]');
    const trigger = document.querySelector<HTMLElement>('[data-builder-more-trigger]');
    menu?.setAttribute('hidden', '');
    trigger?.setAttribute('aria-expanded', 'false');
  };

  document.querySelector('[data-builder-more-trigger]')?.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      const menu = document.querySelector<HTMLElement>('[data-builder-more-menu]');
      const trigger = document.querySelector<HTMLElement>('[data-builder-more-trigger]');
      const isOpen = menu ? !menu.hasAttribute('hidden') : false;

      if (isOpen) {
        closeMoreMenu();
        return;
      }

      menu?.removeAttribute('hidden');
      trigger?.setAttribute('aria-expanded', 'true');
    },
    { signal },
  );

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-builder-more]')) {
        return;
      }

      closeMoreMenu();
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        closeMoreMenu();
      }
    },
    { signal },
  );

  document
    .querySelectorAll<HTMLElement>('[data-builder-save-template]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          localStorageService.setJson(LocalStorageKey.CampaignBuilderTemplate, state);
          persistState(state);
          syncSaveState();
          closeMoreMenu();
          showToast({
            title: 'Шаблон сохранён',
            description:
              'Текущую конфигурацию можно использовать как основу для следующей кампании.',
          });
        },
        { signal },
      );
    });

  document.querySelector('[data-builder-duplicate]')?.addEventListener(
    'click',
    () => {
      persistState(state);
      closeMoreMenu();
      showToast({
        title: 'Копия подготовлена',
        description:
          'Текущую конфигурацию можно использовать как основу для новой кампании.',
      });
    },
    { signal },
  );

  document.querySelector('[data-builder-reset]')?.addEventListener(
    'click',
    () => {
      const nextState = resetState();
      Object.assign(state, nextState);
      syncBuilder(state);
      closeMoreMenu();
      showToast({
        title: 'Форма очищена',
        description: 'Вернули базовую конфигурацию для новой кампании.',
      });
    },
    { signal },
  );

  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      '[data-builder-input], [data-builder-budget]',
    )
    .forEach((field) => {
      field.addEventListener(
        'change',
        () => {
          syncSaveState();
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-submit]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        async () => {
          const mode = getModeConfig();

          if (state.step !== 'publication') {
            const validation = validateBuilder(state);

            showToast({
              title: validation.ok ? mode.lockedTitle : 'Ещё не всё заполнено',
              description: validation.ok
                ? mode.lockedDescription
                : validation.description || 'Заполните обязательные поля перед отправкой.',
            });
            return;
          }

          const validation = validateBuilder(state);

          if (!validation.ok) {
            if (validation.step) {
              setStep(validation.step);
            }

            showToast({
              title: validation.title || mode.submitValidationTitle,
              description: validation.description || 'Не все обязательные поля заполнены.',
            });
            return;
          }

          state.step = 'publication';
          if (submitBuilder) {
            await submitBuilder(state);
            return;
          }

          persistState(state);
          persistEditSeedFromState(state);
          syncBuilder(state);
          showToast({
            title: mode.submitSuccessTitle,
            description: mode.submitSuccessDescription,
          });
        },
        { signal },
      );
    });

  document
    .querySelector('[data-builder-toast-close]')
    ?.addEventListener('click', hideToast, { signal });
}
