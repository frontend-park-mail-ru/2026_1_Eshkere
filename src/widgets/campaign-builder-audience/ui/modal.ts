import { closeAudienceModal, createAudienceModalElements, createAudienceModalRuntimeState, openAudienceModal } from './modal-runtime';
import { handleAudienceModalSearch, handleAudienceModalSelectionChange, renderAudienceModal, saveAudienceModalDraft } from './modal-handlers';

import type { AudienceDetailKey } from 'features/campaign-builder/model/types';
import type { InitCampaignBuilderAudienceModalParams } from './modal-types';

export function initCampaignBuilderAudienceModal(params: InitCampaignBuilderAudienceModalParams): void {
  const elements = createAudienceModalElements();
  const runtimeState = createAudienceModalRuntimeState();

  document.querySelectorAll<HTMLElement>('[data-builder-audience-detail]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.builderAudienceDetail as AudienceDetailKey | undefined;
      if (!key || !elements.audienceModal) {
        return;
      }

      runtimeState.activeAudienceModal = key;
      renderAudienceModal(key, elements, runtimeState, params);
      openAudienceModal(elements, runtimeState);
    }, { signal: params.signal });
  });

  elements.audienceModalOptions?.addEventListener('change', () => {
    handleAudienceModalSelectionChange(elements, runtimeState, params);
  }, { signal: params.signal });

  elements.audienceModalSearch?.addEventListener('input', () => {
    handleAudienceModalSearch(elements, runtimeState, params);
  }, { signal: params.signal });

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-modal-close], [data-builder-audience-modal-cancel]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        closeAudienceModal(elements, runtimeState);
      }, { signal: params.signal });
    });

  elements.audienceModalSave?.addEventListener('click', () => {
    saveAudienceModalDraft(runtimeState, params);
    closeAudienceModal(elements, runtimeState);
  }, { signal: params.signal });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAudienceModal(elements, runtimeState);
    }
  }, { signal: params.signal });
}
