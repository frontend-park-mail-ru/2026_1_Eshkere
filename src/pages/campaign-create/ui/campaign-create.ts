import './campaign-create.scss';
import { navigateTo } from 'app/navigation';
import { createAdCampaign, updateAdCampaign } from 'features/ads';
import { renderTemplate } from 'shared/lib/render';
import {
  LocalStorageKey,
  localStorageService,
} from 'shared/lib/local-storage';
import { REQUEST_ERROR_EVENT_NAME } from 'widgets/request-error-modal';
import campaignCreateTemplate from './campaign-create.hbs';

import {
  AUDIENCE_PRESET_CONFIGS,
  CONTENT_LIMITS,
  DEFAULT_STATE,
  FINAL_REVIEW_JUMP_TARGETS,
  FORMAT_LABELS,
  GOAL_LABELS,
  PROFILE_AGE_OPTIONS,
  PROFILE_TAG_RULES,
  STEP_META,
  STEP_ORDER,
  STRATEGY_LABELS,
} from 'features/campaign-builder/model/config';
import {
  formatSaveStateLabel,
  getBuilderMode,
  getBuilderModeConfig,
  getBuilderState,
  persistBuilderState,
  persistEditSeedFromState,
  resetBuilderState,
} from 'features/campaign-builder/model/state';
import type {
  AudienceChipKey,
  AudienceDetailKey,
  AudienceModalConfig,
  AudiencePresetSummary,
  AudienceSummary,
  BuilderHealth,
  BuilderState,
  CreativeAssetKey,
  CreativeKey,
  FieldErrors,
  FinalReviewCheck,
  FinalReviewCheckKey,
  FinalReviewData,
  FormatKey,
  GoalKey,
  SavedAudiencePreset,
  StepKey,
  StrategyKey,
  ToastPayload,
} from 'features/campaign-builder/model/types';
import { syncCampaignBuilderAudienceView } from 'widgets/campaign-builder-audience/ui/audience';
import { initCampaignBuilderAudienceControls } from 'widgets/campaign-builder-audience/ui/init';
import { initCampaignBuilderActions } from 'widgets/campaign-builder-actions/ui/actions';
import { syncCampaignBuilderBudgetView } from 'widgets/campaign-builder-budget/ui/budget';
import { initCampaignBuilderBudgetControls } from 'widgets/campaign-builder-budget/ui/init';
import { syncCampaignBuilderContentView } from 'widgets/campaign-builder-content/ui/content';
import { initCampaignBuilderContentControls } from 'widgets/campaign-builder-content/ui/init';
import { syncCampaignBuilderReviewView } from 'widgets/campaign-builder-review/ui/review';
import {
  syncCampaignBuilderHealthView,
  syncCampaignBuilderModeCopyView,
  syncCampaignBuilderSaveStateView,
  syncCampaignBuilderValidationView,
} from 'widgets/campaign-builder-status/ui/status';
import { syncCampaignBuilderStepView } from 'widgets/campaign-builder-step/ui/step';
import { initCampaignBuilderStepControls } from 'widgets/campaign-builder-step/ui/init';

let campaignCreateLifecycleController: AbortController | null = null;
let builderToastTimer: number | null = null;
const PROFILE_TAG_OPTIONS = [
  {
    value: 'Активная городская аудитория',
    description: 'Жители крупных городов с частыми онлайн-покупками.',
  },
  {
    value: 'Средний доход',
    description:
      'Аудитория с устойчивым средним чеком и понятной платёжеспособностью.',
  },
  {
    value: 'Покупатели маркетплейсов',
    description: 'Пользователи, регулярно покупающие через маркетплейсы.',
  },
  {
    value: 'Retail / e-com',
    description: 'Люди с привычкой сравнивать предложения и искать выгоду.',
  },
  {
    value: 'Маркетологи',
    description: 'Специалисты по продвижению, трафику и аналитике.',
  },
  {
    value: 'Владельцы SMB',
    description:
      'Небольшой и средний бизнес, принимающий решения самостоятельно.',
  },
  {
    value: 'Sales ops',
    description: 'Команды продаж, интересующиеся лидами и автоматизацией.',
  },
  {
    value: 'Look-alike',
    description: 'Похожие на текущую клиентскую базу сегменты.',
  },
  {
    value: 'Похожие на текущую клиентскую базу',
    description: 'Люди с поведением, близким к действующим клиентам.',
  },
  {
    value: 'Молодая аудитория',
    description: 'Пользователи 18-30 с быстрым откликом на оффер.',
  },
  {
    value: 'Digital / product',
    description:
      'Продакт- и digital-специалисты с высокой чувствительностью к value proposition.',
  },
  {
    value: 'Семейная аудитория',
    description: 'Домохозяйства и семейные покупатели с планированием бюджета.',
  },
  {
    value: 'Предприниматели',
    description: 'Люди, которые ищут инструменты роста и упрощения процессов.',
  },
  {
    value: 'Фрилансеры',
    description: 'Самозанятые и независимые специалисты с гибким спросом.',
  },
  {
    value: 'Premium-сегмент',
    description: 'Аудитория с повышенными требованиями к качеству и сервису.',
  },
  {
    value: 'B2B decision makers',
    description: 'Лица, принимающие решения по внедрению и закупкам.',
  },
] as const;

const SAVED_AUDIENCES_STORAGE_KEY =
  LocalStorageKey.CampaignBuilderSavedAudiences;

function cloneAudienceConfig(
  config: BuilderState['audienceConfig'],
): BuilderState['audienceConfig'] {
  return {
    ...config,
    cities: [...config.cities],
    profileTags: [...config.profileTags],
    exclusions: [...config.exclusions],
    interests: [...config.interests],
  };
}

function getSavedAudiences(): SavedAudiencePreset[] {
  const parsed = localStorageService.getJson<SavedAudiencePreset[]>(
    SAVED_AUDIENCES_STORAGE_KEY,
  );

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(
      (item) =>
        item && typeof item.id === 'string' && typeof item.name === 'string',
    )
    .map((item) => ({
      ...item,
      config: cloneAudienceConfig({
        ...DEFAULT_STATE.audienceConfig,
        ...item.config,
        cities: Array.isArray(item.config?.cities) ? item.config.cities : [],
        profileTags: Array.isArray(item.config?.profileTags)
          ? item.config.profileTags
          : [],
        exclusions: Array.isArray(item.config?.exclusions)
          ? item.config.exclusions
          : [],
        interests: Array.isArray(item.config?.interests)
          ? item.config.interests
          : [],
      }),
    }));
}

function persistSavedAudiences(items: SavedAudiencePreset[]): void {
  localStorageService.setJson(SAVED_AUDIENCES_STORAGE_KEY, items);
}

function formatSavedAudienceSummary(
  config: BuilderState['audienceConfig'],
): string {
  return `${config.cities.length} регионов, ${config.ageRange}, ${config.profileTags.length} профильных тегов`;
}

function formatAudienceProfile(
  ageRange: string,
  profileTags: string[],
): string {
  const safeAgeRange = ageRange || DEFAULT_STATE.audienceConfig.ageRange;
  const safeTags = Array.isArray(profileTags) ? profileTags : [];
  const suffix = safeTags.length ? `, ${safeTags.join(', ')}` : '';
  return `${safeAgeRange}${suffix}`;
}

function getProfileSelectionState(profileTags: string[]): {
  label: string;
  note: string;
  canSave: boolean;
  tone: 'info' | 'success' | 'warning';
} {
  const count = Array.isArray(profileTags) ? profileTags.length : 0;

  if (count < PROFILE_TAG_RULES.min) {
    return {
      label: `${count} выбрано`,
      note: 'Добавьте минимум 2 признака. Один тег делает сегмент слишком общим и плохо управляемым.',
      canSave: false,
      tone: 'warning',
    };
  }

  if (count <= PROFILE_TAG_RULES.optimalMax) {
    return {
      label: `${count} выбрано`,
      note: 'Хороший баланс между точностью и объёмом аудитории. Такой набор проще масштабировать.',
      canSave: true,
      tone: 'success',
    };
  }

  return {
      label: `${count} выбрано`,
      note: 'Сегмент становится уже. Проверьте, что каждый тег действительно нужен под этот оффер.',
      canSave: true,
      tone: 'info',
  };
}

