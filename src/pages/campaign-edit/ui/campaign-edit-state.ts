import {
  LocalStorageKey,
  createLocalStorageKey,
  localStorageService,
} from 'shared/lib/local-storage';
import type {
  CampaignEditState,
  CtaKey,
} from './campaign-edit-types';

const CAMPAIGN_EDIT_STORAGE_KEY = LocalStorageKey.CampaignEditState;
export const CAMPAIGN_EDIT_SEED_KEY = LocalStorageKey.CampaignEditSeed;

export const CTA_OPTIONS: Array<{ value: CtaKey; label: string }> = [
  { value: 'discount', label: 'Получить скидку' },
  { value: 'start', label: 'Запустить сейчас' },
  { value: 'details', label: 'Подробнее' },
  { value: 'lead', label: 'Оставить заявку' },
];

const DEFAULT_STATE: CampaignEditState = {
  id: 'ad-1',
  name: 'Весенняя распродажа для новых клиентов - версия 2',
  headline: 'До 35% на запуск первой рекламной кампании',
  description:
    'Мы усилили оффер и обновили подачу. Новая версия объявления делает акцент на бонусе первого запуска и быстрых результатах без сложной настройки.',
  cta: 'discount',
  dailyBudget: 9000,
  period: '14 мар - 28 апреля',
  status: 'Активно',
  updatedLabel: 'Сегодня',
  remainingBudget: 34800,
  ctr: 3.4,
  moderationBadge: 'На модерации после правок',
  format: 'Видео pre-roll',
  goal: 'Охват и узнаваемость',
  placements: 'Лента + stories',
  geography: 'Казань',
  creatives: 2,
  baseline: {
    name: 'Весенняя распродажа для новых клиентов',
    headline: 'До 30% на запуск первой рекламной кампании',
    description:
      'Подключите продвижение за несколько минут, получите готовые рекомендации по бюджету и начните привлекать клиентов уже сегодня.',
    cta: 'start',
    dailyBudget: 7500,
    period: '14 мар - 28 апреля',
  },
  history: [
    {
      time: '14:20',
      title: 'Обновлен заголовок',
      text: 'Старый вариант заменен на версию с более сильной скидкой и четким CTA.',
    },
    {
      time: '13:55',
      title: 'Поднят дневной бюджет',
      text: 'Бюджет увеличен с 7 500 ₽ до 9 000 ₽ из-за хорошего CTR.',
    },
    {
      time: 'Вчера',
      title: 'Обновлен креатив',
      text: 'Заменен главный визуал для повышения заметности в ленте.',
    },
  ],
};

export function getCtaLabel(value: CtaKey): string {
  return (
    CTA_OPTIONS.find((option) => option.value === value)?.label ||
    CTA_OPTIONS[0].label
  );
}

function getSeededState(): Partial<CampaignEditState> {
  const parsed = localStorageService.getJson<
    Partial<CampaignEditState> & {
      title?: string;
      budgetValue?: number;
      goal?: string;
    }
  >(CAMPAIGN_EDIT_SEED_KEY);

  if (!parsed) {
    return {};
  }

  const seededBudget =
    typeof parsed.budgetValue === 'number' &&
    Number.isFinite(parsed.budgetValue)
      ? Math.max(1000, Math.round(parsed.budgetValue))
      : DEFAULT_STATE.dailyBudget;

  return {
    id: typeof parsed.id === 'string' ? parsed.id : DEFAULT_STATE.id,
    name:
      typeof parsed.name === 'string'
        ? parsed.name
        : typeof parsed.title === 'string'
          ? `${parsed.title} - версия 2`
          : DEFAULT_STATE.name,
    baseline: {
      ...DEFAULT_STATE.baseline,
      name:
        typeof parsed.name === 'string'
          ? parsed.name
          : typeof parsed.title === 'string'
            ? parsed.title
            : DEFAULT_STATE.baseline.name,
      dailyBudget: seededBudget,
    },
    dailyBudget: seededBudget,
    remainingBudget: Math.max(12000, seededBudget * 4),
    goal: typeof parsed.goal === 'string' ? parsed.goal : DEFAULT_STATE.goal,
  };
}

export function getCampaignEditStateStorageKey(): string {
  const seed = localStorageService.getJson<{ id?: string }>(CAMPAIGN_EDIT_SEED_KEY);
  const suffix =
    typeof seed?.id === 'string' && seed.id.trim() ? seed.id.trim() : 'default';

  return createLocalStorageKey(CAMPAIGN_EDIT_STORAGE_KEY, suffix);
}

export function getCampaignEditState(): CampaignEditState {
  const base = {
    ...DEFAULT_STATE,
    ...getSeededState(),
  };
  const persisted = localStorageService.getJson<Partial<CampaignEditState>>(
    getCampaignEditStateStorageKey(),
  );

  if (!persisted) {
    return base;
  }

  return {
    ...base,
    ...persisted,
    history: Array.isArray(persisted.history) ? persisted.history : base.history,
    baseline: {
      ...base.baseline,
      ...(persisted.baseline || {}),
    },
  };
}

export function persistCampaignEditState(state: CampaignEditState): void {
  localStorageService.setJson(getCampaignEditStateStorageKey(), state);
}
