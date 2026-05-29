export type AudienceForecastInput = {
  ageFrom: number;
  ageTo: number;
  gender: string;
  region: string;
  topic: string;
};

export type AudienceForecast = {
  reachMin: number;
  reachMax: number;
  clicksMin: number;
  clicksMax: number;
  widthLabel: string;
  qualityLabel: string;
  qualityTone: 'good' | 'medium' | 'low';
  barPercent: number;
};

const BASE_REACH = 420_000;

const REGION_FACTORS: Record<string, number> = {
  Москва: 1,
  'Санкт-Петербург': 0.48,
  Казань: 0.2,
  Екатеринбург: 0.22,
  Новосибирск: 0.24,
  Краснодар: 0.18,
  'Нижний Новгород': 0.17,
  Самара: 0.16,
  'Ростов-на-Дону': 0.17,
  Любой: 3.6,
};

const TOPIC_FACTORS: Record<string, number> = {
  Любой: 1,
  Технологии: 0.42,
  Бизнес: 0.28,
  'Красота и здоровье': 0.55,
  Авто: 0.38,
  Недвижимость: 0.32,
  'Еда и рестораны': 0.62,
  Путешествия: 0.48,
  Спорт: 0.58,
  Мода: 0.52,
  Образование: 0.36,
};

function normalizeAgeTo(ageTo: number): number {
  return ageTo >= 99 ? 70 : ageTo;
}

function ageFactor(ageFrom: number, ageTo: number): number {
  const to = normalizeAgeTo(ageTo);
  const span = Math.max(1, to - ageFrom);
  return Math.min(1, span / 40);
}

function genderFactor(gender: string): number {
  if (gender === 'male' || gender === 'female' || gender === 'man' || gender === 'woman') {
    return 0.49;
  }
  return 1;
}

function regionFactor(region: string): number {
  return REGION_FACTORS[region] ?? 0.15;
}

function topicFactor(topic: string): number {
  return TOPIC_FACTORS[topic] ?? 0.4;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeAudienceForecast(input: AudienceForecastInput): AudienceForecast {
  const age = ageFactor(input.ageFrom, input.ageTo);
  const gender = genderFactor(input.gender);
  const region = regionFactor(input.region);
  const topic = topicFactor(input.topic);

  const center = Math.round(BASE_REACH * age * gender * region * topic);
  const reachMin = Math.max(1_000, Math.round(center * 0.78));
  const reachMax = Math.max(reachMin + 500, Math.round(center * 1.28));

  const narrowness = 1 - age * gender * topic;
  const ctr = clamp(0.018 + narrowness * 0.022, 0.016, 0.045);
  const clicksMin = Math.max(10, Math.round(reachMin * ctr));
  const clicksMax = Math.max(clicksMin + 5, Math.round(reachMax * ctr));

  const widthScore = age * gender * topic;
  const widthLabel =
    widthScore >= 0.62 ? 'Широкая' :
    widthScore >= 0.28 ? 'Сбалансированная' :
    'Узкая';

  const qualityScore = narrowness + (input.topic !== 'Любой' ? 0.12 : 0) + (gender < 1 ? 0.08 : 0);
  const qualityLabel =
    qualityScore >= 0.55 ? 'Высокое' :
    qualityScore >= 0.32 ? 'Среднее' :
    'Низкое';
  const qualityTone: AudienceForecast['qualityTone'] =
    qualityScore >= 0.55 ? 'good' :
    qualityScore >= 0.32 ? 'medium' :
    'low';

  const barPercent = clamp(Math.round((Math.log10(center + 1) / Math.log10(BASE_REACH * 3.6 + 1)) * 100), 12, 96);

  return {
    reachMin,
    reachMax,
    clicksMin,
    clicksMax,
    widthLabel,
    qualityLabel,
    qualityTone,
    barPercent,
  };
}

export function formatReachRange(min: number, max: number): string {
  return `${formatCompact(min)} – ${formatCompact(max)}`;
}

export function formatClickRange(min: number, max: number): string {
  return `${formatCompact(min)} – ${formatCompact(max)}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.', ',')} млн`;
  }
  return new Intl.NumberFormat('ru-RU').format(value);
}