function clampText(value: string, limit: number): string {
  return value.slice(0, limit);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getFieldErrors(state: BuilderState): FieldErrors {
  const errors: FieldErrors = {};

  if (!state.name.trim()) {
    errors.name = 'Укажите внутреннее название кампании.';
  }

  if (!state.headline.trim()) {
    errors.headline = 'Добавьте заголовок объявления.';
  } else if (state.headline.trim().length > CONTENT_LIMITS.headline) {
    errors.headline = 'Заголовок должен быть не длиннее 60 символов.';
  }

  if (!state.description.trim()) {
    errors.description = 'Добавьте основной текст объявления.';
  } else if (state.description.trim().length > CONTENT_LIMITS.description) {
    errors.description =
      'Текст объявления должен быть не длиннее 180 символов.';
  }

  if (!state.cta.trim()) {
    errors.cta = 'Укажите текст кнопки.';
  }

  if (!state.link.trim()) {
    errors.link = 'Добавьте ссылку перехода.';
  } else if (!isValidHttpUrl(state.link.trim())) {
    errors.link = 'Нужна полная ссылка, например https://example.ru.';
  }

  if (!Number.isFinite(state.dailyBudget) || state.dailyBudget < 1000) {
    errors.dailyBudget = 'Минимальный дневной бюджет: 1 000 ₽.';
  }

  if (!Number.isFinite(state.totalBudget) || state.totalBudget < 1000) {
    errors.totalBudget = 'Минимальный общий лимит: 1 000 ₽.';
  } else if (state.totalBudget < state.dailyBudget) {
    errors.totalBudget = 'Общий лимит не может быть меньше дневного бюджета.';
  }

  if (!state.period.trim()) {
    errors.period = 'Укажите период показа.';
  }

  if (!state.strategy.trim()) {
    errors.strategy = 'Выберите стратегию показа.';
  }

  return errors;
}

function getRequiredCreativeKeys(creative: CreativeKey): CreativeAssetKey[] {
  if (creative === 'video') {
    return ['mainVideo', 'verticalVideo', 'videoCover'];
  }

  if (creative === 'stories') {
    return ['storyVisual'];
  }

  return ['feedVisual'];
}

function getMissingCreativeSlots(
  state: BuilderState,
): Array<ReturnType<typeof getCreativeSlots>[number]> {
  const creativeSlots = getCreativeSlots(state.creative, state.creativeAssets);
  const requiredCreativeKeys = getRequiredCreativeKeys(state.creative);

  return creativeSlots.filter(
    (slot) =>
      requiredCreativeKeys.includes(slot.key) &&
      !state.creativeAssets[slot.key],
  );
}

function getAudienceGaps(state: BuilderState): string[] {
  const gaps: string[] = [];

  if (!state.audienceConfig.cities.length) gaps.push('географию');
  if (!state.audienceConfig.ageRange.trim()) gaps.push('возрастной диапазон');
  if (!state.audienceConfig.profileTags.length) gaps.push('профиль аудитории');
  if (!state.audienceConfig.interests.length) gaps.push('интересы');

  return gaps;
}

function validateStep(
  state: BuilderState,
  step: StepKey,
): {
  ok: boolean;
  step?: StepKey;
  title?: string;
  description?: string;
} {
  const errors = getFieldErrors(state);

  if (step === 'content') {
    if (
      errors.name ||
      errors.headline ||
      errors.description ||
      errors.cta ||
      errors.link
    ) {
      return {
        ok: false,
        step: 'content',
        title: 'Проверьте основные данные',
        description:
          'Заполните название, заголовок, текст, кнопку и ссылку перед переходом дальше.',
      };
    }

    const missingCreativeSlots = getMissingCreativeSlots(state);
    if (missingCreativeSlots.length) {
      return {
        ok: false,
        step: 'content',
        title: 'Добавьте креативы',
        description: `Загрузите: ${missingCreativeSlots
          .map((slot) => slot.title.toLowerCase())
          .join(', ')}.`,
      };
    }
  }

  if (step === 'audience') {
    const audienceGaps = getAudienceGaps(state);
    if (audienceGaps.length) {
      return {
        ok: false,
        step: 'audience',
        title: 'Проверьте аудиторию',
        description: `Уточните ${audienceGaps.join(', ')} перед переходом к бюджету.`,
      };
    }
  }

  if (step === 'budget') {
    if (
      errors.dailyBudget ||
      errors.totalBudget ||
      errors.period ||
      errors.strategy
    ) {
      return {
        ok: false,
        step: 'budget',
        title: 'Проверьте бюджет',
        description: 'Общий лимит не может быть меньше дневного бюджета.',
      };
    }
  }

  return { ok: true };
}

function formatRubles(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

function getAudienceSummary(chip: AudienceChipKey): AudiencePresetSummary {
  switch (chip) {
    case 'retail':
      return {
        cities: 'Москва, Екатеринбург, Новосибирск',
        regionsLabel: '3 региона',
        reach: '280 000',
        clicks: '3 900',
        quality: 'Высокое',
        qualityState: 'Охват высокий',
        age: '25-44, покупатели маркетплейсов и сетевого ритейла',
        exclusions: 'Текущие клиенты, сотрудники, случайный трафик',
        interests: 'Онлайн-покупки, скидки, lifestyle, доставка',
      };
    case 'lookalike':
      return {
        cities: 'Москва, Санкт-Петербург, Краснодар',
        regionsLabel: '3 региона',
        reach: '410 000',
        clicks: '5 600',
        quality: 'Очень высокое',
        qualityState: 'Охват максимальный',
        age: '24-40, похожие на текущую клиентскую базу',
        exclusions: 'Низкая вовлечённость, старые лиды, дубли',
        interests: 'Похожие сегменты, бизнес-сервисы, growth, SaaS',
      };
    case 'b2b':
      return {
        cities: 'Москва, Санкт-Петербург, Казань',
        regionsLabel: '3 региона',
        reach: '190 000',
        clicks: '2 450',
        quality: 'Высокое',
        qualityState: 'Сегмент точный',
        age: '27-45, маркетологи, владельцы SMB, sales ops',
        exclusions: 'Студенты, крупный enterprise, нецелевые отрасли',
        interests: 'CRM, аналитика, performance, автоматизация',
      };
    case 'geo':
    default:
      return {
        cities: 'Москва, Санкт-Петербург, Казань',
        regionsLabel: '3 региона',
        reach: '320 000',
        clicks: '4 800',
        quality: 'Высокое',
        qualityState: 'Охват высокий',
        age: '23-40, активная городская аудитория со средним доходом',
        exclusions: 'Нерелевантные регионы, частые отказы, bots',
        interests: 'Предпринимательство, маркетинг, e-commerce, digital',
      };
  }
}

function getAudienceStateSummary(state: BuilderState): AudienceSummary {
  const summary = getAudienceSummary(state.audienceChip);
  const citiesCount = state.audienceConfig.cities.length;
  const profileCount = state.audienceConfig.profileTags.length;
  const exclusionsCount = state.audienceConfig.exclusions.length;
  const interestsCount = state.audienceConfig.interests.length;
  const reachValue = Math.max(
    90000,
    Math.round(
      150000 +
        citiesCount * 42000 +
        interestsCount * 14000 +
        profileCount * 9000 -
        exclusionsCount * 13000,
    ),
  );
  const ctrValue = Math.min(
    2.8,
    Math.max(
      0.7,
      0.85 + profileCount * 0.2 + interestsCount * 0.08 - citiesCount * 0.04,
    ),
  );
  const clicksValue = Math.round(reachValue * (ctrValue / 100));
  const breadth =
    reachValue >= 320000
      ? 'Широкий'
      : reachValue >= 200000
        ? 'Сбалансированный'
        : 'Узкий';
  const competition =
    profileCount >= 4 || interestsCount >= 4
      ? 'Выше средней'
      : exclusionsCount >= 3
        ? 'Низкая'
        : 'Средняя';
  const recommendationTitle =
    breadth === 'Узкий'
      ? 'Сегмент точный, но с меньшим запасом'
      : breadth === 'Широкий'
        ? 'Хорошая база для масштабирования'
        : 'Хороший баланс точности и объёма';
  const recommendationText =
    breadth === 'Узкий'
      ? 'Сегмент хорошо подходит для дорогого лида, но может быстрее упереться в частоту. Если нужен объём, добавьте ещё один город или интерес.'
      : breadth === 'Широкий'
        ? 'Настройки дают хороший объём для старта. Следите за качеством клика и при необходимости усиливайте исключения.'
        : 'Сегмент уже выглядит рабочим: охват достаточно широкий, а профильные признаки удерживают аудиторию близко к офферу.';

  return {
    ...summary,
    cities: state.audienceConfig.cities.join(', '),
    regionsLabel: `${state.audienceConfig.cities.length} региона`,
    ageRange: state.audienceConfig.ageRange,
    profile: state.audienceConfig.profileTags.join(', '),
    profileLabel: `${state.audienceConfig.profileTags.length} тега`,
    exclusions: state.audienceConfig.exclusions.join(', '),
    interests: state.audienceConfig.interests.join(', '),
  };
}

function getAudienceInsights(state: BuilderState): {
  reachValue: number;
  clicksValue: number;
  ctrValue: number;
  breadth: string;
  competition: string;
  quality: string;
  qualityState: string;
  explanation: string;
  logicBadge: string;
  matchingNote: string;
  profilePriorityNote: string;
  interestsPriorityNote: string;
  expansionState: string;
  expansionNote: string;
  riskToneLabel: string;
  riskToneDanger: boolean;
  risks: string[];
} {
  const citiesCount = state.audienceConfig.cities.length;
  const profileCount = state.audienceConfig.profileTags.length;
  const exclusionsCount = state.audienceConfig.exclusions.length;
  const interestsCount = state.audienceConfig.interests.length;
  const strictnessFactor =
    state.audienceConfig.matchingMode === 'strict'
      ? -42000
      : state.audienceConfig.matchingMode === 'any'
        ? 38000
        : 0;
  const expansionFactor = state.audienceConfig.expansionEnabled
    ? 36000
    : -18000;
  const reachValue = Math.max(
    75000,
    Math.round(
      130000 +
        citiesCount * 42000 +
        interestsCount * 14000 +
        profileCount * 9000 -
        exclusionsCount * 13000 +
        strictnessFactor +
        expansionFactor,
    ),
  );
  const ctrValue = Math.min(
    3.2,
    Math.max(
      0.7,
      0.82 +
        profileCount * 0.22 +
        interestsCount * 0.07 -
        citiesCount * 0.03 +
        (state.audienceConfig.matchingMode === 'strict'
          ? 0.24
          : state.audienceConfig.matchingMode === 'any'
            ? -0.12
            : 0) +
        (state.audienceConfig.expansionEnabled ? -0.08 : 0.05),
    ),
  );
  const clicksValue = Math.round(reachValue * (ctrValue / 100));
  const breadth =
    reachValue >= 340000
      ? 'Широкий'
      : reachValue >= 200000
        ? 'Сбалансированный'
        : 'Узкий';
  const competition =
    profileCount >= 4 || interestsCount >= 4
      ? 'Выше средней'
      : exclusionsCount >= 3
        ? 'Низкая'
        : 'Средняя';
  const quality =
    breadth === 'Узкий'
      ? 'Высокая концентрация'
      : breadth === 'Широкий'
        ? 'Хороший запас по объёму'
        : 'Сбалансированное качество';
  const qualityState =
    breadth === 'Узкий'
      ? 'Сегмент точный'
      : breadth === 'Широкий'
        ? 'Охват высокий'
        : 'Баланс точности';
  const matchingNote =
    state.audienceConfig.matchingMode === 'strict'
      ? 'Пользователь должен сильнее совпадать с профилем и интересами. Качество выше, но запас охвата ниже.'
      : state.audienceConfig.matchingMode === 'any'
        ? 'Достаточно одного сильного сигнала. Охват расширяется быстрее, но сегмент может стать общим.'
        : 'Система ищет баланс между профильными признаками и интересами, без сильного перекоса в объём или строгость.';
  const profilePriorityNote =
    state.audienceConfig.profilePriority === 'primary'
      ? 'Профиль аудитории считается ядром сегмента и сильнее влияет на выдачу.'
      : 'Профиль скорее расширяет охват и не жёстко ограничивает показ.';
  const interestsPriorityNote =
    state.audienceConfig.interestsPriority === 'primary'
      ? 'Интересы используются как главный сигнал и сильнее влияют на масштаб.'
      : 'Интересы работают как дополнительная подсказка поверх профиля.';
  const expansionState = state.audienceConfig.expansionEnabled
    ? 'Разрешено'
    : 'Выключено';
  const expansionNote = state.audienceConfig.expansionEnabled
    ? 'Система сможет мягко расширять показ на похожие сегменты, если текущая аудитория быстро выгорает.'
    : 'Показы будут держаться ближе к выбранным фильтрам. Это лучше для точности, но хуже для масштаба.';
  const explanation = `Сейчас у вас ${citiesCount} регионов, ${profileCount} профильных признаков, ${interestsCount} интересов и ${exclusionsCount} исключений. ${
    state.audienceConfig.matchingMode === 'strict'
      ? 'Жёсткая логика совпадения делает сегмент точнее.'
      : state.audienceConfig.matchingMode === 'any'
        ? 'Мягкая логика совпадения помогает быстрее нарастить объём.'
        : 'Сбалансированная логика удерживает разумный компромисс между качеством и охватом.'
  }`;
  const logicBadge =
    state.audienceConfig.matchingMode === 'strict'
      ? 'Строгий режим'
      : state.audienceConfig.matchingMode === 'any'
        ? 'Режим расширения'
        : 'Баланс';
  const risks = [
    breadth === 'Узкий'
      ? 'Сегмент может быстрее упереться в частоту. Для масштабирования стоит добавить ещё один регион или интерес.'
      : breadth === 'Широкий'
        ? 'Охват хороший, но контролируйте качество лида: широкий сегмент чаще требует более сильных исключений.'
        : 'Сегмент уже выглядит рабочим: риск по объёму умеренный.',
    exclusionsCount >= 4
      ? 'Исключений уже много. Проверьте, не режете ли вы полезный объём вместе с нерелевантным трафиком.'
      : 'Исключений достаточно, чтобы держать шум под контролем.',
    !state.audienceConfig.expansionEnabled
      ? 'Расширение отключено. Если запуску не хватит объёма, первым шагом включите поиск похожих сегментов.'
      : 'Расширение включено. Следите, чтобы оно не размывало слишком точный B2B или premium-оффер.',
  ];
  const riskToneDanger = breadth === 'Узкий' || exclusionsCount >= 4;

  return {
    reachValue,
    clicksValue,
    ctrValue,
    breadth,
    competition,
    quality,
    qualityState,
    explanation,
    logicBadge,
    matchingNote,
    profilePriorityNote,
    interestsPriorityNote,
    expansionState,
    expansionNote,
    riskToneLabel: riskToneDanger ? 'Нужен контроль' : 'Риск умеренный',
    riskToneDanger,
    risks,
  };
}

function renderSavedAudiencesList(state: BuilderState): void {
  document
    .querySelectorAll<HTMLElement>('[data-builder-saved-audiences]')
    .forEach((container) => {
      const items = getSavedAudiences();

      if (!items.length) {
        container.innerHTML =
          '<p class="campaign-builder__saved-audience-empty">Здесь можно хранить готовые аудитории для повторного запуска похожих кампаний.</p>';
        return;
      }

      container.innerHTML = items
        .map((item) => {
          const isActive =
            JSON.stringify(item.config) ===
            JSON.stringify(cloneAudienceConfig(state.audienceConfig));

          return `
          <article class="campaign-builder__saved-audience${isActive ? ' campaign-builder__saved-audience--active' : ''}" data-audience-preset-id="${item.id}">
            <div>
              <strong class="campaign-builder__saved-audience-title">${item.name}</strong>
              <p class="campaign-builder__saved-audience-text">${item.summary}</p>
            </div>
            <div class="campaign-builder__saved-audience-actions">
              <button class="campaign-builder__text-button" type="button" data-builder-apply-audience="${item.id}">Применить</button>
              <button class="campaign-builder__text-button campaign-builder__text-button--danger" type="button" data-builder-delete-audience="${item.id}">Удалить</button>
            </div>
          </article>
        `;
        })
        .join('');
    });
}

function ensureAudiencePanelScaffold(state: BuilderState): void {
  const audiencePanel = document.querySelector<HTMLElement>(
    '[data-step-panel="audience"]',
  );

  if (!audiencePanel) {
    return;
  }

  const cards = audiencePanel.querySelectorAll<HTMLElement>(
    '.campaign-builder__card',
  );
  const settingsCard = cards[0];
  const summaryCard = cards[1];
  const stack = settingsCard?.querySelector<HTMLElement>(
    '.campaign-builder__stack',
  );

  if (
    settingsCard &&
    stack &&
    !settingsCard.querySelector('[data-builder-audience-controls]')
  ) {
    stack.insertAdjacentHTML(
      'afterend',
      `
        <div class="campaign-builder__audience-controls" data-builder-audience-controls>
          <section class="campaign-builder__meta-item">
            <span class="campaign-builder__meta-item-label">Логика совпадения</span>
            <div class="campaign-builder__segmented">
              <button class="campaign-builder__segmented-button" type="button" data-builder-audience-setting="matchingMode" data-value="any">Любой сигнал</button>
              <button class="campaign-builder__segmented-button" type="button" data-builder-audience-setting="matchingMode" data-value="balanced">Сбалансировано</button>
              <button class="campaign-builder__segmented-button" type="button" data-builder-audience-setting="matchingMode" data-value="strict">Строгое ядро</button>
            </div>
            <p class="campaign-builder__meta-item-text" data-audience-matching-note></p>
          </section>

          <section class="campaign-builder__meta-grid">
            <article class="campaign-builder__meta-item">
              <span class="campaign-builder__meta-item-label">Приоритет профиля</span>
              <div class="campaign-builder__chip-row">
                <button class="campaign-builder__mini-chip" type="button" data-builder-audience-setting="profilePriority" data-value="primary">Основной</button>
                <button class="campaign-builder__mini-chip" type="button" data-builder-audience-setting="profilePriority" data-value="secondary">Расширяющий</button>
              </div>
              <p class="campaign-builder__meta-item-text" data-audience-profile-priority-note></p>
            </article>

            <article class="campaign-builder__meta-item">
              <span class="campaign-builder__meta-item-label">Приоритет интересов</span>
              <div class="campaign-builder__chip-row">
                <button class="campaign-builder__mini-chip" type="button" data-builder-audience-setting="interestsPriority" data-value="primary">Основной</button>
                <button class="campaign-builder__mini-chip" type="button" data-builder-audience-setting="interestsPriority" data-value="secondary">Расширяющий</button>
              </div>
              <p class="campaign-builder__meta-item-text" data-audience-interests-priority-note></p>
            </article>
          </section>

          <section class="campaign-builder__meta-item campaign-builder__meta-item--toggle">
            <div>
              <span class="campaign-builder__meta-item-label">Расширение аудитории</span>
              <strong class="campaign-builder__meta-item-value" data-audience-expansion-state></strong>
              <p class="campaign-builder__meta-item-text" data-audience-expansion-note></p>
            </div>
            <button class="campaign-builder__toggle" type="button" aria-pressed="false" data-builder-audience-toggle="expansionEnabled">
              <span class="campaign-builder__toggle-handle"></span>
            </button>
          </section>

          <section class="campaign-builder__meta-item">
            <div class="campaign-builder__meta-item-head">
              <span class="campaign-builder__meta-item-label">Сохранённые аудитории</span>
              <button class="campaign-builder__button campaign-builder__button--ghost campaign-builder__button--compact" type="button" data-builder-save-audience>Сохранить текущую</button>
            </div>
            <div class="campaign-builder__saved-audiences" data-builder-saved-audiences></div>
          </section>
        </div>
      `,
    );
  }

  if (summaryCard) {
    summaryCard.innerHTML = `
      <div class="campaign-builder__card-head">
        <h2 class="campaign-builder__card-title">Сводка охвата</h2>
        <p class="campaign-builder__card-subtitle">Что получится после текущих фильтров и где есть риск потерять объём.</p>
      </div>

      <div class="campaign-builder__metrics">
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Потенциальный охват</span>
          <strong class="campaign-builder__metric-value" data-audience-reach></strong>
        </div>
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Прогноз кликов</span>
          <strong class="campaign-builder__metric-value" data-audience-clicks></strong>
        </div>
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Качество аудитории</span>
          <strong class="campaign-builder__metric-value" data-audience-quality-text></strong>
        </div>
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Прогноз CTR</span>
          <strong class="campaign-builder__metric-value" data-audience-ctr></strong>
        </div>
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Ширина сегмента</span>
          <strong class="campaign-builder__metric-value" data-audience-breadth></strong>
        </div>
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Конкуренция в аукционе</span>
          <strong class="campaign-builder__metric-value" data-audience-competition></strong>
        </div>
      </div>

      <section class="campaign-builder__summary-block">
        <div class="campaign-builder__summary-block-head">
          <strong class="campaign-builder__summary-block-title">Почему система даёт такую оценку</strong>
          <span class="campaign-builder__pill" data-audience-logic-badge></span>
        </div>
        <p class="campaign-builder__summary-block-text" data-audience-explanation></p>
      </section>

      <section class="campaign-builder__summary-block">
        <div class="campaign-builder__summary-block-head">
          <strong class="campaign-builder__summary-block-title">Риски запуска</strong>
          <span class="campaign-builder__pill" data-audience-risk-tone></span>
        </div>
        <ul class="campaign-builder__risk-list" data-audience-risk-list></ul>
      </section>
    `;
  }

  renderSavedAudiencesList(state);
}

function ensureBudgetPanelScaffold(state: BuilderState): void {
  void state;

  const budgetPanel = document.querySelector<HTMLElement>(
    '[data-step-panel="budget"]',
  );

  if (!budgetPanel) {
    return;
  }

  const cards = budgetPanel.querySelectorAll<HTMLElement>(
    '.campaign-builder__card',
  );
  const settingsCard = cards[0];
  const forecastCard = cards[1];
  const form = settingsCard?.querySelector<HTMLElement>(
    '.campaign-builder__form',
  );

  if (
    settingsCard &&
    form &&
    !settingsCard.querySelector('[data-builder-budget-controls]')
  ) {
    form.insertAdjacentHTML(
      'beforeend',
      `
        <div class="campaign-builder__budget-controls" data-builder-budget-controls>
          <section class="campaign-builder__meta-item">
            <span class="campaign-builder__meta-item-label">Быстрый выбор дневного бюджета</span>
            <div class="campaign-builder__chip-row">
              <button class="campaign-builder__mini-chip" type="button" data-builder-budget-preset="3000">3 000 ₽</button>
              <button class="campaign-builder__mini-chip" type="button" data-builder-budget-preset="5000">5 000 ₽</button>
              <button class="campaign-builder__mini-chip" type="button" data-builder-budget-preset="7500">7 500 ₽</button>
              <button class="campaign-builder__mini-chip" type="button" data-builder-budget-preset="12000">12 000 ₽</button>
            </div>
            <p class="campaign-builder__meta-item-text" data-budget-preset-note></p>
          </section>

          <section class="campaign-builder__meta-item">
            <span class="campaign-builder__meta-item-label">Период кампании</span>
            <div class="campaign-builder__chip-row">
              <button class="campaign-builder__mini-chip" type="button" data-builder-period-preset="7 дней">7 дней</button>
              <button class="campaign-builder__mini-chip" type="button" data-builder-period-preset="14 дней">14 дней</button>
              <button class="campaign-builder__mini-chip" type="button" data-builder-period-preset="30 дней">30 дней</button>
            </div>
            <p class="campaign-builder__meta-item-text" data-budget-period-note></p>
          </section>

          <section class="campaign-builder__meta-item campaign-builder__meta-item--period-preview">
            <div class="campaign-builder__budget-balance-head">
              <div class="campaign-builder__budget-balance-copy">
                <span class="campaign-builder__meta-item-label" data-budget-period-label>Горизонт запуска</span>
                <strong class="campaign-builder__meta-item-value" data-budget-period-title></strong>
              </div>
              <span class="campaign-builder__pill" data-budget-period-badge></span>
            </div>
            <p class="campaign-builder__meta-item-text" data-budget-period-summary></p>
          </section>

          <section class="campaign-builder__meta-item campaign-builder__meta-item--budget-link">
            <div class="campaign-builder__budget-balance-head">
              <div class="campaign-builder__budget-balance-copy">
                <span class="campaign-builder__meta-item-label" data-budget-balance-label>Связка лимитов</span>
                <strong class="campaign-builder__meta-item-value" data-budget-balance-title></strong>
              </div>
              <span class="campaign-builder__pill" data-budget-balance-badge></span>
            </div>
            <div class="campaign-builder__budget-balance-bar">
              <span data-budget-balance-fill></span>
            </div>
            <p class="campaign-builder__meta-item-text" data-budget-balance-note></p>
          </section>
        </div>
      `,
    );
  }

  if (forecastCard && !forecastCard.querySelector('[data-budget-pace-label]')) {
    forecastCard.innerHTML = `
      <div class="campaign-builder__card-head">
        <h2 class="campaign-builder__card-title">Прогноз бюджета</h2>
        <p class="campaign-builder__card-subtitle">Что даёт текущий бюджет и темп запуска.</p>
      </div>

      <div class="campaign-builder__metrics">
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Охват</span>
          <strong class="campaign-builder__metric-value" data-budget-reach></strong>
        </div>
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Переходы</span>
          <strong class="campaign-builder__metric-value" data-budget-clicks></strong>
        </div>
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Средний CPC</span>
          <strong class="campaign-builder__metric-value" data-budget-cpc></strong>
        </div>
      </div>

      <section class="campaign-builder__summary-block">
        <div class="campaign-builder__summary-block-head">
          <strong class="campaign-builder__summary-block-title">Темп расхода</strong>
          <span class="campaign-builder__pill" data-budget-pace-label></span>
        </div>
        <p class="campaign-builder__summary-block-text" data-budget-pace-note></p>
      </section>

      <section class="campaign-builder__summary-block">
        <div class="campaign-builder__summary-block-head">
          <strong class="campaign-builder__summary-block-title">Запас по лимиту</strong>
          <span class="campaign-builder__pill" data-budget-reserve-label></span>
        </div>
        <p class="campaign-builder__summary-block-text" data-budget-reserve-note></p>
      </section>

      <section class="campaign-builder__summary-block">
        <div class="campaign-builder__summary-block-head">
          <strong class="campaign-builder__summary-block-title">На что обратить внимание</strong>
          <span class="campaign-builder__pill" data-budget-warning-tone></span>
        </div>
        <ul class="campaign-builder__risk-list" data-budget-warning-list></ul>
      </section>
    `;
  }
}

function getAudienceModalConfig(key: AudienceDetailKey): AudienceModalConfig {
  switch (key) {
    case 'geo':
      return {
        title: 'География показа',
        description: 'Выберите города, в которых хотите показывать объявление.',
        selectionType: 'multiple',
        options: [
          { value: 'Москва', label: 'Москва' },
          { value: 'Санкт-Петербург', label: 'Санкт-Петербург' },
          { value: 'Казань', label: 'Казань' },
          { value: 'Екатеринбург', label: 'Екатеринбург' },
          { value: 'Новосибирск', label: 'Новосибирск' },
          { value: 'Краснодар', label: 'Краснодар' },
          { value: 'Нижний Новгород', label: 'Нижний Новгород' },
          { value: 'Самара', label: 'Самара' },
          { value: 'Ростов-на-Дону', label: 'Ростов-на-Дону' },
          { value: 'Уфа', label: 'Уфа' },
          { value: 'Челябинск', label: 'Челябинск' },
          { value: 'Пермь', label: 'Пермь' },
          { value: 'Воронеж', label: 'Воронеж' },
          { value: 'Волгоград', label: 'Волгоград' },
          { value: 'Красноярск', label: 'Красноярск' },
          { value: 'Омск', label: 'Омск' },
          { value: 'Тюмень', label: 'Тюмень' },
          { value: 'Ижевск', label: 'Ижевск' },
          { value: 'Сочи', label: 'Сочи' },
          { value: 'Владивосток', label: 'Владивосток' },
        ],
      };
    case 'age':
      return {
        title: 'Возрастной диапазон',
        description:
          'Выберите возрастной диапазон, внутри которого система будет искать аудиторию.',
        selectionType: 'single',
        options: PROFILE_AGE_OPTIONS.map((value) => ({
          value,
          label: value,
        })),
      };
    case 'profile':
      return {
        title: 'Возраст и профиль',
        description:
          'Соберите возрастной диапазон и профильные признаки, которые лучше всего подходят под оффер.',
        selectionType: 'multiple',
        options: PROFILE_TAG_OPTIONS.map((option) => ({
          value: option.value,
          label: option.value,
          description: option.description,
        })),
      };
    case 'exclusions':
      return {
        title: 'Исключения',
        description: 'Отметьте сегменты, которые нужно исключить из показа.',
        selectionType: 'multiple',
        options: [
          { value: 'Нерелевантные регионы', label: 'Нерелевантные регионы' },
          { value: 'Частые отказы', label: 'Частые отказы' },
          { value: 'bots', label: 'Подозрительный бот-трафик' },
          { value: 'Текущие клиенты', label: 'Текущие клиенты' },
          { value: 'Сотрудники', label: 'Сотрудники компании' },
          { value: 'Старые лиды', label: 'Старые лиды' },
          { value: 'Дубли лидов', label: 'Дубли лидов' },
          { value: 'Низкий LTV', label: 'Низкий LTV' },
          { value: 'Возвраты и отмены', label: 'Пользователи с возвратами' },
          { value: 'Случайный трафик', label: 'Случайный трафик' },
        ],
      };
    case 'interests':
    default:
      return {
        title: 'Интересы',
        description:
          'Выберите интересы, которые лучше всего соответствуют предложению.',
        selectionType: 'multiple',
        options: [
          { value: 'Предпринимательство', label: 'Предпринимательство' },
          { value: 'Маркетинг', label: 'Маркетинг' },
          { value: 'e-commerce', label: 'e-commerce' },
          { value: 'digital', label: 'digital' },
          { value: 'CRM', label: 'CRM' },
          { value: 'Аналитика', label: 'Аналитика' },
          { value: 'growth', label: 'growth' },
          { value: 'SaaS', label: 'SaaS' },
          { value: 'Реклама', label: 'Реклама' },
          { value: 'Автоматизация', label: 'Автоматизация' },
          { value: 'Маркетплейсы', label: 'Маркетплейсы' },
          { value: 'B2B продажи', label: 'B2B продажи' },
          { value: 'Финтех', label: 'Финтех' },
          { value: 'Логистика', label: 'Логистика' },
          { value: 'Продуктовый менеджмент', label: 'Продуктовый менеджмент' },
          { value: 'Розничная торговля', label: 'Розничная торговля' },
        ],
      };
  }
}

function getCreativeSummary(creative: CreativeKey): {
  count: string;
  placements: string;
} {
  switch (creative) {
    case 'stories':
      return { count: '2', placements: 'Stories + mobile placements' };
    case 'video':
      return { count: '1', placements: 'Видео + in-stream' };
    case 'feed':
    default:
      return { count: '3', placements: 'Лента + сторис' };
  }
}

function getCreativeSlots(
  creative: CreativeKey,
  assets: Partial<Record<CreativeAssetKey, string>>,
): Array<{
  key: CreativeAssetKey;
  title: string;
  text: string;
  accept: string;
  buttonLabel: string;
  status: string;
  meta: string;
  multiple?: boolean;
}> {
  if (creative === 'video') {
    return [
      {
        key: 'mainVideo',
        title: 'Основное видео',
        text: 'Главный ролик для ленты или in-stream размещения.',
        accept: 'video/*',
        buttonLabel: assets.mainVideo ? 'Заменить видео' : 'Загрузить видео',
        status: assets.mainVideo || 'Не загружено',
        meta: 'MP4 или MOV, 6-30 сек',
      },
      {
        key: 'verticalVideo',
        title: 'Вертикальная версия',
        text: 'Отдельный ролик под Stories и Reels.',
        accept: 'video/*',
        buttonLabel: assets.verticalVideo
          ? 'Заменить видео'
          : 'Добавить вертикальное видео',
        status: assets.verticalVideo || 'Не загружено',
        meta: 'Формат 9:16, до 500 МБ',
      },
      {
        key: 'videoCover',
        title: 'Обложка видео',
        text: 'Статичный кадр, который увидят до запуска воспроизведения.',
        accept: 'image/*',
        buttonLabel: assets.videoCover
          ? 'Заменить обложку'
          : 'Загрузить обложку',
        status: assets.videoCover || 'Не загружено',
        meta: 'PNG или JPG, от 1200 px',
      },
    ];
  }

  if (creative === 'stories') {
    return [
      {
        key: 'storyVisual',
        title: 'Вертикальный креатив',
        text: 'Основной материал для Stories и Reels.',
        accept: 'image/*,video/*',
        buttonLabel: assets.storyVisual ? 'Заменить файл' : 'Загрузить файл',
        status: assets.storyVisual || 'Не загружено',
        meta: '9:16, изображение или видео',
      },
      {
        key: 'feedVisual',
        title: 'Резерв для ленты',
        text: 'Дополнительная версия, если тот же оффер пойдёт и в ленту.',
        accept: 'image/*,video/*',
        buttonLabel: assets.feedVisual
          ? 'Заменить файл'
          : 'Добавить резервный файл',
        status: assets.feedVisual || 'Не загружено',
        meta: 'Опционально, 4:5 или 1.91:1',
      },
    ];
  }

  return [
    {
      key: 'feedVisual',
      title: 'Основной визуал',
      text: 'Главное изображение или короткое видео для карточки в ленте.',
      accept: 'image/*,video/*',
      buttonLabel: assets.feedVisual ? 'Заменить файл' : 'Загрузить файл',
      status: assets.feedVisual || 'Не загружено',
      meta: 'PNG, JPG или MP4',
    },
    {
      key: 'storyVisual',
      title: 'Адаптация под Stories',
      text: 'Отдельная вертикальная версия для полноэкранных размещений.',
      accept: 'image/*,video/*',
      buttonLabel: assets.storyVisual ? 'Заменить файл' : 'Добавить адаптацию',
      status: assets.storyVisual || 'Не загружено',
      meta: 'Опционально, 9:16',
    },
  ];
}

function getBudgetForecast(state: BuilderState): {
  reach: string;
  clicks: string;
  cpc: string;
  note: string;
  goalBadge: string;
} {
  const total = Math.max(state.totalBudget, state.dailyBudget);
  const reach = Math.round(total * 2.45);
  const clicksMin = Math.max(Math.round(total / 24), 1800);
  const clicksMax = clicksMin + Math.round(clicksMin * 0.36);
  const cpc = Math.max(Math.round(total / clicksMax), 12);

  return {
    reach: new Intl.NumberFormat('ru-RU').format(reach),
    clicks: `${new Intl.NumberFormat('ru-RU').format(clicksMin)} - ${new Intl.NumberFormat('ru-RU').format(clicksMax)}`,
    cpc: `${cpc} - ${cpc + 4} ₽`,
    note: `При текущих настройках система прогнозирует от ${new Intl.NumberFormat('ru-RU').format(clicksMin)} до ${new Intl.NumberFormat('ru-RU').format(clicksMax)} переходов за весь период кампании.`,
    goalBadge:
      state.goal === 'website'
        ? 'CTR / CPC'
        : state.goal === 'leads'
          ? 'CPA / лиды'
          : 'Охват / CPM',
  };
}

function getStepProgress(state: BuilderState): {
  progressValue: number;
  progressLabel: string;
  currentStepTitle: string;
  currentStepText: string;
} {
  const currentIndex = STEP_ORDER.indexOf(state.step);
  const progressValue = Math.round(
    ((currentIndex + 1) / STEP_ORDER.length) * 100,
  );

  return {
    progressValue,
    progressLabel: `${progressValue}%`,
    currentStepTitle: STEP_META[state.step].title,
    currentStepText: STEP_META[state.step].text,
  };
}

function validateBuilder(state: BuilderState): {
  ok: boolean;
  step?: StepKey;
  title?: string;
  description?: string;
} {
  const contentValidation = validateStep(state, 'content');
  if (!contentValidation.ok) {
    return contentValidation;
  }

  const audienceValidation = validateStep(state, 'audience');
  if (!audienceValidation.ok) {
    return audienceValidation;
  }

  const budgetValidation = validateStep(state, 'budget');
  if (!budgetValidation.ok) {
    return budgetValidation;
  }

  return { ok: true };
}

function getBuilderHealth(state: BuilderState): BuilderHealth {
  const validation = validateBuilder(state);

  if (!validation.ok) {
    const healthTitleByStep: Record<StepKey, string> = {
      content: 'Контент требует внимания',
      audience: 'Аудитория не завершена',
      budget: 'Бюджет требует внимания',
      publication: 'Проверка требует внимания',
    };

    return {
      badge: 'Нужно проверить',
      title: validation.step
        ? healthTitleByStep[validation.step]
        : 'Проверьте кампанию',
      text:
        validation.description ||
        'Исправьте обязательные поля перед отправкой объявления.',
      isPositive: false,
    };
  }

  if (state.step === 'publication') {
    return {
      badge: 'Готово',
      title: 'Кампания готова к публикации',
      text: 'Параметры объявления выглядят согласованно. Можно отправлять в модерацию.',
      isPositive: true,
    };
  }

  return {
    badge: 'Черновик',
    title: 'Черновик выглядит уверенно',
    text: 'Основные параметры заполнены. Перейдите к следующему шагу, чтобы завершить настройку.',
    isPositive: true,
  };
}

function getFinalReviewData(state: BuilderState): FinalReviewData {
  const mode = getBuilderModeConfig();
  const errors = getFieldErrors(state);
  const creativeSummary = getCreativeSummary(state.creative);
  const audience = getAudienceStateSummary(state);

  const contentMissing: string[] = [];
  if (errors.name) contentMissing.push('внутреннее название');
  if (errors.headline) contentMissing.push('заголовок');
  if (errors.description) contentMissing.push('текст');
  if (errors.cta) contentMissing.push('кнопку');
  if (errors.link) contentMissing.push('ссылку');

  const contentCheck: FinalReviewCheck = {
    title: 'Контент и ссылка',
    text:
      contentMissing.length === 0
        ? `${FORMAT_LABELS[state.format]}, цель «${GOAL_LABELS[state.goal]}», CTA «${state.cta.trim()}».`
        : `Нужно заполнить: ${contentMissing.join(', ')}.`,
    status: contentMissing.length === 0 ? 'ОК' : 'Дополнить',
    success: contentMissing.length === 0,
  };

  const creativeSlots = getCreativeSlots(state.creative, state.creativeAssets);
  const missingCreativeSlots = getMissingCreativeSlots(state);
  const uploadedAssetsCount = creativeSlots.filter((slot) =>
    Boolean(state.creativeAssets[slot.key]),
  ).length;

  const creativeCheck: FinalReviewCheck = {
    title: 'Креативы и площадки',
    text:
      missingCreativeSlots.length === 0
        ? `Готово ${uploadedAssetsCount} материалов. Сценарий показа: ${creativeSummary.placements}.`
        : `Не хватает материалов: ${missingCreativeSlots.map((slot) => slot.title.toLowerCase()).join(', ')}.`,
    status: missingCreativeSlots.length === 0 ? 'ОК' : 'Добавить',
    success: missingCreativeSlots.length === 0,
  };

  const audienceGaps = getAudienceGaps(state);

  const audienceCheck: FinalReviewCheck = {
    title: 'Аудитория и таргетинг',
    text:
      audienceGaps.length === 0
        ? `${state.audienceConfig.cities.length} региона, ${state.audienceConfig.profileTags.length} профиля и ${state.audienceConfig.interests.length} интереса в сегменте.`
        : `Нужно уточнить: ${audienceGaps.join(', ')}.`,
    status: audienceGaps.length === 0 ? 'ОК' : 'Проверить',
    success: audienceGaps.length === 0,
  };

  const budgetIssues = [
    errors.dailyBudget,
    errors.totalBudget,
    errors.period,
    errors.strategy,
  ].filter(Boolean) as string[];

  const budgetCheck: FinalReviewCheck = {
    title: 'Бюджет и период',
    text:
      budgetIssues.length === 0
        ? `${formatRubles(state.dailyBudget)} в день на ${state.period}. Стратегия: ${STRATEGY_LABELS[state.strategy]}.`
        : budgetIssues[0],
    status: budgetIssues.length === 0 ? 'ОК' : 'Исправить',
    success: budgetIssues.length === 0,
  };

  const checks = [contentCheck, creativeCheck, audienceCheck, budgetCheck];
  const failedChecks = checks.filter((check) => !check.success);

  return {
    status:
      failedChecks.length === 0
        ? {
            badge: 'Готово',
            title: mode.reviewTitle,
            text: mode.reviewReadyText,
            isPositive: true,
          }
        : {
            badge: 'Проверить',
            title: mode.reviewTitle,
            text: `${mode.reviewPendingPrefix} ${failedChecks
              .map((check) => check.title.toLowerCase())
              .join(', ')}.`,
            isPositive: false,
          },
    content: contentCheck,
    creative: creativeCheck,
    audience: audienceCheck,
    budget: budgetCheck,
  };
}

function getTemplateContext(state: BuilderState) {
  const audience = getAudienceStateSummary(state);
  const budget = getBudgetForecast(state);
  const publication = getCreativeSummary(state.creative);
  const progress = getStepProgress(state);
  const health = getBuilderHealth(state);
  const finalReview = getFinalReviewData(state);
  const currentIndex = STEP_ORDER.indexOf(state.step);
  const mode = getBuilderModeConfig();

  return {
    mode,
    saveStateLabel: formatSaveStateLabel(),
    hero: {
      progressValue: progress.progressValue,
      progressLabel: progress.progressLabel,
      completionText: health.text,
      currentStepTitle: progress.currentStepTitle,
      currentStepText: progress.currentStepText,
    },
    health,
    steps: STEP_ORDER.map((key, index) => ({
      key,
      ...STEP_META[key],
      isActive: state.step === key,
      isComplete: index < currentIndex,
      stateLabel:
        state.step === key
          ? 'Сейчас'
          : index < currentIndex
            ? 'Готово'
            : 'Далее',
    })),
    content: {
      name: state.name,
      headline: state.headline,
      description: state.description,
      cta: state.cta,
      link: state.link,
      headlineLength: state.headline.trim().length,
      descriptionLength: state.description.trim().length,
      formatLabel: FORMAT_LABELS[state.format],
      goalLabel: GOAL_LABELS[state.goal],
    },
    formats: [
      {
        value: 'feed-card',
        label: 'Карточка в ленте',
        meta: 'Базовый формат',
        selected: state.format === 'feed-card',
      },
      {
        value: 'stories',
        label: 'Stories / Reels',
        meta: 'Вертикальный',
        selected: state.format === 'stories',
      },
      {
        value: 'video-15',
        label: 'Видео pre-roll',
        meta: '15 сек',
        selected: state.format === 'video-15',
      },
    ],
    goals: [
      {
        value: 'website',
        label: 'Переход на сайт',
        meta: 'Трафик',
        selected: state.goal === 'website',
      },
      {
        value: 'leads',
        label: 'Сбор лидов',
        meta: 'Заявки',
        selected: state.goal === 'leads',
      },
      {
        value: 'awareness',
        label: 'Охват и узнаваемость',
        meta: 'Масштаб',
        selected: state.goal === 'awareness',
      },
    ],
    creatives: [
      {
        key: 'feed',
        size: 'Изображение',
        title: 'Карточка и лента',
        text: 'Базовый сценарий для изображения или короткого видео в ленте.',
        isActive: state.creative === 'feed',
      },
      {
        key: 'stories',
        size: 'Stories / Reels',
        title: 'Вертикальная версия',
        text: 'Полноэкранный сценарий под Stories и Reels.',
        isActive: state.creative === 'stories',
      },
      {
        key: 'video',
        size: 'Видео',
        title: 'Видеообъявление',
        text: 'Главный ролик, отдельная вертикаль и обложка в одном наборе.',
        isActive: state.creative === 'video',
      },
    ],
    creativeSlots: getCreativeSlots(state.creative, state.creativeAssets),
    audience,
    audienceChips: [
      {
        key: 'geo',
        label: 'Города-миллионники',
        selected: state.audienceChip === 'geo',
      },
      {
        key: 'retail',
        label: 'Retail / e-com',
        selected: state.audienceChip === 'retail',
      },
      {
        key: 'b2b',
        label: 'Маркетологи и SMB',
        selected: state.audienceChip === 'b2b',
      },
      {
        key: 'lookalike',
        label: 'Look-alike 5%',
        selected: state.audienceChip === 'lookalike',
      },
    ],
    budget: {
      dailyBudget: state.dailyBudget,
      totalBudget: state.totalBudget,
      dailyBudgetLabel: formatRubles(state.dailyBudget),
      totalBudgetLabel: formatRubles(state.totalBudget),
      period: state.period,
      periodDays: getBudgetPeriodDays(state.period),
      strategyLabel: STRATEGY_LABELS[state.strategy],
      reach: budget.reach,
      clicks: budget.clicks,
      cpc: budget.cpc,
      goalBadge: budget.goalBadge,
    },
    strategies: [
      {
        value: 'even',
        label: 'Равномерный показ',
        selected: state.strategy === 'even',
      },
      {
        value: 'aggressive',
        label: 'Ускоренный старт',
        selected: state.strategy === 'aggressive',
      },
      {
        value: 'smart',
        label: 'Автооптимизация',
        selected: state.strategy === 'smart',
      },
    ],
    publication: {
      creativesCount: publication.count,
      placements: publication.placements,
    },
    finalReview,
  };
}

function getBudgetPeriodDays(period: string): number {
  const normalized = period.trim().toLowerCase();
  const numericMatch = normalized.match(/(\d+)/);

  if (numericMatch) {
    return Math.max(1, Number(numericMatch[1]));
  }
  const directDaysMatch = normalized.match(/(\d+)\s*(дн|дней|день)/);

  if (directDaysMatch) {
    return Math.max(1, Number(directDaysMatch[1]));
  }

  if (normalized.includes('-')) {
    return 30;
  }

  return 14;
}

function formatBudgetPeriod(days: number): string {
  return `${Math.max(1, Math.round(days))} дней`;
}

function getBudgetInsights(state: BuilderState): {
  paceLabel: string;
  paceNote: string;
  reserveLabel: string;
  reserveNote: string;
  warningTone: 'normal' | 'warning';
  warnings: string[];
} {
  const total = Math.max(state.totalBudget, state.dailyBudget);
  const coverageDays = Math.max(
    1,
    Math.round(total / Math.max(state.dailyBudget, 1)),
  );
  const plannedDays = getBudgetPeriodDays(state.period);
  const paceLabel =
    state.strategy === 'aggressive'
      ? 'Быстрый старт'
      : state.strategy === 'smart'
        ? 'Автооптимизация'
        : 'Ровный темп';
  const paceNote =
    state.strategy === 'aggressive'
      ? 'Бюджет будет расходоваться активнее в первые дни. Хорошо для быстрого теста и скорого набора статистики.'
      : state.strategy === 'smart'
        ? 'Система будет гибко перераспределять открутку между днями в поиске более дешёвого результата.'
        : 'Открутка распределяется равномерно. Удобно для стабильного контроля расхода и частоты.';
  const reserveLabel =
    coverageDays >= plannedDays + 5
      ? 'Запас высокий'
      : coverageDays >= plannedDays
        ? 'Запас умеренный'
        : 'Запас низкий';
  const reserveNote =
    coverageDays >= plannedDays + 5
      ? `Бюджета хватает примерно на ${coverageDays} дней при плане на ${plannedDays}. Есть запас на тест и дообучение.`
      : coverageDays >= plannedDays
        ? `Текущего лимита хватает примерно на ${coverageDays} дней. Этого достаточно, чтобы пройти запланированный период без резкого обрыва.`
        : `При текущем соотношении лимит закончится примерно через ${coverageDays} дн., а плановый период выглядит длиннее. Нужен больший общий бюджет или короче период.`;
  const warnings = [
    coverageDays < plannedDays
      ? 'Плановый период длиннее, чем позволяет общий лимит. Кампания может остановиться раньше срока.'
      : 'Соотношение периода и общего лимита выглядит рабочим.',
    state.totalBudget < state.dailyBudget * 7
      ? 'Общий лимит меньше недели открутки. Для устойчивой оценки кампании обычно нужен более длинный горизонт.'
      : 'Горизонт открутки выглядит достаточным для первого запуска.',
    state.strategy === 'aggressive'
      ? 'Агрессивная стратегия быстрее соберёт данные, но может поднять цену клика в начале.'
      : 'Текущая стратегия не выглядит рискованной по расходу.',
    state.dailyBudget < 3000
      ? 'Низкий дневной бюджет может замедлить обучение и дать менее стабильный прогноз.'
      : 'Дневной лимит достаточен, чтобы система набирала статистику без сильной задержки.',
  ];

  return {
    paceLabel,
    paceNote,
    reserveLabel,
    reserveNote,
    warningTone:
      coverageDays < plannedDays || state.totalBudget < state.dailyBudget * 7
        ? 'warning'
        : 'normal',
    warnings,
  };
}

function showToast({ title, description }: ToastPayload): void {
  const toast = document.querySelector<HTMLElement>('[data-builder-toast]');
  const titleNode = document.querySelector<HTMLElement>(
    '[data-builder-toast-title]',
  );
  const textNode = document.querySelector<HTMLElement>(
    '[data-builder-toast-text]',
  );

  if (!toast || !titleNode || !textNode) {
    return;
  }

  titleNode.textContent = title;
  textNode.textContent = description;
  toast.hidden = false;

  if (builderToastTimer) {
    window.clearTimeout(builderToastTimer);
  }

  builderToastTimer = window.setTimeout(() => {
    toast.hidden = true;
    builderToastTimer = null;
  }, 3200);
}

function hideToast(): void {
  const toast = document.querySelector<HTMLElement>('[data-builder-toast]');

  if (toast) {
    toast.hidden = true;
  }

  if (builderToastTimer) {
    window.clearTimeout(builderToastTimer);
    builderToastTimer = null;
  }
}

function setText(
  selector: string,
  value: string,
  parent: ParentNode = document,
): void {
  const node = parent.querySelector<HTMLElement>(selector);

  if (node) {
    node.textContent = value;
  }
}

function setTextAll(
  selector: string,
  value: string,
  parent: ParentNode = document,
): void {
  parent.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.textContent = value;
  });
}

