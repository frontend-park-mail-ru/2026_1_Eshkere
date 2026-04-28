import {
  LocalStorageKey,
  createLocalStorageKey,
  localStorageService,
} from 'shared/lib/local-storage';
import {
  AUDIENCE_PRESET_CONFIGS,
  DEFAULT_STATE,
  GOAL_LABELS,
} from './config';
import type {
  BuilderAudienceConfig,
  BuilderMode,
  BuilderModeConfig,
  BuilderState,
  CampaignEditSeed,
  GoalKey,
} from './types';

let builderSavedAt = Date.now();

const CAMPAIGN_CREATE_STORAGE_KEY = LocalStorageKey.CampaignBuilderDraft;
const CAMPAIGN_EDIT_STORAGE_KEY = LocalStorageKey.CampaignEditBuilderState;
const CAMPAIGN_EDIT_SEED_KEY = LocalStorageKey.CampaignEditSeed;

export function getBuilderMode(): BuilderMode {
  return window.location.pathname === '/ads/edit' ? 'edit' : 'create';
}

export function getBuilderModeConfig(
  mode: BuilderMode = getBuilderMode(),
): BuilderModeConfig {
  if (mode === 'edit') {
    return {
      title: 'Редактирование объявления',
      subtitle: 'Обновите объявление по шагам и сохраните после финальной проверки.',
      closeLabel: 'Вернуться к списку',
      duplicateLabel: 'Сделать копию',
      resetLabel: 'Сбросить изменения',
      primaryActionLabel: 'Сохранить изменения',
      saveStateFallback: 'Изменения сохранены',
      reviewTitle: 'Финальная сверка перед сохранением',
      reviewReadyText:
        'Все обязательные блоки заполнены. Сверьте ключевые параметры ниже перед сохранением.',
      reviewPendingPrefix: 'Исправьте перед сохранением:',
      lockedTitle: 'Перейдите к проверке',
      lockedDescription: 'Сохранять изменения можно только на шаге «Проверка».',
      submitSuccessTitle: 'Изменения сохранены',
      submitSuccessDescription:
        'Обновлённая версия объявления сохранена. При необходимости вернитесь к нужному шагу и внесите дополнительные правки.',
      submitValidationTitle: 'Не всё готово к сохранению',
    };
  }

  return {
    title: 'Создание объявления',
    subtitle: 'Четыре шага: контент, аудитория, бюджет и финальная проверка перед запуском.',
    closeLabel: 'Закрыть',
    duplicateLabel: 'Создать копию',
    resetLabel: 'Очистить форму',
    primaryActionLabel: 'Отправить на модерацию',
    saveStateFallback: 'Черновик сохранён',
    reviewTitle: 'Финальная сверка перед отправкой',
    reviewReadyText:
      'Все обязательные блоки заполнены. Сверьте ключевые параметры ниже.',
    reviewPendingPrefix: 'Исправьте:',
    lockedTitle: 'Перейдите к проверке',
    lockedDescription: 'Финальная отправка доступна на шаге «Проверка».',
    submitSuccessTitle: 'Отправлено на модерацию',
    submitSuccessDescription:
      'Кампания собрана корректно. Проверьте финальную сводку и дождитесь проверки.',
    submitValidationTitle: 'Проверьте форму',
  };
}

export function formatSaveStateLabel(): string {
  const mode = getBuilderModeConfig();
  const delta = Math.max(0, Math.round((Date.now() - builderSavedAt) / 1000));

  if (delta < 5) {
    return 'Сохранено только что';
  }

  if (delta < 60) {
    return `Сохранено ${delta} сек назад`;
  }

  return mode.saveStateFallback;
}

function createBuilderBaseState(): BuilderState {
  return {
    ...DEFAULT_STATE,
    creativeAssets: { ...DEFAULT_STATE.creativeAssets },
    audienceConfig: {
      ...DEFAULT_STATE.audienceConfig,
      cities: [...DEFAULT_STATE.audienceConfig.cities],
      profileTags: [...DEFAULT_STATE.audienceConfig.profileTags],
      exclusions: [...DEFAULT_STATE.audienceConfig.exclusions],
      interests: [...DEFAULT_STATE.audienceConfig.interests],
      matchingMode: DEFAULT_STATE.audienceConfig.matchingMode,
      expansionEnabled: DEFAULT_STATE.audienceConfig.expansionEnabled,
      profilePriority: DEFAULT_STATE.audienceConfig.profilePriority,
      interestsPriority: DEFAULT_STATE.audienceConfig.interestsPriority,
    },
  };
}

function getCampaignEditSeed(): CampaignEditSeed | null {
  const parsed = localStorageService.getJson<Partial<CampaignEditSeed>>(
    CAMPAIGN_EDIT_SEED_KEY,
  );

  if (!parsed) {
    return null;
  }

  const rawId = typeof parsed.id === 'string' ? parsed.id.trim() : '';
  if (!rawId) {
    return null;
  }

  return {
    id: rawId,
    title: typeof parsed.title === 'string' ? parsed.title : '',
    budgetValue:
      typeof parsed.budgetValue === 'number' &&
      Number.isFinite(parsed.budgetValue)
        ? parsed.budgetValue
        : 0,
    goal: typeof parsed.goal === 'string' ? parsed.goal : '',
  };
}

