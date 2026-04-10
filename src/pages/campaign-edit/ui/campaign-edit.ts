import './campaign-edit.scss';
import { navigateTo } from 'app/navigation';
import { LocalStorageKey, localStorageService } from 'shared/lib/local-storage';
import { renderTemplate } from 'shared/lib/render';
import { formatPrice } from 'shared/lib/format';
import campaignEditTemplate from './campaign-edit.hbs';

type CtaKey = 'discount' | 'start' | 'details' | 'lead';

interface CampaignEditHistoryItem {
  time: string;
  title: string;
  text: string;
}

interface CampaignEditState {
  id: string;
  name: string;
  headline: string;
  description: string;
  cta: CtaKey;
  dailyBudget: number;
  period: string;
  status: string;
  updatedLabel: string;
  remainingBudget: number;
  ctr: number;
  moderationBadge: string;
  format: string;
  goal: string;
  placements: string;
  geography: string;
  creatives: number;
  baseline: {
    name: string;
    headline: string;
    description: string;
    cta: CtaKey;
    dailyBudget: number;
    period: string;
  };
  history: CampaignEditHistoryItem[];
}

interface CampaignEditTemplateContext {
  moderationBadge: string;
  saveState: string;
  stats: Array<{ key: string; label: string; value: string }>;
  form: {
    name: string;
    headline: string;
    description: string;
    cta: string;
    dailyBudget: string;
    period: string;
  };
  preview: {
    headline: string;
    description: string;
    cta: string;
  };
  history: CampaignEditHistoryItem[];
  summary: Array<{ key: string; label: string; value: string }>;
  ctaOptions: Array<{ value: CtaKey; label: string; selected: boolean }>;
}

const CAMPAIGN_EDIT_STORAGE_KEY = LocalStorageKey.CampaignEditState;
const CAMPAIGN_EDIT_SEED_KEY = LocalStorageKey.CampaignEditSeed;
const CAMPAIGN_EDIT_TOAST_DELAY = 3200;

const CTA_OPTIONS: Array<{ value: CtaKey; label: string }> = [
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
      title: 'Обновлён заголовок',
      text: 'Старый вариант заменён на версию с более сильной скидкой и чётким CTA.',
    },
    {
      time: '13:55',
      title: 'Поднят дневной бюджет',
      text: 'Бюджет увеличен с 7 500 ₽ до 9 000 ₽ из-за хорошего CTR.',
    },
    {
      time: 'Вчера',
      title: 'Обновлён креатив',
      text: 'Заменён главный визуал для повышения заметности в ленте.',
    },
  ],
};

let campaignEditLifecycleController: AbortController | null = null;
let editToastTimer: number | null = null;

