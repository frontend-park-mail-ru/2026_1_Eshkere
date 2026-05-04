import './add-sites-block.scss';
import { createPartnerBlock, getPartnerBlockEmbed } from 'features/sites';
import { renderTemplate } from 'shared/lib/render';
import { showToast } from 'shared/lib/toast';
import { renderFormField } from 'shared/ui/form-field/form-field';
import { setFieldState, validatePartnerBlockName } from 'shared/validators';
import { navigateTo } from 'shared/lib/navigation';
import template from './add-sites-block.hbs';

const BLOCK_TYPE_LABELS: Record<string, string> = {
  banner: 'Баннер',
  fullscreen: 'Полноэкранный',
  floor_ad: 'Floor Ad',
  top_ad: 'Top Ad',
  feed: 'Лента',
  in_image: 'In-Image',
};

const EMBED_SDK_SAMPLE = [
  '<!-- PartnerBlockEmbedResponse.script_url -->',
  '<script src="https://cdn.eshkere.example/ad-sdk.js" async></script>',
].join('\n');

const STEP_SUBTITLES: Record<1 | 2, string> = {
  1: 'Выберите тип блока и укажите название, затем нажмите «Создать блок».',
  2: 'Скопируйте код и вставьте на сайт. Когда закончите — «Готово».',
};

const EMBED_SNIPPET_SAMPLE = [
  '<!-- PartnerBlockEmbedResponse.html_snippet -->',
  '<div data-eshkere-ad data-embed-token="<token>"></div>',
].join('\n');

