import type { CreateAdRequest } from 'features/ads/api/ads';
import type {
  CreateAdGroupRequest,
  GenderType,
} from 'features/ads/api/ad-groups';
import type { CreateAdCampaignRequest } from 'features/ads/api/contracts';
import type { BuilderState, GenderKey, GoalKey } from '../model/types';

export const CITY_REGION_ID: Record<string, number> = {
  Москва: 1,
  'Санкт-Петербург': 2,
  Казань: 3,
  Екатеринбург: 4,
  Новосибирск: 5,
  Краснодар: 6,
  'Нижний Новгород': 7,
  Самара: 8,
  'Ростов-на-Дону': 9,
  Уфа: 10,
  Челябинск: 11,
  Пермь: 12,
  Воронеж: 13,
  Волгоград: 14,
  Красноярск: 15,
  Омск: 16,
  Тюмень: 17,
  Ижевск: 18,
  Сочи: 19,
  Владивосток: 20,
};

export const TOPIC_LABELS: Record<number, string> = {
  1: 'Технологии',
  2: 'Бизнес',
  3: 'Красота и здоровье',
  4: 'Авто',
  5: 'Недвижимость',
  6: 'Еда и рестораны',
  7: 'Путешествия',
  8: 'Спорт',
  9: 'Мода',
  10: 'Образование',
};

export const PROFILE_TOPIC_ID: Record<string, number> = {
  'Активная городская аудитория': 2,
  'Средний доход': 2,
  'Покупатели маркетплейсов': 2,
  'Retail / e-com': 2,
  Маркетологи: 2,
  'Владельцы SMB': 2,
  'Sales ops': 2,
  'Look-alike': 1,
  'Похожие на текущую клиентскую базу': 1,
  'Молодая аудитория': 10,
  'Digital / product': 1,
  'Семейная аудитория': 3,
  Предприниматели: 2,
  Фрилансеры: 2,
  'Premium-сегмент': 3,
  'B2B decision makers': 2,
};

const DEFAULT_TOPIC_ID = 1;
const DEFAULT_REGION_ID = 1;

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

export function getRegionId(state: BuilderState): number {
  const city = getPrimaryCity(state);
  const regionId = city ? CITY_REGION_ID[city] : undefined;

  if (!regionId) {
    throw new BuilderPayloadError('Выберите город для основной группы.');
  }

  return regionId;
}

function getSafeRegionId(state: BuilderState): number {
  getRegionId(state);
  return DEFAULT_REGION_ID;
}

export function getTopicId(state: BuilderState): number {
  const topicId = state.audienceConfig.profileTags
    .map((tag) => PROFILE_TOPIC_ID[tag])
    .find((id): id is number => Number.isFinite(id));

  return topicId || DEFAULT_TOPIC_ID;
}

function getSafeTopicId(state: BuilderState): number {
  getTopicId(state);
  return DEFAULT_TOPIC_ID;
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
    region_id: getSafeRegionId(state),
    topic_id: getSafeTopicId(state),
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
