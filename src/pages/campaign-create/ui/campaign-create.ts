import './campaign-create.scss';
import { renderTemplate } from 'shared/lib/render';
import campaignCreateTemplate from './campaign-create.hbs';

import { getCurrentPath } from 'app/navigation';

type BuilderMode = 'create' | 'edit';
type StepKey = 'content' | 'audience' | 'budget' | 'publication';
type CreativeKey = 'feed' | 'stories' | 'video';
type MatchingMode = 'any' | 'balanced' | 'strict';
type PriorityMode = 'primary' | 'secondary';
type CreativeAssetKey =
  | 'feedVisual'
  | 'storyVisual'
  | 'mainVideo'
  | 'verticalVideo'
  | 'videoCover';
type AudienceDetailKey = 'geo' | 'age' | 'profile' | 'exclusions' | 'interests';
type AudienceChipKey = 'geo' | 'retail' | 'b2b' | 'lookalike';
type StrategyKey = 'even' | 'aggressive' | 'smart';
type GoalKey = 'website' | 'leads' | 'awareness';
type FormatKey = 'feed-card' | 'stories' | 'video-15';

interface BuilderState {
  step: StepKey;
  name: string;
  format: FormatKey;
  goal: GoalKey;
  headline: string;
  description: string;
  cta: string;
  link: string;
  creative: CreativeKey;
  creativeAssets: Partial<Record<CreativeAssetKey, string>>;
  audienceChip: AudienceChipKey;
  audienceConfig: {
    cities: string[];
    ageRange: string;
    profileTags: string[];
    exclusions: string[];
    interests: string[];
    matchingMode: MatchingMode;
    expansionEnabled: boolean;
    profilePriority: PriorityMode;
    interestsPriority: PriorityMode;
  };
  dailyBudget: number;
  totalBudget: number;
  period: string;
  strategy: StrategyKey;
}

interface ToastPayload {
  title: string;
  description: string;
}

interface AudienceSummary {
  cities: string;
  regionsLabel: string;
  reach: string;
  clicks: string;
  quality: string;
  qualityState: string;
  ageRange: string;
  profile: string;
  profileLabel: string;
  exclusions: string;
  interests: string;
  ctr?: string;
  breadth?: string;
  competition?: string;
  recommendationTitle?: string;
  recommendationText?: string;
}

interface AudiencePresetSummary
  extends Omit<
    AudienceSummary,
    | 'ageRange'
    | 'profile'
    | 'profileLabel'
    | 'ctr'
    | 'breadth'
    | 'competition'
    | 'recommendationTitle'
    | 'recommendationText'
  > {
  age: string;
}

interface AudienceModalConfig {
  title: string;
  description: string;
  selectionType: 'single' | 'multiple';
  options: Array<{ value: string; label: string; description?: string }>;
}

interface SavedAudiencePreset {
  id: string;
  name: string;
  summary: string;
  config: BuilderState['audienceConfig'];
}

interface BuilderHealth {
  badge: string;
  title: string;
  text: string;
  isPositive: boolean;
}

type FinalReviewCheckKey = 'content' | 'creative' | 'audience' | 'budget';

const FINAL_REVIEW_JUMP_TARGETS: Record<
  FinalReviewCheckKey,
  { step: StepKey; selector: string; focusSelector?: string }
> = {
  content: {
    step: 'content',
    selector: '[data-step-panel="content"] .campaign-builder__card--message',
    focusSelector: '[data-builder-input="headline"]',
  },
  creative: {
    step: 'content',
    selector: '[data-step-panel="content"] .campaign-builder__card--wide',
    focusSelector: '[data-builder-creative]',
  },
  audience: {
    step: 'audience',
    selector: '[data-step-panel="audience"] .campaign-builder__card',
    focusSelector: '[data-builder-audience-detail="geo"]',
  },
  budget: {
    step: 'budget',
    selector: '[data-step-panel="budget"] .campaign-builder__card',
    focusSelector: '[data-builder-budget="dailyBudget"]',
  },
};

interface FinalReviewCheck {
  title: string;
  text: string;
  status: string;
  success: boolean;
}

interface FinalReviewData {
  status: BuilderHealth;
  content: FinalReviewCheck;
  creative: FinalReviewCheck;
  audience: FinalReviewCheck;
  budget: FinalReviewCheck;
}

interface CampaignEditSeed {
  id: string;
  title: string;
  budgetValue: number;
  goal: string;
}

const AUDIENCE_PRESET_CONFIGS: Record<
  AudienceChipKey,
  BuilderState['audienceConfig']
> = {
  geo: {
    cities: ['Москва', 'Санкт-Петербург', 'Казань'],
    ageRange: '23-40',
    profileTags: ['Активная городская аудитория', 'Средний доход'],
    exclusions: ['Нерелевантные регионы', 'Частые отказы', 'bots'],
    interests: ['Предпринимательство', 'Маркетинг', 'e-commerce', 'digital'],
    matchingMode: 'balanced',
    expansionEnabled: true,
    profilePriority: 'primary',
    interestsPriority: 'secondary',
  },
  retail: {
    cities: ['Москва', 'Екатеринбург', 'Новосибирск'],
    ageRange: '25-44',
    profileTags: ['Покупатели маркетплейсов', 'Retail / e-com'],
    exclusions: ['Текущие клиенты', 'Сотрудники', 'Случайный трафик'],
    interests: ['Онлайн-покупки', 'Скидки', 'lifestyle', 'Доставка'],
    matchingMode: 'any',
    expansionEnabled: true,
    profilePriority: 'secondary',
    interestsPriority: 'primary',
  },
  b2b: {
    cities: ['Москва', 'Санкт-Петербург', 'Казань'],
    ageRange: '27-45',
    profileTags: ['Маркетологи', 'Владельцы SMB', 'Sales ops'],
    exclusions: ['Студенты', 'Крупный enterprise', 'Нецелевые отрасли'],
    interests: ['CRM', 'Аналитика', 'performance', 'Автоматизация'],
    matchingMode: 'strict',
    expansionEnabled: false,
    profilePriority: 'primary',
    interestsPriority: 'secondary',
  },
  lookalike: {
    cities: ['Москва', 'Санкт-Петербург', 'Краснодар'],
    ageRange: '24-40',
    profileTags: ['Look-alike', 'Похожие на текущую клиентскую базу'],
    exclusions: ['Низкая вовлечённость', 'Старые лиды', 'Дубли'],
    interests: ['Похожие сегменты', 'Бизнес-сервисы', 'growth', 'SaaS'],
    matchingMode: 'balanced',
    expansionEnabled: true,
    profilePriority: 'primary',
    interestsPriority: 'primary',
  },
};

type FieldKey =
  | 'name'
  | 'headline'
  | 'description'
  | 'cta'
  | 'link'
  | 'dailyBudget'
  | 'totalBudget'
  | 'period'
  | 'strategy';

type FieldErrors = Partial<Record<FieldKey, string>>;

let campaignCreateLifecycleController: AbortController | null = null;
let builderToastTimer: number | null = null;
let builderSavedAt = Date.now();

const DEFAULT_STATE: BuilderState = {
  step: 'content',
  name: 'Весенняя распродажа для новых клиентов',
  format: 'feed-card',
  goal: 'website',
  headline: 'До 30% на запуск первой кампании',
  description:
    'Подключите продвижение за несколько минут, получите готовые рекомендации по бюджету и начните привлекать клиентов уже сегодня.',
  cta: 'Запустить сейчас',
  link: 'https://eshke.ru/promo/spring',
  creative: 'feed',
  creativeAssets: {},
  audienceChip: 'geo',
  audienceConfig: AUDIENCE_PRESET_CONFIGS.geo,
  dailyBudget: 7500,
  totalBudget: 90000,
  period: '15 мар - 15 апр',
  strategy: 'even',
};

