export const ANY_TARGETING_VALUE = 'Любой';

export type TargetingValue = string | number;

export const REGION_OPTIONS = [
  { value: 'Москва', label: 'Москва' },
  { value: 'Санкт-Петербург', label: 'Санкт-Петербург' },
  { value: 'Казань', label: 'Казань' },
  { value: 'Екатеринбург', label: 'Екатеринбург' },
  { value: 'Новосибирск', label: 'Новосибирск' },
  { value: 'Краснодар', label: 'Краснодар' },
  { value: 'Нижний Новгород', label: 'Нижний Новгород' },
  { value: 'Самара', label: 'Самара' },
  { value: 'Ростов-на-Дону', label: 'Ростов-на-Дону' },
  { value: ANY_TARGETING_VALUE, label: 'Весь РФ' },
] as const;

export const TOPIC_OPTIONS = [
  { value: 'Технологии', label: 'Технологии' },
  { value: 'Бизнес', label: 'Бизнес' },
  { value: 'Красота и здоровье', label: 'Красота и здоровье' },
  { value: 'Авто', label: 'Авто' },
  { value: 'Недвижимость', label: 'Недвижимость' },
  { value: 'Еда и рестораны', label: 'Еда и рестораны' },
  { value: 'Путешествия', label: 'Путешествия' },
  { value: 'Спорт', label: 'Спорт' },
  { value: 'Мода', label: 'Мода' },
  { value: 'Образование', label: 'Образование' },
  { value: ANY_TARGETING_VALUE, label: ANY_TARGETING_VALUE },
] as const;

const LEGACY_REGION_LABELS: Record<number, string> = {
  1: 'Москва',
  2: 'Санкт-Петербург',
  3: 'Казань',
  4: 'Екатеринбург',
  5: 'Новосибирск',
  6: 'Краснодар',
  7: 'Нижний Новгород',
  8: 'Самара',
  9: 'Ростов-на-Дону',
  10: ANY_TARGETING_VALUE,
};

const LEGACY_TOPIC_LABELS: Record<number, string> = {
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

function normalizeLegacyValue(
  value: TargetingValue | null | undefined,
  legacyLabels: Record<number, string>,
): string {
  if (typeof value === 'number') {
    return legacyLabels[value] ?? '';
  }

  const trimmed = String(value ?? '').trim();
  const numeric = Number(trimmed);

  if (Number.isInteger(numeric) && legacyLabels[numeric]) {
    return legacyLabels[numeric];
  }

  return trimmed;
}

export function getRegionPayloadValue(
  value: TargetingValue | null | undefined,
): string {
  const normalized = normalizeLegacyValue(value, LEGACY_REGION_LABELS);

  if (normalized === 'Весь РФ') {
    return ANY_TARGETING_VALUE;
  }

  return normalized || REGION_OPTIONS[0].value;
}

export function getTopicPayloadValue(
  value: TargetingValue | null | undefined,
): string {
  return normalizeLegacyValue(value, LEGACY_TOPIC_LABELS) || TOPIC_OPTIONS[0].value;
}

export function getRegionDisplayLabel(
  value: TargetingValue | null | undefined,
): string {
  const payloadValue = getRegionPayloadValue(value);
  return (
    REGION_OPTIONS.find((option) => option.value === payloadValue)?.label ??
    payloadValue
  );
}

export function getTopicDisplayLabel(
  value: TargetingValue | null | undefined,
): string {
  const payloadValue = getTopicPayloadValue(value);
  return (
    TOPIC_OPTIONS.find((option) => option.value === payloadValue)?.label ??
    payloadValue
  );
}
