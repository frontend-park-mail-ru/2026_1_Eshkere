export interface ModerationQueueItem {
  id: string;
  type: 'campaign' | 'creative' | 'landing' | 'account' | 'document';
  title: string;
  advertiser: string;
  platform: string;
  stage: 'incoming' | 'review' | 'decision' | 'escalation';
  priority: 'critical' | 'high' | 'medium';
  slaMinutes: number;
  reason: string;
  tags: string[];
  createdAt: string;
  assignedTo: string;
  summary: string;
}

export interface ModerationCaseDecisionOption {
  id: string;
  label: string;
  tone: 'success' | 'danger' | 'warning' | 'neutral';
  note: string;
}

export interface ModerationCaseSubmission {
  name: string;
  formatLabel: string;
  goalLabel: string;
  headline: string;
  description: string;
  cta: string;
  link: string;
  moderationNote: string;
  placements: string;
  creativeType: string;
  creativeAssets: Array<{
    title: string;
    meta: string;
    status: string;
    note: string;
  }>;
  audience: {
    cities: string[];
    ageRange: string;
    profileTags: string[];
    interests: string[];
    exclusions: string[];
    matchingMode: string;
    expansionLabel: string;
  };
  budget: {
    dailyBudget: string;
    totalBudget: string;
    period: string;
    strategy: string;
    forecastReach: string;
    forecastClicks: string;
    forecastCpc: string;
  };
}

export interface ModerationMessage {
  id: string;
  author: 'moderator' | 'client' | 'system';
  authorName: string;
  timestamp: string;
  text: string;
}

export interface ModerationPolicyReference {
  code: string;
  title: string;
  description: string;
}

export interface ModerationCaseDetail {
  id: string;
  title: string;
  objectType: string;
  advertiser: string;
  status: string;
  stage: ModerationQueueItem['stage'];
  priority: ModerationQueueItem['priority'];
  platform: string;
  campaignId: string;
  submittedAt: string;
  assignedTo: string;
  sla: string;
  summary: string;
  assets: Array<{ label: string; value: string }>;
  signals: string[];
  checks: Array<{ label: string; state: 'pass' | 'warning' | 'fail' }>;
  decisions: ModerationCaseDecisionOption[];
  internalNotes: string[];
  policyReferences: ModerationPolicyReference[];
  messages: ModerationMessage[];
  submission: ModerationCaseSubmission;
}

export interface ModerationAppealItem {
  id: string;
  caseId: string;
  advertiser: string;
  subject: string;
  status: string;
  receivedAt: string;
  owner: string;
}

export interface ModerationInboxThread {
  id: string;
  advertiser: string;
  subject: string;
  status: string;
  lastMessage: string;
  updatedAt: string;
}

export interface ModerationPolicyItem {
  code: string;
  category: string;
  title: string;
  summary: string;
  severity: string;
}

export interface ModerationAuditItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  note: string;
}

export const moderationQueue: ModerationQueueItem[] = [
  {
    id: '5821',
    type: 'campaign',
    title: 'Кампания "Финансовый рывок за 3 дня"',
    advertiser: 'ООО ФинТон',
    platform: 'Telegram Ads',
    stage: 'incoming',
    priority: 'critical',
    slaMinutes: 6,
    reason: 'Подозрение на misleading claims и давление на пользователя.',
    tags: ['finance', 'claim', 'auto-rule'],
    createdAt: '4 мин назад',
    assignedTo: 'Не назначен',
    summary: 'Автосигнал и 11 жалоб на обещание гарантированного дохода.',
  },
  {
    id: '221',
    type: 'creative',
    title: 'Креатив "Шок-скидка только сегодня"',
    advertiser: 'Market Nova',
    platform: 'VK Ads',
    stage: 'review',
    priority: 'high',
    slaMinutes: 11,
    reason: 'Clickbait, возможный диссонанс с лендингом.',
    tags: ['creative', 'clickbait'],
    createdAt: '12 мин назад',
    assignedTo: 'Алина С.',
    summary: 'Нужно сравнить обещание в баннере с фактическим оффером на лендинге.',
  },
  {
    id: '993',
    type: 'landing',
    title: 'Лендинг "Вылечим боль без врача"',
    advertiser: 'Здоровье+',
    platform: 'Яндекс',
    stage: 'decision',
    priority: 'high',
    slaMinutes: 4,
    reason: 'Health claims без подтверждения.',
    tags: ['health', 'landing'],
    createdAt: '24 мин назад',
    assignedTo: 'Егор П.',
    summary: 'Материалы проверены, не хватает финального решения и текста клиенту.',
  },
  {
    id: 'A-14',
    type: 'account',
    title: 'Профиль рекламодателя "Sphere Group"',
    advertiser: 'Sphere Group',
    platform: 'Multi-platform',
    stage: 'escalation',
    priority: 'medium',
    slaMinutes: 35,
    reason: 'Повторные жалобы и спор по документам.',
    tags: ['kyc', 'account'],
    createdAt: '1 час назад',
    assignedTo: 'Lead queue',
    summary: 'Нужен повторный review с участием product и account team.',
  },
];

