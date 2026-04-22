import type { BuilderHealth, BuilderState, CreativeAssetKey, FieldErrors, StepKey } from '../model/types';
import { CONTENT_LIMITS } from '../model/config';
import { getCreativeSlots } from './creative';

export function isValidHttpUrl(value: string): boolean {
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

export function getRequiredCreativeKeys(creative: BuilderState['creative']): CreativeAssetKey[] {
  if (creative === 'video') {
    return ['mainVideo', 'verticalVideo', 'videoCover'];
  }

  if (creative === 'stories') {
    return ['storyVisual'];
  }

  return ['feedVisual'];
}

export function getMissingCreativeSlots(
  state: BuilderState,
): ReturnType<typeof getCreativeSlots> {
  const creativeSlots = getCreativeSlots(state.creative, state.creativeAssets);
  const requiredCreativeKeys = getRequiredCreativeKeys(state.creative);

  return creativeSlots.filter(
    (slot) =>
      requiredCreativeKeys.includes(slot.key) && !state.creativeAssets[slot.key],
  );
}

export function getAudienceGaps(state: BuilderState): string[] {
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
    if (errors.name || errors.headline || errors.description || errors.cta || errors.link) {
      return {
        ok: false,
        step: 'content',
        title: 'Проверьте основные данные',
        description: 'Заполните название, заголовок, текст, кнопку и ссылку перед переходом дальше.',
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

export function validateBuilder(state: BuilderState): {
  ok: boolean;
  step?: StepKey;
  title?: string;
  description?: string;
} {
  const contentValidation = validateStep(state, 'content');
  if (!contentValidation.ok) return contentValidation;

  const audienceValidation = validateStep(state, 'audience');
  if (!audienceValidation.ok) return audienceValidation;

  const budgetValidation = validateStep(state, 'budget');
  if (!budgetValidation.ok) return budgetValidation;

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