function getSelectOptionDefaultMeta(key?: string, value?: string): string {
  if (!key || !value) {
    return '';
  }

  if (key === 'format') {
    if (value === 'feed') return 'Базовый формат';
    if (value === 'stories') return 'Вертикальный';
    if (value === 'video-15') return '15 сек';
  }

  if (key === 'goal') {
    if (value === 'website') return 'Трафик';
    if (value === 'leads') return 'Заявки';
    if (value === 'awareness') return 'Масштаб';
  }

  if (key === 'strategy') {
    if (value === 'even') return 'Контроль';
    if (value === 'smart') return 'Баланс';
    if (value === 'aggressive') return 'Тест';
  }

  return '';
}

function syncStep(state: BuilderState): void {
  const progress = getStepProgress(state);
  const currentIndex = STEP_ORDER.indexOf(state.step);
  const canSubmit = state.step === 'publication';
  const mode = getBuilderModeConfig();

  syncCampaignBuilderStepView({
    canSubmit,
    currentIndex,
    currentStepText: progress.currentStepText,
    currentStepTitle: progress.currentStepTitle,
    lockedDescription: mode.lockedDescription,
    primaryActionLabel: mode.primaryActionLabel,
    progressLabel: progress.progressLabel,
    progressValue: progress.progressValue,
    step: state.step,
  });
}

