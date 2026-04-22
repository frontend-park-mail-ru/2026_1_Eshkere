import './moderator.scss';
import { navigateTo } from 'app/navigation';
import { logoutUser } from 'features/auth';
import { renderTemplate } from 'shared/lib/render';
import moderatorTemplate from './moderator.hbs';

interface ModeratorMetric {
  label: string;
  value: string;
  note: string;
  tone: 'accent' | 'success' | 'warning' | 'danger';
}

interface ModeratorQueueItem {
  title: string;
  meta: string;
  priority: string;
  priorityTone: 'danger' | 'warning' | 'success';
  sla: string;
  tags: string[];
}

interface ModeratorQueueColumn {
  stage: 'all' | 'incoming' | 'review' | 'decision' | 'escalation';
  title: string;
  count: string;
  description: string;
  items: ModeratorQueueItem[];
}

interface ModeratorFeedItem {
  title: string;
  meta: string;
  description: string;
  status: string;
  statusTone: 'neutral' | 'success' | 'warning' | 'danger';
}

interface ModeratorRuleItem {
  title: string;
  description: string;
  impact: string;
}

const overviewMetrics: ModeratorMetric[] = [
  {
    label: 'В очереди сейчас',
    value: '148',
    note: '+12 за последний час',
    tone: 'accent',
  },
  {
    label: 'Нарушения подтверждены',
    value: '27',
    note: '18.2% от всех кейсов',
    tone: 'danger',
  },
  {
    label: 'Средний SLA',
    value: '11 мин',
    note: 'ниже целевых 15 мин',
    tone: 'success',
  },
  {
    label: 'Эскалации в продукт',
    value: '6',
    note: '2 срочные, 4 плановые',
    tone: 'warning',
  },
];

const queueColumns: ModeratorQueueColumn[] = [
  {
    stage: 'incoming',
    title: 'Новые жалобы',
    count: '42',
    description: 'Сырые обращения и автосигналы, которые требуют первичного разбора.',
    items: [
      {
        title: 'Кампания #5821 · агрессивный оффер',
        meta: 'Маркетплейсы · поступила 4 мин назад',
        priority: 'Критично',
        priorityTone: 'danger',
        sla: 'SLA 06:20',
        tags: ['Жалоба пользователя', 'Автоправило'],
      },
      {
        title: 'Креатив #221 · подозрение на мислид',
        meta: 'Telegram Ads · 11 жалоб',
        priority: 'Высокий риск',
        priorityTone: 'warning',
        sla: 'SLA 09:10',
        tags: ['Визуал', 'Текст'],
      },
    ],
  },
  {
    stage: 'review',
    title: 'На разборе',
    count: '63',
    description: 'Кейсы в работе у модераторов: проверка контента, истории и контекста показа.',
    items: [
      {
        title: 'Профиль рекламодателя ООО "Сфера"',
        meta: 'Проверка документов · 2 модератора подключены',
        priority: 'Фокус',
        priorityTone: 'success',
        sla: 'SLA 14:40',
        tags: ['KYC', 'Повторная проверка'],
      },
      {
        title: 'Лендинг #993 · спорный health-клейм',
        meta: 'Переходы из VK и Дзена',
        priority: 'Высокий риск',
        priorityTone: 'warning',
        sla: 'SLA 07:55',
        tags: ['Landing', 'Policy'],
      },
    ],
  },
  {
    stage: 'decision',
    title: 'Ожидают решения',
    count: '29',
    description: 'Материалы собраны, нужно вынести вердикт и отправить причину рекламодателю.',
    items: [
      {
        title: 'Кампания #5730 · спор по гео-таргету',
        meta: 'Повторное открытие после апелляции',
        priority: 'Требует ответа',
        priorityTone: 'warning',
        sla: 'SLA 04:30',
        tags: ['Апелляция', 'Geo'],
      },
      {
        title: 'Баннер #114 · шок-контент',
        meta: 'Автоблок уже применен',
        priority: 'Критично',
        priorityTone: 'danger',
        sla: 'SLA 02:15',
        tags: ['Блокировка', 'Safety'],
      },
    ],
  },
  {
    stage: 'escalation',
    title: 'Эскалации',
    count: '14',
    description: 'Кейсы, где требуется продукт, юристы или ручное решение операционного лида.',
    items: [
      {
        title: 'Правило "misleading_claims_v2" слишком шумит',
        meta: '58 ложных срабатываний за сутки',
        priority: 'Разобрать сегодня',
        priorityTone: 'danger',
        sla: 'ETA 17:00',
        tags: ['Rule tuning', 'ML'],
      },
      {
        title: 'VIP-рекламодатель просит ручной ревью канал',
        meta: 'Тариф Enterprise · SLA по договору',
        priority: 'Приоритет',
        priorityTone: 'success',
        sla: 'ETA 13:30',
        tags: ['Enterprise', 'SLA'],
      },
    ],
  },
];

