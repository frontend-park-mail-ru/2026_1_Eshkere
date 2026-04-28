import { renderElement } from 'shared/lib/render';
import {
  LocalStorageKey,
  localStorageService,
} from 'shared/lib/local-storage';
import audienceControlsTemplate from '../ui/audience-controls.hbs';
import audienceSummaryTemplate from '../ui/audience-summary.hbs';
import savedAudienceListTemplate from '../ui/saved-audience-list.hbs';
import type {
  AudienceChipKey,
  AudienceDetailKey,
  AudienceModalConfig,
  AudiencePresetSummary,
  AudienceSummary,
  BuilderState,
  SavedAudiencePreset,
} from '../model/types';
import {
  DEFAULT_STATE,
  PROFILE_AGE_OPTIONS,
  PROFILE_TAG_OPTIONS,
  PROFILE_TAG_RULES,
} from '../model/config';

const SAVED_AUDIENCES_STORAGE_KEY = LocalStorageKey.CampaignBuilderSavedAudiences;

export function cloneAudienceConfig(
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

export function getSavedAudiences(): SavedAudiencePreset[] {
  const parsed = localStorageService.getJson<SavedAudiencePreset[]>(
    SAVED_AUDIENCES_STORAGE_KEY,
  );

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(
      (item) =>
        item && typeof item.id === 'string' && typeof item.name === 'string',
    )
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
}

export function persistSavedAudiences(items: SavedAudiencePreset[]): void {
  localStorageService.setJson(SAVED_AUDIENCES_STORAGE_KEY, items);
}

export function formatSavedAudienceSummary(
  config: BuilderState['audienceConfig'],
): string {
  return `${config.cities.length} регионов, ${config.ageRange}, ${config.profileTags.length} профильных тегов`;
}

export function formatAudienceProfile(
  ageRange: string,
  profileTags: string[],
): string {
  const safeAgeRange = ageRange || DEFAULT_STATE.audienceConfig.ageRange;
  const safeTags = Array.isArray(profileTags) ? profileTags : [];
  const suffix = safeTags.length ? `, ${safeTags.join(', ')}` : '';
  return `${safeAgeRange}${suffix}`;
}

export function getProfileSelectionState(profileTags: string[]): {
  label: string;
  note: string;
  canSave: boolean;
  tone: 'info' | 'success' | 'warning';
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
    tone: 'info',
  };
}

export function getAudienceSummary(chip: AudienceChipKey): AudiencePresetSummary {
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

export function getAudienceStateSummary(state: BuilderState): AudienceSummary {
  const summary = getAudienceSummary(state.audienceChip);

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

export function getAudienceInsights(state: BuilderState): {
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
    reachValue >= 340000
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

export function getAudienceModalConfig(key: AudienceDetailKey): AudienceModalConfig {
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
        options: PROFILE_AGE_OPTIONS.map((value) => ({ value, label: value })),
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

export function renderSavedAudiencesList(state: BuilderState): void {
  document
    .querySelectorAll<HTMLElement>('[data-builder-saved-audiences]')
    .forEach((container) => {
      const rawItems = getSavedAudiences();
      const audiences = rawItems.map((item) => ({
        ...item,
        isActive:
          JSON.stringify(item.config) ===
          JSON.stringify(cloneAudienceConfig(state.audienceConfig)),
      }));
      container.innerHTML = savedAudienceListTemplate({
        audiences,
        hasAudiences: audiences.length > 0,
      });
    });
}

export function ensureAudiencePanelScaffold(state: BuilderState): void {
  const audiencePanel = document.querySelector<HTMLElement>(
    '[data-step-panel="audience"]',
  );

  if (!audiencePanel) {
    return;
  }

  const cards = audiencePanel.querySelectorAll<HTMLElement>('.campaign-builder__card');
  const settingsCard = cards[0];
  const summaryCard = cards[1];
  const stack = settingsCard?.querySelector<HTMLElement>('.campaign-builder__stack');

  if (settingsCard && stack && !settingsCard.querySelector('[data-builder-audience-controls]')) {
    stack.insertAdjacentElement('afterend', renderElement(audienceControlsTemplate));
  }

  if (summaryCard) {
    summaryCard.innerHTML = audienceSummaryTemplate();
  }

  renderSavedAudiencesList(state);
}