function syncContent(state: BuilderState): void {
  const creative = getCreativeSummary(state.creative);
  const creativeSlots = getCreativeSlots(state.creative, state.creativeAssets);
  const formatLabel = FORMAT_LABELS[state.format];
  const goalLabel = GOAL_LABELS[state.goal];
  const previewHeadline =
    state.headline.trim() || 'Добавьте заголовок объявления';
  const previewDescription =
    state.description.trim() ||
    'Текст объявления появится здесь после заполнения формы.';
  const previewCta = state.cta.trim() || 'Добавьте кнопку';

  syncCampaignBuilderContentView({
    creative: state.creative,
    creativeCount: creative.count,
    creativePlacements: creative.placements,
    creativeSlots,
    descriptionCount: state.description.trim().length,
    formatLabel,
    goalLabel,
    headlineCount: state.headline.trim().length,
    name: state.name,
    previewCta,
    previewDescription,
    previewHeadline,
    selectedValues: {
      format: state.format,
      goal: state.goal,
      strategy: state.strategy,
    },
  });
}

function syncAudience(state: BuilderState): void {
  const audience = getAudienceStateSummary(state);
  const citiesCount = state.audienceConfig.cities.length;
  const profileCount = state.audienceConfig.profileTags.length;
  const exclusionsCount = state.audienceConfig.exclusions.length;
  const interestsCount = state.audienceConfig.interests.length;
  const reachValue = Math.max(
    90000,
    Math.round(
      150000 +
        citiesCount * 42000 +
        interestsCount * 14000 +
        profileCount * 9000 -
        exclusionsCount * 13000,
    ),
  );
  const ctrValue = Math.min(
    2.8,
    Math.max(
      0.7,
      0.85 + profileCount * 0.2 + interestsCount * 0.08 - citiesCount * 0.04,
    ),
  );
  const clicksValue = Math.round(reachValue * (ctrValue / 100));
  const breadth =
    reachValue >= 320000
      ? 'Широкий'
      : reachValue >= 200000
        ? 'Сбалансированный'
        : 'Узкий';
  const competition =
    profileCount >= 4 || interestsCount >= 4
      ? 'Выше средней'
      : exclusionsCount >= 3
        ? 'Низкая'
        : 'Средняя';
  const quality =
    breadth === 'Узкий'
      ? 'Высокая концентрация'
      : breadth === 'Широкий'
        ? 'Хороший запас по объёму'
        : 'Сбалансированное качество';
  const qualityState =
    breadth === 'Узкий'
      ? 'Сегмент точный'
      : breadth === 'Широкий'
        ? 'Охват высокий'
        : 'Баланс точности';
  const recommendationTitle =
    breadth === 'Узкий'
      ? 'Сегмент точный, но с меньшим запасом'
      : breadth === 'Широкий'
        ? 'Хорошая база для масштабирования'
        : 'Хороший баланс точности и объёма';
  const recommendationText =
    breadth === 'Узкий'
      ? 'Сегмент хорошо подходит для дорогого лида, но может быстрее упереться в частоту. Если нужен объём, добавьте ещё один город или интерес.'
      : breadth === 'Широкий'
        ? 'Настройки дают хороший объём для старта. Следите за качеством клика и при необходимости усиливайте исключения.'
        : 'Сегмент уже выглядит рабочим: охват достаточно широкий, а профильные признаки удерживают аудиторию близко к офферу.';

  const insights = getAudienceInsights(state);

  syncCampaignBuilderAudienceView({
    audience,
    audienceChip: state.audienceChip,
    breadth,
    clicks: new Intl.NumberFormat('ru-RU').format(clicksValue),
    competition,
    ctr: `${ctrValue.toFixed(1)}%`,
    exclusionsCount,
    expansionEnabled: state.audienceConfig.expansionEnabled,
    interestsCount,
    interestsPriority: state.audienceConfig.interestsPriority,
    insights,
    matchingMode: state.audienceConfig.matchingMode,
    profilePriority: state.audienceConfig.profilePriority,
    quality,
    qualityState,
    reach: new Intl.NumberFormat('ru-RU').format(reachValue),
  });

  renderSavedAudiencesList(state);
}