function mapSeedGoalToGoalKey(goal: string): GoalKey {
  const normalized = goal.trim().toLowerCase();

  if (normalized.includes('лид') || normalized.includes('заяв')) {
    return 'leads';
  }

  if (normalized.includes('охват') || normalized.includes('узнава')) {
    return 'awareness';
  }

  return 'website';
}

function getDefaultCtaByGoal(goal: GoalKey): string {
  if (goal === 'leads') {
    return 'Оставить заявку';
  }

  if (goal === 'awareness') {
    return 'Узнать больше';
  }

  return 'Перейти на сайт';
}

function getBuilderStorageKey(mode: BuilderMode = getBuilderMode()): string {
  if (mode === 'edit') {
    const seed = getCampaignEditSeed();
    return createLocalStorageKey(CAMPAIGN_EDIT_STORAGE_KEY, seed?.id || 'seedless');
  }

  return CAMPAIGN_CREATE_STORAGE_KEY;
}

function createEditBuilderState(): BuilderState {
  const base = createBuilderBaseState();
  const seed = getCampaignEditSeed();
  const goal = seed?.goal ? mapSeedGoalToGoalKey(seed.goal) : base.goal;
  const dailyBudget =
    seed?.budgetValue && seed.budgetValue > 0
      ? Math.max(1000, Math.round(seed.budgetValue))
      : base.dailyBudget;

  return {
    ...base,
    step: 'content',
    name: seed?.title || `${base.name} — версия 2`,
    goal,
    cta: getDefaultCtaByGoal(goal),
    dailyBudget,
    totalBudget: Math.max(base.totalBudget, dailyBudget * 12),
  };
}

export function persistEditSeedFromState(state: BuilderState): void {
  if (getBuilderMode() !== 'edit') {
    return;
  }

  const seed = getCampaignEditSeed();

  localStorageService.setJson(CAMPAIGN_EDIT_SEED_KEY, {
    id: seed?.id || '',
    title: state.name,
    budgetValue: state.dailyBudget,
    goal: GOAL_LABELS[state.goal],
  });
}

export function getBuilderState(): BuilderState {
  const mode = getBuilderMode();
  if (mode === 'edit' && !getCampaignEditSeed()) {
    localStorageService.removeItem(getBuilderStorageKey(mode));
    return createBuilderBaseState();
  }

  const parsed = localStorageService.getJson<
    Partial<BuilderState> & {
      audienceConfig?: Partial<BuilderState['audienceConfig']> & {
        age?: string;
      };
    }
  >(getBuilderStorageKey(mode));

  if (!parsed) {
    return mode === 'edit'
      ? createEditBuilderState()
      : createBuilderBaseState();
  }

  const fallbackState =
    mode === 'edit' ? createEditBuilderState() : createBuilderBaseState();
  const fallbackAudience =
    AUDIENCE_PRESET_CONFIGS[parsed.audienceChip || fallbackState.audienceChip];
  const storedAudience: Partial<BuilderAudienceConfig> & { age?: string } =
    parsed.audienceConfig || {};

  return {
    ...fallbackState,
    ...parsed,
    audienceConfig: {
      cities: Array.isArray(storedAudience.cities)
        ? storedAudience.cities
        : [...fallbackAudience.cities],
      ageRange:
        typeof storedAudience.ageRange === 'string' && storedAudience.ageRange
          ? storedAudience.ageRange
          : typeof storedAudience.age === 'string' && storedAudience.age
            ? storedAudience.age.split(',')[0]?.trim() ||
              fallbackAudience.ageRange
            : fallbackAudience.ageRange,
      profileTags: Array.isArray(storedAudience.profileTags)
        ? storedAudience.profileTags
        : typeof storedAudience.age === 'string' &&
            storedAudience.age.includes(',')
          ? storedAudience.age
              .split(',')
              .slice(1)
              .map((item: string) => item.trim())
              .filter(Boolean)
          : [...fallbackAudience.profileTags],
      exclusions: Array.isArray(storedAudience.exclusions)
        ? storedAudience.exclusions
        : [...fallbackAudience.exclusions],
      interests: Array.isArray(storedAudience.interests)
        ? storedAudience.interests
        : [...fallbackAudience.interests],
      matchingMode:
        storedAudience.matchingMode === 'any' ||
        storedAudience.matchingMode === 'balanced' ||
        storedAudience.matchingMode === 'strict'
          ? storedAudience.matchingMode
          : fallbackAudience.matchingMode,
      expansionEnabled:
        typeof storedAudience.expansionEnabled === 'boolean'
          ? storedAudience.expansionEnabled
          : fallbackAudience.expansionEnabled,
      profilePriority:
        storedAudience.profilePriority === 'primary' ||
        storedAudience.profilePriority === 'secondary'
          ? storedAudience.profilePriority
          : fallbackAudience.profilePriority,
      interestsPriority:
        storedAudience.interestsPriority === 'primary' ||
        storedAudience.interestsPriority === 'secondary'
          ? storedAudience.interestsPriority
          : fallbackAudience.interestsPriority,
    },
  };
}

export function persistBuilderState(state: BuilderState): void {
  localStorageService.setJson(getBuilderStorageKey(), state);
  builderSavedAt = Date.now();
}

export function resetBuilderState(): BuilderState {
  const mode = getBuilderMode();
  localStorageService.removeItem(getBuilderStorageKey(mode));
  builderSavedAt = Date.now();
  return mode === 'edit' ? createEditBuilderState() : createBuilderBaseState();
}
