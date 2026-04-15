import type {
  AudienceChipKey,
  BuilderAudienceConfig,
  BuilderState,
  FinalReviewCheckKey,
  FormatKey,
  GoalKey,
  StepKey,
  StrategyKey,
} from './types';

export const FINAL_REVIEW_JUMP_TARGETS: Record<
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

export const AUDIENCE_PRESET_CONFIGS: Record<
  AudienceChipKey,
  BuilderAudienceConfig
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

export const DEFAULT_STATE: BuilderState = {
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

export const STEP_ORDER: StepKey[] = ['content', 'audience', 'budget', 'publication'];

export const STEP_META = {
  content: {
    index: '01',
    title: 'Контент',
    text: 'Оффер, формат и текст объявления',
  },
  audience: {
    index: '02',
    title: 'Аудитория',
    text: 'Сегменты, таргетинг и география',
  },
  budget: {
    index: '03',
    title: 'Бюджет',
    text: 'Лимиты, период и стратегия показа',
  },
  publication: {
    index: '04',
    title: 'Проверка',
    text: 'Финальная сводка перед отправкой',
  },
} satisfies Record<StepKey, { index: string; title: string; text: string }>;

export const FORMAT_LABELS: Record<FormatKey, string> = {
  'feed-card': 'Карточка в ленте',
  stories: 'Stories / Reels',
  'video-15': 'Видео pre-roll',
};

export const GOAL_LABELS: Record<GoalKey, string> = {
  website: 'Переход на сайт',
  leads: 'Сбор лидов',
  awareness: 'Охват и узнаваемость',
};

export const STRATEGY_LABELS: Record<StrategyKey, string> = {
  even: 'Равномерный показ',
  aggressive: 'Ускоренный старт',
  smart: 'Автооптимизация',
};

export const CONTENT_LIMITS = {
  name: 80,
  headline: 60,
  description: 180,
  cta: 32,
} as const;

export const PROFILE_AGE_OPTIONS = [
  '18-24',
  '23-30',
  '24-40',
  '25-44',
  '27-45',
  '30-50',
  '35-55',
] as const;

export const PROFILE_TAG_RULES = {
  min: 2,
  optimalMax: 4,
  max: 6,
} as const;
