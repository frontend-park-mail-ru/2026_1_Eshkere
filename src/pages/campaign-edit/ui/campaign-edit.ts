import './campaign-edit.scss';
import { renderTemplate } from 'shared/lib/render';
import { initCampaignEditCtaSelect } from 'widgets/campaign-edit-cta';
import { createCampaignEditDeleteModalController, initCampaignEditDeleteModal } from 'widgets/campaign-edit-delete';
import { createCampaignEditToastController } from 'widgets/campaign-edit-toast';
import campaignEditTemplate from './campaign-edit.hbs';
import { getCampaignEditState, getCtaLabel } from './campaign-edit-state';
import { syncCampaignEdit } from './campaign-edit-sync';
import { bindDeleteAction, bindEditableFields, bindSaveAction, bindToolbarActions } from './campaign-edit-bindings';
import { toTemplateContext } from './campaign-edit-view-model';

import type { CtaKey } from './campaign-edit-types';

let campaignEditLifecycleController: AbortController | null = null;

export async function renderCampaignEditPage(): Promise<string> {
  return renderTemplate(campaignEditTemplate, toTemplateContext(getCampaignEditState()));
}

export function CampaignEdit(): void | VoidFunction {
  const root = document.querySelector<HTMLElement>('[data-campaign-edit-page]');
  if (!root) {
    return;
  }

  if (campaignEditLifecycleController) {
    campaignEditLifecycleController.abort();
  }

  const controller = new AbortController();
  campaignEditLifecycleController = controller;
  const { signal } = controller;

  const state = getCampaignEditState();
  let dirty = false;

  const deleteModal = createCampaignEditDeleteModalController();
  const toast = createCampaignEditToastController();

  const markDirty = (): void => {
    dirty = true;
    syncCampaignEdit(state, dirty);
  };

  initCampaignEditDeleteModal(signal, deleteModal.close);
  bindToolbarActions(state, signal, deleteModal);
  bindDeleteAction(state, signal, deleteModal);
  bindEditableFields(state, signal, markDirty);

  document.querySelector<HTMLElement>('[data-edit-toast-close]')?.addEventListener('click', toast.hide, { signal });

  initCampaignEditCtaSelect<CtaKey>({
    getLabel: getCtaLabel,
    onChange: (nextValue) => {
      state.cta = nextValue;
      markDirty();
    },
    signal,
  });

  bindSaveAction(state, signal, () => {
    dirty = false;
    syncCampaignEdit(state, dirty);
  });

  syncCampaignEdit(state, dirty);

  return () => {
    if (campaignEditLifecycleController === controller) {
      campaignEditLifecycleController = null;
    }
    toast.hide();
    controller.abort();
  };
}
