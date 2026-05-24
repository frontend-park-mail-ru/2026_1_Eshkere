import '../../../pages/add-sites-site/ui/add-sites-site.scss';
import {
  getPartnerBlock,
  updatePartnerBlockGeneral,
  updatePartnerBlockGeography,
  updatePartnerBlockSelfAd,
} from 'features/sites';
import { renderTemplate } from 'shared/lib/render';
import { showToast } from 'shared/lib/toast';
import template from './add-sites-block-edit.hbs';

const BLOCK_TYPE_LABELS: Record<string, string> = {
  banner: 'Баннер',
  fullscreen: 'Полноэкранный',
  floor_ad: 'Floor Ad',
  top_ad: 'Top Ad',
  feed: 'Лента',
  in_image: 'In-Image',
};

function readQueryParams(): { siteId: number | null; blockId: number | null } {
  const params = new URLSearchParams(window.location.search);
  const toId = (key: string) => {
    const n = Number(params.get(key));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return { siteId: toId('siteId'), blockId: toId('blockId') };
}

export async function renderAddSitesBlockEditPage(): Promise<string> {
  const { siteId, blockId } = readQueryParams();
  const backHref = siteId != null ? `/partner/sites/site?siteId=${siteId}` : '/partner/sites';

  if (siteId == null || blockId == null) {
    return renderTemplate(template, { siteId, blockId, backHref, loadError: 'Не указан блок или сайт.' });
  }

  try {
    const block = await getPartnerBlock(siteId, blockId);
    const g = block.general_settings;
    const geo = block.geography_settings;

    return renderTemplate(template, {
      siteId,
      blockId,
      backHref,
      blockName: block.name,
      blockType: BLOCK_TYPE_LABELS[block.block_type] ?? block.block_type,
      general: {
        isMaxIncome: g.cpm_strategy === 'max_income',
        isThemeLight: g.theme === 'light',
        isThemeDark: g.theme === 'dark',
        isCornerAuto: g.corner_mode === 'auto',
        isCornerRounded: g.corner_mode === 'rounded',
        isCornerSquare: g.corner_mode === 'square',
        isBorderAuto: g.border_mode === 'auto',
        isBorderEnabled: g.border_mode === 'enabled',
        isBorderDisabled: g.border_mode === 'disabled',
        isAmpDisabled: g.amp_mode === 'disabled',
        isAmpEnabled: g.amp_mode === 'enabled',
        isInterAuto: g.interscroller_mode === 'auto',
        isInterEnabled: g.interscroller_mode === 'enabled',
        isInterDisabled: g.interscroller_mode === 'disabled',
      },
      geography: {
        onlyConfigured: geo.only_configured,
        globalCpmv: geo.global_cpmv ?? '',
        rules: geo.rules.map((r) => ({
          geo_code: r.geo_code,
          is_enabled: r.is_enabled,
          cpmv: r.cpmv ?? '',
        })),
      },
      selfAd: { reserved: block.self_ad_settings.reserved },
    });
  } catch {
    return renderTemplate(template, { siteId, blockId, backHref, loadError: 'Не удалось загрузить данные блока.' });
  }
}

export function AddSitesBlockEdit(): void | VoidFunction {
  const root = document.querySelector<HTMLElement>('[data-add-sites-block-edit]');
  if (!root) return;

  const siteId = Number(root.dataset.siteId);
  const blockId = Number(root.dataset.blockId);
  if (!siteId || !blockId) return;

  const controller = new AbortController();
  const { signal } = controller;

  // Табы
  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((tab) => {
    tab.addEventListener(
      'click',
      () => {
        const name = tab.dataset.tab!;
        root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((t) => {
          t.classList.toggle('add-sites-block-edit__tab--active', t === tab);
          t.setAttribute('aria-selected', String(t === tab));
        });
        root.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => {
          panel.hidden = panel.dataset.panel !== name;
        });
      },
      { signal },
    );
  });

  function showResult(form: HTMLFormElement, ok: boolean, msg?: string): void {
    const errorEl = form.querySelector<HTMLElement>('[data-form-error]');
    const successEl = form.querySelector<HTMLElement>('[data-form-success]');
    if (ok) {
      if (successEl) successEl.hidden = false;
      if (errorEl) errorEl.hidden = true;
      setTimeout(() => { if (successEl) successEl.hidden = true; }, 3000);
    } else {
      if (errorEl) { errorEl.textContent = msg ?? 'Ошибка сохранения'; errorEl.hidden = false; }
      if (successEl) successEl.hidden = true;
    }
  }

  // Форма: Общие
  const generalForm = document.getElementById('block-general-form');
  generalForm?.addEventListener(
    'submit',
    async (e) => {
      e.preventDefault();
      const form = generalForm as HTMLFormElement;
      const el = form.elements as HTMLFormControlsCollection & Record<string, HTMLSelectElement>;
      const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await updatePartnerBlockGeneral(siteId, blockId, {
          cpm_strategy: el['cpm_strategy']?.value || undefined,
          theme: el['theme']?.value || undefined,
          corner_mode: el['corner_mode']?.value || undefined,
          border_mode: el['border_mode']?.value || undefined,
          amp_mode: el['amp_mode']?.value || undefined,
          interscroller_mode: el['interscroller_mode']?.value || undefined,
        });
        showResult(form, true);
        showToast('Сохранено', 'Общие настройки обновлены.', 'success', 2500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Не удалось сохранить.';
        showResult(form, false, msg);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    },
    { signal },
  );

  // Форма: География
  const geoForm = document.getElementById('block-geography-form');
  geoForm?.addEventListener(
    'submit',
    async (e) => {
      e.preventDefault();
      const form = geoForm as HTMLFormElement;
      const onlyConfigured = (form.querySelector<HTMLInputElement>('[name="only_configured"]'))?.checked ?? false;
      const ruleEls = form.querySelectorAll<HTMLElement>('[data-geo-code]');
      const rules = Array.from(ruleEls).map((el) => ({
        geo_code: el.dataset.geoCode!,
        is_enabled: (el.querySelector<HTMLInputElement>('[data-geo-enabled]'))?.checked ?? false,
        cpmv: (() => {
          const v = Number((el.querySelector<HTMLInputElement>('[data-geo-cpmv]'))?.value);
          return Number.isFinite(v) && v > 0 ? v : null;
        })(),
      }));
      const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await updatePartnerBlockGeography(siteId, blockId, { only_configured: onlyConfigured, rules });
        showResult(form, true);
        showToast('Сохранено', 'Настройки географии обновлены.', 'success', 2500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Не удалось сохранить.';
        showResult(form, false, msg);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    },
    { signal },
  );

  // Форма: Своя реклама
  const selfAdForm = document.getElementById('block-self-ad-form');
  selfAdForm?.addEventListener(
    'submit',
    async (e) => {
      e.preventDefault();
      const form = selfAdForm as HTMLFormElement;
      const reserved = (form.querySelector<HTMLInputElement>('[name="reserved"]'))?.checked ?? false;
      const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await updatePartnerBlockSelfAd(siteId, blockId, reserved);
        showResult(form, true);
        showToast('Сохранено', 'Настройки своей рекламы обновлены.', 'success', 2500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Не удалось сохранить.';
        showResult(form, false, msg);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    },
    { signal },
  );

  return () => controller.abort();
}
