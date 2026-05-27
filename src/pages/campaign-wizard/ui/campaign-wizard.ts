import './campaign-wizard.scss';
import { initCampaignBuilderSelectArrows } from 'shared/lib/campaign-builder-select-arrow';
import { showToast } from 'shared/lib/toast';
import { createAdCampaign } from 'features/ads/api/create-ad-campaign';
import { createAdGroup } from 'features/ads/api/ad-groups';
import { createAdInGroup } from 'features/ads/api/ads';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import {
  createInitialWizardState,
  getWizardReviewData,
  normalizeUrl,
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

  function showFile(file: File): void {
    state.ad_image = file;
    const url = URL.createObjectURL(file);
    if (previewImg)  previewImg.src = url;
    if (previewName) previewName.textContent = file.name;
    if (placeholder) placeholder.hidden = true;
    if (preview)     preview.hidden = false;
    updateAdPreview();
  }

  function clearFile(): void {
    state.ad_image = null;
    if (fileInput)   fileInput.value = '';
    if (placeholder) placeholder.hidden = false;
    if (preview)     preview.hidden = true;
  }

  fileInput?.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) showFile(f);
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
    if (f?.type.startsWith('image/')) showFile(f);
  }, { signal });

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

    if (imgEl && state.ad_image) {
      const existing = imgEl.querySelector('img');
      const src = URL.createObjectURL(state.ad_image);
      if (existing) {
        existing.src = src;
      } else {
        imgEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = src; img.alt = '';
        imgEl.appendChild(img);
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

    if (state.ad_image) {
      const imgEl4 = r4('[data-cw-review-image]');
      if (imgEl4 && !imgEl4.querySelector('img')) {
        imgEl4.innerHTML = '';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(state.ad_image);
        img.alt = '';
        imgEl4.appendChild(img);
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

  // Инициализация
  syncAgeRangeOptions();
  updateAdPreview();
  goToStep(1);

  return () => controller.abort();
}
