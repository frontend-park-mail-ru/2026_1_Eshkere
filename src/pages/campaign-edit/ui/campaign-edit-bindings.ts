import { navigateTo } from 'shared/lib/navigation';
import { deleteAdCampaign, updateAdCampaign } from 'features/ads';
import { LocalStorageKey, localStorageService } from 'shared/lib/local-storage';
import { createCampaignEditDeleteModalController } from 'widgets/campaign-edit-delete';

import { CAMPAIGN_EDIT_SEED_KEY, getCampaignEditStateStorageKey, getCtaLabel, persistCampaignEditState } from './campaign-edit-state';
import { buildSaveHistoryItem } from './campaign-edit-view-model';
import { getCampaignId, showCampaignEditRequestError } from './campaign-edit-request';

import type { CampaignEditState } from './campaign-edit-types';

const DELETE_ERROR_TITLE = 'Не удалось удалить кампанию';
const DELETE_ERROR_MESSAGE = 'Сейчас мы временно не можем удалить кампанию. Попробуйте повторить действие немного позже.';
const SAVE_ERROR_TITLE = 'Не удалось сохранить кампанию';
const SAVE_ERROR_MESSAGE = 'Сейчас мы временно не можем сохранить изменения в кампании. Попробуйте обновить страницу и повторить действие немного позже.';

export function bindEditableFields(
  state: CampaignEditState,
  signal: AbortSignal,
  markDirty: () => void,
): void {
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-edit-input]').forEach((field) => {
    const key = field.dataset.editInput;

    const update = (): void => {
      if (key === 'name') {
        state.name = field.value.trim();
      }
      if (key === 'headline') {
        state.headline = field.value.trim();
      }
      if (key === 'description') {
        state.description = field.value.trim();
      }
      if (key === 'dailyBudget') {
        const nextValue = Number(field.value);
        state.dailyBudget = Number.isFinite(nextValue) ? Math.max(1000, nextValue) : state.dailyBudget;
      }
      if (key === 'period') {
        state.period = field.value.trim();
      }

      markDirty();
    };

    field.addEventListener('input', update, { signal });
    field.addEventListener('change', update, { signal });
  });
}

export function bindToolbarActions(
  state: CampaignEditState,
  signal: AbortSignal,
  deleteModal: ReturnType<typeof createCampaignEditDeleteModalController>,
): void {
  document.querySelector<HTMLElement>('[data-edit-back]')?.addEventListener('click', () => {
    navigateTo('/ads');
  }, { signal });

  document.querySelector<HTMLElement>('[data-edit-duplicate]')?.addEventListener('click', () => {
    localStorageService.setJson(LocalStorageKey.CampaignBuilderDraft, {
      name: `${state.name} — копия`,
      headline: state.headline,
      description: state.description,
      cta: getCtaLabel(state.cta),
      link: 'https://eshke.ru/promo/spring',
      dailyBudget: state.dailyBudget,
      period: state.period,
    });
    navigateTo('/ads/create');
  }, { signal });

  document.querySelector<HTMLElement>('[data-edit-delete-open]')?.addEventListener('click', deleteModal.open, { signal });
  document.querySelector<HTMLElement>('[data-edit-delete-cancel]')?.addEventListener('click', deleteModal.close, { signal });
}

export function bindDeleteAction(
  state: CampaignEditState,
  signal: AbortSignal,
  deleteModal: ReturnType<typeof createCampaignEditDeleteModalController>,
): void {
  document.querySelector<HTMLElement>('[data-edit-delete-confirm]')?.addEventListener('click', async () => {
    const campaignId = getCampaignId(state);

    if (!campaignId) {
      showCampaignEditRequestError(DELETE_ERROR_TITLE, DELETE_ERROR_MESSAGE);
      return;
    }

    try {
      await deleteAdCampaign(campaignId);
      localStorageService.removeItem(getCampaignEditStateStorageKey());
      localStorageService.removeItem(CAMPAIGN_EDIT_SEED_KEY);
      deleteModal.close();
      navigateTo('/ads');
    } catch {
      showCampaignEditRequestError(DELETE_ERROR_TITLE, DELETE_ERROR_MESSAGE);
    }
  }, { signal });
}

export function bindSaveAction(
  state: CampaignEditState,
  signal: AbortSignal,
  onSaved: () => void,
): void {
  document.querySelector<HTMLElement>('[data-edit-save]')?.addEventListener('click', async () => {
    const campaignId = getCampaignId(state);

    if (!campaignId) {
      showCampaignEditRequestError(SAVE_ERROR_TITLE, SAVE_ERROR_MESSAGE);
      return;
    }

    try {
      await updateAdCampaign(campaignId, {
        name: state.name.trim(),
        daily_budget: Math.max(1000, Math.round(state.dailyBudget)),
      });

      state.updatedLabel = 'Только что';
      state.moderationBadge = 'На модерации после правок';
      state.history = [buildSaveHistoryItem(state), ...state.history].slice(0, 5);

      persistCampaignEditState(state);
      onSaved();
      navigateTo('/ads');
    } catch {
      showCampaignEditRequestError(SAVE_ERROR_TITLE, SAVE_ERROR_MESSAGE);
    }
  }, { signal });
}
