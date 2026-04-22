import { formatPrice } from 'shared/lib/format';
import type {
  CampaignEditState,
  CampaignEditTemplateContext,
} from './campaign-edit-types';
import { CTA_OPTIONS, getCtaLabel } from './campaign-edit-state';

export function createChangeSummary(
  state: CampaignEditState,
): Array<{ key: string; label: string; value: string }> {
  const headlineChanged =
    state.headline.trim() !== state.baseline.headline.trim();
  const descriptionChanged =
    state.description.trim() !== state.baseline.description.trim();
  const ctaChanged = state.cta !== state.baseline.cta;
  const budgetDelta = state.dailyBudget - state.baseline.dailyBudget;
  const moderationRequired =
    headlineChanged || descriptionChanged || ctaChanged;

  const textChangedParts: string[] = [];
  if (headlineChanged) textChangedParts.push('Заголовок');
  if (descriptionChanged) textChangedParts.push('Описание');
  if (ctaChanged) textChangedParts.push('CTA');

  let effect = 'Без резкой смены показателей';
  if (moderationRequired && budgetDelta > 0) {
    effect = 'Рост CTR и охвата';
  } else if (moderationRequired) {
    effect = 'Рост CTR';
  } else if (budgetDelta > 0) {
    effect = 'Рост охвата';
  }

  return [
    {
      key: 'moderation',
      label: 'Повторная модерация',
      value: moderationRequired ? 'Да' : 'Нет',
    },
    {
      key: 'budget',
      label: 'Обновление бюджета',
      value:
        budgetDelta === 0
          ? 'Без изменений'
          : `${budgetDelta > 0 ? '+' : '−'}${formatPrice(Math.abs(budgetDelta))} / день`,
    },
    {
      key: 'text',
      label: 'Изменение текста',
      value: textChangedParts.length ? textChangedParts.join(' + ') : 'Нет',
    },
    {
      key: 'effect',
      label: 'Ожидаемый эффект',
      value: effect,
    },
  ];
}

export function toTemplateContext(
  state: CampaignEditState,
): CampaignEditTemplateContext {
  return {
    moderationBadge: state.moderationBadge,
    saveState: 'Черновик сохранен',
    stats: [
      { key: 'status', label: 'Текущий статус', value: state.status },
      {
        key: 'updated',
        label: 'Последнее обновление',
        value: state.updatedLabel,
      },
      {
        key: 'budget',
        label: 'Остаток бюджета',
        value: formatPrice(state.remainingBudget),
      },
      { key: 'ctr', label: 'CTR', value: `${state.ctr.toFixed(1)}%` },
    ],
    form: {
      name: state.name,
      headline: state.headline,
      description: state.description,
      cta: getCtaLabel(state.cta),
      dailyBudget: String(state.dailyBudget),
      period: state.period,
    },
    preview: {
      headline: state.headline,
      description: state.description,
      cta: getCtaLabel(state.cta),
    },
    history: state.history,
    summary: createChangeSummary(state),
    ctaOptions: CTA_OPTIONS.map((option) => ({
      ...option,
      selected: option.value === state.cta,
    })),
  };
}

function getTimeLabel(): string {
  return new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildSaveHistoryItem(state: CampaignEditState) {
  const changes = createChangeSummary(state);
  const textChange =
    changes.find((item) => item.key === 'text')?.value || 'Нет';
  const budgetChange =
    changes.find((item) => item.key === 'budget')?.value || 'Без изменений';

  return {
    time: getTimeLabel(),
    title: 'Сохранены изменения',
    text: `Текст: ${textChange}. Бюджет: ${budgetChange}.`,
  };
}