function syncBudget(state: BuilderState): void {
  const budget = getBudgetForecast(state);
  const insights = getBudgetInsights(state);
  const plannedDays = getBudgetPeriodDays(state.period);
  const coverageDays = Math.max(
    1,
    Math.round(
      Math.max(state.totalBudget, state.dailyBudget) /
        Math.max(state.dailyBudget, 1),
    ),
  );
  const coverageRatio = Math.max(
    0.08,
    Math.min(1, coverageDays / Math.max(plannedDays, 1)),
  );
  const warningToneLabel =
    insights.warningTone === 'warning' ? 'Нужен контроль' : 'Риск умеренный';
  const periodTitle =
    plannedDays <= 7
      ? 'Короткий тестовый запуск'
      : plannedDays <= 14
        ? 'Рабочий двухнедельный цикл'
        : 'Длинный горизонт для масштабирования';
  const periodSummary =
    plannedDays <= 7
      ? 'Подходит для быстрого теста гипотез и проверки первых метрик.'
      : plannedDays <= 14
        ? 'Сбалансированный период, чтобы собрать статистику и скорректировать открутку.'
        : 'Подходит для стабильного запуска и постепенного масштабирования кампании.';
  const balanceTitle = `${formatRubles(state.dailyBudget)} в день x ${coverageDays} дн. = ${formatRubles(state.totalBudget)}`;
  const balanceBadge =
    coverageDays >= plannedDays
      ? `${coverageDays} из ${plannedDays} дн.`
      : `Хватит на ${coverageDays} дн.`;
  const balanceNote =
    coverageDays >= plannedDays
      ? `Лимита хватает на весь период. Дополнительный запас: ${Math.max(0, coverageDays - plannedDays)} дн.`
      : `При текущем соотношении лимита и расхода кампании хватит примерно на ${coverageDays} дн. из ${plannedDays}.`;

  syncCampaignBuilderBudgetView({
    balanceBadge,
    balanceNote,
    balanceTitle,
    budget,
    coverageDays,
    coverageRatio,
    dailyBudget: state.dailyBudget,
    insights,
    period: state.period,
    periodSummary,
    periodTitle,
    plannedDays,
    strategyLabel: STRATEGY_LABELS[state.strategy],
    totalBudget: state.totalBudget,
    warningToneLabel,
  });
}

