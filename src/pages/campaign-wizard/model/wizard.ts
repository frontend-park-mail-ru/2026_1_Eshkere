import type { CreateAdRequest } from 'features/ads/api/ads';
import type { CreateAdGroupRequest, GenderType } from 'features/ads/api/ad-groups';
import type { CreateAdCampaignRequest } from 'features/ads/api/contracts';
import {
  getRegionDisplayLabel,
  getRegionPayloadValue,
  getTopicPayloadValue,
} from 'features/ads/model/targeting';

export const DEFAULT_CPM_PRICE = 10000;
export const MAX_DAILY_BUDGET = 10_000_000;
export const TOTAL_STEPS = 4;

export type WizardStep = 1 | 2 | 3 | 4;
export type WizardObjective = 'leads' | 'traffic' | 'awareness' | 'installs';
export type WizardMainAction = 'click' | 'look';
export type WizardGender = 'male' | 'female' | 'any';
export type WizardAdFormat = 'feed' | 'stories' | 'banner' | 'fullscreen';
export type WizardFieldKey =
  | 'name'
  | 'daily_budget'
  | 'age_range'
  | 'ad_title'
  | 'ad_desc'
  | 'ad_url';

export interface CampaignWizardState {
  name: string;
  objective: WizardObjective;
  main_action: WizardMainAction;
  daily_budget?: number;
  group_name: string;
  age_from: number;
  age_to: number;
  gender: WizardGender;
  region: string;
  topic: string;
  ad_title: string;
  ad_desc: string;
  ad_url: string;
  ad_cta: string;
  ad_format: WizardAdFormat;
  ad_image: File | null;
}

export interface WizardValidationResult {
  ok: boolean;
  errors: Partial<Record<WizardFieldKey, string>>;
  issues: string[];
}

export interface WizardReviewData {
  name: string;
  goal: string;
  budget: string;
  groupName: string;
  audience: string;
  region: string;
  adTitle: string;
  adUrl: string;
  adImage: string;
}

export const STEP_SUBTITLES: Record<WizardStep, string> = {
  1: 'Задайте базовые параметры кампании.',
  2: 'Настройте аудиторию первой группы объявлений.',
  3: 'Загрузите креатив и заполните текст первого объявления.',
  4: 'Проверьте данные и создайте кампанию.',
};

export const STEP_NAMES: Record<WizardStep, string> = {
  1: 'Кампания',
  2: 'Аудитория',
  3: 'Объявление',
  4: 'Итог',
};

export const OBJECTIVE_LABELS: Record<WizardObjective, string> = {
  leads: 'Заявки и лиды',
  traffic: 'Трафик на сайт',
  awareness: 'Узнаваемость бренда',
  installs: 'Установки приложения',
};

export const GENDER_LABELS: Record<WizardGender, string> = {
  male: 'Мужчины',
  female: 'Женщины',
  any: 'Все',
};

