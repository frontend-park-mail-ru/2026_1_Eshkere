import { navigateTo } from 'app/navigation';
import {
  createLocalStorageKey,
  LocalStorageKey,
  localStorageService,
} from 'shared/lib/local-storage';
import { renderElement } from 'shared/lib/render';
import { OPEN_CAMPAIGN_DELETE_MODAL_EVENT } from 'widgets/ads-delete-modal/ui/delete-modal';
import adsActionMenuTemplate from 'pages/ads/ui/ads-action-menu.hbs';

export function initCampaignActionMenus(signal: AbortSignal): void {
  const triggerButtons = Array.from(
    document.querySelectorAll<HTMLElement>('.js-campaign-actions-trigger'),
  );
  const editButtons = Array.from(
    document.querySelectorAll<HTMLElement>('.js-edit-action-trigger'),
  );
  const deleteButtons = Array.from(
    document.querySelectorAll<HTMLElement>('.js-delete-action-trigger'),
  );

  if (!triggerButtons.length && !editButtons.length && !deleteButtons.length) {
    return;
  }

  const ensureMenu = (trigger: HTMLElement): HTMLElement | null => {
    const actions = trigger.closest<HTMLElement>('.campaign-row__actions');

    if (!actions) {
      return null;
    }

    const existing = actions.querySelector<HTMLElement>('.campaign-row__menu');
    if (existing) {
      return existing;
    }

    const menu = renderElement(adsActionMenuTemplate);
    actions.appendChild(menu);
    return menu;
  };

  const closeAll = (): void => {
    document
      .querySelectorAll<HTMLElement>('.campaign-row__menu')
      .forEach((menu) => {
        menu.hidden = true;
      });

    triggerButtons.forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
    });
  };

  const navigateToEdit = (target: Element): void => {
    const row = target.closest<HTMLElement>('.campaign-row');

    const campaignId = Number(row?.dataset.campaignId || '0');
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      return;
    }

    localStorageService.setJson(LocalStorageKey.CampaignEditSeed, {
      id: String(campaignId),
      title: row?.dataset.campaignTitle || '',
      budgetValue: Number(row?.dataset.campaignBudgetValue || '0'),
      goal: row?.dataset.campaignGoal || '',
    });
    localStorageService.removeItem(
      createLocalStorageKey(
        LocalStorageKey.CampaignEditBuilderState,
        String(campaignId),
      ),
    );

    navigateTo('/ads/edit');
  };

  const navigateToStatistics = (target: Element): void => {
    const row = target.closest<HTMLElement>('.campaign-row');

    if (row) {
      localStorageService.setJson(LocalStorageKey.CampaignStatisticsSeed, {
        id: row.dataset.campaignId || '',
        title: row.dataset.campaignTitle || '',
        budgetValue: Number(row.dataset.campaignBudgetValue || '0'),
        goal: row.dataset.campaignGoal || '',
      });
    }

    navigateTo('/ads/statistics');
  };

  const openDeleteModal = (target: Element): void => {
    const row = target.closest<HTMLElement>('.campaign-row');
    if (!row) {
      return;
    }

    const id = Number(row.dataset.campaignId || '0');
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }

    document.dispatchEvent(
      new CustomEvent(OPEN_CAMPAIGN_DELETE_MODAL_EVENT, {
        detail: {
          id,
          title: row.dataset.campaignTitle || 'кампания',
        },
      }),
    );
  };

  triggerButtons.forEach((button) => {
    ensureMenu(button);
    button.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        const menu = ensureMenu(button);
        if (!menu) {
          return;
        }

        const willOpen = menu.hidden;
        closeAll();
        menu.hidden = !willOpen;
        button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      },
      { signal },
    );
  });

  deleteButtons.forEach((button) => {
    button.querySelector('.campaign-row__action-button-label')?.remove();

    button.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeAll();
        openDeleteModal(button);
      },
      { signal },
    );
  });

  editButtons.forEach((button) => {
    button.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeAll();
        navigateToEdit(button);
      },
      { signal },
    );
  });

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const menuItem = target.closest<HTMLElement>('.campaign-row__menu-item');
      if (!menuItem) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeAll();

      if (menuItem.classList.contains('js-edit-menu-item')) {
        navigateToEdit(menuItem);
        return;
      }

      if (menuItem.classList.contains('js-statistics-menu-item')) {
        navigateToStatistics(menuItem);
        return;
      }

      if (menuItem.classList.contains('js-delete-menu-item')) {
        openDeleteModal(menuItem);
      }
    },
    { signal },
  );

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest('.campaign-row__actions')) {
        return;
      }

      closeAll();
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        closeAll();
      }
    },
    { signal },
  );
}
