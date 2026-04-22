import {
  FORMAT_LABELS,
  GOAL_LABELS,
  STEP_ORDER,
  STRATEGY_LABELS,
} from 'features/campaign-builder/model/config';
import {
  formatSaveStateLabel,
  getBuilderMode,
  getBuilderModeConfig,
  persistBuilderState,
} from 'features/campaign-builder/model/state';
import type {
  BuilderState,
  FinalReviewCheck,
  FinalReviewCheckKey,
  ToastPayload,
} from 'features/campaign-builder/model/types';
import { syncCampaignBuilderAudienceView } from 'widgets/campaign-builder-audience/ui/audience';
import { syncCampaignBuilderBudgetView } from 'widgets/campaign-builder-budget/ui/budget';
import { syncCampaignBuilderContentView } from 'widgets/campaign-builder-content/ui/content';
import { syncCampaignBuilderReviewView } from 'widgets/campaign-builder-review/ui/review';
import {
  syncCampaignBuilderHealthView,
  syncCampaignBuilderModeCopyView,
  syncCampaignBuilderSaveStateView,
  syncCampaignBuilderValidationView,
} from 'widgets/campaign-builder-status/ui/status';
import { syncCampaignBuilderStepView } from 'widgets/campaign-builder-step/ui/step';
import {
  getAudienceInsights,
  getAudienceStateSummary,
  renderSavedAudiencesList,
} from './campaign-create-audience';
import {
  getBudgetForecast,
  getBudgetInsights,
  getBudgetPeriodDays,
  getBuilderHealth,
  getCreativeSlots,
  getCreativeSummary,
  getFieldErrors,
  getFinalReviewData,
  getStepProgress,
  validateStep,
} from './campaign-create-builder';

let builderToastTimer: number | null = null;

export function showToast({ title, description }: ToastPayload): void {
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

export function hideToast(): void {
  const toast = document.querySelector<HTMLElement>('[data-builder-toast]');

  if (toast) {
    toast.hidden = true;
  }

  if (builderToastTimer) {
    window.clearTimeout(builderToastTimer);
    builderToastTimer = null;
  }
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
  const insights = getAudienceInsights(state);

  syncCampaignBuilderAudienceView({
    audience,
    audienceChip: state.audienceChip,
    breadth: insights.breadth,
    clicks: new Intl.NumberFormat('ru-RU').format(insights.clicksValue),
    competition: insights.competition,
    ctr: `${insights.ctrValue.toFixed(1)}%`,
    exclusionsCount: state.audienceConfig.exclusions.length,
    expansionEnabled: state.audienceConfig.expansionEnabled,
    interestsCount: state.audienceConfig.interests.length,
    interestsPriority: state.audienceConfig.interestsPriority,
    insights,
    matchingMode: state.audienceConfig.matchingMode,
    profilePriority: state.audienceConfig.profilePriority,
    quality: insights.quality,
    qualityState: insights.qualityState,
    reach: new Intl.NumberFormat('ru-RU').format(insights.reachValue),
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
  const balanceTitle = `${state.dailyBudget.toLocaleString('ru-RU')} ₽ в день x ${coverageDays} дн. = ${state.totalBudget.toLocaleString('ru-RU')} ₽`;
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

export function syncSaveState(): void {
  syncCampaignBuilderSaveStateView(formatSaveStateLabel());
}

function syncBuilderModeCopy(): void {
  if (getBuilderMode() !== 'edit') {
    return;
  }

  syncCampaignBuilderModeCopyView();
}

export function syncBuilder(state: BuilderState): void {
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

export function moveStep(
  state: BuilderState,
  direction: 'next' | 'prev',
): void {
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