export const moderationAppeals: ModerationAppealItem[] = [
  {
    id: 'APL-302',
    caseId: '993',
    advertiser: 'Здоровье+',
    subject: 'Клиент просит пересмотреть решение по health claims',
    status: 'Новая апелляция',
    receivedAt: 'Сегодня, 12:14',
    owner: 'Старший модератор',
  },
  {
    id: 'APL-301',
    caseId: '221',
    advertiser: 'Market Nova',
    subject: 'Повторный review после правок креатива',
    status: 'Ждет проверки',
    receivedAt: 'Сегодня, 10:46',
    owner: 'Алина С.',
  },
];

export const moderationInbox: ModerationInboxThread[] = [
  {
    id: 'MSG-11',
    advertiser: 'ООО ФинТон',
    subject: 'Нужны пояснения по отклонению кампании #5821',
    status: 'Требует ответа',
    lastMessage: 'Мы убрали формулировку про гарантированный доход. Можно ли отправить заново?',
    updatedAt: '2 мин назад',
  },
  {
    id: 'MSG-10',
    advertiser: 'Market Nova',
    subject: 'Уточнение по баннеру и правилам clickbait',
    status: 'В диалоге',
    lastMessage: 'Клиент приложил обновленный баннер и просит ручную проверку.',
    updatedAt: '18 мин назад',
  },
];

export const moderationPolicies: ModerationPolicyItem[] = [
  {
    code: 'FIN-04',
    category: 'Finance',
    title: 'Нельзя обещать гарантированную прибыль или безрисковый доход',
    summary: 'Любые абсолютные обещания финансового результата требуют отклонения или исправления.',
    severity: 'Critical',
  },
  {
    code: 'HLT-02',
    category: 'Health',
    title: 'Медицинские claims требуют подтверждаемого основания',
    summary: 'Нельзя использовать формулировки о лечении или гарантированном эффекте без верифицируемых доказательств.',
    severity: 'High',
  },
  {
    code: 'CR-07',
    category: 'Creative',
    title: 'Clickbait и вводящие в заблуждение тизеры',
    summary: 'Запрещены манипулятивные заголовки и сильный разрыв между креативом и посадочной.',
    severity: 'Medium',
  },
];

export const moderationAuditLog: ModerationAuditItem[] = [
  {
    id: 'LOG-8001',
    actor: 'Егор П.',
    action: 'Отклонил кейс',
    target: 'Кампания #993',
    timestamp: 'Сегодня, 11:58',
    note: 'Код policy HLT-02, отправлен запрос на исправление текста лендинга.',
  },
  {
    id: 'LOG-8000',
    actor: 'Алина С.',
    action: 'Перевела кейс в review',
    target: 'Креатив #221',
    timestamp: 'Сегодня, 11:42',
    note: 'Сопоставление баннера с новым лендингом после жалобы.',
  },
];

