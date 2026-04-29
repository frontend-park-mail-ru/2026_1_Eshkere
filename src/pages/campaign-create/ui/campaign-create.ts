import './campaign-create.scss';
import { navigateTo } from 'shared/lib/navigation';
import { createAdCampaign, updateAdCampaign } from 'features/ads';
import { renderTemplate } from 'shared/lib/render';
import {
  LocalStorageKey,
  localStorageService,
} from 'shared/lib/local-storage';
import { REQUEST_ERROR_EVENT_NAME } from 'widgets/request-error-modal';
import campaignCreateTemplate from './campaign-create.hbs';
import {
  FINAL_REVIEW_JUMP_TARGETS,
} from 'features/campaign-builder/model/config';
import {
  getBuilderMode,
  getBuilderModeConfig,
  getBuilderState,
  persistBuilderState,
  persistEditSeedFromState,
  resetBuilderState,
} from 'features/campaign-builder/model/state';
import type {
  BuilderState,
  FinalReviewCheckKey,
  StepKey,
} from 'features/campaign-builder/model/types';
import { initCampaignBuilderAudienceControls } from 'widgets/campaign-builder-audience';
import { initCampaignBuilderActions } from 'widgets/campaign-builder-actions';
import { initCampaignBuilderBudgetControls } from 'widgets/campaign-builder-budget';
import { initCampaignBuilderContentControls } from 'widgets/campaign-builder-content';
import { initCampaignBuilderStepControls } from 'widgets/campaign-builder-step';
import {
  cloneAudienceConfig,
  ensureAudiencePanelScaffold,
  formatSavedAudienceSummary,
  getAudienceModalConfig,
  getProfileSelectionState,
  getSavedAudiences,
  persistSavedAudiences,
  renderSavedAudiencesList,
} from './campaign-create-audience';
import {
  clampText,
  ensureBudgetPanelScaffold,
  formatBudgetPeriod,
  getSelectOptionDefaultMeta,
  getTemplateContext,
  validateBuilder,
} from './campaign-create-builder';
import {
  hideToast,
  moveStep,
  showToast,
  syncBuilder,
  syncSaveState,
} from './campaign-create-sync';

let campaignCreateLifecycleController: AbortController | null = null;

function enhanceAudienceSummaryCard(state: BuilderState): void {
  const combinedAudienceButton = document.querySelector<HTMLElement>(
    '[data-builder-audience-detail="profile"]',
  );

  if (!combinedAudienceButton) {
    return;
  }

  combinedAudienceButton.outerHTML = `
    <button class="campaign-builder__stack-item campaign-builder__stack-item--interactive" type="button" data-builder-audience-detail="age">
      <div>
        <strong class="campaign-builder__stack-title">Возрастной диапазон</strong>
        <p class="campaign-builder__stack-text" data-audience-age-range>${state.audienceConfig.ageRange}</p>
      </div>
      <span class="campaign-builder__pill" data-audience-age-pill>${state.audienceConfig.ageRange}</span>
    </button>

    <button class="campaign-builder__stack-item campaign-builder__stack-item--interactive" type="button" data-builder-audience-detail="profile">
      <div>
        <strong class="campaign-builder__stack-title">Профиль аудитории</strong>
        <p class="campaign-builder__stack-text" data-audience-profile>${state.audienceConfig.profileTags.join(', ')}</p>
      </div>
      <span class="campaign-builder__pill" data-audience-profile-count>${state.audienceConfig.profileTags.length} тега</span>
    </button>
  `;
}

