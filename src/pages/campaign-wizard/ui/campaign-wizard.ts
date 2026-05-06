import './campaign-wizard.scss';
import { showToast } from 'shared/lib/toast';
import { createAdCampaign } from 'features/ads/api/create-ad-campaign';
import { createAdGroup } from 'features/ads/api/ad-groups';
import { createAdInGroup } from 'features/ads/api/ads';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import campaignWizardTemplate from './campaign-wizard.hbs';

const DEFAULT_CPM_PRICE = 10000;

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Задайте базовые параметры кампании.',
  2: 'Настройте аудиторию первой группы объявлений.',
  3: 'Загрузите креатив и заполните текст первого объявления.',
  4: 'Проверьте данные и создайте кампанию.',
};

const REGION_LABELS: Record<number, string> = {
  1: 'Москва', 2: 'Санкт-Петербург', 3: 'Казань', 4: 'Екатеринбург',
  5: 'Новосибирск', 6: 'Краснодар', 7: 'Нижний Новгород',
  8: 'Самара', 9: 'Ростов-на-Дону', 10: 'Весь РФ',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Мужчины', female: 'Женщины', any: 'Все',
};

export async function renderCampaignWizardPage(): Promise<string> {
  return renderTemplate(campaignWizardTemplate, {});
}

export function CampaignWizard(): VoidFunction {
  const rootEl = document.querySelector<HTMLElement>('[data-cw]');
  if (!rootEl) return () => {};
  const root: HTMLElement = rootEl;

  const controller = new AbortController();
  const { signal } = controller;

  let currentStep = 1;
  const TOTAL_STEPS = 4;

  // State
  const state = {
    name: '',
    objective: 'leads' as string,
    main_action: 'click' as 'click' | 'look',
    daily_budget: undefined as number | undefined,
    group_name: '',
    age_from: 18,
    age_to: 34,
    gender: 'any' as 'male' | 'female' | 'any',
    region_id: 1,
    topic_id: 1,
    ad_title: '',
    ad_desc: '',
    ad_url: '',
    ad_cta: 'Узнать подробнее',
    ad_format: 'feed' as 'feed' | 'stories' | 'banner' | 'fullscreen',
    ad_image: null as File | null,
  };

  const subtitle    = root.querySelector<HTMLElement>('[data-cw-step-subtitle]');
  const stepBtns    = root.querySelectorAll<HTMLButtonElement>('[data-cw-step-btn]');
  const submitError = root.querySelector<HTMLElement>('[data-cw-error="submit"]');

  function getPanel(step: number): HTMLElement | null {
    return root.querySelector(`[data-cw-panel="${step}"]`);
  }

  function goToStep(step: number): void {
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
    state.name         = getFieldValue('name').trim();
    state.group_name   = getFieldValue('group_name').trim();
    state.age_from     = parseInt(getFieldValue('age_from'), 10) || 18;
    state.age_to       = parseInt(getFieldValue('age_to'), 10) || 34;
    state.gender       = (getFieldValue('gender') || 'any') as typeof state.gender;
    state.region_id    = parseInt(getFieldValue('region_id'), 10) || 1;
    state.topic_id     = parseInt(getFieldValue('topic_id'), 10) || 1;
    state.ad_title     = getFieldValue('ad_title').trim();
    state.ad_desc      = getFieldValue('ad_desc').trim();
    state.ad_url       = getFieldValue('ad_url').trim();
    const budget       = getFieldValue('daily_budget');
    state.daily_budget = budget ? parseInt(budget, 10) : undefined;
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

  const STEP_NAMES: Record<number, string> = {
    1: 'Кампания', 2: 'Аудитория', 3: 'Объявление', 4: 'Итог',
  };

  function validateStep(step: number): boolean {
    clearErrors();
    syncStateFromFields();
    const issues: string[] = [];

    if (step === 1) {
      if (!state.name) {
        setError('name', 'Введите название кампании');
        issues.push('Укажите название кампании');
      }
      if (state.daily_budget === undefined) {
        setError('daily_budget', 'Укажите дневной бюджет');
        issues.push('Укажите дневной бюджет');
      } else if (state.daily_budget < 100) {
        setError('daily_budget', 'Минимальный бюджет — 100 ₽');
        issues.push('Минимальный бюджет — 100 ₽');
      }
    }

    if (step === 3) {
      if (!state.ad_title) { setError('ad_title', 'Введите заголовок'); issues.push('Заголовок объявления обязателен'); }
      if (!state.ad_desc)  { setError('ad_desc',  'Введите описание');  issues.push('Заполните описание объявления'); }
      if (!state.ad_url)   { setError('ad_url',   'Введите ссылку');    issues.push('Целевая ссылка обязательна'); }
    }

    if (issues.length > 0) {
      showToast(
        `Заполните раздел «${STEP_NAMES[step]}»`,
        issues.join(' · '),
        'error',
      );
      return false;
    }

    return true;
  }

  function updateReview(): void {
    if (currentStep !== 4) return;
    syncStateFromFields();

    const set = (key: string, val: string) => {
      const el = root.querySelector(`[data-cw-review="${key}"]`);
      if (el) el.textContent = val || '—';
    };

    const OBJECTIVE_LABELS: Record<string, string> = {
      leads:     'Заявки и лиды',
      traffic:   'Трафик на сайт',
      awareness: 'Узнаваемость бренда',
      installs:  'Установки приложения',
    };
    const goalLabel = OBJECTIVE_LABELS[state.objective] ?? 'Заявки и лиды';
    const audienceLabel = `${GENDER_LABELS[state.gender]}, ${state.age_from}–${state.age_to} лет`;

    set('name',       state.name);
    set('goal',       goalLabel);
    set('budget',     state.daily_budget ? `${state.daily_budget.toLocaleString('ru-RU')} ₽/день` : 'Не задан');
    set('group_name', state.group_name || `Группа — ${audienceLabel}`);
    set('audience',   audienceLabel);
    set('region',     REGION_LABELS[state.region_id] ?? '—');
    set('ad_title',   state.ad_title);
    set('ad_url',     state.ad_url);
    set('ad_image',   state.ad_image?.name ?? 'Не загружено');
  }

  async function handleSubmit(): Promise<void> {
    if (!validateStep(3)) { goToStep(3); return; }
    syncStateFromFields();

    root!.querySelectorAll<HTMLButtonElement>('[data-cw-next]').forEach((b) => { b.disabled = true; });
    if (submitError) submitError.hidden = true;

    const groupName = state.group_name.trim() ||
      `${GENDER_LABELS[state.gender]}, ${state.age_from}–${state.age_to} лет, ${REGION_LABELS[state.region_id]}`;

    try {
      const { id: campaignId } = await createAdCampaign({
        name: state.name,
        main_action: state.main_action,
        daily_budget: state.daily_budget ?? 0,
        cpm_price: DEFAULT_CPM_PRICE,
      });

      const { id: groupId } = await createAdGroup(campaignId, {
        name: groupName,
        age_from:  state.age_from,
        age_to:    state.age_to,
        gender:    state.gender,
        region_id: state.region_id,
        topic_id:  state.topic_id,
      });

      await createAdInGroup(
        campaignId,
        groupId,
        { title: state.ad_title, short_desc: state.ad_desc, target_url: state.ad_url },
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
        goToStep(currentStep + 1);
      } else {
        void handleSubmit();
      }
    }, { signal });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-cw-prev]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (currentStep > 1) goToStep(currentStep - 1);
    }, { signal });
  });

  root.querySelector<HTMLElement>('[data-cw-close]')?.addEventListener('click', () => {
    navigateTo('/ads');
  }, { signal });

  stepBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.dataset.cwStepBtn ?? '0', 10);
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
      state.main_action = btn.dataset.goal as 'click' | 'look';
      state.objective   = btn.dataset.objective ?? 'leads';
    }, { signal });
  });

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
      state.ad_format = btn.dataset.format as typeof state.ad_format;

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

  removeBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearFile(); }, { signal });

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
  updateAdPreview();
  goToStep(1);

  return () => controller.abort();
}