const caseDetails: Record<string, ModerationCaseDetail> = {
  '5821': {
    id: '5821',
    title: 'Кампания "Финансовый рывок за 3 дня"',
    objectType: 'Кампания',
    advertiser: 'ООО ФинТон',
    status: 'Новый входящий кейс',
    stage: 'incoming',
    priority: 'critical',
    platform: 'Telegram Ads',
    campaignId: '5821',
    submittedAt: 'Сегодня, 12:08',
    assignedTo: 'Не назначен',
    sla: '06:20 до нарушения SLA',
    summary:
      'Кейс попал в очередь из-за автоправила FIN-04 и жалоб на обещание гарантированного дохода. Нужно проверить креатив, посадочную и историю рекламодателя.',
    assets: [
      { label: 'Заголовок', value: 'Заработай от 300 000 ₽ за 3 дня без риска' },
      { label: 'CTA', value: 'Получить схему сейчас' },
      { label: 'Лендинг', value: 'fin-ton.example/boost' },
      { label: 'Таргетинг', value: '25-45, interest: business, finance' },
    ],
    signals: [
      '11 пользовательских жалоб за 15 минут',
      'Автосигнал по policy FIN-04',
      'У аккаунта уже были 2 отклонённые кампании по misleading claims',
    ],
    checks: [
      { label: 'Гарантированная прибыль / отсутствие риска', state: 'fail' },
      { label: 'Соответствие лендинга креативу', state: 'warning' },
      { label: 'Прозрачность оффера и disclaimer', state: 'fail' },
      { label: 'Возрастные ограничения и фин. оговорки', state: 'warning' },
    ],
    decisions: [
      {
        id: 'approve',
        label: 'Одобрить',
        tone: 'success',
        note: 'Если нарушения не подтверждаются и материалы консистентны.',
      },
      {
        id: 'reject',
        label: 'Отклонить',
        tone: 'danger',
        note: 'Основной сценарий для ложных обещаний и опасных claims.',
      },
      {
        id: 'request_changes',
        label: 'Запросить исправления',
        tone: 'warning',
        note: 'Если можно исправить формулировки без полной блокировки аккаунта.',
      },
      {
        id: 'escalate',
        label: 'Эскалировать',
        tone: 'neutral',
        note: 'Если кейс требует юристов, product или senior review.',
      },
    ],
    internalNotes: [
      'Проверить, не совпадает ли лендинг с ранее заблокированным доменом.',
      'Если клиент запросит апелляцию, приложить скрин с claim в hero-блоке.',
    ],
    policyReferences: [
      {
        code: 'FIN-04',
        title: 'Гарантированная прибыль и безрисковый доход',
        description: 'Нельзя использовать абсолютные финансовые обещания без оговорок и подтверждаемого основания.',
      },
      {
        code: 'CR-07',
        title: 'Вводящий в заблуждение креатив',
        description: 'Нельзя преувеличивать результат или создавать ложное ожидание относительно продукта.',
      },
    ],
    messages: [
      {
        id: 'sys-1',
        author: 'system',
        authorName: 'Система',
        timestamp: '12:08',
        text: 'Кейс создан автоматически после FIN-04 и 11 жалоб пользователей.',
      },
      {
        id: 'mod-1',
        author: 'moderator',
        authorName: 'Дежурная очередь',
        timestamp: '12:10',
        text: 'Требуется ручная оценка креатива, лендинга и истории аккаунта.',
      },
      {
        id: 'cli-1',
        author: 'client',
        authorName: 'ООО ФинТон',
        timestamp: '12:12',
        text: 'Готовы оперативно скорректировать формулировки, если проблема в обещании результата.',
      },
    ],
    submission: {
      name: 'Финансовый рывок за 3 дня',
      formatLabel: 'Карточка в ленте',
      goalLabel: 'Переход на сайт',
      headline: 'Заработай от 300 000 ₽ за 3 дня без риска',
      description:
        'Покажем готовую схему, как выйти на высокий доход уже в этом месяце. Нажмите, чтобы получить пошаговый план.',
      cta: 'Получить схему',
      link: 'https://fin-ton.example/boost',
      moderationNote:
        'Пользователь отправил прямой performance-запуск на холодную аудиторию. Главный риск здесь в абсолютном обещании дохода и отсутствии оговорок.',
      placements: 'Лента Telegram Ads, мобильный трафик',
      creativeType: 'Статичный feed-креатив',
      creativeAssets: [
        {
          title: 'Основной баннер',
          meta: '1200×628, JPG',
          status: 'Загружен',
          note: 'На баннере вынесен ключевой claim про доход за 3 дня.',
        },
        {
          title: 'Текст карточки',
          meta: 'Headline + description',
          status: 'Готово',
          note: 'Текст повторяет обещание гарантированного результата без дисклеймера.',
        },
      ],
      audience: {
        cities: ['Москва', 'Санкт-Петербург', 'Казань'],
        ageRange: '25-45',
        profileTags: ['Предприниматели', 'Инвесторы-новички', 'Digital / product'],
        interests: ['Финансы', 'Инвестиции', 'Бизнес-образование'],
        exclusions: ['Текущие клиенты', 'Сотрудники', 'Несовершеннолетние'],
        matchingMode: 'Сбалансированный таргетинг',
        expansionLabel: 'Авторасширение включено',
      },
      budget: {
        dailyBudget: '12 000 ₽',
        totalBudget: '120 000 ₽',
        period: '21 апр - 30 апр',
        strategy: 'Ускоренный старт',
        forecastReach: '180 000',
        forecastClicks: '4 200',
        forecastCpc: '28 ₽',
      },
    },
  },
  '221': {
    id: '221',
    title: 'Креатив "Шок-скидка только сегодня"',
    objectType: 'Креатив',
    advertiser: 'Market Nova',
    status: 'На проверке',
    stage: 'review',
    priority: 'high',
    platform: 'VK Ads',
    campaignId: '221',
    submittedAt: 'Сегодня, 11:54',
    assignedTo: 'Алина С.',
    sla: '11:00 до нарушения SLA',
    summary:
      'Клиент обновил баннер после жалобы. Нужно проверить, остался ли clickbait и соответствует ли обещание фактической акции.',
    assets: [
      { label: 'Headline', value: 'Шок-скидка 90% только сегодня' },
      { label: 'Landing', value: 'marketnova.example/sale' },
      { label: 'Текущий статус', value: 'Перепроверка после правок' },
    ],
    signals: [
      'Повторный кейс после редактирования баннера',
      'Жалоба на расхождение между креативом и финальным ценником',
    ],
    checks: [
      { label: 'Clickbait / pressure language', state: 'warning' },
      { label: 'Соответствие акционной механики', state: 'pass' },
      { label: 'Прозрачность условий скидки', state: 'warning' },
    ],
    decisions: [
      {
        id: 'approve',
        label: 'Одобрить',
        tone: 'success',
        note: 'Если на лендинге реально есть подтверждение скидки и условия ясны.',
      },
      {
        id: 'request_changes',
        label: 'Попросить правки',
        tone: 'warning',
        note: 'Смягчить агрессивную формулировку и уточнить условия.',
      },
    ],
    internalNotes: ['Если клиент оставляет 90%, нужен блок с ограничениями и списком SKU.'],
    policyReferences: [
      {
        code: 'CR-07',
        title: 'Clickbait и вводящие в заблуждение тизеры',
        description: 'Манипулятивные формулировки допускаются только при полном подтверждении на целевой странице.',
      },
    ],
    messages: [
      {
        id: 'sys-2',
        author: 'system',
        authorName: 'Система',
        timestamp: '11:54',
        text: 'Клиент загрузил обновлённый баннер и запросил повторную проверку.',
      },
    ],
    submission: {
      name: 'Шок-скидка только сегодня',
      formatLabel: 'Карточка в ленте',
      goalLabel: 'Переход на сайт',
      headline: 'Скидка 90% только сегодня',
      description:
        'Откройте подборку товаров с финальной ценой и проверьте, что акция ещё действует. Предложение ограничено.',
      cta: 'Смотреть скидки',
      link: 'https://marketnova.example/sale',
      moderationNote:
        'Кампания уже возвращалась на правки. Модератору нужно быстро сверить обновлённый баннер с условиями акции на посадочной странице.',
      placements: 'VK Ads feed + recommendation placements',
      creativeType: 'Промо-баннер',
      creativeAssets: [
        {
          title: 'Баннер акции',
          meta: '1080×1080, PNG',
          status: 'Обновлён после правок',
          note: 'Сильный акцент на 90% сохранился, условия акции всё ещё читаются слабо.',
        },
      ],
      audience: {
        cities: ['Москва', 'Екатеринбург', 'Новосибирск'],
        ageRange: '25-44',
        profileTags: ['Покупатели маркетплейсов', 'Retail / e-com'],
        interests: ['Скидки', 'Онлайн-покупки', 'Lifestyle'],
        exclusions: ['Текущие клиенты', 'Нецелевые регионы'],
        matchingMode: 'Широкое совпадение',
        expansionLabel: 'Авторасширение включено',
      },
      budget: {
        dailyBudget: '7 500 ₽',
        totalBudget: '45 000 ₽',
        period: '21 апр - 27 апр',
        strategy: 'Равномерный показ',
        forecastReach: '95 000',
        forecastClicks: '2 050',
        forecastCpc: '22 ₽',
      },
    },
  },
};

export function getModerationCaseById(id: string): ModerationCaseDetail {
  return caseDetails[id] ?? caseDetails['5821'];
}
