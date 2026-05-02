import './ad-create.scss';
import { createAdInGroup, type CreateAdRequest } from 'features/ads/api/ads';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import adCreateTemplate from './ad-create.hbs';

function getParams(): { campaignId: number | null; groupId: number | null } {
  const params = new URLSearchParams(window.location.search);
  const cId = parseInt(params.get('campaignId') ?? '', 10);
  const gId = parseInt(params.get('groupId') ?? '', 10);
  return {
    campaignId: Number.isFinite(cId) ? cId : null,
    groupId:    Number.isFinite(gId) ? gId : null,
  };
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url || 'example.com'; }
}

export async function renderAdCreatePage(): Promise<string> {
  return renderTemplate(adCreateTemplate, {});
}

export function AdCreate(): VoidFunction {
  const { campaignId, groupId } = getParams();
  const root = document.querySelector<HTMLElement>('[data-adc]');
  if (!root || !campaignId || !groupId) return () => {};

  const controller = new AbortController();
  const { signal } = controller;

  let currentFormat: 'feed' | 'stories' = 'feed';
  let selectedFile: File | null = null;

  // Назад
  root.querySelector<HTMLElement>('[data-adc-back]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign?id=${campaignId}`);
  }, { signal });

  const form         = root.querySelector<HTMLFormElement>('[data-adc-form]');
  const submitBtn    = root.querySelector<HTMLButtonElement>('[data-adc-submit]');
  const formError    = root.querySelector<HTMLElement>('[data-adc-form-error]');
  const titleInput   = form?.querySelector<HTMLInputElement>('[name="title"]');
  const descInput    = form?.querySelector<HTMLTextAreaElement>('[name="short_desc"]');
  const urlInput     = form?.querySelector<HTMLInputElement>('[name="target_url"]');
  const ctaInput     = root.querySelector<HTMLInputElement>('[data-adc-cta-input]');

  // Предпросмотр
  const previewAd     = root.querySelector<HTMLElement>('[data-adc-preview-ad]');
  const previewTitle  = root.querySelector<HTMLElement>('[data-adc-preview-title]');
  const previewDesc   = root.querySelector<HTMLElement>('[data-adc-preview-desc]');
  const previewDomain = root.querySelector<HTMLElement>('[data-adc-preview-domain]');
  const previewImg    = root.querySelector<HTMLElement>('[data-adc-preview-image]');
  const previewCta    = root.querySelector<HTMLElement>('[data-adc-preview-cta]');
  const previewBadge  = root.querySelector<HTMLElement>('[data-adc-preview-badge]');

  function updatePreview(): void {
    const title  = titleInput?.value.trim()  || 'Заголовок объявления';
    const desc   = descInput?.value.trim()   || 'Описание вашего предложения появится здесь.';
    const url    = urlInput?.value.trim()    || '';

    if (previewTitle)  previewTitle.textContent  = title;
    if (previewDesc)   previewDesc.textContent   = desc;
    if (previewDomain) previewDomain.textContent = extractDomain(url);

    // Синхронизировать stories overlay
    const overlay = previewAd?.querySelector<HTMLElement>('.adc__preview-stories-overlay');
    if (overlay) {
      const ol = overlay.querySelector<HTMLElement>('.adc__preview-headline');
      const od = overlay.querySelector<HTMLElement>('.adc__preview-desc');
      const oc = overlay.querySelector<HTMLElement>('.adc__preview-cta');
      if (ol) ol.textContent = title;
      if (od) od.textContent = desc;
      if (oc) oc.textContent = previewCta?.textContent ?? '';
    }
  }

  root.querySelectorAll<HTMLButtonElement>('[data-adc-formats] [data-format]').forEach((tab) => {
    tab.addEventListener('click', () => {
      root.querySelectorAll('[data-adc-formats] [data-format]').forEach((t) => {
        t.classList.remove('adc__format-tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('adc__format-tab--active');
      tab.setAttribute('aria-selected', 'true');

      currentFormat = tab.dataset.format as 'feed' | 'stories';

      if (previewAd) {
        previewAd.classList.toggle('adc__preview-ad--stories', currentFormat === 'stories');
        previewAd.classList.toggle('adc__preview-ad--feed',    currentFormat === 'feed');
      }

      if (previewBadge) {
        previewBadge.textContent = currentFormat === 'stories' ? 'Stories' : 'Лента';
      }

      // Добавить overlay для stories если его нет
      if (currentFormat === 'stories' && previewAd && !previewAd.querySelector('.adc__preview-stories-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'adc__preview-stories-overlay';
        overlay.innerHTML = `
          <p class="adc__preview-headline">${previewTitle?.textContent ?? ''}</p>
          <p class="adc__preview-desc">${previewDesc?.textContent ?? ''}</p>
          <button class="adc__preview-cta" type="button">${previewCta?.textContent ?? ''}</button>
        `;
        previewAd.querySelector('.adc__preview-image')?.after(overlay);
      }
    }, { signal });
  });

  const uploadZone        = root.querySelector<HTMLElement>('[data-adc-upload-zone]');
  const fileInput         = root.querySelector<HTMLInputElement>('[data-adc-file-input]');
  const uploadPlaceholder = root.querySelector<HTMLElement>('[data-adc-upload-placeholder]');
  const uploadPreview     = root.querySelector<HTMLElement>('[data-adc-upload-preview]');
  const uploadImg         = root.querySelector<HTMLImageElement>('[data-adc-upload-img]');
  const uploadFilename    = root.querySelector<HTMLElement>('[data-adc-upload-filename]');
  const uploadRemoveBtn   = root.querySelector<HTMLButtonElement>('[data-adc-upload-remove]');

  function showFile(file: File): void {
    selectedFile = file;
    const url = URL.createObjectURL(file);

    if (uploadPlaceholder) uploadPlaceholder.hidden = true;
    if (uploadPreview)     uploadPreview.hidden = false;
    if (uploadImg)         uploadImg.src = url;
    if (uploadFilename)    uploadFilename.textContent = file.name;

    // Показать в предпросмотре
    if (previewImg) {
      const existing = previewImg.querySelector('img');
      if (existing) {
        existing.src = url;
      } else {
        previewImg.innerHTML = '';
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        previewImg.appendChild(img);
      }
    }
  }

  function clearFile(): void {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    if (uploadPlaceholder) uploadPlaceholder.hidden = false;
    if (uploadPreview)     uploadPreview.hidden = true;

    if (previewImg) {
      previewImg.innerHTML = `
        <span class="adc__preview-image-placeholder">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
            <path d="m3 15 5-5 4 4 3-3 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Изображение</span>
        </span>`;
    }
  }

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) showFile(file);
  }, { signal });

  uploadRemoveBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
  }, { signal });

  uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('is-dragover');
  }, { signal });

  uploadZone?.addEventListener('dragleave', () => {
    uploadZone.classList.remove('is-dragover');
  }, { signal });

  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('is-dragover');
    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) showFile(file);
  }, { signal });

  (['title', 'short_desc'] as const).forEach((fieldName) => {
    const input = form?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${fieldName}"]`);
    if (!input) return;
    const counter = form?.querySelector<HTMLElement>(`[data-adc-counter="${fieldName}"]`);
    const max = parseInt(input.getAttribute('maxlength') ?? '0', 10);
    input.addEventListener('input', () => {
      if (counter) counter.textContent = `${input.value.length}/${max}`;
      updatePreview();
    }, { signal });
  });

  urlInput?.addEventListener('input', updatePreview, { signal });

  function setCta(text: string): void {
    if (previewCta) previewCta.textContent = text;
    if (ctaInput && document.activeElement !== ctaInput) ctaInput.value = text;
    updatePreview();
  }

  root.querySelectorAll<HTMLButtonElement>('[data-adc-cta] .adc__cta-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('.adc__cta-chip').forEach((c) => c.classList.remove('adc__cta-chip--active'));
      chip.classList.add('adc__cta-chip--active');
      setCta(chip.textContent?.trim() ?? '');
    }, { signal });
  });

  ctaInput?.addEventListener('input', () => {
    root.querySelectorAll('.adc__cta-chip').forEach((c) => c.classList.remove('adc__cta-chip--active'));
    setCta(ctaInput.value);
  }, { signal });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data       = new FormData(form);
    const title      = (data.get('title')      as string).trim();
    const short_desc = (data.get('short_desc') as string).trim();
    const target_url = (data.get('target_url') as string).trim();

    const errors: Record<string, string> = {};
    if (!title)      errors['title']      = 'Введите заголовок';
    if (!short_desc) errors['short_desc'] = 'Введите описание';
    if (!target_url) errors['target_url'] = 'Введите ссылку';

    root.querySelectorAll<HTMLElement>('[data-adc-error]').forEach((el) => {
      el.textContent = errors[el.dataset.adcError ?? ''] ?? '';
    });

    if (Object.keys(errors).length > 0) return;

    const payload: CreateAdRequest = { title, short_desc, target_url, image_url: '' };

    if (submitBtn) submitBtn.disabled = true;
    if (formError) formError.hidden = true;

    try {
      await createAdInGroup(campaignId, groupId, payload, selectedFile ?? undefined);
      navigateTo(`/ads/campaign?id=${campaignId}`);
    } catch {
      if (formError) {
        formError.textContent = 'Не удалось создать объявление. Попробуйте ещё раз.';
        formError.hidden = false;
      }
      if (submitBtn) submitBtn.disabled = false;
    }
  }, { signal });

  return () => controller.abort();
}
