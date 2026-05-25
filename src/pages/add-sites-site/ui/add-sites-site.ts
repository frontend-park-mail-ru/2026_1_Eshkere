import './add-sites-site.scss';
import {
  deletePartnerBlock,
  deletePartnerSite,
  getPartnerBlockEmbed,
  getPartnerSite,
  listPartnerBlocks,
  partnerBlockStatusBadgeType,
  partnerBlockStatusRu,
  partnerBlockToggleChecked,
  partnerSiteStatusBadgeType,
  partnerSiteStatusRu,
  updatePartnerSite,
} from 'features/sites';
import { renderTemplate } from 'shared/lib/render';
import { showToast } from 'shared/lib/toast';
import { REQUEST_ERROR_EVENT_NAME } from 'widgets/request-error-modal';
import {
  initCampaignDeleteModal,
  OPEN_CAMPAIGN_DELETE_MODAL_EVENT,
  type CampaignDeleteModalDetail,
} from 'widgets/ads-delete-modal';
import {
  bindModalShell,
  closeModal,
  openModal,
} from 'shared/ui/modal/modal';
import template from './add-sites-site.hbs';
import { bindPartnerBlockStatusModal } from './add-sites-site-block-status-flow';


function readSiteIdFromQuery(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = new URLSearchParams(window.location.search).get('siteId');
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function renderAddSitesSitePage(): Promise<string> {
  const siteId = readSiteIdFromQuery();
  if (siteId == null) {
    return await renderTemplate(template, {
      siteId: null,
      site_name: '',
      site_domain: '',
      siteStatus: '',
      siteStatusType: '',
      loadError: 'Не указан сайт. Вернитесь к списку площадок и выберите сайт.',
      hasBlocks: false,
      blocks: [],
    });
  }

  let site_name = '';
  let site_domain = '';
  let siteStatus = '';
  let siteStatusType = '';
  let loadError = '';
  let blocks: Array<{
    id: number;
    name: string;
    block_type_label: string;
    block_status: string;
    status_label: string;
    block_status_badge_type: string;
    block_toggle_checked: boolean;
  }> = [];

  try {
    const [site, list] = await Promise.all([
      getPartnerSite(siteId),
      listPartnerBlocks(siteId),
    ]);
    site_name = site.site_name;
    site_domain = site.domain;
    siteStatus = partnerSiteStatusRu(site.status);
    siteStatusType = partnerSiteStatusBadgeType(site.status);
    blocks = list.blocks.map((b) => {
      const block_status = (b.status ?? '').trim().toLowerCase() || 'inactive';
      return {
        id: b.id,
        name: b.name,
        block_type_label: b.block_type,
        block_status,
        status_label: partnerBlockStatusRu(block_status),
        block_status_badge_type: partnerBlockStatusBadgeType(block_status),
        block_toggle_checked: partnerBlockToggleChecked(block_status),
      };
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : 'Не удалось загрузить данные площадки.';
    loadError = message;
    window.dispatchEvent(
      new CustomEvent(REQUEST_ERROR_EVENT_NAME, {
        detail: {
          title: 'Ошибка загрузки',
          message,
        },
      }),
    );
  }

  return await renderTemplate(template, {
    siteId,
    site_name,
    site_domain,
    siteStatus: loadError ? '' : siteStatus,
    siteStatusType: loadError ? '' : siteStatusType,
    loadError,
    hasBlocks: blocks.length > 0,
    blocks,
  });
}

export function AddSitesSite(): void | VoidFunction {
  const root = document.querySelector<HTMLElement>('[data-add-sites-site]');
  if (!root) {
    return;
  }

  const modal = document.getElementById('add-sites-block-embed-modal');
  const snippetEl = document.querySelector<HTMLElement>('#ass-embed-snippet');
  const subtitleEl = document.querySelector<HTMLElement>('[data-embed-modal-subtitle]');

  const controller = new AbortController();
  const { signal } = controller;

  const sitePageId = root.dataset.sitePageId;
  const siteIdNum = sitePageId != null ? Number(sitePageId) : NaN;

  bindPartnerBlockStatusModal(signal, siteIdNum);

  // --- Редактирование сайта ---
  const editModal = document.getElementById('add-sites-site-edit-modal');
  const editForm = document.getElementById('add-sites-site-edit-form');
  if (editModal instanceof HTMLElement) {
    bindModalShell(editModal, signal);
  }

  root.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-site-edit]')) return;
      const nameInput = editForm?.querySelector<HTMLInputElement>('[name="site_name"]');
      const domainInput = editForm?.querySelector<HTMLInputElement>('[name="domain"]');
      if (nameInput) nameInput.value = document.querySelector<HTMLElement>('.add-sites-site__title')?.textContent?.trim() ?? '';
      if (domainInput) domainInput.value = document.querySelector<HTMLElement>('.add-sites-site__domain')?.textContent?.trim() ?? '';
      if (editModal instanceof HTMLElement) openModal(editModal);
    },
    { signal },
  );

  editForm?.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();
      if (!Number.isFinite(siteIdNum) || siteIdNum <= 0) return;
      const errorEl = editForm.querySelector<HTMLElement>('[data-form-error]');
      const submitBtn = editForm.querySelector<HTMLButtonElement>('[type="submit"]');
      const nameInput = editForm.querySelector<HTMLInputElement>('[name="site_name"]');
      const domainInput = editForm.querySelector<HTMLInputElement>('[name="domain"]');
      const siteName = nameInput?.value.trim() ?? '';
      const domain = domainInput?.value.trim() ?? '';
      if (!siteName && !domain) return;
      if (errorEl) errorEl.hidden = true;
      if (submitBtn) submitBtn.disabled = true;
      try {
        await updatePartnerSite(siteIdNum, {
          site_name: siteName || undefined,
          domain: domain || undefined,
        });
        if (editModal instanceof HTMLElement) closeModal(editModal);
        const { renderRoute } = await import('app/router');
        await renderRoute();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось сохранить изменения.';
        if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    },
    { signal },
  );

  // --- Удаление сайта ---
  const siteDeleteModal = document.getElementById('add-sites-site-delete-modal');
  const siteDeleteNameEl = siteDeleteModal?.querySelector<HTMLElement>('[data-site-delete-name]');

  root.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-site-delete]')) return;
      const siteName = document.querySelector<HTMLElement>('.add-sites-site__title')?.textContent?.trim() ?? '';
      if (siteDeleteNameEl) siteDeleteNameEl.textContent = siteName;
      if (siteDeleteModal instanceof HTMLElement) openModal(siteDeleteModal);
    },
    { signal },
  );

  siteDeleteModal?.querySelector('[data-site-delete-cancel]')?.addEventListener(
    'click',
    () => { if (siteDeleteModal instanceof HTMLElement) closeModal(siteDeleteModal); },
    { signal },
  );

  siteDeleteModal?.querySelector('[data-site-delete-confirm]')?.addEventListener(
    'click',
    async () => {
      if (!Number.isFinite(siteIdNum) || siteIdNum <= 0) return;
      const confirmBtn = siteDeleteModal.querySelector<HTMLButtonElement>('[data-site-delete-confirm]');
      if (confirmBtn) confirmBtn.disabled = true;
      try {
        await deletePartnerSite(siteIdNum);
        if (siteDeleteModal instanceof HTMLElement) {
          closeModal(siteDeleteModal);
        }
        const { navigateTo } = await import('shared/lib/navigation');
        navigateTo('/partner/sites', { replace: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось удалить сайт.';
        window.dispatchEvent(new CustomEvent(REQUEST_ERROR_EVENT_NAME, { detail: { title: 'Ошибка удаления', message } }));
        if (siteDeleteModal instanceof HTMLElement) closeModal(siteDeleteModal);
      } finally {
        if (confirmBtn) confirmBtn.disabled = false;
      }
    },
    { signal },
  );

  initCampaignDeleteModal(signal, {
    onConfirm: async (detail: CampaignDeleteModalDetail) => {
      if (!Number.isFinite(siteIdNum) || siteIdNum <= 0) {
        return;
      }
      try {
        await deletePartnerBlock(siteIdNum, detail.id);
        const { renderRoute } = await import('app/router');
        await renderRoute();
      } catch (err) {
        const message =
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Не удалось удалить блок.';
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

  if (modal instanceof HTMLElement) {
    bindModalShell(modal, signal);
  }

  async function openEmbedModal(blockName: string, blockId: number): Promise<void> {
    if (subtitleEl) {
      subtitleEl.textContent = `Блок «${blockName}»`;
    }
    if (snippetEl) {
      snippetEl.textContent = 'Загружаем…';
    }
    if (modal instanceof HTMLElement) {
      openModal(modal);
    }

    if (!Number.isFinite(siteIdNum) || siteIdNum <= 0 || !Number.isFinite(blockId) || blockId <= 0) {
      if (snippetEl) snippetEl.textContent = '— нет данных —';
      return;
    }

    try {
      const embed = await getPartnerBlockEmbed(siteIdNum, blockId);
      if (snippetEl) {
        snippetEl.textContent = embed.html_snippet;
      }
    } catch {
      if (snippetEl) snippetEl.textContent = '— не удалось загрузить код —';
      showToast('Ошибка', 'Не удалось загрузить код блока.', 'error', 3000);
    }
  }

  root.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement | null;
      const getCodeBtn = target?.closest<HTMLButtonElement>('[data-block-get-code]');
      if (getCodeBtn) {
        event.preventDefault();
        const name = getCodeBtn.dataset.blockName?.trim() || 'Блок';
        const blockId = Number(getCodeBtn.dataset.blockId ?? '');
        void openEmbedModal(name, blockId);
        return;
      }
      if (target?.closest('[data-placeholder-action]')) {
        event.preventDefault();
        showToast('Скоро', 'Раздел в разработке.', 'warning', 2400);
        return;
      }
      const delBtn = target?.closest<HTMLButtonElement>('[data-block-delete]');
      if (delBtn) {
        event.preventDefault();
        openBlockDeleteModal(delBtn);
      }
    },
    { signal },
  );

  root.addEventListener(
    'click',
    async (event) => {
      const target = event.target as HTMLElement | null;
      const btn = target?.closest<HTMLButtonElement>('[data-block-embed-copy]');
      if (!btn) {
        return;
      }
      const sel = btn.dataset.blockEmbedCopy;
      if (!sel) {
        return;
      }
      const node = document.querySelector<HTMLElement>(sel);
      const text = node?.textContent ?? '';
      if (!text) {
        showToast('Пусто', 'Нет текста для копирования.', 'error', 2000);
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast('Скопировано', '', 'success', 1800);
      } catch {
        showToast('Ошибка', 'Не удалось скопировать в буфер.', 'error', 2600);
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !(modal instanceof HTMLElement)) {
        return;
      }
      if (modal.getAttribute('aria-hidden') !== 'false') {
        return;
      }
      closeModal(modal);
    },
    { signal },
  );

  return () => {
    controller.abort();
  };
}

function openBlockDeleteModal(button: HTMLButtonElement): void {
  const row = button.closest<HTMLElement>('[data-block-id]');
  const idAttr = row?.getAttribute('data-block-id');
  const blockId = idAttr != null ? Number(idAttr) : NaN;
  if (!Number.isFinite(blockId) || blockId <= 0) {
    return;
  }

  const nameEl = row?.querySelector('.add-sites-site__block-name');
  const blockLabel = nameEl?.textContent?.trim() || 'блок';

  document.dispatchEvent(
    new CustomEvent(OPEN_CAMPAIGN_DELETE_MODAL_EVENT, {
      detail: {
        id: blockId,
        title: blockLabel,
        headingText: 'Удалить блок',
        bodyText: `Блок «${blockLabel}» будет удалён. Это действие нельзя отменить.`,
        noteText: 'После удаления блок нельзя будет восстановить в этом разделе.',
      } satisfies CampaignDeleteModalDetail,
    }),
  );
}
