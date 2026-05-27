import type { CreateAdRequest } from 'features/ads/api/ads';
import type {
  CreateAdGroupRequest,
  GenderType,
} from 'features/ads/api/ad-groups';
import type { CreateAdCampaignRequest } from 'features/ads/api/contracts';
import {
  ANY_TARGETING_VALUE,
  getRegionPayloadValue,
  getTopicPayloadValue,
} from 'features/ads/model/targeting';
import type { BuilderState, GenderKey, GoalKey } from '../model/types';

export const CITY_REGION_ID: Record<string, string> = {
  Москва: 'Москва',
  'Санкт-Петербург': 'Санкт-Петербург',
  Казань: 'Казань',
  Екатеринбург: 'Екатеринбург',
  Новосибирск: 'Новосибирск',
  Краснодар: 'Краснодар',
  'Нижний Новгород': 'Нижний Новгород',
  Самара: 'Самара',
  'Ростов-на-Дону': 'Ростов-на-Дону',
  Уфа: 'Любой',
  Челябинск: 'Любой',
  Пермь: 'Любой',
  Воронеж: 'Любой',
  Волгоград: 'Любой',
  Красноярск: 'Любой',
  Омск: 'Любой',
  Тюмень: 'Любой',
  Ижевск: 'Любой',
  Сочи: 'Любой',
  Владивосток: 'Любой',
};

export const TOPIC_LABELS: Record<string, string> = {
  Технологии: 'Технологии',
  Бизнес: 'Бизнес',
  'Красота и здоровье': 'Красота и здоровье',
  Авто: 'Авто',
  Недвижимость: 'Недвижимость',
  'Еда и рестораны': 'Еда и рестораны',
  Путешествия: 'Путешествия',
  Спорт: 'Спорт',
  Мода: 'Мода',
  Образование: 'Образование',
  [ANY_TARGETING_VALUE]: ANY_TARGETING_VALUE,
};

export const PROFILE_TOPIC_ID: Record<string, string> = {
  'Активная городская аудитория': 'Бизнес',
  'Средний доход': 'Бизнес',
  'Покупатели маркетплейсов': 'Бизнес',
  'Retail / e-com': 'Бизнес',
  Маркетологи: 'Бизнес',
  'Владельцы SMB': 'Бизнес',
  'Sales ops': 'Бизнес',
  'Look-alike': 'Технологии',
  'Похожие на текущую клиентскую базу': 'Технологии',
  'Молодая аудитория': 'Образование',
  'Digital / product': 'Технологии',
  'Семейная аудитория': 'Красота и здоровье',
  Предприниматели: 'Бизнес',
  Фрилансеры: 'Бизнес',
  'Premium-сегмент': 'Красота и здоровье',
  'B2B decision makers': 'Бизнес',
};

const DEFAULT_TOPIC_ID = 'Технологии';
const DEFAULT_REGION_ID = 'Москва';

const GOAL_MAIN_ACTION: Record<GoalKey, 'click' | 'look'> = {
  website: 'click',
  leads: 'click',
  awareness: 'look',
};

export class BuilderPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuilderPayloadError';
  }
}

export function parseAgeRange(ageRange: string): {
  ageFrom: number;
  ageTo: number;
} {
  const [fromRaw, toRaw] = ageRange.split('-');
  const ageFrom = Number(fromRaw);
  const ageTo = Number(toRaw);

  if (!Number.isFinite(ageFrom) || !Number.isFinite(ageTo)) {
    throw new BuilderPayloadError('Выберите возрастной диапазон.');
  }

  if (ageFrom > ageTo) {
    throw new BuilderPayloadError('Возраст "от" не может быть больше возраста "до".');
  }

  return {
    ageFrom: Math.max(0, Math.round(ageFrom)),
    ageTo: Math.max(0, Math.round(ageTo)),
  };
}

export function getPrimaryCity(state: BuilderState): string {
  return state.audienceConfig.cities[0] || '';
}

export function getRegionId(state: BuilderState): string {
  const city = getPrimaryCity(state);
  const regionId =
    state.audienceConfig.cities.includes(ANY_TARGETING_VALUE) ||
    state.audienceConfig.cities.length > 1 ||
    city === 'Весь РФ'
      ? ANY_TARGETING_VALUE
      : city
        ? CITY_REGION_ID[city]
        : undefined;

  if (!regionId) {
    throw new BuilderPayloadError('Выберите город для основной группы.');
  }

  return getRegionPayloadValue(regionId);
}

function getSafeRegionId(state: BuilderState): string {
  return getRegionId(state) || DEFAULT_REGION_ID;
}

export function getTopicId(state: BuilderState): string {
  const topicId = state.audienceConfig.profileTags
    .map((tag) => PROFILE_TOPIC_ID[tag])
    .find((id): id is string => Boolean(id));

  return getTopicPayloadValue(topicId || DEFAULT_TOPIC_ID);
}

function getSafeTopicId(state: BuilderState): string {
  return getTopicId(state) || DEFAULT_TOPIC_ID;
}

export function getTopicLabel(state: BuilderState): string {
  return TOPIC_LABELS[getTopicId(state)] || TOPIC_LABELS[DEFAULT_TOPIC_ID];
}

export function getGenderLabel(gender: GenderKey): string {
  if (gender === 'male') {
    return 'мужчины';
  }

  if (gender === 'female') {
    return 'женщины';
  }

  return 'все';
}

export function buildGroupName(state: BuilderState): string {
  const city = getPrimaryCity(state) || 'Регион';
  const { ageFrom, ageTo } = parseAgeRange(state.audienceConfig.ageRange);
  const gender = getGenderLabel(state.gender);
  const topic = getTopicLabel(state).toLowerCase();

  return `${city}, ${ageFrom}-${ageTo}, ${gender}, ${topic}`;
}

export function getResolvedGroupName(state: BuilderState): string {
  return state.groupName.trim() || buildGroupName(state);
}

export function getPrimaryCreativeImageUrl(state: BuilderState): string {
  return (
    state.creativeAssets.feedVisual ||
    state.creativeAssets.storyVisual ||
    state.creativeAssets.videoCover ||
    state.creativeAssets.mainVideo ||
    state.creativeAssets.verticalVideo ||
    ''
  );
}

export function getPrimaryCreativeFile(state: BuilderState): File | undefined {
  return (
    state.creativeFiles.feedVisual ||
    state.creativeFiles.storyVisual ||
    state.creativeFiles.videoCover ||
    state.creativeFiles.mainVideo ||
    state.creativeFiles.verticalVideo
  );
}

// CPM в копейках: 10 000 = 10 руб. за 1000 показов (1 коп. за показ)
const DEFAULT_CPM_PRICE = 10000;

export function toCampaignPayload(state: BuilderState): CreateAdCampaignRequest {
  return {
    name: state.name.trim(),
    main_action: GOAL_MAIN_ACTION[state.goal],
    daily_budget: state.dailyBudget,
    cpm_price: DEFAULT_CPM_PRICE,
  };
}

export function toGroupPayload(state: BuilderState): CreateAdGroupRequest {
  const { ageFrom, ageTo } = parseAgeRange(state.audienceConfig.ageRange);

  return {
    name: getResolvedGroupName(state),
    age_from: ageFrom,
    age_to: ageTo,
    gender: 'any' as GenderType,
    region: getSafeRegionId(state),
    topic: getSafeTopicId(state),
  };
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function toAdPayload(state: BuilderState): CreateAdRequest {
  return {
    title: state.headline.trim(),
    short_desc: state.description.trim(),
    target_url: normalizeUrl(state.link),
  };
}
