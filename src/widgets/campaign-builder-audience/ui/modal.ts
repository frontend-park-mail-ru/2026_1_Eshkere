import { PROFILE_TAG_RULES } from 'features/campaign-builder/model/config';
import type {
  AudienceDetailKey,
  AudienceModalConfig,
  BuilderState,
  ToastPayload,
} from 'features/campaign-builder/model/types';
import {
  renderAudienceModalOptions,
  syncProfileSelectionUI,
  type ProfileSelectionState,
} from './modal-view';

interface InitCampaignBuilderAudienceModalParams {
  getAudienceModalConfig: (key: AudienceDetailKey) => AudienceModalConfig;
  getProfileSelectionState: (profileTags: string[]) => ProfileSelectionState;
  persistState: (state: BuilderState) => void;
  showToast: (payload: ToastPayload) => void;
  signal: AbortSignal;
  state: BuilderState;
  syncBuilder: (state: BuilderState) => void;
}

export function initCampaignBuilderAudienceModal({
  getAudienceModalConfig,
  getProfileSelectionState,
  persistState,
  showToast,
  signal,
  state,
  syncBuilder,
}: InitCampaignBuilderAudienceModalParams): void {
  const audienceModal = document.querySelector<HTMLElement>('[data-builder-audience-modal]');
  const audienceModalOptions = document.querySelector<HTMLElement>('[data-builder-audience-modal-options]');
  const audienceModalSearch = document.querySelector<HTMLInputElement>('[data-builder-audience-modal-search]');
  const audienceModalSearchField = audienceModalSearch?.closest<HTMLElement>('.campaign-builder__modal-search');
  const audienceModalSave = document.querySelector<HTMLButtonElement>('[data-builder-audience-modal-save]');

  let activeAudienceModal: AudienceDetailKey | null = null;
  let draftAudienceConfig: BuilderState['audienceConfig'] | null = null;
  let currentAudienceSearch = '';
  let audienceModalCloseTimer: number | null = null;

  const openAudienceModal = (): void => {
    if (!audienceModal) {
      return;
    }

    if (audienceModalCloseTimer) {
      window.clearTimeout(audienceModalCloseTimer);
      audienceModalCloseTimer = null;
    }

    audienceModal.hidden = false;
    audienceModal.classList.remove('is-closing');
    requestAnimationFrame(() => {
      audienceModal.classList.add('is-open');
    });
  };

  const closeAudienceModal = (): void => {
    activeAudienceModal = null;
    draftAudienceConfig = null;
    currentAudienceSearch = '';
    if (audienceModalCloseTimer) {
      window.clearTimeout(audienceModalCloseTimer);
      audienceModalCloseTimer = null;
    }
    audienceModal?.classList.remove('is-open');
    audienceModal?.classList.add('is-closing');
    audienceModalCloseTimer = window.setTimeout(() => {
      if (audienceModalOptions) {
        audienceModalOptions.innerHTML = '';
      }
      audienceModal?.setAttribute('hidden', '');
      audienceModal?.classList.remove('is-closing');
      audienceModalCloseTimer = null;
    }, 180);
    if (audienceModalSearch) {
      audienceModalSearch.value = '';
    }
    audienceModalSearchField?.removeAttribute('hidden');
    if (audienceModalSave) {
      audienceModalSave.disabled = false;
    }
  };

  const renderAudienceModal = (key: AudienceDetailKey): void => {
    const config = getAudienceModalConfig(key);
    draftAudienceConfig = {
      cities: [...state.audienceConfig.cities],
      ageRange: state.audienceConfig.ageRange,
      profileTags: [...state.audienceConfig.profileTags],
      exclusions: [...state.audienceConfig.exclusions],
      interests: [...state.audienceConfig.interests],
      matchingMode: state.audienceConfig.matchingMode,
      expansionEnabled: state.audienceConfig.expansionEnabled,
      profilePriority: state.audienceConfig.profilePriority,
      interestsPriority: state.audienceConfig.interestsPriority,
    };
    currentAudienceSearch = '';

    const modalTitle =
      key === 'age'
        ? 'Возрастной диапазон'
        : key === 'profile'
          ? 'Профиль аудитории'
          : config.title;
    const modalDescription =
      key === 'age'
        ? 'Выберите возрастной диапазон, внутри которого система будет искать аудиторию.'
        : key === 'profile'
          ? 'Выберите роли, признаки и модели поведения, которые подходят под оффер.'
          : config.description;

    const titleNode = document.querySelector<HTMLElement>('[data-builder-audience-modal-title]');
    const textNode = document.querySelector<HTMLElement>('[data-builder-audience-modal-text]');
    if (titleNode) {
      titleNode.textContent = modalTitle;
    }
    if (textNode) {
      textNode.textContent = modalDescription;
    }
    if (audienceModalSearch) {
      audienceModalSearch.value = '';
      audienceModalSearch.placeholder =
        key === 'profile'
          ? 'Найти роль, поведение или признак'
          : 'Найти вариант';
    }
    audienceModalSearchField?.toggleAttribute('hidden', key === 'age');

    if (audienceModalOptions && draftAudienceConfig) {
      renderAudienceModalOptions({
        activeAudienceModal: key,
        audienceModalOptions,
        audienceModalSave,
        currentAudienceSearch,
        draftAudienceConfig,
        getAudienceModalConfig,
        getProfileSelectionState,
        state,
      });
      if (key === 'profile') {
        syncProfileSelectionUI({
          activeAudienceModal: key,
          audienceModalOptions,
          audienceModalSave,
          draftAudienceConfig,
          getProfileSelectionState,
        });
      } else if (audienceModalSave) {
        audienceModalSave.disabled = false;
      }
    }
  };

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-detail]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const key = button.dataset.builderAudienceDetail as AudienceDetailKey | undefined;
          if (!key || !audienceModal) {
            return;
          }

          activeAudienceModal = key;
          renderAudienceModal(key);
          openAudienceModal();
        },
        { signal },
      );
    });

  audienceModalOptions?.addEventListener(
    'change',
    () => {
      if (!activeAudienceModal || !draftAudienceConfig || !audienceModalOptions) {
        return;
      }

      const selectedValues = Array.from(
        audienceModalOptions.querySelectorAll<HTMLInputElement>(
          '.campaign-builder__modal-option-input:checked',
        ),
      ).map((input) => input.value);

      if (activeAudienceModal === 'geo') {
        draftAudienceConfig.cities = selectedValues;
      } else if (activeAudienceModal === 'age') {
        draftAudienceConfig.ageRange = selectedValues[0] || state.audienceConfig.ageRange;
      } else if (activeAudienceModal === 'profile') {
        const checkedTagInputs = Array.from(
          audienceModalOptions.querySelectorAll<HTMLInputElement>('[data-profile-tag]:checked'),
        );
        if (checkedTagInputs.length > PROFILE_TAG_RULES.max) {
          const lastChecked = checkedTagInputs[checkedTagInputs.length - 1];
          lastChecked.checked = false;
          showToast({
            title: 'Слишком много признаков',
            description: `Оставьте до ${PROFILE_TAG_RULES.max} тегов, иначе сегмент станет трудно масштабировать.`,
          });
        }
        draftAudienceConfig.profileTags = Array.from(
          audienceModalOptions.querySelectorAll<HTMLInputElement>('[data-profile-tag]:checked'),
        ).map((input) => input.value);
        syncProfileSelectionUI({
          activeAudienceModal,
          audienceModalOptions,
          audienceModalSave,
          draftAudienceConfig,
          getProfileSelectionState,
        });
      } else if (activeAudienceModal === 'exclusions') {
        draftAudienceConfig.exclusions = selectedValues;
      } else if (activeAudienceModal === 'interests') {
        draftAudienceConfig.interests = selectedValues;
      }
    },
    { signal },
  );

  audienceModalSearch?.addEventListener(
    'input',
    () => {
      if (!activeAudienceModal || !draftAudienceConfig || !audienceModalOptions) {
        return;
      }

      currentAudienceSearch = audienceModalSearch.value;
      renderAudienceModalOptions({
        activeAudienceModal,
        audienceModalOptions,
        audienceModalSave,
        currentAudienceSearch,
        draftAudienceConfig,
        getAudienceModalConfig,
        getProfileSelectionState,
        state,
      });
    },
    { signal },
  );

  document
    .querySelectorAll<HTMLElement>(
      '[data-builder-audience-modal-close], [data-builder-audience-modal-cancel]',
    )
    .forEach((button) => {
      button.addEventListener('click', closeAudienceModal, { signal });
    });

  document
    .querySelector('[data-builder-audience-modal-save]')
    ?.addEventListener(
      'click',
      () => {
        if (!activeAudienceModal || !draftAudienceConfig) {
          return;
        }

        state.audienceConfig = {
          cities: draftAudienceConfig.cities.length
            ? draftAudienceConfig.cities
            : state.audienceConfig.cities,
          ageRange: draftAudienceConfig.ageRange,
          profileTags: draftAudienceConfig.profileTags,
          exclusions: draftAudienceConfig.exclusions.length
            ? draftAudienceConfig.exclusions
            : state.audienceConfig.exclusions,
          interests: draftAudienceConfig.interests.length
            ? draftAudienceConfig.interests
            : state.audienceConfig.interests,
          matchingMode: state.audienceConfig.matchingMode,
          expansionEnabled: state.audienceConfig.expansionEnabled,
          profilePriority: state.audienceConfig.profilePriority,
          interestsPriority: state.audienceConfig.interestsPriority,
        };
        persistState(state);
        syncBuilder(state);
        closeAudienceModal();
        showToast({
          title: 'Аудитория обновлена',
          description: 'Изменения сохранены в настройках таргетинга.',
        });
      },
      { signal },
    );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        closeAudienceModal();
      }
    },
    { signal },
  );
}
