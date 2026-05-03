import './add-sites-block.scss';
import { renderTemplate } from 'shared/lib/render';
import { showToast } from 'shared/lib/toast';
import { renderFormField } from 'shared/ui/form-field/form-field';
import { setFieldState, validatePartnerBlockName } from 'shared/validators';
import template from './add-sites-block.hbs';

const BLOCK_TYPE_LABELS: Record<string, string> = {
  banner: 'Баннер',
  fullscreen: 'Полноэкранный',
  floor_ad: 'Floor Ad',
  top_ad: 'Top Ad',
  feed: 'Лента',
  in_image: 'In-Image',
};

/** Примеры под поля dto.PartnerBlockEmbedResponse (до подстановки реальных значений из API). */
const EMBED_SDK_SAMPLE = [
  '<!-- PartnerBlockEmbedResponse.script_url — URL фронтового ad-sdk.js -->',
  '<script src="https://cdn.eshkere.example/ad-sdk.js" async></script>',
].join('\n');

const STEP_SUBTITLES: Record<1 | 2, string> = {
  1: 'Выберите тип блока и укажите название.',
  2: 'Скопируйте примеры вставки по полям ответа API.',
};

const EMBED_SNIPPET_SAMPLE = [
  '<!-- PartnerBlockEmbedResponse.html_snippet — разметка data-eshkere-ad + script -->',
  '<div data-eshkere-ad data-embed-token="<embed_token из ответа>"></div>',
  '<script>',
  '  // инициализация блока (фрагмент из html_snippet)',
  '</script>',
  '',
  '<!-- PartnerBlockEmbedResponse.iframe_url — при необходимости вставьте iframe с этим src -->',
  '<!-- <iframe src="…" title="EshkeReklama" loading="lazy"></iframe> -->',
].join('\n');

function formatBlockDefaultName(type: string): string {
  const label = BLOCK_TYPE_LABELS[type] ?? type;
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${label} (${dd}.${mm}.${yyyy})`;
}

export async function renderAddSitesBlockPage(): Promise<string> {
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

  return await renderTemplate(template, { blockNameField });
}

export function AddSitesBlock(): void | VoidFunction {
  const root = document.querySelector<HTMLElement>('[data-add-sites-block]');
  if (!root) {
    return;
  }

  const form = root.querySelector<HTMLFormElement>('#add-sites-block-form');
  const blockNameItem = form?.elements.namedItem('block_name');
  if (!form || !(blockNameItem instanceof HTMLInputElement)) {
    return;
  }
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
    sdkCodeEl.textContent = EMBED_SDK_SAMPLE;
  }
  if (snippetCodeEl) {
    snippetCodeEl.textContent = EMBED_SNIPPET_SAMPLE;
  }

  const nextBtn = pageRoot.querySelector<HTMLButtonElement>('[data-asb-next]');
  const createBtn = pageRoot.querySelector<HTMLButtonElement>('[data-asb-create]');
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
    });

    nextBtn?.toggleAttribute('hidden', step !== 1);
    createBtn?.toggleAttribute('hidden', step !== 2);

    if (scrollTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (step === 2) {
      pageRoot.querySelector<HTMLElement>('#add-sites-block-embed')?.focus({
        preventScroll: true,
      });
    }
  }

  nextBtn?.addEventListener(
    'click',
    () => {
      if (!validateBlockName()) {
        blockNameInput.focus();
        return;
      }
      goToStep(2);
    },
    { signal },
  );

  createBtn?.addEventListener(
    'click',
    () => {
      showToast(
        'Создание блока',
        'Запрос к API будет подключён на следующем шаге.',
        'warning',
        3200,
      );
    },
    { signal },
  );

  pageRoot.querySelectorAll<HTMLButtonElement>('[data-asb-step-btn]').forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        const n = Number(btn.getAttribute('data-asb-step-btn'));
        if (n === 1) {
          goToStep(1);
        } else if (n === 2) {
          if (!validateBlockName()) {
            blockNameInput.focus();
            return;
          }
          goToStep(2);
        }
      },
      { signal },
    );
  });

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
        showToast('Не удалось скопировать', 'Разрешите доступ к буферу обмена или скопируйте вручную.', 'error', 3200);
      }
    },
    { signal },
  );

  return () => {
    controller.abort();
  };
}
