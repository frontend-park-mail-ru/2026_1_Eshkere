import './campaign-wizard.scss';
import { initCampaignBuilderSelectArrows } from 'shared/lib/campaign-builder-select-arrow';
import { showToast } from 'shared/lib/toast';
import { createAdCampaign } from 'features/ads/api/create-ad-campaign';
import { createAdGroup } from 'features/ads/api/ad-groups';
import { createAdInGroup } from 'features/ads/api/ads';
import { generateAdImage, type AiImageStyle } from 'features/ads/api/ai-image';
import { ApiRequestError } from 'shared/lib/request';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import { openImageCropModal, type ImageCropRatio } from 'widgets/image-crop-modal';
import {
  createInitialWizardState,
  getWizardReviewData,
  readWizardStateFromFields,
  STEP_NAMES,
  STEP_SUBTITLES,
  toAdPayload,
  toCampaignPayload,
  toGroupPayload,
  TOTAL_STEPS,
  validateWizardStep,
  type WizardAdFormat,
  type WizardMainAction,
  type WizardObjective,
  type WizardStep,
} from '../model/wizard';
import campaignWizardTemplate from './campaign-wizard.hbs';

export async function renderCampaignWizardPage(): Promise<string> {
  return renderTemplate(campaignWizardTemplate, {});
}

