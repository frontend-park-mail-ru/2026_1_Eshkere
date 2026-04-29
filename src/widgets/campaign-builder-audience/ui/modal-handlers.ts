import { PROFILE_TAG_RULES } from 'features/campaign-builder/model/config';
import type { AudienceDetailKey, BuilderState } from 'features/campaign-builder/model/types';
import { renderAudienceModalOptions, syncProfileSelectionUI } from './modal-view';

import type {
  CampaignBuilderAudienceModalElements,
  CampaignBuilderAudienceModalRuntimeState,
  InitCampaignBuilderAudienceModalParams,
} from './modal-types';

function cloneAudienceConfig(state: BuilderState): BuilderState['audienceConfig'] {
  return {
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
}

function getAudienceModalMeta(
  key: AudienceDetailKey,
  getAudienceModalConfig: InitCampaignBuilderAudienceModalParams['getAudienceModalConfig'],
): { title: string; description: string } {
  const config = getAudienceModalConfig(key);
  return {
    title:
      key === 'age'
        ? 'Возрастной диапазон'
        : key === 'profile'
          ? 'Профиль аудитории'
          : config.title,
    description:
      key === 'age'
        ? 'Выберите возрастной диапазон, внутри которого система будет искать аудиторию.'
        : key === 'profile'
          ? 'Выберите роли, признаки и модели поведения, которые подходят под оффер.'
          : config.description,
  };
}

export function renderAudienceModal(
  key: AudienceDetailKey,
  elements: CampaignBuilderAudienceModalElements,
  runtimeState: CampaignBuilderAudienceModalRuntimeState,
  params: InitCampaignBuilderAudienceModalParams,
): void {
  runtimeState.draftAudienceConfig = cloneAudienceConfig(params.state);
  runtimeState.currentAudienceSearch = '';

  const meta = getAudienceModalMeta(key, params.getAudienceModalConfig);
  const titleNode = document.querySelector<HTMLElement>('[data-builder-audience-modal-title]');
  const textNode = document.querySelector<HTMLElement>('[data-builder-audience-modal-text]');
  if (titleNode) {
    titleNode.textContent = meta.title;
  }
  if (textNode) {
    textNode.textContent = meta.description;
  }
  if (elements.audienceModalSearch) {
    elements.audienceModalSearch.value = '';
    elements.audienceModalSearch.placeholder =
      key === 'profile'
        ? 'Найти роль, поведение или признак'
        : 'Найти вариант';
  }
  elements.audienceModalSearchField?.toggleAttribute('hidden', key === 'age');

  if (!elements.audienceModalOptions || !runtimeState.draftAudienceConfig) {
    return;
  }

  renderAudienceModalOptions({
    activeAudienceModal: key,
    audienceModalOptions: elements.audienceModalOptions,
    audienceModalSave: elements.audienceModalSave,
    currentAudienceSearch: runtimeState.currentAudienceSearch,
    draftAudienceConfig: runtimeState.draftAudienceConfig,
    getAudienceModalConfig: params.getAudienceModalConfig,
    getProfileSelectionState: params.getProfileSelectionState,
    state: params.state,
  });

  if (key === 'profile') {
    syncProfileSelectionUI({
      activeAudienceModal: key,
      audienceModalOptions: elements.audienceModalOptions,
      audienceModalSave: elements.audienceModalSave,
      draftAudienceConfig: runtimeState.draftAudienceConfig,
      getProfileSelectionState: params.getProfileSelectionState,
    });
  } else if (elements.audienceModalSave) {
    elements.audienceModalSave.disabled = false;
  }
}

export function handleAudienceModalSelectionChange(
  elements: CampaignBuilderAudienceModalElements,
  runtimeState: CampaignBuilderAudienceModalRuntimeState,
  params: InitCampaignBuilderAudienceModalParams,
): void {
  if (!runtimeState.activeAudienceModal || !runtimeState.draftAudienceConfig || !elements.audienceModalOptions) {
    return;
  }

  const selectedValues = Array.from(
    elements.audienceModalOptions.querySelectorAll<HTMLInputElement>('.campaign-builder__modal-option-input:checked'),
  ).map((input) => input.value);

  if (runtimeState.activeAudienceModal === 'geo') {
    runtimeState.draftAudienceConfig.cities = selectedValues;
    return;
  }

  if (runtimeState.activeAudienceModal === 'age') {
    runtimeState.draftAudienceConfig.ageRange = selectedValues[0] || params.state.audienceConfig.ageRange;
    return;
  }

  if (runtimeState.activeAudienceModal === 'profile') {
    const checkedTagInputs = Array.from(
      elements.audienceModalOptions.querySelectorAll<HTMLInputElement>('[data-profile-tag]:checked'),
    );
    if (checkedTagInputs.length > PROFILE_TAG_RULES.max) {
      const lastChecked = checkedTagInputs[checkedTagInputs.length - 1];
      lastChecked.checked = false;
      params.showToast({
        title: 'Слишком много признаков',
        description: `Оставьте до ${PROFILE_TAG_RULES.max} тегов, иначе сегмент станет трудно масштабировать.`,
      });
    }
    runtimeState.draftAudienceConfig.profileTags = Array.from(
      elements.audienceModalOptions.querySelectorAll<HTMLInputElement>('[data-profile-tag]:checked'),
    ).map((input) => input.value);
    syncProfileSelectionUI({
      activeAudienceModal: runtimeState.activeAudienceModal,
      audienceModalOptions: elements.audienceModalOptions,
      audienceModalSave: elements.audienceModalSave,
      draftAudienceConfig: runtimeState.draftAudienceConfig,
      getProfileSelectionState: params.getProfileSelectionState,
    });
    return;
  }

  if (runtimeState.activeAudienceModal === 'exclusions') {
    runtimeState.draftAudienceConfig.exclusions = selectedValues;
    return;
  }

  if (runtimeState.activeAudienceModal === 'interests') {
    runtimeState.draftAudienceConfig.interests = selectedValues;
  }
}

export function handleAudienceModalSearch(
  elements: CampaignBuilderAudienceModalElements,
  runtimeState: CampaignBuilderAudienceModalRuntimeState,
  params: InitCampaignBuilderAudienceModalParams,
): void {
  if (!runtimeState.activeAudienceModal || !runtimeState.draftAudienceConfig || !elements.audienceModalOptions || !elements.audienceModalSearch) {
    return;
  }

  runtimeState.currentAudienceSearch = elements.audienceModalSearch.value;
  renderAudienceModalOptions({
    activeAudienceModal: runtimeState.activeAudienceModal,
    audienceModalOptions: elements.audienceModalOptions,
    audienceModalSave: elements.audienceModalSave,
    currentAudienceSearch: runtimeState.currentAudienceSearch,
    draftAudienceConfig: runtimeState.draftAudienceConfig,
    getAudienceModalConfig: params.getAudienceModalConfig,
    getProfileSelectionState: params.getProfileSelectionState,
    state: params.state,
  });
}

export function saveAudienceModalDraft(
  runtimeState: CampaignBuilderAudienceModalRuntimeState,
  params: InitCampaignBuilderAudienceModalParams,
): void {
  if (!runtimeState.activeAudienceModal || !runtimeState.draftAudienceConfig) {
    return;
  }

  params.state.audienceConfig = {
    cities: runtimeState.draftAudienceConfig.cities.length
      ? runtimeState.draftAudienceConfig.cities
      : params.state.audienceConfig.cities,
    ageRange: runtimeState.draftAudienceConfig.ageRange,
    profileTags: runtimeState.draftAudienceConfig.profileTags,
    exclusions: runtimeState.draftAudienceConfig.exclusions.length
      ? runtimeState.draftAudienceConfig.exclusions
      : params.state.audienceConfig.exclusions,
    interests: runtimeState.draftAudienceConfig.interests.length
      ? runtimeState.draftAudienceConfig.interests
      : params.state.audienceConfig.interests,
    matchingMode: params.state.audienceConfig.matchingMode,
    expansionEnabled: params.state.audienceConfig.expansionEnabled,
    profilePriority: params.state.audienceConfig.profilePriority,
    interestsPriority: params.state.audienceConfig.interestsPriority,
  };
  params.persistState(params.state);
  params.syncBuilder(params.state);
  params.showToast({
    title: 'Аудитория обновлена',
    description: 'Изменения сохранены в настройках таргетинга.',
  });
}
