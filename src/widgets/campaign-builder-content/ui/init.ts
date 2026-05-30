import { CONTENT_LIMITS, DEFAULT_STATE } from 'features/campaign-builder/model/config';
import type {
  BuilderState,
  CreativeAssetKey,
  FormatKey,
  GoalKey,
  StrategyKey,
  ToastPayload,
} from 'features/campaign-builder/model/types';
import { openImageCropModal, type ImageCropRatio } from 'widgets/image-crop-modal';
import { generateAdImage, type AiImageStyle } from 'features/ads/api/ai-image';
import { ApiRequestError } from 'shared/lib/request';
import { markMotionUpdated, setupMotionEnhancements } from 'shared/lib/animations';

interface InitCampaignBuilderContentControlsParams {
  clampText: (value: string, limit: number) => string;
  getSelectOptionDefaultMeta: (key?: string, value?: string) => string;
  persistState: (state: BuilderState) => void;
  showToast: (payload: ToastPayload) => void;
  signal: AbortSignal;
  state: BuilderState;
  syncBuilder: (state: BuilderState) => void;
}

export function initCampaignBuilderContentControls({
  clampText,
  getSelectOptionDefaultMeta,
  persistState,
  showToast,
  signal,
  state,
  syncBuilder,
}: InitCampaignBuilderContentControlsParams): void {
  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-builder-input]')
    .forEach((field) => {
      field.addEventListener(
        'input',
        () => {
          const key = field.dataset.builderInput as keyof BuilderState | undefined;
          if (!key) {
            return;
          }

          let nextValue = field.value;

          if (key === 'name') {
            nextValue = clampText(nextValue, CONTENT_LIMITS.name);
          } else if (key === 'headline') {
            nextValue = clampText(nextValue, CONTENT_LIMITS.headline);
          } else if (key === 'description') {
            nextValue = clampText(nextValue, CONTENT_LIMITS.description);
          } else if (key === 'cta') {
            nextValue = clampText(nextValue, CONTENT_LIMITS.cta);
          }

          field.value = nextValue;
          state[key] = nextValue as never;

          if (
            key === 'name' ||
            key === 'headline' ||
            key === 'description' ||
            key === 'cta' ||
            key === 'link'
          ) {
            const isExample = nextValue === (DEFAULT_STATE[key] as string);
            field.classList.toggle('campaign-builder__input--example', isExample);
          }

          persistState(state);
          syncBuilder(state);
        },
        { signal },
      );

      if (field.dataset.builderInput === 'link') {
        field.addEventListener(
          'blur',
          () => {
            const value = field.value.trim();

            if (
              value &&
              !value.startsWith('http://') &&
              !value.startsWith('https://')
            ) {
              field.value = `https://${value}`;
              state.link = field.value;
              persistState(state);
              syncBuilder(state);
            }
          },
          { signal },
        );
      }
    });

  const closeSelects = (): void => {
    document
      .querySelectorAll<HTMLElement>('[data-builder-select]')
      .forEach((select) => {
        select.classList.remove('campaign-builder__select--open');
        select
          .querySelector<HTMLElement>('[data-builder-select-menu]')
          ?.setAttribute('hidden', '');
        select
          .querySelector<HTMLElement>('[data-builder-select-trigger]')
          ?.setAttribute('aria-expanded', 'false');
      });
  };

  document
    .querySelectorAll<HTMLElement>('[data-builder-select]')
    .forEach((select) => {
      const trigger = select.querySelector<HTMLElement>('[data-builder-select-trigger]');
      const menu = select.querySelector<HTMLElement>('[data-builder-select-menu]');

      trigger?.addEventListener(
        'click',
        (event) => {
          event.preventDefault();

          const isOpen = select.classList.contains('campaign-builder__select--open');
          closeSelects();

          if (!isOpen) {
            select.classList.add('campaign-builder__select--open');
            menu?.removeAttribute('hidden');
            trigger.setAttribute('aria-expanded', 'true');
          }
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-select-option]')
    .forEach((option) => {
      const meta = option.querySelector<HTMLElement>('.campaign-builder__select-option-meta');
      if (meta) {
        meta.dataset.defaultMeta = getSelectOptionDefaultMeta(
          option.dataset.selectKey,
          option.dataset.value,
        );
      }

      option.addEventListener(
        'click',
        () => {
          const key = option.dataset.selectKey;
          const value = option.dataset.value;

          if (!key || !value) {
            return;
          }

          if (key === 'format') {
            state.format = value as FormatKey;
          } else if (key === 'goal') {
            state.goal = value as GoalKey;
          } else if (key === 'strategy') {
            state.strategy = value as StrategyKey;
          }

          persistState(state);
          syncBuilder(state);
          closeSelects();
        },
        { signal },
      );
    });

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-builder-select]')) {
        return;
      }

      closeSelects();
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        closeSelects();
      }
    },
    { signal },
  );

  document
    .querySelectorAll<HTMLElement>('[data-builder-creative]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const creative = button.dataset.creative as BuilderState['creative'] | undefined;
          if (!creative) {
            return;
          }

          state.creative = creative;
          persistState(state);
          syncBuilder(state);
        },
        { signal },
      );
    });

  const IMAGE_SLOT_RATIOS: Partial<Record<CreativeAssetKey, ImageCropRatio>> = {
    feedVisual:  'feed',
    storyVisual: 'stories',
    videoCover:  'feed',
  };

  document
    .querySelectorAll<HTMLInputElement>('[data-builder-slot-input]')
    .forEach((input) => {
      input.addEventListener(
        'change',
        () => {
          void (async () => {
            const key = input.dataset.builderSlotInput as CreativeAssetKey | undefined;
            const files = input.files ? Array.from(input.files) : [];

            if (!key || files.length === 0) {
              return;
            }

            const firstFile = files[0];
            const expectsVideo = key === 'mainVideo' || key === 'verticalVideo';

            if (expectsVideo && !firstFile.type.startsWith('video/')) {
              input.value = '';
              showToast({
                title: 'Нужен видеофайл',
                description:
                  'Для этого слота загрузите MP4, MOV или другой видеофайл.',
              });
              return;
            }

            if (!expectsVideo && !firstFile.type.startsWith('image/')) {
              input.value = '';
              showToast({
                title: 'Нужно изображение',
                description:
                  'Для этого слота загрузите PNG, JPG или другое изображение.',
              });
              return;
            }

            let fileToUse = firstFile;
            const cropRatio = IMAGE_SLOT_RATIOS[key];
            if (cropRatio) {
              const cropResult = await openImageCropModal(firstFile, cropRatio);
              if (!cropResult) {
                input.value = '';
                return;
              }
              fileToUse = cropResult.file;
            }

            state.creativeAssets[key] = fileToUse.name;
            state.creativeFiles[key] = fileToUse;

            persistState(state);
            syncBuilder(state);
            markMotionUpdated(
              input.closest<HTMLElement>('[data-builder-creative-slot]'),
              'motion-upload-done',
              900,
            );
            showToast({
              title: 'Креатив обновлён',
              description: `Файл "${fileToUse.name}" сохранён в черновике кампании.`,
            });
            input.value = '';
          })();
        },
        { signal },
      );
    });

  // ─── AI: генерация текста ───────────────────────────────────────────────────

  const descTextarea = document.querySelector<HTMLTextAreaElement>('[data-builder-input="description"]');
  const headlineInput = document.querySelector<HTMLInputElement>('[data-builder-input="headline"]');
  const aiTextToggle  = document.querySelector<HTMLButtonElement>('[data-cb-ai-text-toggle]');
  const aiPanel       = document.querySelector<HTMLElement>('[data-cb-ai-panel]');
  const aiContextInput = document.querySelector<HTMLTextAreaElement>('[data-cb-ai-context]');
  const aiGenTextBtn  = document.querySelector<HTMLButtonElement>('[data-cb-ai-gen-text]');
  const aiGenTextLabel = document.querySelector<HTMLElement>('[data-cb-ai-gen-text-label]');

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
      const context = (aiContextInput?.value ?? '').trim() || (headlineInput?.value ?? '').trim() || 'продукт';

      aiGenTextBtn.disabled = true;
      aiGenTextBtn.classList.add('is-loading');
      if (aiGenTextLabel) aiGenTextLabel.textContent = 'Генерирую...';

      await new Promise((r) => setTimeout(r, 1200));

      const tpl = DESC_TEMPLATES[Math.floor(Math.random() * DESC_TEMPLATES.length)];
      const generated = tpl(context).substring(0, 180);

      descTextarea.value = generated;
      descTextarea.dispatchEvent(new Event('input'));
      state.description = generated;
      persistState(state);
      syncBuilder(state);

      aiGenTextBtn.classList.remove('is-loading');
      aiGenTextBtn.disabled = false;
      if (aiGenTextLabel) aiGenTextLabel.textContent = 'Сгенерировать';
      if (aiPanel) aiPanel.hidden = true;
      aiTextToggle?.classList.remove('is-active');
    })();
  }, { signal });

  // ─── AI: голосовой ввод ───────────────────────────────────────────────────────

  const voiceBtn = document.querySelector<HTMLButtonElement>('[data-cb-voice-btn]');

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
      showToast({ title: 'Не поддерживается', description: 'Голосовой ввод доступен только в Chrome и Edge.' });
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

    // Открываем AI-панель если закрыта
    if (aiPanel && aiPanel.hidden !== false) {
      aiPanel.hidden = false;
      aiTextToggle?.classList.add('is-active');
    }

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('');
      if (aiContextInput) {
        aiContextInput.value = transcript.substring(0, 300);
      }
    };

    recognition.onerror = stopRecording;
    recognition.onend   = stopRecording;
    recognition.start();
  }, { signal });

  // ─── AI: генерация изображений ────────────────────────────────────────────────

  const genImageBtn    = document.querySelector<HTMLButtonElement>('[data-cb-gen-image]');
  const genImageLabel  = document.querySelector<HTMLElement>('[data-cb-gen-image-label]');
  const aiVariants     = document.querySelector<HTMLElement>('[data-cb-ai-variants]');
  const genErrorEl     = document.querySelector<HTMLElement>('[data-cb-gen-error]');
  const aiImageSection = document.querySelector<HTMLElement>('[data-cb-ai-image-section]');

  let currentCbStyle: AiImageStyle = 'clean';
  const cbGenerationKey = crypto.randomUUID();
  const CB_MAX_REGEN = 3;
  let cbRegenLeft = CB_MAX_REGEN;

  // Показываем секцию только для feed/stories (не для video)
  function updateAiImageSectionVisibility(): void {
    if (aiImageSection) {
      aiImageSection.hidden = state.creative === 'video';
    }
  }

  function updateGenImageBtn(): void {
    const hasDesc = (state.description?.trim() ?? '').length > 0;
    if (genImageBtn) genImageBtn.disabled = !hasDesc;
  }

  updateAiImageSectionVisibility();
  updateGenImageBtn();

  // Обновляем видимость при смене creatives (пользователь переключает Лента/Stories/Видео)
  document.querySelectorAll<HTMLElement>('[data-builder-creative]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTimeout(() => {
        updateAiImageSectionVisibility();
        updateGenImageBtn();
      }, 0);
    }, { signal });
  });

  descTextarea?.addEventListener('input', updateGenImageBtn, { signal });

  // Стиль-чипы
  document.querySelectorAll<HTMLButtonElement>('[data-cb-style]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-cb-style]').forEach((c) => c.classList.remove('campaign-builder__ai-style-chip--active'));
      chip.classList.add('campaign-builder__ai-style-chip--active');
      currentCbStyle = chip.dataset.cbStyle as AiImageStyle;
    }, { signal });
  });

  genImageBtn?.addEventListener('click', () => {
    void (async () => {
      if (!genImageBtn || !aiVariants) return;

      const prompt = (state.description?.trim() || state.headline?.trim() || '').substring(0, 400);
      if (!prompt) return;

      const format = state.creative === 'stories' ? 'stories' : 'feed';

      if (genErrorEl) genErrorEl.hidden = true;
      genImageBtn.disabled = true;
      genImageBtn.classList.add('is-loading');
      if (genImageLabel) genImageLabel.textContent = 'Генерирую варианты...';

      aiVariants.hidden = false;
      aiVariants.innerHTML = `
        <div class="campaign-builder__ai-variant campaign-builder__ai-variant--skeleton"></div>
        <div class="campaign-builder__ai-variant campaign-builder__ai-variant--skeleton"></div>
        <div class="campaign-builder__ai-variant campaign-builder__ai-variant--skeleton"></div>`;
      setupMotionEnhancements(aiVariants);

      try {
        const image = await generateAdImage({
          prompt,
          style:          currentCbStyle,
          format,
          generation_key: cbGenerationKey,
        });

        cbRegenLeft = Math.max(0, cbRegenLeft - 1);

        const slotKey: CreativeAssetKey = state.creative === 'stories' ? 'storyVisual' : 'feedVisual';

        aiVariants.hidden = false;
        aiVariants.innerHTML = `
          <div class="campaign-builder__ai-variant campaign-builder__ai-variant--selected" style="aspect-ratio:${format === 'stories' ? '9/16' : '1.91'}; max-height:180px;">
            <img src="${image.image_url}" alt="Сгенерированное изображение" loading="lazy" />
            <span class="campaign-builder__ai-variant-check">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </div>`;
        setupMotionEnhancements(aiVariants);

        genImageBtn.classList.remove('is-loading');
        genImageBtn.disabled = cbRegenLeft === 0;
        if (genImageLabel) {
          genImageLabel.textContent = cbRegenLeft > 0
            ? `Перегенерировать (осталось ${cbRegenLeft})`
            : 'Лимит регенераций исчерпан';
        }

        // Сохраняем в state
        void (async () => {
          try {
            const res = await fetch(image.image_url);
            const blob = await res.blob();
            const filename = `ai_${slotKey}_${Date.now()}.jpg`;
            const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
            state.creativeAssets[slotKey] = filename;
            state.creativeFiles[slotKey]  = file;
            persistState(state);
            syncBuilder(state);
            showToast({ title: 'Изображение выбрано', description: `Сохранено для ${slotKey === 'feedVisual' ? 'Ленты' : 'Stories'}.` });
          } catch {
            showToast({ title: 'Не удалось сохранить', description: 'Скачайте картинку и загрузите вручную.' });
          }
        })();
      } catch (err) {
        aiVariants.hidden = true;
        aiVariants.innerHTML = '';
        genImageBtn.classList.remove('is-loading');
        genImageBtn.disabled = false;
        if (genImageLabel) genImageLabel.textContent = 'Сгенерировать из описания';

        let msg = 'Не удалось сгенерировать изображения. Попробуйте ещё раз.';
        if (err instanceof ApiRequestError && err.status === 402) {
          msg = 'Генерация изображений доступна только на тарифе Pro. Перейдите в профиль, чтобы оформить подписку.';
        } else if (err instanceof ApiRequestError && err.status >= 500) {
          msg = 'Сервис генерации временно недоступен. Попробуйте позже.';
        }

        if (genErrorEl) { genErrorEl.textContent = msg; genErrorEl.hidden = false; }
        showToast({ title: 'Ошибка генерации', description: msg });
      }
    })();
  }, { signal });
}
