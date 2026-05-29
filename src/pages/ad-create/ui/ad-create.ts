import './ad-create.scss';
import { createAdInGroup, type CreateAdRequest } from 'features/ads/api/ads';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import { openImageCropModal } from 'widgets/image-crop-modal';
import { showToast } from 'shared/lib/toast';
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

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url || 'example.com'; }
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
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

  // AI-элементы
  const aiTextToggle  = root.querySelector<HTMLButtonElement>('[data-adc-ai-text-toggle]');
  const aiPanel       = root.querySelector<HTMLElement>('[data-adc-ai-panel]');
  const aiContextInput = root.querySelector<HTMLTextAreaElement>('[data-adc-ai-context]');
  const aiGenTextBtn  = root.querySelector<HTMLButtonElement>('[data-adc-ai-gen-text]');
  const aiGenTextLabel = root.querySelector<HTMLElement>('[data-adc-ai-gen-text-label]');
  const voiceBtn      = root.querySelector<HTMLButtonElement>('[data-adc-voice-btn]');
  const genImageBtn   = root.querySelector<HTMLButtonElement>('[data-adc-gen-image]');
  const genImageLabel = root.querySelector<HTMLElement>('[data-adc-gen-image-label]');
  const aiVariants    = root.querySelector<HTMLElement>('[data-adc-ai-variants]');

  // ─── Предпросмотр ────────────────────────────────────────────────────────

  function updatePreview(): void {
    const title = titleInput?.value.trim()  || 'Заголовок объявления';
    const desc  = descInput?.value.trim()   || 'Описание вашего предложения появится здесь.';
    const url   = urlInput?.value.trim()    || '';

    if (previewTitle)  previewTitle.textContent  = title;
    if (previewDesc)   previewDesc.textContent   = desc;
    if (previewDomain) previewDomain.textContent = extractDomain(url);

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

  function setPreviewImage(dataUrl: string): void {
    if (!previewImg) return;
    const existing = previewImg.querySelector('img');
    if (existing) {
      existing.src = dataUrl;
    } else {
      previewImg.innerHTML = '';
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = '';
      previewImg.appendChild(img);
    }
  }

  // ─── Переключатель формата ───────────────────────────────────────────────

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

  // ─── Загрузка изображения ────────────────────────────────────────────────

  const uploadZone        = root.querySelector<HTMLElement>('[data-adc-upload-zone]');
  const fileInput         = root.querySelector<HTMLInputElement>('[data-adc-file-input]');
  const uploadPlaceholder = root.querySelector<HTMLElement>('[data-adc-upload-placeholder]');
  const uploadPreview     = root.querySelector<HTMLElement>('[data-adc-upload-preview]');
  const uploadImg         = root.querySelector<HTMLImageElement>('[data-adc-upload-img]');
  const uploadFilename    = root.querySelector<HTMLElement>('[data-adc-upload-filename]');
  const uploadRemoveBtn   = root.querySelector<HTMLButtonElement>('[data-adc-upload-remove]');

  function clearVariantSelection(): void {
    aiVariants?.querySelectorAll('.adc__ai-variant--selected').forEach((el) => {
      el.classList.remove('adc__ai-variant--selected');
    });
  }

  function clearUploadZone(): void {
    if (fileInput) { fileInput.value = ''; fileInput.style.pointerEvents = ''; }
    if (uploadPlaceholder) uploadPlaceholder.hidden = false;
    if (uploadPreview)     uploadPreview.hidden = true;
  }

  function clearFile(): void {
    selectedFile = null;
    clearUploadZone();
    clearVariantSelection();
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

  function showFile(file: File, dataUrl: string): void {
    selectedFile = file;
    clearVariantSelection();

    if (uploadPlaceholder) uploadPlaceholder.hidden = true;
    if (uploadPreview)     uploadPreview.hidden = false;
    if (uploadImg)         uploadImg.src = dataUrl;
    if (uploadFilename)    uploadFilename.textContent = file.name;
    if (fileInput)         fileInput.style.pointerEvents = 'none';

    setPreviewImage(dataUrl);
  }

  async function handleFileSelected(file: File): Promise<void> {
    const ratio = currentFormat === 'stories' ? 'stories' : 'feed';
    const result = await openImageCropModal(file, ratio);
    if (!result) {
      if (fileInput) fileInput.value = '';
      return;
    }
    showFile(result.file, result.dataUrl);
  }

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) void handleFileSelected(file);
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
    if (file?.type.startsWith('image/')) void handleFileSelected(file);
  }, { signal });

  // ─── Текстовые поля и предпросмотр ───────────────────────────────────────

  (['title', 'short_desc'] as const).forEach((fieldName) => {
    const input = form?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${fieldName}"]`);
    if (!input) return;
    const counter = form?.querySelector<HTMLElement>(`[data-adc-counter="${fieldName}"]`);
    const max = parseInt(input.getAttribute('maxlength') ?? '0', 10);
    input.addEventListener('input', () => {
      if (counter) counter.textContent = `${input.value.length}/${max}`;
      updatePreview();
      if (fieldName === 'short_desc') updateGenImageBtn();
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

  // ─── ИИ: генерация описания ───────────────────────────────────────────────

  aiTextToggle?.addEventListener('click', () => {
    if (!aiPanel) return;
    const opening = aiPanel.hidden !== false;
    aiPanel.hidden = !opening;
    aiTextToggle.classList.toggle('is-active', opening);
    if (opening) aiContextInput?.focus();
  }, { signal });

  const DESC_TEMPLATES = [
    (s: string) => `${s} — именно то, что вы искали. Уникальное предложение для наших клиентов. Не упустите возможность!`,
    (s: string) => `Откройте для себя ${s}. Высокое качество, доступные цены и надёжный сервис. Закажите прямо сейчас.`,
    (s: string) => `${s}: выгодное предложение ждёт вас. Быстрая доставка, профессиональная поддержка и гарантия качества.`,
    (s: string) => `Только у нас — ${s} по специальной цене. Ограниченное предложение для новых клиентов.`,
  ];

  async function handleGenText(): Promise<void> {
    if (!descInput || !aiGenTextBtn) return;
    const context = (aiContextInput?.value ?? '').trim() || (titleInput?.value ?? '').trim() || 'продукт';

    aiGenTextBtn.disabled = true;
    aiGenTextBtn.classList.add('is-loading');
    if (aiGenTextLabel) aiGenTextLabel.textContent = 'Генерирую...';

    await delay(1400);

    const tpl = DESC_TEMPLATES[Math.floor(Math.random() * DESC_TEMPLATES.length)];
    const text = tpl(context).substring(0, 150);

    descInput.value = text;
    descInput.dispatchEvent(new Event('input'));
    updateGenImageBtn();

    aiGenTextBtn.classList.remove('is-loading');
    aiGenTextBtn.disabled = false;
    if (aiGenTextLabel) aiGenTextLabel.textContent = 'Сгенерировать';

    if (aiPanel) aiPanel.hidden = true;
    aiTextToggle?.classList.remove('is-active');
  }

  aiGenTextBtn?.addEventListener('click', () => void handleGenText(), { signal });

  // ─── ИИ: голосовой ввод ───────────────────────────────────────────────────

  type SpeechRecognitionCtor = new () => {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start(): void;
  };

  voiceBtn?.addEventListener('click', () => {
    const win = window as unknown as Record<string, unknown>;
    const SR = (win['SpeechRecognition'] ?? win['webkitSpeechRecognition']) as SpeechRecognitionCtor | undefined;

    if (!SR) {
      showToast('Не поддерживается', 'Голосовой ввод недоступен в этом браузере. Попробуйте Chrome.', 'warning');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    voiceBtn.classList.add('is-recording');
    voiceBtn.setAttribute('aria-label', 'Остановить запись');

    const stopRecording = (): void => {
      voiceBtn.classList.remove('is-recording');
      voiceBtn.setAttribute('aria-label', 'Голосовой ввод');
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      if (descInput) {
        descInput.value = transcript.substring(0, 150);
        descInput.dispatchEvent(new Event('input'));
        updateGenImageBtn();
      }
    };

    recognition.onerror = stopRecording;
    recognition.onend = stopRecording;

    recognition.start();
  }, { signal });

  // ─── ИИ: генерация изображений ────────────────────────────────────────────

  function updateGenImageBtn(): void {
    const hasDesc = (descInput?.value.trim() ?? '').length > 0;
    if (genImageBtn) genImageBtn.disabled = !hasDesc;
  }

  const PALETTES = [
    { from: '#667eea', to: '#764ba2' },
    { from: '#f093fb', to: '#f5576c' },
    { from: '#4facfe', to: '#00f2fe' },
  ];

  function buildVariantCanvas(index: number): Promise<{ dataUrl: string; file: File }> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 628;
      const ctx = canvas.getContext('2d')!;

      const { from, to } = PALETTES[index % PALETTES.length];
      const grad = ctx.createLinearGradient(0, 0, 1200, 628);
      grad.addColorStop(0, from);
      grad.addColorStop(1, to);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 628);

      // Декоративные круги
      ctx.beginPath();
      ctx.arc(180, 140, 320, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(1050, 500, 260, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillText('AI', 600, 260);

      ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(`Вариант ${index + 1}`, 600, 340);

      ctx.font = '22px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText('Сгенерировано ИИ', 600, 390);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const file = new File([blob], `ai_variant_${index + 1}.jpg`, { type: 'image/jpeg' });
        resolve({ dataUrl, file });
      }, 'image/jpeg', 0.85);
    });
  }

  function selectVariant(index: number, variant: { dataUrl: string; file: File }): void {
    selectedFile = variant.file;
    clearUploadZone();
    clearVariantSelection();
    aiVariants?.querySelectorAll<HTMLElement>('[data-variant-index]').item(index)?.classList.add('adc__ai-variant--selected');
    setPreviewImage(variant.dataUrl);
  }

  function renderVariants(variants: Array<{ dataUrl: string; file: File }>): void {
    if (!aiVariants) return;
    aiVariants.innerHTML = '';

    variants.forEach((v, i) => {
      const card = document.createElement('div');
      card.className = 'adc__ai-variant';
      card.dataset.variantIndex = String(i);
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Вариант ${i + 1}`);

      const img = document.createElement('img');
      img.src = v.dataUrl;
      img.alt = `Вариант ${i + 1}`;
      card.appendChild(img);

      const check = document.createElement('span');
      check.className = 'adc__ai-variant-check';
      check.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      card.appendChild(check);

      card.addEventListener('click', () => selectVariant(i, v));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectVariant(i, v); }
      });

      aiVariants.appendChild(card);
    });

    const note = document.createElement('p');
    note.className = 'adc__ai-variants-note';
    note.textContent = 'Нажмите на вариант, чтобы выбрать';
    aiVariants.appendChild(note);
  }

  async function handleGenImages(): Promise<void> {
    if (!genImageBtn || !aiVariants) return;

    genImageBtn.disabled = true;
    genImageBtn.classList.add('is-loading');
    if (genImageLabel) genImageLabel.textContent = 'Генерирую варианты...';

    // Скелетон
    aiVariants.hidden = false;
    aiVariants.innerHTML = `
      <div class="adc__ai-variant adc__ai-variant--skeleton"></div>
      <div class="adc__ai-variant adc__ai-variant--skeleton"></div>
      <div class="adc__ai-variant adc__ai-variant--skeleton"></div>
    `;

    await delay(2000);

    const variants = await Promise.all([0, 1, 2].map((i) => buildVariantCanvas(i)));

    renderVariants(variants);

    genImageBtn.classList.remove('is-loading');
    genImageBtn.disabled = false;
    if (genImageLabel) genImageLabel.textContent = 'Другие варианты';
  }

  genImageBtn?.addEventListener('click', () => void handleGenImages(), { signal });

  // ─── Отправка формы ──────────────────────────────────────────────────────

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data       = new FormData(form);
    const title      = (data.get('title')      as string).trim();
    const short_desc = (data.get('short_desc') as string).trim();
    const target_url = (data.get('target_url') as string).trim();

    const errors: Record<string, string> = {};
    if (!title)      errors['title']      = 'Введите заголовок';
    if (!short_desc) errors['short_desc'] = 'Введите описание';
    if (!target_url) {
      errors['target_url'] = 'Введите ссылку';
    } else if (!isValidHttpUrl(normalizeUrl(target_url))) {
      errors['target_url'] = 'Введите корректную ссылку, например https://example.ru';
    }

    root.querySelectorAll<HTMLElement>('[data-adc-error]').forEach((el) => {
      el.textContent = errors[el.dataset.adcError ?? ''] ?? '';
    });

    if (Object.keys(errors).length > 0) return;

    const payload: CreateAdRequest = { title, short_desc, target_url: normalizeUrl(target_url) };

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