function readSiteIdFromQuery(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = new URLSearchParams(window.location.search).get('siteId');
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** После создания блока или «Назад» — на карточку сайта, если открыли с ?siteId= */
function addSitesBlockReturnHref(siteId: number | null): string {
  return siteId != null ? `/add-sites/site?siteId=${siteId}` : '/add-sites';
}

function formatBlockDefaultName(type: string): string {
  const label = BLOCK_TYPE_LABELS[type] ?? type;
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${label} (${dd}.${mm}.${yyyy})`;
}

export async function renderAddSitesBlockPage(): Promise<string> {
  const siteId = readSiteIdFromQuery();
  const backHref = addSitesBlockReturnHref(siteId);

  const blockNameField = await renderFormField({
    id: 'add-sites-block-name',
    name: 'block_name',
    type: 'text',
    label: 'Название',
    placeholder: 'Например: Лента главной страницы',
    required: true,
    autocomplete: 'off',
    maxlength: 120,
  });

  return await renderTemplate(template, { blockNameField, backHref });
}

export function AddSitesBlock(): void | VoidFunction {
  const root = document.querySelector<HTMLElement>('[data-add-sites-block]');
  if (!root) {
    return;
  }

  const formEl = root.querySelector<HTMLFormElement>('#add-sites-block-form');
  const blockNameItem = formEl?.elements.namedItem('block_name');
  if (!formEl || !(blockNameItem instanceof HTMLInputElement)) {
    return;
  }
  const form = formEl;
  const blockNameInput = blockNameItem;

  const radios = form.querySelectorAll<HTMLInputElement>(
    'input.block-type-card__input[name="block_type"]',
  );
  if (radios.length === 0) {
    return;
  }

  const pageRoot = root;
  const controller = new AbortController();
  const { signal } = controller;

  let nameTouched = false;

  function applyDefaultNameFromSelection(): void {
    const selected = form.querySelector<HTMLInputElement>(
      'input.block-type-card__input[name="block_type"]:checked',
    );
    if (!selected) {
      return;
    }
    blockNameInput.value = formatBlockDefaultName(selected.value);
  }

  function validateBlockName(): boolean {
    const error = validatePartnerBlockName(blockNameInput.value);
    setFieldState(form, 'block_name', error);
    return !error;
  }

  form.addEventListener('submit', (event) => event.preventDefault(), { signal });

  blockNameInput.addEventListener(
    'input',
    () => {
      nameTouched = true;
      validateBlockName();
    },
    { passive: true, signal },
  );

  radios.forEach((radio) => {
    radio.addEventListener(
      'change',
      () => {
        if (!nameTouched) {
          applyDefaultNameFromSelection();
          validateBlockName();
        }
      },
      { signal },
    );
  });

  if (!nameTouched) {
    applyDefaultNameFromSelection();
  }
  validateBlockName();

  const sdkCodeEl = pageRoot.querySelector<HTMLElement>('#asb-code-sdk');
  const snippetCodeEl = pageRoot.querySelector<HTMLElement>('#asb-code-snippet');
  if (sdkCodeEl) {
    sdkCodeEl.textContent = '';
  }
  if (snippetCodeEl) {
    snippetCodeEl.textContent = '';
  }

  const createBtn = pageRoot.querySelector<HTMLButtonElement>('[data-asb-create]');
  const doneBtn = pageRoot.querySelector<HTMLButtonElement>('[data-asb-done]');
  const subtitleEl = pageRoot.querySelector<HTMLElement>('[data-asb-subtitle]');

  function goToStep(step: 1 | 2, scrollTop = true): void {
    pageRoot.querySelectorAll<HTMLElement>('[data-asb-panel]').forEach((panel) => {
      const n = Number(panel.getAttribute('data-asb-panel'));
      if (n !== 1 && n !== 2) {
        return;
      }
      panel.toggleAttribute('hidden', n !== step);
    });

    if (subtitleEl) {
      subtitleEl.textContent = STEP_SUBTITLES[step];
    }

    pageRoot.querySelectorAll<HTMLElement>('[data-asb-hero-step]').forEach((el) => {
      const s = Number(el.dataset.asbHeroStep);
      el.classList.toggle('campaign-builder__step--active', s === step);
      el.classList.toggle('campaign-builder__step--complete', s < step);
      if (s === step) {
        el.setAttribute('aria-current', 'step');
      } else {
        el.removeAttribute('aria-current');
      }
    });

    createBtn?.toggleAttribute('hidden', step !== 1);
    doneBtn?.toggleAttribute('hidden', step !== 2);

    if (scrollTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (step === 2) {
      pageRoot.querySelector<HTMLElement>('#add-sites-block-embed')?.focus({
        preventScroll: true,
      });
    }
  }

  createBtn?.addEventListener(
    'click',
    () => {
      const btn = createBtn;
      if (!btn) {
        return;
      }
      void (async () => {
        if (!validateBlockName()) {
          blockNameInput.focus();
          return;
        }

        const siteId = readSiteIdFromQuery();
        if (siteId == null) {
          showToast(
            'Не указан сайт',
            'Сначала добавьте площадку или откройте эту страницу после создания сайта.',
            'error',
            4200,
          );
          return;
        }

        const typeInput = form.querySelector<HTMLInputElement>(
          'input.block-type-card__input[name="block_type"]:checked',
        );
        if (!typeInput?.value) {
          showToast('Тип блока', 'Выберите тип рекламного блока.', 'error', 2800);
          return;
        }

        const prevLabel = btn.textContent ?? '';
        btn.disabled = true;
        btn.textContent = 'Создание…';

        try {
          const block = await createPartnerBlock(siteId, {
            block_type: typeInput.value,
            name: blockNameInput.value.trim(),
          });

          let embed;
          try {
            embed = await getPartnerBlockEmbed(siteId, block.id);
          } catch {
            embed = null;
          }

          if (sdkCodeEl) {
            sdkCodeEl.textContent = embed
              ? [
                  '<!-- PartnerBlockEmbedResponse.script_url -->',
                  `<script src="${embed.script_url}" async></script>`,
                ].join('\n')
              : EMBED_SDK_SAMPLE;
          }
          if (snippetCodeEl) {
            snippetCodeEl.textContent = embed?.html_snippet ?? EMBED_SNIPPET_SAMPLE;
          }

          showToast(
            'Блок создан',
            embed ? 'Код для вставки ниже.' : 'Блок создан; код вставки — примерный.',
            embed ? 'success' : 'warning',
            3200,
          );

          goToStep(2);
        } catch (err) {
          const message =
            err instanceof Error && err.message.trim()
              ? err.message
              : 'Не удалось создать блок. Попробуйте снова.';
          showToast('Ошибка', message, 'error', 4200);
        } finally {
          btn.disabled = false;
          btn.textContent = prevLabel || 'Создать блок';
        }
      })();
    },
    { signal },
  );

  doneBtn?.addEventListener(
    'click',
    () => {
      navigateTo(addSitesBlockReturnHref(readSiteIdFromQuery()));
    },
    { signal },
  );

  goToStep(1, false);

  pageRoot.addEventListener(
    'click',
    async (event) => {
      const target = event.target as HTMLElement | null;
      const btn = target?.closest<HTMLButtonElement>('[data-asb-copy]');
      if (!btn) {
        return;
      }
      const sel = btn.dataset.asbCopy;
      if (!sel) {
        return;
      }
      const node = document.querySelector<HTMLElement>(sel);
      const text = node?.textContent ?? '';
      if (!text) {
        showToast('Нечего копировать', 'Фрагмент кода пуст.', 'error', 2200);
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast('Скопировано', 'Код помещён в буфер обмена.', 'success', 2200);
      } catch {
        showToast(
          'Не удалось скопировать',
          'Разрешите доступ к буферу обмена или скопируйте вручную.',
          'error',
          3200,
        );
      }
    },
    { signal },
  );

  return () => {
    controller.abort();
  };
}
