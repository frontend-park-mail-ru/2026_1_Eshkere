import './add-sites.scss';
import {
  getSites,
  partnerSiteStatusBadgeVariant,
  partnerSiteStatusLabelRu,
  setSiteListingEnabled,
} from 'features/sites';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import addSitesTemplate from './add-sites.hbs';

export async function renderAddSitesPage(): Promise<string> {
  const sites = getSites().map((s) => ({
    ...s,
    statusType: partnerSiteStatusBadgeVariant(s.status),
    statusLabel: partnerSiteStatusLabelRu(s.status),
    enabled: s.listing_enabled,
  }));

  return await renderTemplate(addSitesTemplate, {
    hasSites: sites.length > 0,
    sites,
  });
}

/**
 * Кнопка «Добавить сайт», поиск по списку (localStorage).
 */
export function AddSites(): void | VoidFunction {
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    '[data-add-site-action]',
  );
  if (buttons.length === 0) {
    return;
  }

  const controller = new AbortController();
  const { signal } = controller;

  buttons.forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        navigateTo('/add-sites/create');
      },
      { signal },
    );
  });

  const search = document.getElementById('sites-search');
  const tbody = document.querySelector<HTMLElement>(
    '.add-sites-page .campaigns-table__body',
  );

  function applySitesSearch(): void {
    if (!(search instanceof HTMLInputElement) || !tbody) {
      return;
    }

    const q = search.value.trim().toLowerCase();
    tbody.querySelectorAll<HTMLElement>('.campaign-row').forEach((row) => {
      const text = row.textContent?.toLowerCase() ?? '';
      row.hidden = Boolean(q) && !text.includes(q);
    });
  }

  search?.addEventListener('input', applySitesSearch, { signal });

  const pageRoot = document.querySelector('[data-add-sites-page]');
  pageRoot?.addEventListener(
    'change',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
        return;
      }
      if (!target.closest('.toggle')) {
        return;
      }
      const row = target.closest('.campaign-row');
      const idAttr = row?.getAttribute('data-site-id');
      if (idAttr == null) {
        return;
      }
      const siteId = Number(idAttr);
      if (Number.isNaN(siteId)) {
        return;
      }
      setSiteListingEnabled(siteId, target.checked);
    },
    { signal },
  );

  return () => {
    controller.abort();
  };
}