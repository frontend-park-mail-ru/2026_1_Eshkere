import { renderElement } from 'shared/lib/render';
import budgetControlsTemplate from 'features/campaign-builder/ui/budget-controls.hbs';
import budgetForecastTemplate from 'features/campaign-builder/ui/budget-forecast.hbs';
import {
  CONTENT_LIMITS,
  DEFAULT_STATE,
  FORMAT_LABELS,
  GOAL_LABELS,
  STEP_META,
  STEP_ORDER,
  STRATEGY_LABELS,
} from 'features/campaign-builder/model/config';
import {
  formatSaveStateLabel,
  getBuilderModeConfig,
} from 'features/campaign-builder/model/state';
import type {
  BuilderHealth,
  BuilderState,
  CreativeAssetKey,
  CreativeKey,
  FieldErrors,
  FinalReviewCheck,
  FinalReviewData,
  StepKey,
} from 'features/campaign-builder/model/types';
import { getAudienceStateSummary } from './campaign-create-audience';

export function clampText(value: string, limit: number): string {
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

export function getFieldErrors(state: BuilderState): FieldErrors {
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

export function getCreativeSummary(creative: CreativeKey): {
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

export function getCreativeSlots(
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

export function getMissingCreativeSlots(
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

export function validateStep(
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

export function getBudgetForecast(state: BuilderState): {
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

export function getStepProgress(state: BuilderState): {
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

export function validateBuilder(state: BuilderState): {
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

export function getBuilderHealth(state: BuilderState): BuilderHealth {
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

export function getFinalReviewData(state: BuilderState): FinalReviewData {
  const mode = getBuilderModeConfig();
  const errors = getFieldErrors(state);
  const creativeSummary = getCreativeSummary(state.creative);

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

export function getTemplateContext(state: BuilderState) {
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
      nameIsExample: state.name === DEFAULT_STATE.name,
      headlineIsExample: state.headline === DEFAULT_STATE.headline,
      descriptionIsExample: state.description === DEFAULT_STATE.description,
      ctaIsExample: state.cta === DEFAULT_STATE.cta,
      linkIsExample: state.link === DEFAULT_STATE.link,
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

export function getBudgetPeriodDays(period: string): number {
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

export function formatBudgetPeriod(days: number): string {
  return `${Math.max(1, Math.round(days))} дней`;
}

export function getBudgetInsights(state: BuilderState): {
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

export function getSelectOptionDefaultMeta(key?: string, value?: string): string {
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

export function ensureBudgetPanelScaffold(): void {
  const budgetPanel = document.querySelector<HTMLElement>('[data-step-panel="budget"]');

  if (!budgetPanel) {
    return;
  }

  const cards = budgetPanel.querySelectorAll<HTMLElement>('.campaign-builder__card');
  const settingsCard = cards[0];
  const forecastCard = cards[1];
  const form = settingsCard?.querySelector<HTMLElement>('.campaign-builder__form');

  if (settingsCard && form && !settingsCard.querySelector('[data-builder-budget-controls]')) {
    form.appendChild(renderElement(budgetControlsTemplate));
  }

  if (forecastCard && !forecastCard.querySelector('[data-budget-pace-label]')) {
    forecastCard.innerHTML = budgetForecastTemplate();
  }
}
