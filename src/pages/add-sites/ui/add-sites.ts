import './add-sites.scss';
import {
  deletePartnerSite,
  listPartnerBlocks,
  listPartnerSites,
  partnerSiteStatusBadgeType,
  partnerSiteStatusRu,
  partnerSiteToggleChecked,
  partnerSiteToggleEditable,
} from 'features/sites';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import { bindTableRowSearch } from 'shared/lib/table-row-search';
import { REQUEST_ERROR_EVENT_NAME } from 'widgets/request-error-modal';
import {
  initCampaignDeleteModal,
  OPEN_CAMPAIGN_DELETE_MODAL_EVENT,
  type CampaignDeleteModalDetail,
} from 'widgets/ads-delete-modal';
import addSitesTemplate from './add-sites.hbs';
import { bindPartnerSiteStatusModal } from './add-sites-status-flow';

export async function renderAddSitesPage(): Promise<string> {
  let sites: Array<{
    id: number;
    domain: string;
    site_name: string;
    created_at: string;
    updated_at?: string;
    /** Код статуса с API (для переключателя и data-атрибутов). */
    statusCode: string;
    /** Статус сайта на русском. */
    status: string;
    /** Плашка как на ads: draft | pending | working | … */
    statusType: string;
    enabled: boolean;
    listingToggleDisabled: boolean;
    blocksCount: number;
    activeBlocksCount: number;
  }> = [];

  try {
    const { sites: apiSites } = await listPartnerSites();
    sites = await Promise.all(
      apiSites.map(async (s) => {
        const statusCode = s.status?.trim() || 'draft';
        const blocks = await listPartnerBlocks(s.id)
          .then((response) => response.blocks)
          .catch(() => []);
        return {
          id: s.id,
          domain: s.domain,
          site_name: s.site_name,
          created_at: s.created_at,
          updated_at: s.updated_at,
          statusCode,
          status: partnerSiteStatusRu(statusCode),
          statusType: partnerSiteStatusBadgeType(statusCode),
          enabled: partnerSiteToggleChecked(statusCode),
          listingToggleDisabled: !partnerSiteToggleEditable(statusCode),
          blocksCount: blocks.length,
          activeBlocksCount: blocks.filter((block) => block.status === 'active')
            .length,
        };
      }),
    );
  } catch (err) {
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : 'Список сайтов временно недоступен. Попробуйте обновить страницу.';
    window.dispatchEvent(
      new CustomEvent(REQUEST_ERROR_EVENT_NAME, {
        detail: {
          title: 'Не удалось загрузить сайты',
          message,
          note: 'Как только сервис снова станет доступен, обновите страницу — список подтянется автоматически.',
        },
      }),
    );
  }

  return await renderTemplate(addSitesTemplate, {
    activeSitesCount: sites.filter((site) => site.statusCode === 'active')
      .length,
    blocksCount: sites.reduce((total, site) => total + site.blocksCount, 0),
    hasSites: sites.length > 0,
    pendingSitesCount: sites.filter(
      (site) => site.statusCode === 'pending_review',
    ).length,
    sites,
  });
}

/**
 * Кнопка «Добавить сайт», поиск по списку на странице.
 */
export function AddSites(): void | VoidFunction {
  const controller = new AbortController();
  const { signal } = controller;

  initCampaignDeleteModal(signal, {
    onConfirm: async (detail: CampaignDeleteModalDetail) => {
      try {
        await deletePartnerSite(detail.id);
        const { renderRoute } = await import('app/router');
        await renderRoute();
      } catch (err) {
        const message =
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Не удалось удалить сайт. Попробуйте снова.';
        window.dispatchEvent(
          new CustomEvent(REQUEST_ERROR_EVENT_NAME, {
            detail: {
              title: 'Ошибка удаления',
              message,
            },
          }),
        );
        throw new Error('delete failed');
      }
    },
  });

  const buttons = document.querySelectorAll<HTMLButtonElement>(
    '[data-add-site-action]',
  );
  buttons.forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        navigateTo('/partner/sites/create');
      },
      { signal },
    );
  });

  bindTableRowSearch({
    inputId: 'sites-search',
    rowSelector: '.add-sites-page .campaigns-table__body .campaign-row',
    signal,
    hideNonMatching: true,
    buildSearchText: (row) =>
      [
        row.dataset.siteName || '',
        row.dataset.siteDomain || '',
        row.dataset.siteStatusLabel || '',
        row.textContent || '',
      ].join(' '),
  });

  const pageRoot = document.querySelector('[data-add-sites-page]');
  pageRoot?.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const button = target.closest<HTMLButtonElement>('[data-site-delete]');
      if (!button) {
        return;
      }
      openSiteDeleteModal(button);
    },
    { signal },
  );

  bindPartnerSiteStatusModal(signal);

  return () => {
    controller.abort();
  };
}

function openSiteDeleteModal(button: HTMLButtonElement): void {
  const row = button.closest<HTMLElement>('[data-site-id]');
  const idAttr = row?.getAttribute('data-site-id');
  const siteId = idAttr != null ? Number(idAttr) : NaN;
  if (!Number.isFinite(siteId) || siteId <= 0) {
    return;
  }

  const nameCell = row?.querySelector('.campaign-row__name');
  const siteLabel =
    nameCell?.textContent?.trim() ||
    row?.querySelector('.campaign-row__composition')?.textContent?.trim() ||
    'сайт';

  document.dispatchEvent(
    new CustomEvent(OPEN_CAMPAIGN_DELETE_MODAL_EVENT, {
      detail: {
        id: siteId,
        title: siteLabel,
        headingText: 'Удалить сайт',
        bodyText: `Сайт «${siteLabel}» будет удалён из списка. Это действие нельзя отменить.`,
        noteText:
          'После удаления сайт нельзя будет восстановить в этом разделе.',
      } satisfies CampaignDeleteModalDetail,
    }),
  );
}
