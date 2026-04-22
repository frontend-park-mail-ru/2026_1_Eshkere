import type { CampaignBuilderAudienceModalElements, CampaignBuilderAudienceModalRuntimeState } from './modal-types';

export function createAudienceModalElements(): CampaignBuilderAudienceModalElements {
  const audienceModalSearch = document.querySelector<HTMLInputElement>('[data-builder-audience-modal-search]');
  return {
    audienceModal: document.querySelector<HTMLElement>('[data-builder-audience-modal]'),
    audienceModalOptions: document.querySelector<HTMLElement>('[data-builder-audience-modal-options]'),
    audienceModalSave: document.querySelector<HTMLButtonElement>('[data-builder-audience-modal-save]'),
    audienceModalSearch,
    audienceModalSearchField: audienceModalSearch?.closest<HTMLElement>('.campaign-builder__modal-search') || null,
  };
}

export function createAudienceModalRuntimeState(): CampaignBuilderAudienceModalRuntimeState {
  return {
    activeAudienceModal: null,
    currentAudienceSearch: '',
    audienceModalCloseTimer: null,
    draftAudienceConfig: null,
  };
}

export function openAudienceModal(
  elements: CampaignBuilderAudienceModalElements,
  runtimeState: CampaignBuilderAudienceModalRuntimeState,
): void {
  if (!elements.audienceModal) {
    return;
  }

  if (runtimeState.audienceModalCloseTimer) {
    window.clearTimeout(runtimeState.audienceModalCloseTimer);
    runtimeState.audienceModalCloseTimer = null;
  }

  elements.audienceModal.hidden = false;
  elements.audienceModal.classList.remove('is-closing');
  requestAnimationFrame(() => {
    elements.audienceModal?.classList.add('is-open');
  });
}

export function closeAudienceModal(
  elements: CampaignBuilderAudienceModalElements,
  runtimeState: CampaignBuilderAudienceModalRuntimeState,
): void {
  runtimeState.activeAudienceModal = null;
  runtimeState.draftAudienceConfig = null;
  runtimeState.currentAudienceSearch = '';

  if (runtimeState.audienceModalCloseTimer) {
    window.clearTimeout(runtimeState.audienceModalCloseTimer);
    runtimeState.audienceModalCloseTimer = null;
  }

  elements.audienceModal?.classList.remove('is-open');
  elements.audienceModal?.classList.add('is-closing');
  runtimeState.audienceModalCloseTimer = window.setTimeout(() => {
    if (elements.audienceModalOptions) {
      elements.audienceModalOptions.innerHTML = '';
    }
    elements.audienceModal?.setAttribute('hidden', '');
    elements.audienceModal?.classList.remove('is-closing');
    runtimeState.audienceModalCloseTimer = null;
  }, 180);

  if (elements.audienceModalSearch) {
    elements.audienceModalSearch.value = '';
  }
  elements.audienceModalSearchField?.removeAttribute('hidden');
  if (elements.audienceModalSave) {
    elements.audienceModalSave.disabled = false;
  }
}