function syncFinalReview(state: BuilderState): void {
  const audience = getAudienceStateSummary(state);
  const finalReview = getFinalReviewData(state);
  const checks: Record<FinalReviewCheckKey, FinalReviewCheck> = {
    content: finalReview.content,
    creative: finalReview.creative,
    audience: finalReview.audience,
    budget: finalReview.budget,
  };
  const pendingChecks = (Object.keys(checks) as FinalReviewCheckKey[])
    .filter((key) => !checks[key].success)
    .map((key) => checks[key].title.toLowerCase());

  syncCampaignBuilderReviewView({
    audience,
    checks,
    finalHealth: finalReview.status,
    pendingChecks,
  });
}

function syncHealth(state: BuilderState): void {
  syncCampaignBuilderHealthView(getBuilderHealth(state));
}

function syncValidation(state: BuilderState): void {
  syncCampaignBuilderValidationView({
    errors: getFieldErrors(state),
  });
}

function syncSaveState(): void {
  syncCampaignBuilderSaveStateView(formatSaveStateLabel());
}

function syncBuilderModeCopy(): void {
  const mode = getBuilderMode();

  if (mode !== 'edit') {
    return;
  }

  syncCampaignBuilderModeCopyView();
}

function syncBuilder(state: BuilderState): void {
  syncStep(state);
  syncContent(state);
  syncAudience(state);
  syncBudget(state);
  syncFinalReview(state);
  syncHealth(state);
  syncValidation(state);
  syncSaveState();
  syncBuilderModeCopy();
}

