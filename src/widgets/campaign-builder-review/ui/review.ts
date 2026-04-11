interface AudienceReviewView {
  ageRange: string;
  cities: string;
  exclusions: string;
  interests: string;
  profile: string;
}

interface FinalReviewCheckView {
  status: string;
  success: boolean;
  text: string;
  title: string;
}

interface FinalReviewHealthView {
  badge: string;
  isPositive: boolean;
  text: string;
  title: string;
}

interface SyncCampaignBuilderReviewParams {
  audience: AudienceReviewView;
  checks: Record<string, FinalReviewCheckView>;
  finalHealth: FinalReviewHealthView;
  pendingChecks: string[];
}

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) {
    node.textContent = value;
  }
}

function setTextAll(selector: string, value: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.textContent = value;
  });
}

export function syncCampaignBuilderReviewView({
  audience,
  checks,
  finalHealth,
  pendingChecks,
}: SyncCampaignBuilderReviewParams): void {
  setTextAll('[data-final-cities]', audience.cities || 'Не выбрано');
  setTextAll('[data-final-age]', audience.ageRange || 'Не выбрано');
  setTextAll('[data-final-profile]', audience.profile || 'Не выбрано');
  setTextAll('[data-final-interests]', audience.interests || 'Не выбрано');
  setTextAll('[data-final-exclusions]', audience.exclusions || 'Не настроено');
  setText('[data-final-health-badge]', finalHealth.badge);
  setText('[data-final-health-title]', finalHealth.title);
  setText('[data-final-health-text]', finalHealth.text);
  setText(
    '[data-final-note]',
    pendingChecks.length
      ? `Исправьте: ${pendingChecks.join(', ')}.`
      : 'Сверьте сегмент, площадки, срок и бюджет.',
  );

  document
    .querySelectorAll<HTMLElement>('[data-final-health-badge]')
    .forEach((node) => {
      node.classList.toggle(
        'campaign-builder__pill--success',
        finalHealth.isPositive,
      );
      node.classList.toggle(
        'campaign-builder__pill--danger',
        !finalHealth.isPositive,
      );
    });

  Object.entries(checks).forEach(([key, check]) => {
    setText(`[data-final-check-title="${key}"]`, check.title);
    setText(`[data-final-check-text="${key}"]`, check.text);
    setText(`[data-final-check-status="${key}"]`, check.status);

    document
      .querySelectorAll<HTMLElement>(`[data-final-check-status="${key}"]`)
      .forEach((node) => {
        node.classList.toggle('campaign-builder__pill--success', check.success);
        node.classList.toggle('campaign-builder__pill--danger', !check.success);
      });
  });
}