const CAMPAIGN_CREATE_STORAGE_KEY = 'campaign_builder_draft';
const CAMPAIGN_EDIT_STORAGE_KEY = 'campaign_edit_builder_state';
const CAMPAIGN_EDIT_SEED_KEY = 'campaign_edit_seed';

const STEP_ORDER: StepKey[] = ['content', 'audience', 'budget', 'publication'];

const STEP_META = {
  content: {
    index: '01',
    title: 'Контент',
    text: 'Оффер, формат и текст объявления',
  },
  audience: {
    index: '02',
    title: 'Аудитория',
    text: 'Сегменты, география и профиль пользователей',
  },
  budget: {
    index: '03',
    title: 'Бюджет',
    text: 'Лимиты, период и стратегия показа',
  },
  publication: {
    index: '04',
    title: 'Проверка',
    text: 'Финальная сводка и отправка на модерацию',
  },
} satisfies Record<StepKey, { index: string; title: string; text: string }>;

function getBuilderMode(): BuilderMode {
  return getCurrentPath() === '/ads/edit' ? 'edit' : 'create';
}

function getBuilderModeConfig(mode: BuilderMode = getBuilderMode()) {
  if (mode === 'edit') {
    return {
      title: 'Редактирование объявления',
      subtitle:
        'Обновите существующее объявление по тем же шагам: контент, аудитория, бюджет и финальная проверка перед сохранением.',
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
    subtitle:
      'Соберите объявление по шагам: текст, креатив, аудитория, бюджет и финальная проверка перед запуском.',
    closeLabel: 'Закрыть',
    duplicateLabel: 'Создать копию',
    resetLabel: 'Очистить форму',
    primaryActionLabel: 'Отправить на модерацию',
    saveStateFallback: 'Черновик сохранён',
    reviewTitle: 'Финальная сверка перед отправкой',
    reviewReadyText: 'Все обязательные блоки заполнены. Сверьте ключевые параметры ниже.',
    reviewPendingPrefix: 'Исправьте:',
    lockedTitle: 'Перейдите к проверке',
    lockedDescription: 'Финальная отправка доступна на шаге «Проверка».',
    submitSuccessTitle: 'Отправлено на модерацию',
    submitSuccessDescription:
      'Кампания собрана корректно. Проверьте финальную сводку и дождитесь проверки.',
    submitValidationTitle: 'Проверьте форму',
  };
}

const FORMAT_LABELS: Record<FormatKey, string> = {
  'feed-card': 'Карточка в ленте',
  stories: 'Stories / Reels',
  'video-15': 'Видео pre-roll',
};

const GOAL_LABELS: Record<GoalKey, string> = {
  website: 'Переход на сайт',
  leads: 'Сбор лидов',
  awareness: 'Охват и узнаваемость',
};

const STRATEGY_LABELS: Record<StrategyKey, string> = {
  even: 'Равномерный показ',
  aggressive: 'Ускоренный старт',
  smart: 'Автооптимизация',
};

const CONTENT_LIMITS = {
  name: 80,
  headline: 60,
  description: 180,
  cta: 32,
} as const;

const PROFILE_AGE_OPTIONS = [
  '18-24',
  '23-30',
  '24-40',
  '25-44',
  '27-45',
  '30-50',
  '35-55',
] as const;

const PROFILE_TAG_RULES = {
  min: 2,
  max: 6,
  optimalMax: 4,
} as const;

const PROFILE_TAG_OPTIONS = [
  { value: 'Активная городская аудитория', description: 'Жители крупных городов с частыми онлайн-покупками.' },
  { value: 'Средний доход', description: 'Аудитория с устойчивым средним чеком и понятной платёжеспособностью.' },
  { value: 'Покупатели маркетплейсов', description: 'Пользователи, регулярно покупающие через маркетплейсы.' },
  { value: 'Retail / e-com', description: 'Люди с привычкой сравнивать предложения и искать выгоду.' },
  { value: 'Маркетологи', description: 'Специалисты по продвижению, трафику и аналитике.' },
  { value: 'Владельцы SMB', description: 'Небольшой и средний бизнес, принимающий решения самостоятельно.' },
  { value: 'Sales ops', description: 'Команды продаж, интересующиеся лидами и автоматизацией.' },
  { value: 'Look-alike', description: 'Похожие на текущую клиентскую базу сегменты.' },
  { value: 'Похожие на текущую клиентскую базу', description: 'Люди с поведением, близким к действующим клиентам.' },
  { value: 'Молодая аудитория', description: 'Пользователи 18-30 с быстрым откликом на оффер.' },
  { value: 'Digital / product', description: 'Продакт- и digital-специалисты с высокой чувствительностью к value proposition.' },
  { value: 'Семейная аудитория', description: 'Домохозяйства и семейные покупатели с планированием бюджета.' },
  { value: 'Предприниматели', description: 'Люди, которые ищут инструменты роста и упрощения процессов.' },
  { value: 'Фрилансеры', description: 'Самозанятые и независимые специалисты с гибким спросом.' },
  { value: 'Premium-сегмент', description: 'Аудитория с повышенными требованиями к качеству и сервису.' },
  { value: 'B2B decision makers', description: 'Лица, принимающие решения по внедрению и закупкам.' },
] as const;

const SAVED_AUDIENCES_STORAGE_KEY = 'campaign_builder_saved_audiences';

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
  try {
    const raw = localStorage.getItem(SAVED_AUDIENCES_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SavedAudiencePreset[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
      .map((item) => ({
        ...item,
        config: cloneAudienceConfig({
          ...DEFAULT_STATE.audienceConfig,
          ...item.config,
          cities: Array.isArray(item.config?.cities) ? item.config.cities : [],
          profileTags: Array.isArray(item.config?.profileTags) ? item.config.profileTags : [],
          exclusions: Array.isArray(item.config?.exclusions) ? item.config.exclusions : [],
          interests: Array.isArray(item.config?.interests) ? item.config.interests : [],
        }),
      }));
  } catch {
    return [];
  }
}

function persistSavedAudiences(items: SavedAudiencePreset[]): void {
  localStorage.setItem(SAVED_AUDIENCES_STORAGE_KEY, JSON.stringify(items));
}

function formatSavedAudienceSummary(config: BuilderState['audienceConfig']): string {
  return `${config.cities.length} регионов, ${config.ageRange}, ${config.profileTags.length} профильных тегов`;
}

function formatAudienceProfile(ageRange: string, profileTags: string[]): string {
  const safeAgeRange = ageRange || DEFAULT_STATE.audienceConfig.ageRange;
  const safeTags = Array.isArray(profileTags) ? profileTags : [];
  const suffix = safeTags.length ? `, ${safeTags.join(', ')}` : '';
  return `${safeAgeRange}${suffix}`;
}

function getProfileSelectionState(profileTags: string[]): {
  label: string;
  note: string;
  canSave: boolean;
  tone: 'muted' | 'success' | 'warning';
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
    tone: 'muted',
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
    errors.description = 'Текст объявления должен быть не длиннее 180 символов.';
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

function validateStep(state: BuilderState, step: StepKey): {
  ok: boolean;
  step?: StepKey;
  title?: string;
  description?: string;
} {
  const errors = getFieldErrors(state);

  if (step === 'content') {
    if (errors.name || errors.headline || errors.description || errors.cta || errors.link) {
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
    if (errors.dailyBudget || errors.totalBudget || errors.period || errors.strategy) {
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
    Math.max(0.7, 0.85 + profileCount * 0.2 + interestsCount * 0.08 - citiesCount * 0.04),
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
  const expansionFactor = state.audienceConfig.expansionEnabled ? 36000 : -18000;
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
    reachValue >= 340000 ? 'Широкий' : reachValue >= 200000 ? 'Сбалансированный' : 'Узкий';
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
  const expansionState = state.audienceConfig.expansionEnabled ? 'Разрешено' : 'Выключено';
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
  document.querySelectorAll<HTMLElement>('[data-builder-saved-audiences]').forEach((container) => {
    const items = getSavedAudiences();

    if (!items.length) {
      container.innerHTML =
        '<p class="campaign-builder__saved-audience-empty">Здесь можно хранить готовые аудитории для повторного запуска похожих кампаний.</p>';
      return;
    }

    container.innerHTML = items
      .map((item) => {
        const isActive =
          JSON.stringify(item.config) === JSON.stringify(cloneAudienceConfig(state.audienceConfig));

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
  const audiencePanel = document.querySelector<HTMLElement>('[data-step-panel="audience"]');

  if (!audiencePanel) {
    return;
  }

  const cards = audiencePanel.querySelectorAll<HTMLElement>('.campaign-builder__card');
  const settingsCard = cards[0];
  const summaryCard = cards[1];
  const stack = settingsCard?.querySelector<HTMLElement>('.campaign-builder__stack');

  if (settingsCard && stack && !settingsCard.querySelector('[data-builder-audience-controls]')) {
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

  const budgetPanel = document.querySelector<HTMLElement>('[data-step-panel="budget"]');

  if (!budgetPanel) {
    return;
  }

  const cards = budgetPanel.querySelectorAll<HTMLElement>('.campaign-builder__card');
  const settingsCard = cards[0];
  const forecastCard = cards[1];
  const form = settingsCard?.querySelector<HTMLElement>('.campaign-builder__form');

  if (settingsCard && form && !settingsCard.querySelector('[data-builder-budget-controls]')) {
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
        description: 'Выберите возрастной диапазон, внутри которого система будет искать аудиторию.',
        selectionType: 'single',
        options: PROFILE_AGE_OPTIONS.map((value) => ({
          value,
          label: value,
        })),
      };
    case 'profile':
      return {
        title: 'Возраст и профиль',
        description: 'Соберите возрастной диапазон и профильные признаки, которые лучше всего подходят под оффер.',
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
        description: 'Выберите интересы, которые лучше всего соответствуют предложению.',
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

function getCreativeSummary(
  creative: CreativeKey,
): { count: string; placements: string } {
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
        buttonLabel: assets.videoCover ? 'Заменить обложку' : 'Загрузить обложку',
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
  const progressValue = Math.round(((currentIndex + 1) / STEP_ORDER.length) * 100);

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
      title: validation.step ? healthTitleByStep[validation.step] : 'Проверьте кампанию',
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
  const uploadedAssetsCount = creativeSlots.filter((slot) => Boolean(state.creativeAssets[slot.key])).length;

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

  const budgetIssues = [errors.dailyBudget, errors.totalBudget, errors.period, errors.strategy].filter(
    Boolean,
  ) as string[];

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

function formatSaveStateLabel(): string {
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
        state.step === key ? 'Сейчас' : index < currentIndex ? 'Готово' : 'Далее',
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
  try {
    const raw = localStorage.getItem(CAMPAIGN_EDIT_SEED_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CampaignEditSeed>;

    return {
      id: typeof parsed.id === 'string' ? parsed.id : 'default',
      title: typeof parsed.title === 'string' ? parsed.title : '',
      budgetValue:
        typeof parsed.budgetValue === 'number' && Number.isFinite(parsed.budgetValue)
          ? parsed.budgetValue
          : 0,
      goal: typeof parsed.goal === 'string' ? parsed.goal : '',
    };
  } catch {
    return null;
  }
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
    return `${CAMPAIGN_EDIT_STORAGE_KEY}:${seed?.id || 'default'}`;
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

function persistEditSeedFromState(state: BuilderState): void {
  if (getBuilderMode() !== 'edit') {
    return;
  }

  const seed = getCampaignEditSeed();

  localStorage.setItem(
    CAMPAIGN_EDIT_SEED_KEY,
    JSON.stringify({
      id: seed?.id || 'default',
      title: state.name,
      budgetValue: state.dailyBudget,
      goal: GOAL_LABELS[state.goal],
    }),
  );
}

function getBuilderState(): BuilderState {
  const mode = getBuilderMode();

  try {
    const raw = localStorage.getItem(getBuilderStorageKey(mode));

    if (!raw) {
      return mode === 'edit' ? createEditBuilderState() : createBuilderBaseState();
    }

    const parsed = JSON.parse(raw) as Partial<BuilderState> & {
      audienceConfig?: Partial<BuilderState['audienceConfig']> & { age?: string };
    };
    const fallbackState = mode === 'edit' ? createEditBuilderState() : createBuilderBaseState();
    const fallbackAudience =
      AUDIENCE_PRESET_CONFIGS[parsed.audienceChip || fallbackState.audienceChip];
    const storedAudience = parsed.audienceConfig || {};

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
              ? storedAudience.age.split(',')[0]?.trim() || fallbackAudience.ageRange
              : fallbackAudience.ageRange,
        profileTags: Array.isArray(storedAudience.profileTags)
          ? storedAudience.profileTags
          : typeof storedAudience.age === 'string' && storedAudience.age.includes(',')
            ? storedAudience.age
                .split(',')
                .slice(1)
                .map((item) => item.trim())
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
  } catch {
    return mode === 'edit' ? createEditBuilderState() : createBuilderBaseState();
  }
}

function persistBuilderState(state: BuilderState): void {
  localStorage.setItem(getBuilderStorageKey(), JSON.stringify(state));
  builderSavedAt = Date.now();
}

function resetBuilderState(): BuilderState {
  const mode = getBuilderMode();
  localStorage.removeItem(getBuilderStorageKey(mode));
  builderSavedAt = Date.now();
  return mode === 'edit' ? createEditBuilderState() : createBuilderBaseState();
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
  const coverageDays = Math.max(1, Math.round(total / Math.max(state.dailyBudget, 1)));
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
    warningTone: coverageDays < plannedDays || state.totalBudget < state.dailyBudget * 7 ? 'warning' : 'normal',
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

  document
    .querySelectorAll<HTMLElement>('[data-builder-step-trigger]')
    .forEach((button, index) => {
      const isActive = button.dataset.step === state.step;
      button.classList.toggle('campaign-builder__step--active', isActive);
      button.classList.toggle('campaign-builder__step--complete', index < currentIndex);

      const stateNode = button.querySelector<HTMLElement>(
        '.campaign-builder__step-state',
      );
      if (stateNode) {
        stateNode.textContent = isActive ? 'Сейчас' : index < currentIndex ? 'Готово' : 'Далее';
      }
    });

  document.querySelectorAll<HTMLElement>('[data-step-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.stepPanel !== state.step;
  });

  document.querySelectorAll<HTMLButtonElement>('[data-builder-submit]').forEach((button) => {
    button.classList.toggle('campaign-builder__button--locked', !canSubmit);
    button.setAttribute('aria-disabled', String(!canSubmit));
    button.title = canSubmit
      ? mode.primaryActionLabel
      : mode.lockedDescription;
  });

  setText('[data-builder-current-step]', progress.currentStepTitle);
  setText('[data-builder-current-step-text]', progress.currentStepText);
  setText('[data-builder-aside-step]', progress.currentStepTitle);
  setText('[data-builder-progress-value]', progress.progressLabel);

  const progressFill = document.querySelector<HTMLElement>(
    '[data-builder-progress-fill]',
  );
  if (progressFill) {
    progressFill.style.width = `${progress.progressValue}%`;
  }
}

function syncContent(state: BuilderState): void {
  const creative = getCreativeSummary(state.creative);
  const creativeSlots = getCreativeSlots(state.creative, state.creativeAssets);
  const formatLabel = FORMAT_LABELS[state.format];
  const goalLabel = GOAL_LABELS[state.goal];
  const previewHeadline = state.headline.trim() || 'Добавьте заголовок объявления';
  const previewDescription =
    state.description.trim() || 'Текст объявления появится здесь после заполнения формы.';
  const previewCta = state.cta.trim() || 'Добавьте кнопку';

  setTextAll('[data-preview-headline]', previewHeadline);
  setTextAll('[data-preview-description]', previewDescription);
  setTextAll('[data-preview-cta]', previewCta);
  setTextAll('[data-preview-format]', formatLabel);
  setTextAll('[data-preview-goal]', goalLabel);
  setText('[data-summary-name]', state.name);
  setTextAll('[data-summary-format]', formatLabel);
  setTextAll('[data-summary-goal]', goalLabel);
  setText('[data-builder-select-value="format"]', formatLabel);
  setText('[data-builder-select-value="goal"]', goalLabel);
  setText('[data-builder-headline-count]', String(state.headline.trim().length));
  setText(
    '[data-builder-description-count]',
    String(state.description.trim().length),
  );

  document.querySelectorAll<HTMLElement>('[data-builder-creative]').forEach((item) => {
    item.classList.toggle(
      'campaign-builder__creative--active',
      item.dataset.creative === state.creative,
    );
  });

  document
    .querySelectorAll<HTMLElement>('[data-builder-creative-slot]')
    .forEach((slot) => {
      const key = slot.dataset.slotKey as CreativeAssetKey | undefined;
      const config = key ? creativeSlots.find((item) => item.key === key) : undefined;

      if (!config) {
        slot.hidden = true;
        return;
      }

      slot.hidden = false;
      setText('[data-builder-slot-title]', config.title, slot);
      setText('[data-builder-slot-text]', config.text, slot);
      setText('[data-builder-slot-meta]', config.meta, slot);
      setText('[data-builder-slot-status]', config.status, slot);
      setText('[data-builder-slot-button-label]', config.buttonLabel, slot);

      const input = slot.querySelector<HTMLInputElement>('[data-builder-slot-input]');
      if (input) {
        input.accept = config.accept;
        input.multiple = Boolean(config.multiple);
      }
    });

  document.querySelectorAll<HTMLElement>('[data-builder-select-option]').forEach((option) => {
    const key = option.dataset.selectKey;
    const value = option.dataset.value;
    const isActive =
      (key === 'format' && value === state.format) ||
      (key === 'goal' && value === state.goal) ||
      (key === 'strategy' && value === state.strategy);

    option.classList.toggle('campaign-builder__select-option--active', isActive);

    const meta = option.querySelector<HTMLElement>(
      '.campaign-builder__select-option-meta',
    );

    if (meta) {
      meta.textContent = isActive ? 'Выбрано' : meta.dataset.defaultMeta || '';
    }
  });

  setTextAll('[data-summary-creatives]', creative.count);
  setText('[data-summary-creatives-aside]', creative.count);
  setTextAll('[data-summary-placement]', creative.placements);
  setText('[data-summary-placement-aside]', creative.placements);
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
    Math.max(0.7, 0.85 + profileCount * 0.2 + interestsCount * 0.08 - citiesCount * 0.04),
  );
  const clicksValue = Math.round(reachValue * (ctrValue / 100));
  const breadth =
    reachValue >= 320000 ? 'Широкий' : reachValue >= 200000 ? 'Сбалансированный' : 'Узкий';
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

  const setAudienceMetricLabel = (valueSelector: string, label: string): void => {
    const valueNode = document.querySelector<HTMLElement>(valueSelector);
    const labelNode = valueNode
      ?.closest<HTMLElement>('.campaign-builder__metric')
      ?.querySelector<HTMLElement>('.campaign-builder__metric-label');

    if (labelNode) {
      labelNode.textContent = label;
    }
  };

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-chip]')
    .forEach((chip) => {
      chip.classList.toggle(
        'campaign-builder__chip--active',
        chip.dataset.chip === state.audienceChip,
      );
    });

  setText('[data-audience-cities]', audience.cities);
  setText('[data-audience-region-count]', audience.regionsLabel);
  setText('[data-audience-reach]', new Intl.NumberFormat('ru-RU').format(reachValue));
  setText('[data-audience-clicks]', new Intl.NumberFormat('ru-RU').format(clicksValue));
  setText('[data-audience-quality-text]', quality);
  setText('[data-audience-quality]', qualityState);
  setText('[data-audience-ctr]', `${ctrValue.toFixed(1)}%`);
  setText('[data-audience-breadth]', breadth);
  setText('[data-audience-competition]', competition);
  setText('[data-audience-recommendation-title]', recommendationTitle);
  setText('[data-audience-recommendation-text]', recommendationText);
  setText('[data-audience-age-range]', audience.ageRange);
  setText('[data-audience-age-pill]', audience.ageRange);
  setText('[data-audience-profile]', audience.profile);
  setText('[data-audience-profile-count]', audience.profileLabel);
  setText('[data-audience-exclusions]', audience.exclusions);
  setText(
    '[data-audience-exclusions-count]',
    `${state.audienceConfig.exclusions.length} фильтра`,
  );
  setText('[data-audience-interests]', audience.interests);
  setText(
    '[data-audience-interests-count]',
    `${state.audienceConfig.interests.length} темы`,
  );
  setAudienceMetricLabel('[data-audience-reach]', 'Потенциальный охват');
  setAudienceMetricLabel('[data-audience-clicks]', 'Прогноз кликов');
  setAudienceMetricLabel('[data-audience-quality-text]', 'Качество аудитории');
  setAudienceMetricLabel('[data-audience-ctr]', 'Прогноз CTR');
  setAudienceMetricLabel('[data-audience-breadth]', 'Ширина сегмента');
  setAudienceMetricLabel('[data-audience-competition]', 'Конкуренция в аукционе');

  document
    .querySelectorAll<HTMLElement>(
      '[data-step-panel="audience"] .campaign-builder__metrics > .campaign-builder__metric-label',
    )
    .forEach((label) => label.remove());

  document
    .querySelectorAll<HTMLElement>('[data-audience-recommendation-title], [data-audience-recommendation-text]')
    .forEach((node) => node.closest<HTMLElement>('.campaign-builder__metric')?.remove());

  const insights = getAudienceInsights(state);
  setText('[data-audience-matching-note]', insights.matchingNote);
  setText('[data-audience-profile-priority-note]', insights.profilePriorityNote);
  setText('[data-audience-interests-priority-note]', insights.interestsPriorityNote);
  setText('[data-audience-expansion-state]', insights.expansionState);
  setText('[data-audience-expansion-note]', insights.expansionNote);
  setText('[data-audience-logic-badge]', insights.logicBadge);
  setText('[data-audience-explanation]', insights.explanation);
  setText('[data-audience-risk-tone]', insights.riskToneLabel);

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-setting="matchingMode"]')
    .forEach((button) => {
      button.classList.toggle(
        'campaign-builder__segmented-button--active',
        button.dataset.value === state.audienceConfig.matchingMode,
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-setting="profilePriority"]')
    .forEach((button) => {
      button.classList.toggle(
        'campaign-builder__mini-chip--active',
        button.dataset.value === state.audienceConfig.profilePriority,
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-setting="interestsPriority"]')
    .forEach((button) => {
      button.classList.toggle(
        'campaign-builder__mini-chip--active',
        button.dataset.value === state.audienceConfig.interestsPriority,
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-toggle="expansionEnabled"]')
    .forEach((button) => {
      button.classList.toggle(
        'campaign-builder__toggle--active',
        state.audienceConfig.expansionEnabled,
      );
      button.setAttribute('aria-pressed', String(state.audienceConfig.expansionEnabled));
    });

  document
    .querySelectorAll<HTMLElement>('[data-audience-risk-tone]')
    .forEach((node) => {
      node.classList.toggle('campaign-builder__pill--danger', insights.riskToneDanger);
    });

  document.querySelectorAll<HTMLElement>('[data-audience-risk-list]').forEach((list) => {
    list.innerHTML = insights.risks
      .map((risk) => `<li class="campaign-builder__risk-item">${risk}</li>`)
      .join('');
  });

  renderSavedAudiencesList(state);
}

function syncBudget(state: BuilderState): void {
  const budget = getBudgetForecast(state);
  const insights = getBudgetInsights(state);
  const plannedDays = getBudgetPeriodDays(state.period);
  const coverageDays = Math.max(
    1,
    Math.round(Math.max(state.totalBudget, state.dailyBudget) / Math.max(state.dailyBudget, 1)),
  );
  const coverageRatio = Math.max(0.08, Math.min(1, coverageDays / Math.max(plannedDays, 1)));
  const warningToneLabel = insights.warningTone === 'warning' ? 'Нужен контроль' : 'Риск умеренный';
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
    coverageDays >= plannedDays ? `${coverageDays} из ${plannedDays} дн.` : `Хватит на ${coverageDays} дн.`;
  const balanceNote =
    coverageDays >= plannedDays
      ? `Лимита хватает на весь период. Дополнительный запас: ${Math.max(0, coverageDays - plannedDays)} дн.`
      : `При текущем соотношении лимита и расхода кампании хватит примерно на ${coverageDays} дн. из ${plannedDays}.`;

  setText('[data-budget-reach]', budget.reach);
  setText('[data-budget-clicks]', budget.clicks);
  setText('[data-budget-cpc]', budget.cpc);
  setText('[data-budget-note]', budget.note);
  setTextAll('[data-final-daily-budget]', formatRubles(state.dailyBudget));
  setText('[data-final-total-budget]', formatRubles(state.totalBudget));
  setTextAll('[data-final-period]', state.period);
  setTextAll('[data-final-strategy]', STRATEGY_LABELS[state.strategy]);
  setTextAll('[data-summary-reach]', budget.reach);
  setText('[data-budget-reach-aside]', budget.reach);
  setText('[data-budget-clicks-aside]', budget.clicks);
  setText('[data-builder-budget-total]', formatRubles(state.totalBudget));
  setText('[data-builder-select-value="strategy"]', STRATEGY_LABELS[state.strategy]);
  setText('[data-budget-pace-label]', insights.paceLabel);
  setText('[data-budget-pace-note]', insights.paceNote);
  setText('[data-budget-reserve-label]', insights.reserveLabel);
  setText('[data-budget-reserve-note]', insights.reserveNote);
  setText('[data-budget-warning-tone]', warningToneLabel);
  setText(
    '[data-budget-preset-note]',
    `Дневной бюджет ${formatRubles(state.dailyBudget)} при общем лимите ${formatRubles(state.totalBudget)}.`,
  );
  setText(
    '[data-budget-period-note]',
    `Выберите удобный горизонт запуска. Сейчас кампания запланирована на ${plannedDays} дн.`,
  );
  setText('[data-budget-period-label]', 'Горизонт запуска');
  setText('[data-budget-period-title]', periodTitle);
  setText('[data-budget-period-badge]', `${plannedDays} дн.`);
  setText('[data-budget-period-summary]', periodSummary);
  setText('[data-budget-balance-label]', 'Связка лимитов');
  setText('[data-budget-balance-title]', balanceTitle);
  setText('[data-budget-balance-badge]', balanceBadge);
  setText('[data-budget-balance-note]', balanceNote);

  document.querySelectorAll<HTMLInputElement>('[data-builder-budget="dailyBudget"]').forEach((field) => {
    field.value = String(state.dailyBudget);
  });

  document.querySelectorAll<HTMLInputElement>('[data-builder-budget="totalBudget"]').forEach((field) => {
    field.value = String(state.totalBudget);
  });

  document.querySelectorAll<HTMLInputElement>('[data-builder-budget="periodDays"]').forEach((field) => {
    field.value = String(plannedDays);
  });

  document.querySelectorAll<HTMLElement>('[data-budget-warning-tone]').forEach((node) => {
    node.classList.toggle('campaign-builder__pill--danger', insights.warningTone === 'warning');
  });

  document.querySelectorAll<HTMLElement>('[data-budget-balance-badge]').forEach((node) => {
    node.classList.toggle('campaign-builder__pill--danger', coverageDays < plannedDays);
  });

  document.querySelectorAll<HTMLElement>('[data-budget-balance-fill]').forEach((node) => {
    node.style.width = `${Math.round(coverageRatio * 100)}%`;
  });

  document.querySelectorAll<HTMLElement>('[data-budget-warning-list]').forEach((list) => {
    list.innerHTML = insights.warnings
      .map((item) => `<li class="campaign-builder__risk-item">${item}</li>`)
      .join('');
  });

  document
    .querySelectorAll<HTMLElement>('[data-builder-budget-preset]')
    .forEach((button) => {
      const value = Number(button.dataset.builderBudgetPreset);
      button.classList.toggle(
        'campaign-builder__mini-chip--active',
        Number.isFinite(value) && value === state.dailyBudget,
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-period-preset]')
    .forEach((button) => {
      button.classList.toggle(
        'campaign-builder__mini-chip--active',
        button.dataset.builderPeriodPreset === state.period,
      );
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

  setTextAll('[data-final-cities]', audience.cities || 'Не выбрано');
  setTextAll('[data-final-age]', audience.ageRange || 'Не выбрано');
  setTextAll('[data-final-profile]', audience.profile || 'Не выбрано');
  setTextAll('[data-final-interests]', audience.interests || 'Не выбрано');
  setTextAll('[data-final-exclusions]', audience.exclusions || 'Не настроено');
  setText('[data-final-health-badge]', finalReview.status.badge);
  setText('[data-final-health-title]', finalReview.status.title);
  setText('[data-final-health-text]', finalReview.status.text);

  const pendingChecks = (Object.keys(checks) as FinalReviewCheckKey[])
    .filter((key) => !checks[key].success)
    .map((key) => checks[key].title.toLowerCase());

  setText(
    '[data-final-note]',
    pendingChecks.length
      ? `Исправьте: ${pendingChecks.join(', ')}.`
      : 'Сверьте сегмент, площадки, срок и бюджет.',
  );

  document.querySelectorAll<HTMLElement>('[data-final-health-badge]').forEach((node) => {
    node.classList.toggle('campaign-builder__pill--success', finalReview.status.isPositive);
    node.classList.toggle('campaign-builder__pill--danger', !finalReview.status.isPositive);
  });

  (Object.keys(checks) as FinalReviewCheckKey[]).forEach((key) => {
    const check = checks[key];
    setText(`[data-final-check-title="${key}"]`, check.title);
    setText(`[data-final-check-text="${key}"]`, check.text);
    setText(`[data-final-check-status="${key}"]`, check.status);

    document
      .querySelectorAll<HTMLElement>(`[data-final-check-status="${key}"]`)
      .forEach((node) => {
        node.classList.toggle('campaign-builder__pill--success', check.success);
        node.classList.toggle('campaign-builder__pill--danger', !check.success);
      });
  });
}

function syncHealth(state: BuilderState): void {
  const health = getBuilderHealth(state);

  setText('[data-builder-completion-state]', health.badge);

  const badge = document.querySelector<HTMLElement>(
    '[data-builder-completion-state]',
  );

  if (badge) {
    badge.classList.toggle(
      'campaign-builder__hero-meta-badge--success',
      health.isPositive,
    );
  }
}

function syncValidation(state: BuilderState): void {
  const errors = getFieldErrors(state);

  document.querySelectorAll<HTMLElement>('[data-builder-error]').forEach((node) => {
    const key = node.dataset.builderError as FieldKey | undefined;
    const field = node.closest<HTMLElement>('.campaign-builder__field');
    const message = key ? errors[key] || '' : '';

    node.textContent = message;
    node.hidden = !message;
    field?.classList.toggle('campaign-builder__field--error', Boolean(message));
  });
}

function syncSaveState(): void {
  setText('[data-builder-save-state]', formatSaveStateLabel());
}

function syncBuilderModeCopy(): void {
  const mode = getBuilderMode();

  if (mode !== 'edit') {
    return;
  }

  setText(
    '[data-step-panel="publication"] .campaign-builder__card--review-summary .campaign-builder__card-title',
    'Что сохранится после правок',
  );
  setText(
    '[data-step-panel="publication"] .campaign-builder__card--review-summary .campaign-builder__card-subtitle',
    'Финальная конфигурация объявления после редактирования.',
  );
  setText(
    '[data-step-panel="publication"] .campaign-builder__card--review-checks .campaign-builder__card-title',
    'Перед сохранением',
  );
  setText(
    '[data-step-panel="publication"] .campaign-builder__card--review-checks .campaign-builder__card-subtitle',
    'Пункты, которые стоит открыть и сверить перед сохранением.',
  );
  setText(
    '[data-step-panel="publication"] .campaign-builder__review-next .campaign-builder__review-section-title',
    'После сохранения',
  );
  setText(
    '[data-step-panel="publication"] .campaign-builder__panel-note',
    'После сохранения изменения останутся в кабинете. Если правки затрагивают креатив, текст или площадки, объявление может уйти на повторную модерацию.',
  );
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
          validation.description || 'Перед переходом заполните обязательные поля.',
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
  return renderTemplate(campaignCreateTemplate, getTemplateContext(getBuilderState()));
}

export function CampaignCreate(): void | VoidFunction {
  if (campaignCreateLifecycleController) {
    campaignCreateLifecycleController.abort();
  }

  const controller = new AbortController();
  campaignCreateLifecycleController = controller;
  const { signal } = controller;
  const state = getBuilderState();
  let activeAudienceModal: AudienceDetailKey | null = null;
  let draftAudienceConfig: BuilderState['audienceConfig'] | null = null;
  let currentAudienceSearch = '';

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

  document
    .querySelectorAll<HTMLElement>('[data-builder-step-trigger]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const step = button.dataset.step as StepKey | undefined;
          if (step) {
            setStep(step);
          }
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-step-action]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const direction = button.dataset.direction as 'next' | 'prev' | undefined;
          if (direction) {
            moveStep(state, direction);
          }
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-review-jump]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const key = button.dataset.reviewJump as FinalReviewCheckKey | undefined;
          if (key) {
            jumpToReviewSection(key);
          }
        },
        { signal },
      );
    });

  const closeMoreMenu = (): void => {
    const menu = document.querySelector<HTMLElement>('[data-builder-more-menu]');
    const trigger = document.querySelector<HTMLElement>('[data-builder-more-trigger]');
    menu?.setAttribute('hidden', '');
    trigger?.setAttribute('aria-expanded', 'false');
  };

  document.querySelector('[data-builder-more-trigger]')?.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      const menu = document.querySelector<HTMLElement>('[data-builder-more-menu]');
      const trigger = document.querySelector<HTMLElement>('[data-builder-more-trigger]');
      const isOpen = menu ? !menu.hasAttribute('hidden') : false;

      if (isOpen) {
        closeMoreMenu();
        return;
      }

      menu?.removeAttribute('hidden');
      trigger?.setAttribute('aria-expanded', 'true');
    },
    { signal },
  );

  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      '[data-builder-input]',
    )
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
          persistBuilderState(state);
          syncBuilder(state);
        },
        { signal },
      );

      if (field.dataset.builderInput === 'link') {
        field.addEventListener(
          'blur',
          () => {
            const value = field.value.trim();

            if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
              field.value = `https://${value}`;
              state.link = field.value;
              persistBuilderState(state);
              syncBuilder(state);
            }
          },
          { signal },
        );
      }
    });

  const closeSelects = (): void => {
    document.querySelectorAll<HTMLElement>('[data-builder-select]').forEach((select) => {
      select.classList.remove('campaign-builder__select--open');
      select
        .querySelector<HTMLElement>('[data-builder-select-menu]')
        ?.setAttribute('hidden', '');
      select
        .querySelector<HTMLElement>('[data-builder-select-trigger]')
        ?.setAttribute('aria-expanded', 'false');
    });
  };

  document.querySelectorAll<HTMLElement>('[data-builder-select]').forEach((select) => {
    const trigger = select.querySelector<HTMLElement>(
      '[data-builder-select-trigger]',
    );
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
      const meta = option.querySelector<HTMLElement>(
        '.campaign-builder__select-option-meta',
      );
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

          persistBuilderState(state);
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
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-builder-more]')) {
        return;
      }

      closeMoreMenu();
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        closeSelects();
        closeMoreMenu();
        closeAudienceModal();
      }
    },
    { signal },
  );

  document.querySelectorAll<HTMLElement>('[data-builder-creative]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const creative = button.dataset.creative as CreativeKey | undefined;
        if (!creative) {
          return;
        }

        state.creative = creative;
        persistBuilderState(state);
        syncBuilder(state);
      },
      { signal },
    );
  });

  document
    .querySelectorAll<HTMLInputElement>('[data-builder-slot-input]')
    .forEach((input) => {
      input.addEventListener(
        'change',
        () => {
          const key = input.dataset.builderSlotInput as CreativeAssetKey | undefined;
          const files = input.files ? Array.from(input.files) : [];

          if (!key || files.length === 0) {
            return;
          }

          const firstFile = files[0];
          const expectsVideo = key === 'mainVideo' || key === 'verticalVideo';
          const expectsImage = key === 'videoCover';

          if (expectsVideo && !firstFile.type.startsWith('video/')) {
            input.value = '';
            showToast({
              title: 'Нужен видеофайл',
              description: 'Для этого слота загрузите MP4, MOV или другой видеофайл.',
            });
            return;
          }

          if (expectsImage && !firstFile.type.startsWith('image/')) {
            input.value = '';
            showToast({
              title: 'Нужна обложка',
              description: 'Для обложки загрузите PNG, JPG или другое изображение.',
            });
            return;
          }

          state.creativeAssets[key] =
            files.length === 1
              ? firstFile.name
              : `${files.length} файла, первый: ${firstFile.name}`;

          persistBuilderState(state);
          syncBuilder(state);
          showToast({
            title: 'Креатив обновлён',
            description: `Файл "${firstFile.name}" сохранён в черновике кампании.`,
          });
          input.value = '';
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-chip]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const chip = button.dataset.chip as AudienceChipKey | undefined;
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
          persistBuilderState(state);
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
            state.audienceConfig.matchingMode = value as MatchingMode;
          } else if (key === 'profilePriority') {
            state.audienceConfig.profilePriority = value as PriorityMode;
          } else if (key === 'interestsPriority') {
            state.audienceConfig.interestsPriority = value as PriorityMode;
          }

          persistBuilderState(state);
          syncBuilder(state);
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-budget-preset]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const value = Number(button.dataset.builderBudgetPreset);

          if (!Number.isFinite(value)) {
            return;
          }

          state.dailyBudget = value;
          state.totalBudget = Math.max(state.totalBudget, value * 10);
          persistBuilderState(state);
          syncBuilder(state);
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-period-preset]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const value = button.dataset.builderPeriodPreset;

          if (!value) {
            return;
          }

          state.period = value;
          persistBuilderState(state);
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
          persistBuilderState(state);
          syncBuilder(state);
        },
        { signal },
      );
    });

  document.querySelectorAll<HTMLElement>('[data-builder-save-audience]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const name = window.prompt('Название аудитории', `Аудитория ${state.audienceConfig.ageRange}`);

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

  document.querySelectorAll<HTMLElement>('[data-builder-saved-audiences]').forEach((container) => {
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
          persistBuilderState(state);
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
            description: 'Сохранённый набор больше не будет доступен в быстрых сценариях.',
          });
        }
      },
      { signal },
    );
  });

  const audienceModal = document.querySelector<HTMLElement>('[data-builder-audience-modal]');
  const audienceModalOptions = document.querySelector<HTMLElement>(
    '[data-builder-audience-modal-options]',
  );
  const audienceModalSearch = document.querySelector<HTMLInputElement>(
    '[data-builder-audience-modal-search]',
  );
  const audienceModalSearchField = audienceModalSearch?.closest<HTMLElement>(
    '.campaign-builder__modal-search',
  );
  const audienceModalSave = document.querySelector<HTMLButtonElement>(
    '[data-builder-audience-modal-save]',
  );
  let audienceModalCloseTimer: number | null = null;

  const syncProfileSelectionUI = (): void => {
    if (!audienceModalOptions || !draftAudienceConfig) {
      return;
    }

    const profileState = getProfileSelectionState(draftAudienceConfig.profileTags);
    const countNode = audienceModalOptions.querySelector<HTMLElement>(
      '[data-profile-selected-count]',
    );
    const tagsNode = audienceModalOptions.querySelector<HTMLElement>(
      '[data-profile-selected-tags]',
    );
    const noteNode = audienceModalOptions.querySelector<HTMLElement>(
      '[data-profile-selection-note]',
    );

    if (countNode) {
      countNode.textContent = profileState.label;
    }

    if (tagsNode) {
      tagsNode.innerHTML = draftAudienceConfig.profileTags.length
        ? draftAudienceConfig.profileTags
            .map(
              (value) =>
                `<span class="campaign-builder__profile-tag-chip">${value}</span>`,
            )
            .join('')
        : '<p class="campaign-builder__profile-empty">Добавьте несколько признаков, чтобы сегмент был точнее.</p>';
    }

    if (noteNode) {
      noteNode.textContent = profileState.note;
      noteNode.dataset.tone = profileState.tone;
    }

    if (audienceModalSave) {
      audienceModalSave.disabled =
        activeAudienceModal === 'profile' ? !profileState.canSave : false;
    }
  };

  const openAudienceModal = (): void => {
    if (!audienceModal) {
      return;
    }

    if (audienceModalCloseTimer) {
      window.clearTimeout(audienceModalCloseTimer);
      audienceModalCloseTimer = null;
    }

    audienceModal.hidden = false;
    audienceModal.classList.remove('is-closing');
    requestAnimationFrame(() => {
      audienceModal.classList.add('is-open');
    });
  };

  const closeAudienceModal = (): void => {
    activeAudienceModal = null;
    draftAudienceConfig = null;
    currentAudienceSearch = '';
    if (audienceModalCloseTimer) {
      window.clearTimeout(audienceModalCloseTimer);
      audienceModalCloseTimer = null;
    }
    audienceModal?.classList.remove('is-open');
    audienceModal?.classList.add('is-closing');
    audienceModalCloseTimer = window.setTimeout(() => {
      if (audienceModalOptions) {
        audienceModalOptions.innerHTML = '';
      }
      audienceModal?.setAttribute('hidden', '');
      audienceModal?.classList.remove('is-closing');
      audienceModalCloseTimer = null;
    }, 180);
    if (audienceModalSearch) {
      audienceModalSearch.value = '';
    }
    audienceModalSearchField?.removeAttribute('hidden');
    if (audienceModalSave) {
      audienceModalSave.disabled = false;
    }
  };

  const renderAudienceModalOptions = (key: AudienceDetailKey): void => {
    const config = getAudienceModalConfig(key);

    if (!audienceModalOptions) {
      return;
    }

    const normalizedSearch = currentAudienceSearch.trim().toLowerCase();
    const selectedValues =
      key === 'geo'
        ? draftAudienceConfig?.cities || []
        : key === 'age'
          ? [draftAudienceConfig?.ageRange || state.audienceConfig.ageRange]
        : key === 'profile'
          ? draftAudienceConfig?.profileTags || []
          : key === 'exclusions'
            ? draftAudienceConfig?.exclusions || []
            : draftAudienceConfig?.interests || [];

    if (key === 'profile') {
      const filteredOptions = config.options.filter((option) => {
        if (!normalizedSearch) {
          return true;
        }

        return `${option.label} ${option.description || ''} ${option.value}`
          .toLowerCase()
          .includes(normalizedSearch);
      });

      const selectedTagsMarkup = selectedValues.length
        ? `
          ${selectedValues
            .map(
              (value) =>
                `<span class="campaign-builder__profile-tag-chip">${value}</span>`,
            )
            .join('')}
        `
        : '<p class="campaign-builder__profile-empty">Добавьте несколько признаков, чтобы сегмент был точнее.</p>';

      const profileSelectionState = getProfileSelectionState(selectedValues);

      audienceModalOptions.innerHTML = `
        <section class="campaign-builder__profile-section">
          <div class="campaign-builder__profile-section-head">
            <div>
              <strong class="campaign-builder__profile-section-title">Профиль аудитории</strong>
              <p class="campaign-builder__profile-section-text">Отметьте роли, признаки и модели поведения, которые подходят под оффер.</p>
            </div>
            <span class="campaign-builder__pill" data-profile-selected-count>${profileSelectionState.label}</span>
          </div>
          <div class="campaign-builder__profile-tags" data-profile-selected-tags>${selectedTagsMarkup}</div>
          <p class="campaign-builder__profile-selection-note" data-profile-selection-note data-tone="${profileSelectionState.tone}">${profileSelectionState.note}</p>
          <div class="campaign-builder__modal-option-list campaign-builder__modal-option-list--profile">
            ${filteredOptions
              .map((option) => {
                const checked = selectedValues.includes(option.value);
                return `
                  <label class="campaign-builder__modal-option">
                    <input
                      class="campaign-builder__modal-option-input"
                      type="checkbox"
                      value="${option.value}"
                      data-profile-tag
                      ${checked ? 'checked' : ''}
                    />
                    <span class="campaign-builder__modal-option-copy">
                      <strong class="campaign-builder__modal-option-title">${option.label}</strong>
                      ${option.description ? `<span class="campaign-builder__modal-option-text">${option.description}</span>` : ''}
                    </span>
                  </label>
                `;
              })
              .join('')}
          </div>
        </section>
      `;
      if (audienceModalSave) {
        audienceModalSave.disabled = !profileSelectionState.canSave;
      }
      return;
    }

    const filteredOptions = config.options.filter((option) => {
      if (!normalizedSearch) {
        return true;
      }

      return `${option.label} ${option.description || ''} ${option.value}`
        .toLowerCase()
        .includes(normalizedSearch);
    });

    audienceModalOptions.innerHTML = filteredOptions
      .map((option) => {
        const checked = selectedValues.includes(option.value);
        const controlType = config.selectionType === 'single' ? 'radio' : 'checkbox';
        return `
          <label class="campaign-builder__modal-option">
            <input
              class="campaign-builder__modal-option-input"
              type="${controlType}"
              name="audience-modal-selection"
              value="${option.value}"
              ${checked ? 'checked' : ''}
            />
            <span class="campaign-builder__modal-option-copy">
              <strong class="campaign-builder__modal-option-title">${option.label}</strong>
              ${option.description ? `<span class="campaign-builder__modal-option-text">${option.description}</span>` : ''}
            </span>
          </label>
        `;
      })
      .join('');
  };

  const renderAudienceModal = (key: AudienceDetailKey): void => {
    const config = getAudienceModalConfig(key);
    draftAudienceConfig = {
      cities: [...state.audienceConfig.cities],
      ageRange: state.audienceConfig.ageRange,
      profileTags: [...state.audienceConfig.profileTags],
      exclusions: [...state.audienceConfig.exclusions],
      interests: [...state.audienceConfig.interests],
      matchingMode: state.audienceConfig.matchingMode,
      expansionEnabled: state.audienceConfig.expansionEnabled,
      profilePriority: state.audienceConfig.profilePriority,
      interestsPriority: state.audienceConfig.interestsPriority,
    };
    currentAudienceSearch = '';

    const modalTitle =
      key === 'age'
        ? 'Возрастной диапазон'
        : key === 'profile'
          ? 'Профиль аудитории'
          : config.title;
    const modalDescription =
      key === 'age'
        ? 'Выберите возрастной диапазон, внутри которого система будет искать аудиторию.'
        : key === 'profile'
          ? 'Выберите роли, признаки и модели поведения, которые подходят под оффер.'
          : config.description;

    setText('[data-builder-audience-modal-title]', modalTitle);
    setText('[data-builder-audience-modal-text]', modalDescription);
    if (audienceModalSearch) {
      audienceModalSearch.value = '';
      audienceModalSearch.placeholder =
        key === 'profile' ? 'Найти роль, поведение или признак' : 'Найти вариант';
    }
    audienceModalSearchField?.toggleAttribute('hidden', key === 'age');
    renderAudienceModalOptions(key);
    if (key === 'profile') {
      syncProfileSelectionUI();
    } else if (audienceModalSave) {
      audienceModalSave.disabled = false;
    }
  };

  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-detail]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const key = button.dataset.builderAudienceDetail as AudienceDetailKey | undefined;
          if (!key || !audienceModal) {
            return;
          }

          activeAudienceModal = key;
          renderAudienceModal(key);
          openAudienceModal();
        },
        { signal },
      );
    });

  audienceModalOptions?.addEventListener(
    'change',
    () => {
      if (!activeAudienceModal || !draftAudienceConfig || !audienceModalOptions) {
        return;
      }

      const selectedValues = Array.from(
        audienceModalOptions.querySelectorAll<HTMLInputElement>(
          '.campaign-builder__modal-option-input:checked',
        ),
      ).map((input) => input.value);

      if (activeAudienceModal === 'geo') {
        draftAudienceConfig.cities = selectedValues;
      } else if (activeAudienceModal === 'age') {
        draftAudienceConfig.ageRange =
          selectedValues[0] || state.audienceConfig.ageRange;
      } else if (activeAudienceModal === 'profile') {
        const checkedTagInputs = Array.from(
          audienceModalOptions.querySelectorAll<HTMLInputElement>('[data-profile-tag]:checked'),
        );
        if (checkedTagInputs.length > PROFILE_TAG_RULES.max) {
          const lastChecked = checkedTagInputs[checkedTagInputs.length - 1];
          lastChecked.checked = false;
          showToast({
            title: 'Слишком много признаков',
            description: `Оставьте до ${PROFILE_TAG_RULES.max} тегов, иначе сегмент станет трудно масштабировать.`,
          });
        }
        draftAudienceConfig.profileTags = Array.from(
          audienceModalOptions.querySelectorAll<HTMLInputElement>(
            '[data-profile-tag]:checked',
          ),
        ).map((input) => input.value);
        syncProfileSelectionUI();
      } else if (activeAudienceModal === 'exclusions') {
        draftAudienceConfig.exclusions = selectedValues;
      } else if (activeAudienceModal === 'interests') {
        draftAudienceConfig.interests = selectedValues;
      }
    },
    { signal },
  );

  audienceModalSearch?.addEventListener(
    'input',
    () => {
      if (!activeAudienceModal) {
        return;
      }

      currentAudienceSearch = audienceModalSearch.value;
      renderAudienceModalOptions(activeAudienceModal);
    },
    { signal },
  );

  document
    .querySelectorAll<HTMLElement>(
      '[data-builder-audience-modal-close], [data-builder-audience-modal-cancel]',
    )
    .forEach((button) => {
      button.addEventListener('click', closeAudienceModal, { signal });
    });

  document.querySelector('[data-builder-audience-modal-save]')?.addEventListener(
    'click',
    () => {
      if (!activeAudienceModal || !draftAudienceConfig) {
        return;
      }

      state.audienceConfig = {
        cities: draftAudienceConfig.cities.length
          ? draftAudienceConfig.cities
          : state.audienceConfig.cities,
        ageRange: draftAudienceConfig.ageRange,
        profileTags: draftAudienceConfig.profileTags,
        exclusions: draftAudienceConfig.exclusions.length
          ? draftAudienceConfig.exclusions
          : state.audienceConfig.exclusions,
        interests: draftAudienceConfig.interests.length
          ? draftAudienceConfig.interests
          : state.audienceConfig.interests,
        matchingMode: state.audienceConfig.matchingMode,
        expansionEnabled: state.audienceConfig.expansionEnabled,
        profilePriority: state.audienceConfig.profilePriority,
        interestsPriority: state.audienceConfig.interestsPriority,
      };
      persistBuilderState(state);
      syncBuilder(state);
      closeAudienceModal();
      showToast({
        title: 'Аудитория обновлена',
        description: 'Изменения сохранены в настройках таргетинга.',
      });
    },
    { signal },
  );

  document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-builder-budget]')
    .forEach((field) => {
      const update = () => {
        const key = field.dataset.builderBudget;
        if (!key) {
          return;
        }

        if (key === 'dailyBudget' || key === 'totalBudget') {
          const parsed = Number(field.value);
          state[key] = (Number.isFinite(parsed) ? parsed : 0) as never;
        } else if (key === 'periodDays') {
          const parsed = Number(field.value);
          const clamped = Math.max(1, Math.min(365, Number.isFinite(parsed) ? Math.round(parsed) : 14));

          field.value = String(clamped);
          state.period = formatBudgetPeriod(clamped);
        } else if (key === 'strategy') {
          state.strategy = field.value as StrategyKey;
        }

        persistBuilderState(state);
        syncBuilder(state);
      };

      field.addEventListener('input', update, { signal });
      field.addEventListener('change', update, { signal });
    });

  document.querySelectorAll<HTMLElement>('[data-builder-save-template]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        localStorage.setItem('campaign_builder_template', JSON.stringify(state));
        persistBuilderState(state);
        syncSaveState();
        closeMoreMenu();
        showToast({
          title: 'Шаблон сохранён',
          description:
            'Текущую конфигурацию можно использовать как основу для следующей кампании.',
        });
      },
      { signal },
    );
  });

  document.querySelector('[data-builder-duplicate]')?.addEventListener(
    'click',
    () => {
      persistBuilderState(state);
      closeMoreMenu();
      showToast({
        title: 'Копия подготовлена',
        description:
          'Текущую конфигурацию можно использовать как основу для новой кампании.',
      });
    },
    { signal },
  );

  document.querySelector('[data-builder-reset]')?.addEventListener(
    'click',
    () => {
      const nextState = resetBuilderState();
      Object.assign(state, nextState);
      syncBuilder(state);
      closeMoreMenu();
      showToast({
        title: 'Форма очищена',
        description: 'Вернули базовую конфигурацию для новой кампании.',
      });
    },
    { signal },
  );

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    '[data-builder-input], [data-builder-budget]',
  ).forEach((field) => {
    field.addEventListener(
      'change',
      () => {
        syncSaveState();
      },
      { signal },
    );
  });

  document.querySelectorAll<HTMLElement>('[data-builder-submit]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const mode = getBuilderModeConfig();

        if (state.step !== 'publication') {
          const validation = validateBuilder(state);

          showToast({
            title: validation.ok ? mode.lockedTitle : 'Ещё не всё заполнено',
            description: validation.ok
              ? mode.lockedDescription
              : validation.description || 'Заполните обязательные поля перед отправкой.',
          });
          return;
        }

        const validation = validateBuilder(state);

        if (!validation.ok) {
          if (validation.step) {
            setStep(validation.step);
          }

          showToast({
            title: validation.title || mode.submitValidationTitle,
            description:
              validation.description || 'Не все обязательные поля заполнены.',
          });
          return;
        }

        state.step = 'publication';
        persistBuilderState(state);
        persistEditSeedFromState(state);
        syncBuilder(state);
        showToast({
          title: mode.submitSuccessTitle,
          description: mode.submitSuccessDescription,
        });
      },
      { signal },
    );
  });

  document
    .querySelector('[data-builder-toast-close]')
    ?.addEventListener('click', hideToast, { signal });

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



