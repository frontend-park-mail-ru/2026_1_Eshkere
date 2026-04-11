import { AUDIENCE_PRESET_CONFIGS } from 'features/campaign-builder/model/config';
import type {
  BuilderState,
  SavedAudiencePreset,
  ToastPayload,
} from 'features/campaign-builder/model/types';

interface InitCampaignBuilderAudiencePresetsParams {
  cloneAudienceConfig: (
    value: BuilderState['audienceConfig'],
  ) => BuilderState['audienceConfig'];
  formatSavedAudienceSummary: (config: BuilderState['audienceConfig']) => string;
  getSavedAudiences: () => SavedAudiencePreset[];
  persistSavedAudiences: (items: SavedAudiencePreset[]) => void;
  persistState: (state: BuilderState) => void;
  renderSavedAudiencesList: (state: BuilderState) => void;
  showToast: (payload: ToastPayload) => void;
  signal: AbortSignal;
  state: BuilderState;
  syncBuilder: (state: BuilderState) => void;
}

export function initCampaignBuilderAudiencePresets({
  cloneAudienceConfig,
  formatSavedAudienceSummary,
  getSavedAudiences,
  persistSavedAudiences,
  persistState,
  renderSavedAudiencesList,
  showToast,
  signal,
  state,
  syncBuilder,
}: InitCampaignBuilderAudiencePresetsParams): void {
  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-chip]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const chip = button.dataset.chip as BuilderState['audienceChip'] | undefined;
          if (!chip) {
            return;
          }

          state.audienceChip = chip;
          state.audienceConfig = {
            ...AUDIENCE_PRESET_CONFIGS[chip],
            cities: [...AUDIENCE_PRESET_CONFIGS[chip].cities],
            profileTags: [...AUDIENCE_PRESET_CONFIGS[chip].profileTags],
            exclusions: [...AUDIENCE_PRESET_CONFIGS[chip].exclusions],
            interests: [...AUDIENCE_PRESET_CONFIGS[chip].interests],
            matchingMode: AUDIENCE_PRESET_CONFIGS[chip].matchingMode,
            expansionEnabled: AUDIENCE_PRESET_CONFIGS[chip].expansionEnabled,
            profilePriority: AUDIENCE_PRESET_CONFIGS[chip].profilePriority,
            interestsPriority: AUDIENCE_PRESET_CONFIGS[chip].interestsPriority,
          };
          persistState(state);
          syncBuilder(state);
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-setting]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const key = button.dataset.builderAudienceSetting;
          const value = button.dataset.value;

          if (!key || !value) {
            return;
          }

          if (key === 'matchingMode') {
            state.audienceConfig.matchingMode =
              value as BuilderState['audienceConfig']['matchingMode'];
          } else if (key === 'profilePriority') {
            state.audienceConfig.profilePriority =
              value as BuilderState['audienceConfig']['profilePriority'];
          } else if (key === 'interestsPriority') {
            state.audienceConfig.interestsPriority =
              value as BuilderState['audienceConfig']['interestsPriority'];
          }

          persistState(state);
          syncBuilder(state);
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-toggle="expansionEnabled"]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          state.audienceConfig.expansionEnabled = !state.audienceConfig.expansionEnabled;
          persistState(state);
          syncBuilder(state);
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-save-audience]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const name = window.prompt(
            'Название аудитории',
            `Аудитория ${state.audienceConfig.ageRange}`,
          );

          if (!name || !name.trim()) {
            return;
          }

          const items = getSavedAudiences();
          const preset: SavedAudiencePreset = {
            id: `${Date.now()}`,
            name: name.trim(),
            summary: formatSavedAudienceSummary(state.audienceConfig),
            config: cloneAudienceConfig(state.audienceConfig),
          };

          persistSavedAudiences([preset, ...items].slice(0, 8));
          renderSavedAudiencesList(state);
          showToast({
            title: 'Аудитория сохранена',
            description: `Набор "${preset.name}" теперь можно быстро применить в новых кампаниях.`,
          });
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-saved-audiences]')
    .forEach((container) => {
      container.addEventListener(
        'click',
        (event) => {
          const target = event.target;

          if (!(target instanceof HTMLElement)) {
            return;
          }

          const applyButton = target.closest<HTMLElement>('[data-builder-apply-audience]');
          const deleteButton = target.closest<HTMLElement>('[data-builder-delete-audience]');

          if (applyButton?.dataset.builderApplyAudience) {
            const preset = getSavedAudiences().find(
              (item) => item.id === applyButton.dataset.builderApplyAudience,
            );

            if (!preset) {
              return;
            }

            state.audienceConfig = cloneAudienceConfig(preset.config);
            persistState(state);
            syncBuilder(state);
            showToast({
              title: 'Аудитория применена',
              description: `Настройки из "${preset.name}" перенесены в текущую кампанию.`,
            });
            return;
          }

          if (deleteButton?.dataset.builderDeleteAudience) {
            const nextItems = getSavedAudiences().filter(
              (item) => item.id !== deleteButton.dataset.builderDeleteAudience,
            );

            persistSavedAudiences(nextItems);
            renderSavedAudiencesList(state);
            showToast({
              title: 'Аудитория удалена',
              description:
                'Сохранённый набор больше не будет доступен в быстрых сценариях.',
            });
          }
        },
        { signal },
      );
    });
}
