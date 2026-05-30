import './ad-create.scss';
import { createAdInGroup, type CreateAdRequest } from 'features/ads/api/ads';
import { generateAdImage, type AiImageStyle } from 'features/ads/api/ai-image';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import { openImageCropModal } from 'widgets/image-crop-modal';
import { showToast } from 'shared/lib/toast';
import { ApiRequestError } from 'shared/lib/request';
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
  let selectedAiImageUrl: string | null = null;

  // Один ключ на весь черновик объявления
  const generationKey = crypto.randomUUID();
  const MAX_REGEN = 3;
  let regenLeft = MAX_REGEN;

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
  const genErrorEl    = root.querySelector<HTMLElement>('[data-adc-gen-error]');

  let currentStyle: AiImageStyle = 'clean';

  root.querySelectorAll<HTMLButtonElement>('[data-adc-style]').forEach((chip) => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('[data-adc-style]').forEach((c) => c.classList.remove('adc__ai-style-chip--active'));
      chip.classList.add('adc__ai-style-chip--active');
      currentStyle = chip.dataset.adcStyle as AiImageStyle;
    }, { signal });
  });

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
    selectedAiImageUrl = null;
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

  async function handleGenImages(): Promise<void> {
    if (!genImageBtn) return;

    const prompt = (descInput?.value.trim() || titleInput?.value.trim() || '').substring(0, 400);
    if (!prompt) return;

    if (genErrorEl) genErrorEl.hidden = true;
    if (aiVariants) { aiVariants.hidden = true; aiVariants.innerHTML = ''; }

    genImageBtn.disabled = true;
    genImageBtn.classList.add('is-loading');
    if (genImageLabel) genImageLabel.textContent = 'Генерирую...';

    try {
      const image = await generateAdImage({
        prompt,
        style:          currentStyle,
        format:         currentFormat,
        generation_key: generationKey,
      });

      regenLeft = Math.max(0, regenLeft - 1);

      selectedAiImageUrl = image.image_url;
      clearUploadZone();
      setPreviewImage(image.image_url);

      genImageBtn.classList.remove('is-loading');
      genImageBtn.disabled = regenLeft === 0;
      if (genImageLabel) {
        genImageLabel.textContent = regenLeft > 0
          ? `Перегенерировать (осталось ${regenLeft})`
          : 'Лимит регенераций исчерпан';
      }

      if (aiVariants) {
        aiVariants.hidden = false;
        aiVariants.innerHTML = `
          <div class="adc__ai-variant adc__ai-variant--selected" style="aspect-ratio:${currentFormat === 'stories' ? '9/16' : '1.91'}; max-height:180px;">
            <img src="${image.image_url}" alt="Сгенерированное изображение" />
            <span class="adc__ai-variant-check">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </div>`;
      }
    } catch (err) {
      genImageBtn.classList.remove('is-loading');
      genImageBtn.disabled = false;
      if (genImageLabel) genImageLabel.textContent = 'Сгенерировать из описания';

      let msg = 'Не удалось сгенерировать изображение. Попробуйте ещё раз.';
      if (err instanceof ApiRequestError) {
        if (err.status === 402) {
          msg = 'Генерация изображений доступна только на тарифе Pro. Перейдите в профиль, чтобы оформить подписку.';
        } else if (err.status === 401) {
          msg = 'Для генерации необходимо войти в аккаунт.';
        } else if (err.status >= 500) {
          msg = 'Сервис генерации временно недоступен. Попробуйте позже.';
        }
      }

      if (genErrorEl) { genErrorEl.textContent = msg; genErrorEl.hidden = false; }
      showToast('Ошибка генерации', msg, 'error');
    }
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