function createSubmitBuilder() {
  return async (currentState: BuilderState): Promise<void> => {
    try {
      const mode = getBuilderMode();
      const payload = {
        name: currentState.name.trim(),
        daily_budget: Math.max(1000, Math.round(currentState.dailyBudget)),
      };

      if (mode === 'edit') {
        const seed = localStorageService.getJson<{ id?: string }>(
          LocalStorageKey.CampaignEditSeed,
        );
        const campaignId = Number(seed?.id || '0');

        if (!Number.isFinite(campaignId) || campaignId <= 0) {
          throw new Error('campaign id is required for edit mode');
        }

        await updateAdCampaign(campaignId, payload);
      } else {
        await createAdCampaign(payload);
      }

      localStorageService.removeItem(LocalStorageKey.CampaignBuilderDraft);
      navigateTo('/ads');
    } catch {
      window.dispatchEvent(
        new CustomEvent(REQUEST_ERROR_EVENT_NAME, {
          detail: {
            title: 'Не удалось создать кампанию',
            message:
              'Сейчас мы временно не можем сохранить новую кампанию. Попробуйте отправить ее немного позже.',
            note:
              'В этом разделе могут идти технические работы. После восстановления сервиса создание кампаний снова станет доступно.',
          },
        }),
      );
    }
  };
}

export async function renderCampaignCreatePage(): Promise<string> {
  return renderTemplate(
    campaignCreateTemplate,
    getTemplateContext(getBuilderState()),
  );
}

export function CampaignCreate(): void | VoidFunction {
  if (campaignCreateLifecycleController) {
    campaignCreateLifecycleController.abort();
  }

  const controller = new AbortController();
  campaignCreateLifecycleController = controller;
  const { signal } = controller;
  const state = getBuilderState();

  enhanceAudienceSummaryCard(state);
  ensureAudiencePanelScaffold(state);
  ensureBudgetPanelScaffold();

  const setStep = (step: StepKey): void => {
    state.step = step;
    persistBuilderState(state);
    syncBuilder(state);
  };

  const jumpToReviewSection = (key: FinalReviewCheckKey): void => {
    const target = FINAL_REVIEW_JUMP_TARGETS[key];
    if (!target) {
      return;
    }

    setStep(target.step);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const targetNode = document.querySelector<HTMLElement>(target.selector);
        if (!targetNode) {
          return;
        }

        targetNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
        targetNode.classList.remove('campaign-builder__jump-highlight');
        void targetNode.offsetWidth;
        targetNode.classList.add('campaign-builder__jump-highlight');

        window.setTimeout(() => {
          targetNode.classList.remove('campaign-builder__jump-highlight');
        }, 1400);

        const focusNode = target.focusSelector
          ? targetNode.querySelector<HTMLElement>(target.focusSelector)
          : null;

        if (focusNode) {
          focusNode.focus({ preventScroll: true });
        }
      });
    });
  };

  initCampaignBuilderStepControls({
    jumpToReviewSection,
    moveStep: (direction) => moveStep(state, direction),
    setStep,
    signal,
  });
  initCampaignBuilderContentControls({
    clampText,
    getSelectOptionDefaultMeta,
    persistState: persistBuilderState,
    showToast,
    signal,
    state,
    syncBuilder,
  });
  initCampaignBuilderAudienceControls({
    cloneAudienceConfig,
    formatSavedAudienceSummary,
    getAudienceModalConfig,
    getProfileSelectionState,
    getSavedAudiences,
    persistSavedAudiences,
    persistState: persistBuilderState,
    renderSavedAudiencesList,
    showToast,
    signal,
    state,
    syncBuilder,
  });
  initCampaignBuilderBudgetControls({
    formatBudgetPeriod,
    persistState: persistBuilderState,
    signal,
    state,
    syncBuilder,
  });
  initCampaignBuilderActions({
    getModeConfig: getBuilderModeConfig,
    hideToast,
    persistEditSeedFromState,
    persistState: persistBuilderState,
    resetState: resetBuilderState,
    setStep,
    showToast,
    signal,
    state,
    submitBuilder: createSubmitBuilder(),
    syncBuilder,
    syncSaveState,
    validateBuilder,
  });

  syncBuilder(state);

  return () => {
    if (campaignCreateLifecycleController === controller) {
      campaignCreateLifecycleController = null;
    }

    hideToast();
    controller.abort();
  };
}