function moveStep(state: BuilderState, direction: 'next' | 'prev'): void {
  if (direction === 'next') {
    const validation = validateStep(state, state.step);

    if (!validation.ok) {
      showToast({
        title: validation.title || 'Проверьте шаг',
        description:
          validation.description ||
          'Перед переходом заполните обязательные поля.',
      });
      syncBuilder(state);
      return;
    }
  }

  const currentIndex = STEP_ORDER.indexOf(state.step);
  const nextIndex =
    direction === 'next'
      ? Math.min(STEP_ORDER.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);

  state.step = STEP_ORDER[nextIndex];
  persistBuilderState(state);
  syncBuilder(state);
}

export async function renderCampaignCreatePage(): Promise<string> {
  return renderTemplate(
    campaignCreateTemplate,
    getTemplateContext(getBuilderState()),
  );
}

export function CampaignCreate(): void | VoidFunction {
  if (campaignCreateLifecycleController) {
    campaignCreateLifecycleController.abort();
  }

  const controller = new AbortController();
  campaignCreateLifecycleController = controller;
  const { signal } = controller;
  const state = getBuilderState();

  const combinedAudienceButton = document.querySelector<HTMLElement>(
    '[data-builder-audience-detail="profile"]',
  );

  if (combinedAudienceButton) {
    combinedAudienceButton.outerHTML = `
      <button class="campaign-builder__stack-item campaign-builder__stack-item--interactive" type="button" data-builder-audience-detail="age">
        <div>
          <strong class="campaign-builder__stack-title">Возрастной диапазон</strong>
          <p class="campaign-builder__stack-text" data-audience-age-range>${state.audienceConfig.ageRange}</p>
        </div>
        <span class="campaign-builder__pill" data-audience-age-pill>${state.audienceConfig.ageRange}</span>
      </button>

      <button class="campaign-builder__stack-item campaign-builder__stack-item--interactive" type="button" data-builder-audience-detail="profile">
        <div>
          <strong class="campaign-builder__stack-title">Профиль аудитории</strong>
          <p class="campaign-builder__stack-text" data-audience-profile>${state.audienceConfig.profileTags.join(', ')}</p>
        </div>
        <span class="campaign-builder__pill" data-audience-profile-count>${state.audienceConfig.profileTags.length} тега</span>
      </button>
    `;
  }

  ensureAudiencePanelScaffold(state);
  ensureBudgetPanelScaffold(state);

  const setStep = (step: StepKey): void => {
    state.step = step;
    persistBuilderState(state);
    syncBuilder(state);
  };

  const jumpToReviewSection = (key: FinalReviewCheckKey): void => {
    const target = FINAL_REVIEW_JUMP_TARGETS[key];
    if (!target) {
      return;
    }

    setStep(target.step);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const targetNode = document.querySelector<HTMLElement>(target.selector);
        if (!targetNode) {
          return;
        }

        targetNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
        targetNode.classList.remove('campaign-builder__jump-highlight');
        void targetNode.offsetWidth;
        targetNode.classList.add('campaign-builder__jump-highlight');

        window.setTimeout(() => {
          targetNode.classList.remove('campaign-builder__jump-highlight');
        }, 1400);

        const focusNode = target.focusSelector
          ? targetNode.querySelector<HTMLElement>(target.focusSelector)
          : null;

        if (focusNode) {
          focusNode.focus({ preventScroll: true });
        }
      });
    });
  };

  initCampaignBuilderStepControls({
    jumpToReviewSection,
    moveStep: (direction) => moveStep(state, direction),
    setStep,
    signal,
  });
  initCampaignBuilderContentControls({
    clampText,
    getSelectOptionDefaultMeta,
    persistState: persistBuilderState,
    showToast,
    signal,
    state,
    syncBuilder,
  });

  initCampaignBuilderAudienceControls({
    cloneAudienceConfig,
    formatSavedAudienceSummary,
    getAudienceModalConfig,
    getProfileSelectionState,
    getSavedAudiences,
    persistSavedAudiences,
    persistState: persistBuilderState,
    renderSavedAudiencesList,
    showToast,
    signal,
    state,
    syncBuilder,
  });
  initCampaignBuilderBudgetControls({
    formatBudgetPeriod,
    persistState: persistBuilderState,
    signal,
    state,
    syncBuilder,
  });

  initCampaignBuilderActions({
    getModeConfig: getBuilderModeConfig,
    hideToast,
    persistEditSeedFromState,
    persistState: persistBuilderState,
    resetState: resetBuilderState,
    setStep,
    showToast,
    signal,
    state,
    submitBuilder: async (currentState) => {
      try {
        const mode = getBuilderMode();
        const payload = {
          name: currentState.name.trim(),
          daily_budget: Math.max(1000, Math.round(currentState.dailyBudget)),
        };

        if (mode === 'edit') {
          const seed = localStorageService.getJson<{ id?: string }>(
            LocalStorageKey.CampaignEditSeed,
          );
          const campaignId = Number(seed?.id || '0');

          if (!Number.isFinite(campaignId) || campaignId <= 0) {
            throw new Error('campaign id is required for edit mode');
          }

          await updateAdCampaign(campaignId, payload);
        } else {
          await createAdCampaign(payload);
        }

        localStorageService.removeItem(LocalStorageKey.CampaignBuilderDraft);
        navigateTo('/ads');
      } catch {
        window.dispatchEvent(
          new CustomEvent(REQUEST_ERROR_EVENT_NAME, {
            detail: {
              title: 'Не удалось создать кампанию',
              message:
                'Сейчас мы временно не можем сохранить новую кампанию. Попробуйте отправить ее немного позже.',
              note:
                'В этом разделе могут идти технические работы. После восстановления сервиса создание кампаний снова станет доступно.',
            },
          }),
        );
      }
    },
    syncBuilder,
    syncSaveState,
    validateBuilder,
  });

  syncBuilder(state);

  return () => {
    if (campaignCreateLifecycleController === controller) {
      campaignCreateLifecycleController = null;
    }

    if (builderToastTimer) {
      window.clearTimeout(builderToastTimer);
      builderToastTimer = null;
    }

    controller.abort();
  };
}