const moderationFeed: ModeratorFeedItem[] = [
  {
    title: 'Апелляции рекламодателей',
    meta: 'Сегодня · 19 кейсов',
    description:
      '7 кейсов уже закрыты, 5 требуют комментарий для аккаунт-менеджера, 3 уходят на продукт.',
    status: 'Под контролем',
    statusTone: 'success',
  },
  {
    title: 'Автоматические блокировки',
    meta: 'Последний час · 34 события',
    description:
      'Триггер "финансовые обещания" сработал чаще нормы. Нужна ручная валидация выборки.',
    status: 'Нужна проверка',
    statusTone: 'warning',
  },
  {
    title: 'Очередь документов KYC',
    meta: 'Остаток · 11 файлов',
    description:
      'По трём карточкам не хватает ИНН, ещё у двух есть расхождение в юрлице и лендинге.',
    status: 'Есть риск SLA',
    statusTone: 'danger',
  },
];

const ruleUpdates: ModeratorRuleItem[] = [
  {
    title: 'Новая проверка на clickbait в тизерах',
    description:
      'Смотрим сверхобещания, манипулятивные формулировки и контраст между оффером и посадочной.',
    impact: 'Снизит спорные публикации в entertainment-сегменте.',
  },
  {
    title: 'Ослабление правила по caps lock для баннеров',
    description:
      'Оставляем только кейсы, где caps используется вместе с давлением или вводящими в заблуждение обещаниями.',
    impact: 'Меньше ложных отклонений у e-com кампаний.',
  },
  {
    title: 'Чек-лист для enterprise-апелляций',
    description:
      'Вводим обязательный комментарий, ссылку на policy и понятную причину отклонения до отправки клиенту.',
    impact: 'Сократит повторные обращения и эскалации в аккаунтинг.',
  },
];

export async function renderModeratorPage(): Promise<string> {
  return renderTemplate(moderatorTemplate, {
    overviewMetrics,
    queueColumns,
    moderationFeed,
    ruleUpdates,
  });
}

export function Moderator(): void {
  const root = document.querySelector('.moderator-page');
  const logoutButton = document.getElementById(
    'moderator-logout-button',
  ) as HTMLButtonElement | null;
  const adsButton = document.getElementById('moderator-ads-link');

  if (!(root instanceof HTMLElement)) {
    return;
  }

  const filterButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-moderator-filter]'),
  );
  const queueColumnsNodes = Array.from(
    root.querySelectorAll<HTMLElement>('[data-queue-stage]'),
  );
  const searchInput = root.querySelector<HTMLInputElement>('[data-moderator-search]');
  const searchableCards = Array.from(
    root.querySelectorAll<HTMLElement>('[data-searchable-card]'),
  );

  const applyStageFilter = (stage: string): void => {
    filterButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.moderatorFilter === stage);
    });

    queueColumnsNodes.forEach((column) => {
      const columnStage = column.dataset.queueStage;
      const shouldShow = stage === 'all' || columnStage === stage;
      column.hidden = !shouldShow;
    });
  };

  const applySearch = (query: string): void => {
    const normalizedQuery = query.trim().toLowerCase();

    searchableCards.forEach((card) => {
      const haystack = (card.dataset.searchableCard || card.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      card.hidden = Boolean(normalizedQuery) && !haystack.includes(normalizedQuery);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyStageFilter(button.dataset.moderatorFilter || 'all');
    });
  });

  searchInput?.addEventListener('input', () => {
    applySearch(searchInput.value);
  });

  adsButton?.addEventListener('click', (event) => {
    event.preventDefault();
    navigateTo('/ads');
  });

  logoutButton?.addEventListener('click', async () => {
    if (logoutButton.disabled) {
      return;
    }

    logoutButton.disabled = true;

    try {
      await logoutUser();
      navigateTo('/login', { replace: true });
    } finally {
      logoutButton.disabled = false;
    }
  });

  applyStageFilter('all');
}