export function createInitialWizardState(): CampaignWizardState {
  return {
    name: '',
    objective: 'leads',
    main_action: 'click',
    daily_budget: undefined,
    group_name: '',
    age_from: 18,
    age_to: 34,
    gender: 'any',
    region: 'Москва',
    topic: 'Технологии',
    ad_title: '',
    ad_desc: '',
    ad_url: '',
    ad_cta: 'Узнать подробнее',
    ad_format: 'feed',
    ad_image: null,
  };
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseOptionalInt(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readWizardStateFromFields(
  getFieldValue: (key: string) => string,
  currentState: CampaignWizardState,
): CampaignWizardState {
  return {
    ...currentState,
    name: getFieldValue('name').trim(),
    group_name: getFieldValue('group_name').trim(),
    age_from: parseOptionalInt(getFieldValue('age_from')) ?? 18,
    age_to: parseOptionalInt(getFieldValue('age_to')) ?? 34,
    gender: (getFieldValue('gender') || 'any') as WizardGender,
    region: getRegionPayloadValue(getFieldValue('region_id')),
    topic: getTopicPayloadValue(getFieldValue('topic_id')),
    ad_title: getFieldValue('ad_title').trim(),
    ad_desc: getFieldValue('ad_desc').trim(),
    ad_url: getFieldValue('ad_url').trim(),
    daily_budget: parseOptionalInt(getFieldValue('daily_budget')),
  };
}

export function validateWizardStep(
  state: CampaignWizardState,
  step: WizardStep,
): WizardValidationResult {
  const errors: Partial<Record<WizardFieldKey, string>> = {};
  const issues: string[] = [];

  if (step === 1) {
    if (!state.name) {
      errors.name = 'Введите название кампании';
      issues.push('Укажите название кампании');
    }

    if (state.daily_budget === undefined) {
      errors.daily_budget = 'Укажите дневной бюджет';
      issues.push('Укажите дневной бюджет');
    } else if (state.daily_budget < 100) {
      errors.daily_budget = 'Минимальный бюджет - 100 ₽';
      issues.push('Минимальный бюджет - 100 ₽');
    } else if (state.daily_budget > MAX_DAILY_BUDGET) {
      errors.daily_budget = `Максимальный бюджет - ${MAX_DAILY_BUDGET.toLocaleString('ru-RU')} ₽`;
      issues.push(`Максимальный бюджет - ${MAX_DAILY_BUDGET.toLocaleString('ru-RU')} ₽`);
    }
  }

  if (step === 2 && state.age_to <= state.age_from) {
    errors.age_range = 'Возраст "до" должен быть больше возраста "от"';
    issues.push('Проверьте возрастной диапазон');
  }

  if (step === 3) {
    if (!state.ad_title) {
      errors.ad_title = 'Введите заголовок';
      issues.push('Заголовок объявления обязателен');
    }

    if (!state.ad_desc) {
      errors.ad_desc = 'Введите описание';
      issues.push('Заполните описание объявления');
    }

    if (!state.ad_url) {
      errors.ad_url = 'Введите ссылку';
      issues.push('Целевая ссылка обязательна');
    } else if (!isValidHttpUrl(normalizeUrl(state.ad_url))) {
      errors.ad_url = 'Введите корректную ссылку, например https://example.ru';
      issues.push('Некорректная целевая ссылка');
    }
  }

  return {
    ok: issues.length === 0,
    errors,
    issues,
  };
}

export function getAudienceLabel(state: CampaignWizardState): string {
  return `${GENDER_LABELS[state.gender]}, ${state.age_from}-${state.age_to} лет`;
}

export function getResolvedGroupName(state: CampaignWizardState): string {
  return (
    state.group_name.trim() ||
    `${GENDER_LABELS[state.gender]}, ${state.age_from}-${state.age_to} лет, ${getRegionDisplayLabel(state.region)}`
  );
}

export function getWizardReviewData(state: CampaignWizardState): WizardReviewData {
  return {
    name: state.name,
    goal: OBJECTIVE_LABELS[state.objective],
    budget: state.daily_budget
      ? `${state.daily_budget.toLocaleString('ru-RU')} ₽/день`
      : 'Не задан',
    groupName: getResolvedGroupName(state),
    audience: getAudienceLabel(state),
    region: getRegionDisplayLabel(state.region),
    adTitle: state.ad_title,
    adUrl: state.ad_url,
    adImage: state.ad_image?.name ?? 'Не загружено',
  };
}

export function toCampaignPayload(
  state: CampaignWizardState,
): CreateAdCampaignRequest {
  const normalizedDailyBudget = Math.min(
    MAX_DAILY_BUDGET,
    Math.max(100, Math.round(state.daily_budget ?? 0)),
  );

  return {
    name: state.name,
    main_action: state.main_action,
    daily_budget: normalizedDailyBudget,
    cpm_price: DEFAULT_CPM_PRICE,
  };
}

export function toGroupPayload(state: CampaignWizardState): CreateAdGroupRequest {
  return {
    name: getResolvedGroupName(state),
    age_from: state.age_from,
    age_to: state.age_to,
    gender: state.gender as GenderType,
    region: state.region,
    topic: state.topic,
  };
}

export function toAdPayload(state: CampaignWizardState): CreateAdRequest {
  return {
    title: state.ad_title,
    short_desc: state.ad_desc,
    target_url: normalizeUrl(state.ad_url),
  };
}