export function CampaignWizard(): VoidFunction {
  const rootEl = document.querySelector<HTMLElement>('[data-cw]');
  if (!rootEl) return () => {};
  const root: HTMLElement = rootEl;

  const controller = new AbortController();
  const { signal } = controller;

  initCampaignBuilderSelectArrows(root, signal);

  let currentStep: WizardStep = 1;
  const state = createInitialWizardState();

  const subtitle    = root.querySelector<HTMLElement>('[data-cw-step-subtitle]');
  const stepBtns    = root.querySelectorAll<HTMLButtonElement>('[data-cw-step-btn]');
  const submitError = root.querySelector<HTMLElement>('[data-cw-error="submit"]');

  function getPanel(step: WizardStep): HTMLElement | null {
    return root.querySelector(`[data-cw-panel="${step}"]`);
  }

  function goToStep(step: WizardStep): void {
    getPanel(currentStep)?.setAttribute('hidden', '');
    currentStep = step;
    getPanel(currentStep)?.removeAttribute('hidden');

    if (subtitle) subtitle.textContent = STEP_SUBTITLES[currentStep];

    stepBtns.forEach((btn) => {
      const n = parseInt(btn.dataset.cwStepBtn ?? '0', 10);
      btn.classList.toggle('campaign-builder__step--active', n === currentStep);
      btn.classList.toggle('campaign-builder__step--complete', n < currentStep);
    });

    // Скрыть/показать все Prev-кнопки в toolbar
    root.querySelectorAll<HTMLElement>('.campaign-builder__toolbar [data-cw-prev]').forEach((btn) => {
      btn.toggleAttribute('hidden', currentStep === 1);
    });

    // Обновить текст главной кнопки Далее в toolbar
    const toolbarNext = root.querySelector<HTMLButtonElement>('.campaign-builder__toolbar [data-cw-next]');
    if (toolbarNext) {
      toolbarNext.textContent = currentStep === TOTAL_STEPS ? 'Создать кампанию' : 'Далее →';
    }

    updateReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getFieldValue(key: string): string {
    const el = root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `[data-cw-field="${key}"]`,
    );
    return el?.value ?? '';
  }

  function syncStateFromFields(): void {
    Object.assign(state, readWizardStateFromFields(getFieldValue, state));
  }

  function clearErrors(): void {
    root.querySelectorAll('[data-cw-error]').forEach((el) => {
      (el as HTMLElement).textContent = '';
      (el as HTMLElement).hidden = true;
    });
  }

  function setError(key: string, msg: string): void {
    const el = root.querySelector<HTMLElement>(`[data-cw-error="${key}"]`);
    if (el) { el.textContent = msg; el.hidden = false; }
  }

  function clearError(key: string): void {
    const el = root.querySelector<HTMLElement>(`[data-cw-error="${key}"]`);
    if (el) {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function validateStep(step: WizardStep): boolean {
    clearErrors();
    syncStateFromFields();
    const result = validateWizardStep(state, step);

    Object.entries(result.errors).forEach(([key, message]) => {
      if (message) setError(key, message);
    });

    if (!result.ok) {
      showToast(
        `Заполните раздел «${STEP_NAMES[step]}»`,
        result.issues.join(' · '),
        'error',
      );
      return false;
    }

    return true;
  }

  const ageFromSelect = root.querySelector<HTMLSelectElement>('[data-cw-field="age_from"]');
  const ageToSelect = root.querySelector<HTMLSelectElement>('[data-cw-field="age_to"]');

  function syncAgeRangeOptions(): void {
    if (!ageFromSelect || !ageToSelect) return;

    const ageFrom = parseInt(ageFromSelect.value, 10);
    const ageTo = parseInt(ageToSelect.value, 10);

    ageToSelect.querySelectorAll<HTMLOptionElement>('option').forEach((option) => {
      option.disabled = parseInt(option.value, 10) <= ageFrom;
    });

    if (ageTo <= ageFrom) {
      const firstValidOption = Array.from(ageToSelect.options).find(
        (option) => !option.disabled,
      );

      if (firstValidOption) {
        ageToSelect.value = firstValidOption.value;
        clearError('age_range');
      } else {
        setError('age_range', 'Выберите корректный возрастной диапазон');
      }
    } else {
      clearError('age_range');
    }

    syncStateFromFields();
  }

  function updateReview(): void {
    if (currentStep !== 4) return;
    syncStateFromFields();

    const set = (key: string, val: string) => {
      const el = root.querySelector(`[data-cw-review="${key}"]`);
      if (el) el.textContent = val || '—';
    };

    const review = getWizardReviewData(state);
    set('name', review.name);
    set('goal', review.goal);
    set('budget', review.budget);
    set('group_name', review.groupName);
    set('audience', review.audience);
    set('region', review.region);
    set('ad_title', review.adTitle);
    set('ad_url', review.adUrl);
    set('ad_image', review.adImage);
  }

  async function handleSubmit(): Promise<void> {
    for (const step of [1, 2, 3] as WizardStep[]) {
      if (!validateStep(step)) {
        goToStep(step);
        return;
      }
    }

    syncStateFromFields();

    root!.querySelectorAll<HTMLButtonElement>('[data-cw-next]').forEach((b) => { b.disabled = true; });
    if (submitError) submitError.hidden = true;

    try {
      const { id: campaignId } = await createAdCampaign(toCampaignPayload(state));

      const { id: groupId } = await createAdGroup(
        campaignId,
        toGroupPayload(state),
        { rollbackCampaignOnError: true },
      );

      await createAdInGroup(
        campaignId,
        groupId,
        toAdPayload(state),
        state.ad_image ?? undefined,
      );

      showToast('Кампания создана!', 'Переходим к группам объявлений…', 'success', 2500);
      setTimeout(() => navigateTo(`/ads/campaign?id=${campaignId}`), 800);
    } catch {
      if (submitError) {
        submitError.textContent = 'Не удалось создать кампанию. Попробуйте ещё раз.';
        submitError.hidden = false;
      }
      showToast('Ошибка создания', 'Не удалось создать кампанию. Попробуйте ещё раз.', 'error');
      root!.querySelectorAll<HTMLButtonElement>('[data-cw-next]').forEach((b) => { b.disabled = false; });
    }
  }

  root.querySelectorAll<HTMLButtonElement>('[data-cw-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (currentStep < TOTAL_STEPS) {
        if (!validateStep(currentStep)) return;
        goToStep((currentStep + 1) as WizardStep);
      } else {
        void handleSubmit();
      }
    }, { signal });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-cw-prev]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (currentStep > 1) goToStep((currentStep - 1) as WizardStep);
    }, { signal });
  });

  root.querySelector<HTMLElement>('[data-cw-close]')?.addEventListener('click', () => {
    navigateTo('/ads');
  }, { signal });

  stepBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.dataset.cwStepBtn ?? '0', 10) as WizardStep;
      if (target === currentStep) return;
      if (target < currentStep) {
        goToStep(target);
      } else if (target === currentStep + 1 && validateStep(currentStep)) {
        goToStep(target);
      }
    }, { signal });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-cw-goals] [data-goal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-cw-goals] [data-goal]').forEach((b) =>
        b.classList.remove('cw-objective--active'),
      );
      btn.classList.add('cw-objective--active');
      state.main_action = btn.dataset.goal as WizardMainAction;
      state.objective = (btn.dataset.objective ?? 'leads') as WizardObjective;
    }, { signal });
  });

  ageFromSelect?.addEventListener('change', syncAgeRangeOptions, { signal });
  ageToSelect?.addEventListener('change', syncAgeRangeOptions, { signal });

  // ── Контейнер превью ──────────────────────────────────────────
  const containerWInput = root.querySelector<HTMLInputElement>('[data-cw-container-w]');
  const containerHInput = root.querySelector<HTMLInputElement>('[data-cw-container-h]');
  const presetSelect    = root.querySelector<HTMLSelectElement>('[data-cw-container-preset]');
  const adGrid          = root.querySelector<HTMLElement>('[data-cw-adgrid]');

  function getGridClass(w: number, h: number): string {
    const ratio = w / Math.max(h, 1);
    if (ratio >= 4) return 'cw-adgrid cw-adgrid--row';
    if (ratio < 1)  return 'cw-adgrid cw-adgrid--single';
    if (ratio < 2)  return 'cw-adgrid cw-adgrid--grid2';
    return 'cw-adgrid';
  }

  function syncGridLayout(): void {
    if (!adGrid) return;
    const w = parseInt(containerWInput?.value ?? '1000', 10);
    const h = parseInt(containerHInput?.value ?? '400', 10);
    adGrid.className = getGridClass(w, h);
  }

  containerWInput?.addEventListener('input', syncGridLayout, { signal });
  containerHInput?.addEventListener('input', syncGridLayout, { signal });

  presetSelect?.addEventListener('change', () => {
    const [w, h] = (presetSelect.value ?? '').split(':').map(Number);
    if (w && h) {
      if (containerWInput) containerWInput.value = String(w);
      if (containerHInput) containerHInput.value = String(h);
      syncGridLayout();
    }
  }, { signal });

  root.querySelectorAll<HTMLButtonElement>('[data-cw-device]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-cw-device]').forEach((b) =>
        b.classList.remove('cw-preview-device--active'),
      );
      btn.classList.add('cw-preview-device--active');
    }, { signal });
  });

  const FORMAT_BADGE_LABELS: Record<string, string> = {
    feed:    'Лента',
    stories: 'Stories',
  };

  root.querySelectorAll<HTMLButtonElement>('[data-cw-formats] [data-format]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-cw-formats] [data-format]').forEach((b) =>
        b.classList.remove('cw-format--active'),
      );
      btn.classList.add('cw-format--active');
      state.ad_format = btn.dataset.format as WizardAdFormat;

      const badgeEl = root.querySelector<HTMLElement>('.cw-preview-badge');
      if (badgeEl) badgeEl.textContent = FORMAT_BADGE_LABELS[state.ad_format] ?? state.ad_format;

      updateAdPreview();
    }, { signal });
  });

  const fileInput      = root.querySelector<HTMLInputElement>('[data-cw-file]');
  const uploadZone     = root.querySelector<HTMLElement>('[data-cw-upload]');
  const placeholder    = root.querySelector<HTMLElement>('[data-cw-upload-placeholder]');
  const preview        = root.querySelector<HTMLElement>('[data-cw-upload-preview]');
  const previewImg     = root.querySelector<HTMLImageElement>('[data-cw-upload-img]');
  const previewName    = root.querySelector<HTMLElement>('[data-cw-upload-name]');
  const removeBtn      = root.querySelector<HTMLButtonElement>('[data-cw-upload-remove]');
  const livePreviewImagePlaceholder = root.querySelector<HTMLElement>('[data-cw-preview-image]')?.innerHTML ?? '';
  const reviewPreviewImagePlaceholder = root.querySelector<HTMLElement>('[data-cw-review-image]')?.innerHTML ?? '';

  let uploadPreviewUrl: string | null = null;
  let livePreviewUrl: string | null = null;
  let livePreviewFile: File | null = null;
  let reviewPreviewUrl: string | null = null;
  let reviewPreviewFile: File | null = null;

  function getCropRatio(): ImageCropRatio {
    return state.ad_format === 'stories' ? 'stories' : 'feed';
  }

  function showFile(file: File): void {
    state.ad_image = file;
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    uploadPreviewUrl = URL.createObjectURL(file);
    if (previewImg)  previewImg.src = uploadPreviewUrl;
    if (previewName) previewName.textContent = file.name;
    if (placeholder) placeholder.hidden = true;
    if (preview)     preview.hidden = false;
    updateAdPreview();
  }

  function clearFile(): void {
    state.ad_image = null;
    if (uploadPreviewUrl) {
      URL.revokeObjectURL(uploadPreviewUrl);
      uploadPreviewUrl = null;
    }
    if (fileInput)   fileInput.value = '';
    if (previewImg)  previewImg.removeAttribute('src');
    if (placeholder) placeholder.hidden = false;
    if (preview)     preview.hidden = true;
    updateAdPreview();
  }

  async function cropAndShowFile(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      showToast('Неверный формат', 'Загрузите JPG, PNG или WebP.', 'error');
      if (fileInput) fileInput.value = '';
      return;
    }

    const result = await openImageCropModal(file, getCropRatio());
    if (result) showFile(result.file);

    if (fileInput) fileInput.value = '';
  }

  fileInput?.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) void cropAndShowFile(f);
  }, { signal });

  removeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearFile();
  }, { signal });

  uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('is-dragover');
  }, { signal });

  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('is-dragover'), { signal });

  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('is-dragover');
    const f = e.dataTransfer?.files[0];
    if (f) void cropAndShowFile(f);
  }, { signal });

  signal.addEventListener('abort', () => {
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
    if (reviewPreviewUrl) URL.revokeObjectURL(reviewPreviewUrl);
  });

  function extractDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url || 'example.com'; }
  }

  function updateAdPreview(): void {
    const titleEl  = root.querySelector<HTMLElement>('[data-cw-preview-title]');
    const descEl   = root.querySelector<HTMLElement>('[data-cw-preview-desc]');
    const domainEl = root.querySelector<HTMLElement>('[data-cw-preview-domain]');
    const ctaEl    = root.querySelector<HTMLElement>('[data-cw-preview-cta]');
    const imgEl    = root.querySelector<HTMLElement>('[data-cw-preview-image]');

    // Переключаем класс-модификатор на контейнере превью при смене формата
    const previewAdEl = root.querySelector<HTMLElement>('[data-cw-panel="3"] .cw-preview-ad');
    if (previewAdEl) {
      previewAdEl.classList.remove('cw-preview-ad--feed', 'cw-preview-ad--stories');
      previewAdEl.classList.add(`cw-preview-ad--${state.ad_format}`);
    }

    const title = getFieldValue('ad_title') || 'Заголовок объявления';
    const desc  = getFieldValue('ad_desc')  || 'Описание появится здесь.';
    const url   = getFieldValue('ad_url');

    if (titleEl)  titleEl.textContent  = title;
    if (descEl)   descEl.textContent   = desc;
    if (domainEl) domainEl.textContent = extractDomain(url);
    if (ctaEl)    ctaEl.textContent    = state.ad_cta;

    if (imgEl) {
      if (state.ad_image) {
        if (livePreviewFile !== state.ad_image) {
          if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
          livePreviewUrl = URL.createObjectURL(state.ad_image);
          livePreviewFile = state.ad_image;
        }

        const existing = imgEl.querySelector('img');
        if (existing && livePreviewUrl) {
          existing.src = livePreviewUrl;
        } else if (livePreviewUrl) {
          imgEl.innerHTML = '';
          const img = document.createElement('img');
          img.src = livePreviewUrl; img.alt = '';
          imgEl.appendChild(img);
        }
      } else {
        if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
        livePreviewUrl = null;
        livePreviewFile = null;
        imgEl.innerHTML = livePreviewImagePlaceholder;
      }
    }

    // Синхронизировать с итоговым предпросмотром (шаг 4)
    const r4 = (sel: string) => root.querySelector<HTMLElement>(sel);
    const t4 = r4('[data-cw-review-ad-title]');
    const d4 = r4('[data-cw-review-ad-desc]');
    const c4 = r4('[data-cw-review-cta]');
    const dm4 = r4('[data-cw-review-domain]');
    if (t4)  t4.textContent  = title;
    if (d4)  d4.textContent  = desc;
    if (c4)  c4.textContent  = state.ad_cta;
    if (dm4) dm4.textContent = extractDomain(url);

    const imgEl4 = r4('[data-cw-review-image]');
    if (imgEl4) {
      if (state.ad_image) {
        if (reviewPreviewFile !== state.ad_image) {
          if (reviewPreviewUrl) URL.revokeObjectURL(reviewPreviewUrl);
          reviewPreviewUrl = URL.createObjectURL(state.ad_image);
          reviewPreviewFile = state.ad_image;
        }

        const existing = imgEl4.querySelector('img');
        if (existing && reviewPreviewUrl) {
          existing.src = reviewPreviewUrl;
        } else if (reviewPreviewUrl) {
          imgEl4.innerHTML = '';
          const img = document.createElement('img');
          img.src = reviewPreviewUrl;
          img.alt = '';
          imgEl4.appendChild(img);
        }
      } else {
        if (reviewPreviewUrl) URL.revokeObjectURL(reviewPreviewUrl);
        reviewPreviewUrl = null;
        reviewPreviewFile = null;
        imgEl4.innerHTML = reviewPreviewImagePlaceholder;
      }
    }
  }

  (['ad_title', 'ad_desc'] as const).forEach((key) => {
    const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-cw-field="${key}"]`);
    const counter = root.querySelector<HTMLElement>(`[data-cw-counter="${key}"]`);
    if (!input || !counter) return;
    const max = parseInt(input.getAttribute('maxlength') ?? '0', 10);
    input.addEventListener('input', () => {
      counter.textContent = `${input.value.length}/${max}`;
      updateAdPreview();
    }, { signal });
  });

  root.querySelector<HTMLElement>('[data-cw-field="ad_url"]')?.addEventListener('input', updateAdPreview, { signal });

  const ctaInput = root.querySelector<HTMLInputElement>('[data-cw-cta-input]');

  function setCta(text: string, clearChips = true): void {
    state.ad_cta = text;
    if (clearChips) {
      root!.querySelectorAll('.cw-cta-chip').forEach((c) => c.classList.remove('cw-cta-chip--active'));
    }
    if (ctaInput && document.activeElement !== ctaInput) ctaInput.value = text;
    updateAdPreview();
  }

  root.querySelectorAll<HTMLButtonElement>('[data-cw-cta] .cw-cta-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('.cw-cta-chip').forEach((c) => c.classList.remove('cw-cta-chip--active'));
      chip.classList.add('cw-cta-chip--active');
      setCta(chip.textContent?.trim() ?? '', false);
    }, { signal });
  });

  ctaInput?.addEventListener('input', () => {
    setCta(ctaInput.value);
  }, { signal });

  // ── AI: генерация текста ──────────────────────────────────────────────────

  const descTextarea     = root.querySelector<HTMLTextAreaElement>('[data-cw-field="ad_desc"]');
  const titleInput       = root.querySelector<HTMLInputElement>('[data-cw-field="ad_title"]');
  const aiTextToggle     = root.querySelector<HTMLButtonElement>('[data-cw-ai-text-toggle]');
  const aiPanel          = root.querySelector<HTMLElement>('[data-cw-ai-panel]');
  const aiContextInput   = root.querySelector<HTMLTextAreaElement>('[data-cw-ai-context]');
  const aiGenTextBtn     = root.querySelector<HTMLButtonElement>('[data-cw-ai-gen-text]');
  const aiGenTextLabel   = root.querySelector<HTMLElement>('[data-cw-ai-gen-text-label]');

  const DESC_TEMPLATES = [
    (s: string) => `${s} — именно то, что вы искали. Уникальное предложение для наших клиентов. Не упустите возможность!`,
    (s: string) => `Откройте для себя ${s}. Высокое качество, доступные цены и надёжный сервис. Закажите прямо сейчас.`,
    (s: string) => `${s}: выгодное предложение ждёт вас. Быстрая доставка, профессиональная поддержка и гарантия качества.`,
    (s: string) => `Только у нас — ${s} по специальной цене. Ограниченное предложение для новых клиентов.`,
  ];

  aiTextToggle?.addEventListener('click', () => {
    if (!aiPanel) return;
    const opening = aiPanel.hidden !== false;
    aiPanel.hidden = !opening;
    aiTextToggle.classList.toggle('is-active', opening);
    if (opening) aiContextInput?.focus();
  }, { signal });

  aiGenTextBtn?.addEventListener('click', () => {
    void (async () => {
      if (!descTextarea || !aiGenTextBtn) return;
      const context = (aiContextInput?.value ?? '').trim() || (titleInput?.value ?? '').trim() || 'продукт';
      aiGenTextBtn.disabled = true;
      aiGenTextBtn.classList.add('is-loading');
      if (aiGenTextLabel) aiGenTextLabel.textContent = 'Генерирую...';

      await new Promise((r) => setTimeout(r, 1200));

      const tpl = DESC_TEMPLATES[Math.floor(Math.random() * DESC_TEMPLATES.length)];
      const generated = tpl(context).substring(0, 150);
      descTextarea.value = generated;
      descTextarea.dispatchEvent(new Event('input'));

      aiGenTextBtn.classList.remove('is-loading');
      aiGenTextBtn.disabled = false;
      if (aiGenTextLabel) aiGenTextLabel.textContent = 'Сгенерировать';
      if (aiPanel) aiPanel.hidden = true;
      aiTextToggle?.classList.remove('is-active');
    })();
  }, { signal });

  // ── AI: голосовой ввод ────────────────────────────────────────────────────

  const voiceBtn = root.querySelector<HTMLButtonElement>('[data-cw-voice-btn]');

  type SpeechRecognitionCtor = new () => {
    lang: string; interimResults: boolean; maxAlternatives: number;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start(): void;
  };

  voiceBtn?.addEventListener('click', () => {
    const win = window as unknown as Record<string, unknown>;
    const SR = (win['SpeechRecognition'] ?? win['webkitSpeechRecognition']) as SpeechRecognitionCtor | undefined;

    if (!SR) {
      showToast('Не поддерживается', 'Голосовой ввод доступен только в Chrome и Edge.', 'warning');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Открываем AI-панель если закрыта
    if (aiPanel && aiPanel.hidden !== false) {
      aiPanel.hidden = false;
      aiTextToggle?.classList.add('is-active');
    }

    voiceBtn.classList.add('is-recording');
    voiceBtn.setAttribute('aria-label', 'Остановить запись');

    const stopRec = (): void => {
      voiceBtn.classList.remove('is-recording');
      voiceBtn.setAttribute('aria-label', 'Голосовой ввод');
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('');
      if (aiContextInput) {
        aiContextInput.value = transcript.substring(0, 300);
      }
    };

    recognition.onerror = stopRec;
    recognition.onend   = stopRec;
    recognition.start();
  }, { signal });

  // ── AI: генерация изображений ─────────────────────────────────────────────

  const genImageBtn    = root.querySelector<HTMLButtonElement>('[data-cw-gen-image]');
  const genImageLabel  = root.querySelector<HTMLElement>('[data-cw-gen-image-label]');
  const aiVariants     = root.querySelector<HTMLElement>('[data-cw-ai-variants]');
  const genErrorEl     = root.querySelector<HTMLElement>('[data-cw-gen-error]');

  let cwStyle: AiImageStyle = 'clean';
  const cwGenerationKey = crypto.randomUUID();
  const CW_MAX_REGEN = 3;
  let cwRegenLeft = CW_MAX_REGEN;

  function updateGenImageBtn(): void {
    const hasDesc = (descTextarea?.value.trim() ?? '').length > 0;
    if (genImageBtn) genImageBtn.disabled = !hasDesc;
  }

  updateGenImageBtn();
  descTextarea?.addEventListener('input', updateGenImageBtn, { signal });

  root.querySelectorAll<HTMLButtonElement>('[data-cw-style]').forEach((chip) => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('[data-cw-style]').forEach((c) => c.classList.remove('campaign-builder__ai-style-chip--active'));
      chip.classList.add('campaign-builder__ai-style-chip--active');
      cwStyle = chip.dataset.cwStyle as AiImageStyle;
    }, { signal });
  });

  genImageBtn?.addEventListener('click', () => {
    void (async () => {
      if (!genImageBtn) return;
      const prompt = (descTextarea?.value.trim() || titleInput?.value.trim() || '').substring(0, 400);
      if (!prompt) return;

      if (genErrorEl) genErrorEl.hidden = true;
      if (aiVariants) { aiVariants.hidden = true; aiVariants.innerHTML = ''; }

      genImageBtn.disabled = true;
      genImageBtn.classList.add('is-loading');
      if (genImageLabel) genImageLabel.textContent = 'Генерирую...';

      try {
        const aiFormat = state.ad_format === 'stories' ? 'stories' : 'feed';
        const image = await generateAdImage({
          prompt,
          style:          cwStyle,
          format:         aiFormat,
          generation_key: cwGenerationKey,
        });

        cwRegenLeft = Math.max(0, cwRegenLeft - 1);

        // Получаем файл из URL и сохраняем в state
        try {
          const res = await fetch(image.image_url);
          const blob = await res.blob();
          const file = new File([blob], `ai_image_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
          showFile(file);
        } catch {
          // CORS — показываем превью через URL без сохранения файла
          const previewImgEl = root.querySelector<HTMLElement>('[data-cw-preview-image]');
          if (previewImgEl) {
            previewImgEl.innerHTML = `<img src="${image.image_url}" alt="" />`;
          }
        }

        genImageBtn.classList.remove('is-loading');
        genImageBtn.disabled = cwRegenLeft === 0;
        if (genImageLabel) {
          genImageLabel.textContent = cwRegenLeft > 0
            ? `Перегенерировать (осталось ${cwRegenLeft})`
            : 'Лимит регенераций исчерпан';
        }

        if (aiVariants) {
          aiVariants.hidden = false;
          aiVariants.innerHTML = `
            <div class="campaign-builder__ai-variant campaign-builder__ai-variant--selected"
              style="aspect-ratio:${state.ad_format === 'stories' ? '9/16' : '1.91'}; max-height:160px;">
              <img src="${image.image_url}" alt="Сгенерированное изображение" loading="lazy" />
              <span class="campaign-builder__ai-variant-check">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </div>`;
        }
      } catch (err) {
        genImageBtn.classList.remove('is-loading');
        genImageBtn.disabled = false;
        if (genImageLabel) genImageLabel.textContent = 'Сгенерировать из описания';

        let msg = 'Не удалось сгенерировать изображение. Попробуйте ещё раз.';
        if (err instanceof ApiRequestError && err.status === 402) {
          msg = 'Генерация изображений доступна только на тарифе Pro. Перейдите в профиль, чтобы оформить подписку.';
        } else if (err instanceof ApiRequestError && err.status >= 500) {
          msg = 'Сервис генерации временно недоступен. Попробуйте позже.';
        }

        if (genErrorEl) { genErrorEl.textContent = msg; genErrorEl.hidden = false; }
        showToast('Ошибка генерации', msg, 'error');
      }
    })();
  }, { signal });

  // ── Инициализация ─────────────────────────────────────────────────────────

  syncAgeRangeOptions();
  updateAdPreview();
  goToStep(1);

  return () => controller.abort();
}
