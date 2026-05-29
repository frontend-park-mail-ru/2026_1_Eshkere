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
}