function getCtaLabel(value: CtaKey): string {
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

function getCampaignEditState(): CampaignEditState {
  const base = {
    ...DEFAULT_STATE,
    ...getSeededState(),
  };
  const persisted = localStorageService.getJson<Partial<CampaignEditState>>(
    CAMPAIGN_EDIT_STORAGE_KEY,
  );

  if (!persisted) {
    return base;
  }

  return {
    ...base,
    ...persisted,
    history: Array.isArray(persisted.history)
      ? persisted.history
      : base.history,
    baseline: {
      ...base.baseline,
      ...(persisted.baseline || {}),
    },
  };
}

function persistCampaignEditState(state: CampaignEditState): void {
  localStorageService.setJson(CAMPAIGN_EDIT_STORAGE_KEY, state);
}

function createChangeSummary(
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

function toTemplateContext(
  state: CampaignEditState,
): CampaignEditTemplateContext {
  return {
    moderationBadge: state.moderationBadge,
    saveState: 'Черновик сохранён',
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

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) {
    node.textContent = value;
  }
}

function renderHistory(state: CampaignEditState): void {
  const historyRoot = document.querySelector<HTMLElement>(
    '[data-edit-history]',
  );
  if (!historyRoot) {
    return;
  }

  historyRoot.innerHTML = state.history
    .map(
      (item) => `
        <article class="campaign-edit__history-item">
          <span class="campaign-edit__history-time">${item.time}</span>
          <div class="campaign-edit__history-copy">
            <strong class="campaign-edit__history-title">${item.title}</strong>
            <p class="campaign-edit__history-text">${item.text}</p>
          </div>
        </article>
      `,
    )
    .join('');
}

function renderSummary(state: CampaignEditState): void {
  const summaryRoot = document.querySelector<HTMLElement>(
    '[data-edit-summary]',
  );
  if (!summaryRoot) {
    return;
  }

  summaryRoot.innerHTML = createChangeSummary(state)
    .map(
      (item) => `
        <div class="campaign-edit__summary-row">
          <span class="campaign-edit__summary-key">${item.label}</span>
          <strong class="campaign-edit__summary-value" data-edit-summary-value="${item.key}">
            ${item.value}
          </strong>
        </div>
      `,
    )
    .join('');
}

function syncCtaSelect(state: CampaignEditState): void {
  setText('[data-edit-select-value]', getCtaLabel(state.cta));
  document
    .querySelectorAll<HTMLElement>('[data-edit-cta-option]')
    .forEach((node) => {
      const isSelected = node.dataset.editCtaOption === state.cta;
      node.classList.toggle('is-selected', isSelected);
      const metaNode = node.querySelector<HTMLElement>(
        '.campaign-edit__select-meta',
      );

      if (isSelected && !metaNode) {
        const meta = document.createElement('span');
        meta.className = 'campaign-edit__select-meta';
        meta.textContent = 'Выбрано';
        node.appendChild(meta);
      }

      if (!isSelected && metaNode) {
        metaNode.remove();
      }
    });
}

function syncCampaignEdit(state: CampaignEditState, dirty: boolean): void {
  setText('[data-edit-preview="headline"]', state.headline);
  setText('[data-edit-preview="description"]', state.description);
  setText('[data-edit-preview="cta"]', getCtaLabel(state.cta));
  setText('[data-edit-stat="updated"]', state.updatedLabel);
  setText('[data-edit-stat="budget"]', formatPrice(state.remainingBudget));
  setText('[data-edit-stat="ctr"]', `${state.ctr.toFixed(1)}%`);
  setText('[data-edit-moderation-badge]', state.moderationBadge);

  const saveStateNode = document.querySelector<HTMLElement>(
    '[data-edit-save-state]',
  );
  if (saveStateNode) {
    saveStateNode.textContent = dirty
      ? 'Есть несохранённые изменения'
      : 'Черновик сохранён';
    saveStateNode.dataset.state = dirty ? 'dirty' : 'saved';
  }

  renderHistory(state);
  renderSummary(state);
  syncCtaSelect(state);
}

function getTimeLabel(): string {
  return new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function showEditToast(title: string, text: string): void {
  const toast = document.querySelector<HTMLElement>('[data-edit-toast]');
  if (!toast) {
    return;
  }

  setText('[data-edit-toast-title]', title);
  setText('[data-edit-toast-text]', text);
  toast.hidden = false;

  if (editToastTimer) {
    window.clearTimeout(editToastTimer);
  }

  editToastTimer = window.setTimeout(() => {
    toast.hidden = true;
    editToastTimer = null;
  }, CAMPAIGN_EDIT_TOAST_DELAY);
}

function hideEditToast(): void {
  const toast = document.querySelector<HTMLElement>('[data-edit-toast]');
  if (toast) {
    toast.hidden = true;
  }

  if (editToastTimer) {
    window.clearTimeout(editToastTimer);
    editToastTimer = null;
  }
}

function openDeleteModal(): void {
  const modal = document.querySelector<HTMLElement>('[data-edit-delete-modal]');
  if (modal) {
    modal.hidden = false;
  }
}

function closeDeleteModal(): void {
  const modal = document.querySelector<HTMLElement>('[data-edit-delete-modal]');
  if (modal) {
    modal.hidden = true;
  }
}

function buildSaveHistoryText(state: CampaignEditState): string {
  const changes = createChangeSummary(state);
  const textChange =
    changes.find((item) => item.key === 'text')?.value || 'Нет';
  const budgetChange =
    changes.find((item) => item.key === 'budget')?.value || 'Без изменений';
  return `Текст: ${textChange}. Бюджет: ${budgetChange}.`;
}

export async function renderCampaignEditPage(): Promise<string> {
  return renderTemplate(
    campaignEditTemplate,
    toTemplateContext(getCampaignEditState()),
  );
}

export function CampaignEdit(): void | VoidFunction {
  const root = document.querySelector<HTMLElement>('[data-campaign-edit-page]');
  if (!root) {
    return;
  }

  if (campaignEditLifecycleController) {
    campaignEditLifecycleController.abort();
  }

  const controller = new AbortController();
  campaignEditLifecycleController = controller;
  const { signal } = controller;

  const state = getCampaignEditState();
  let dirty = false;

  const markDirty = (): void => {
    dirty = true;
    syncCampaignEdit(state, dirty);
  };

  document.querySelector<HTMLElement>('[data-edit-back]')?.addEventListener(
    'click',
    () => {
      navigateTo('/ads');
    },
    { signal },
  );

  document
    .querySelector<HTMLElement>('[data-edit-duplicate]')
    ?.addEventListener(
      'click',
      () => {
        const draft = {
          name: `${state.name} — копия`,
          headline: state.headline,
          description: state.description,
          cta: getCtaLabel(state.cta),
          link: 'https://eshke.ru/promo/spring',
          dailyBudget: state.dailyBudget,
          period: state.period,
        };

        localStorageService.setJson(
          LocalStorageKey.CampaignBuilderDraft,
          draft,
        );
        navigateTo('/ads/create');
      },
      { signal },
    );

  document
    .querySelector<HTMLElement>('[data-edit-delete-open]')
    ?.addEventListener('click', openDeleteModal, { signal });

  document
    .querySelector<HTMLElement>('[data-edit-delete-cancel]')
    ?.addEventListener('click', closeDeleteModal, { signal });

  document
    .querySelector<HTMLElement>('[data-edit-delete-confirm]')
    ?.addEventListener(
      'click',
      () => {
        localStorageService.removeItem(CAMPAIGN_EDIT_STORAGE_KEY);
        localStorageService.removeItem(CAMPAIGN_EDIT_SEED_KEY);
        closeDeleteModal();
        navigateTo('/ads');
      },
      { signal },
    );

  document
    .querySelector<HTMLElement>('[data-edit-delete-modal]')
    ?.addEventListener(
      'click',
      (event) => {
        if (event.target === event.currentTarget) {
          closeDeleteModal();
        }
      },
      { signal },
    );

  document
    .querySelector<HTMLElement>('[data-edit-toast-close]')
    ?.addEventListener('click', hideEditToast, { signal });

  document
    .querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement
    >('[data-edit-input]')
    .forEach((field) => {
      const key = field.dataset.editInput;

      const update = (): void => {
        if (key === 'name') {
          state.name = field.value.trim();
        }

        if (key === 'headline') {
          state.headline = field.value.trim();
        }

        if (key === 'description') {
          state.description = field.value.trim();
        }

        if (key === 'dailyBudget') {
          const nextValue = Number(field.value);
          state.dailyBudget = Number.isFinite(nextValue)
            ? Math.max(1000, nextValue)
            : state.dailyBudget;
        }

        if (key === 'period') {
          state.period = field.value.trim();
        }

        markDirty();
      };

      field.addEventListener('input', update, { signal });
      field.addEventListener('change', update, { signal });
    });

  const ctaSelect = document.querySelector<HTMLElement>(
    '[data-edit-select="cta"]',
  );
  const ctaTrigger = ctaSelect?.querySelector<HTMLElement>(
    '[data-edit-select-trigger]',
  );
  const ctaMenu = ctaSelect?.querySelector<HTMLElement>(
    '[data-edit-select-menu]',
  );

  const setCtaMenuOpen = (open: boolean): void => {
    if (ctaTrigger) {
      ctaTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    if (ctaMenu) {
      ctaMenu.hidden = !open;
    }

    ctaSelect?.classList.toggle('is-open', open);
  };

  setCtaMenuOpen(false);

  ctaTrigger?.addEventListener(
    'click',
    () => {
      const isOpen = ctaTrigger.getAttribute('aria-expanded') === 'true';
      setCtaMenuOpen(!isOpen);
    },
    { signal },
  );

  document
    .querySelectorAll<HTMLElement>('[data-edit-cta-option]')
    .forEach((option) => {
      option.addEventListener(
        'click',
        () => {
          const nextValue = option.dataset.editCtaOption as CtaKey | undefined;
          if (!nextValue) {
            return;
          }

          state.cta = nextValue;
          setCtaMenuOpen(false);
          markDirty();
        },
        { signal },
      );
    });

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (!target.closest('[data-edit-select="cta"]')) {
        setCtaMenuOpen(false);
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        closeDeleteModal();
        setCtaMenuOpen(false);
      }
    },
    { signal },
  );

  document.querySelector<HTMLElement>('[data-edit-save]')?.addEventListener(
    'click',
    () => {
      state.updatedLabel = 'Только что';
      state.moderationBadge = 'На модерации после правок';

      state.history = [
        {
          time: getTimeLabel(),
          title: 'Сохранены изменения',
          text: buildSaveHistoryText(state),
        },
        ...state.history,
      ].slice(0, 5);

      persistCampaignEditState(state);
      dirty = false;
      syncCampaignEdit(state, dirty);
      showEditToast(
        'Изменения сохранены',
        'Новая версия объявления готова к повторной проверке.',
      );
    },
    { signal },
  );

  syncCampaignEdit(state, dirty);

  return () => {
    if (campaignEditLifecycleController === controller) {
      campaignEditLifecycleController = null;
    }
    hideEditToast();
    controller.abort();
  };
}
