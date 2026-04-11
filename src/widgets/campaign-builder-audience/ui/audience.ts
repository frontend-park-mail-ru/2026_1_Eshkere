interface AudienceSummaryView {
  ageRange: string;
  cities: string;
  exclusions: string;
  interests: string;
  profile: string;
  profileLabel: string;
  regionsLabel: string;
}

interface AudienceInsightsView {
  expansionNote: string;
  expansionState: string;
  explanation: string;
  interestsPriorityNote: string;
  logicBadge: string;
  matchingNote: string;
  profilePriorityNote: string;
  riskToneDanger: boolean;
  riskToneLabel: string;
  risks: string[];
}

interface SyncCampaignBuilderAudienceParams {
  audience: AudienceSummaryView;
  audienceChip: string;
  breadth: string;
  clicks: string;
  competition: string;
  ctr: string;
  exclusionsCount: number;
  expansionEnabled: boolean;
  interestsCount: number;
  interestsPriority: string;
  insights: AudienceInsightsView;
  matchingMode: string;
  profilePriority: string;
  quality: string;
  qualityState: string;
  reach: string;
}

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) {
    node.textContent = value;
  }
}

function setAudienceMetricLabel(
  valueSelector: string,
  label: string,
): void {
  const valueNode = document.querySelector<HTMLElement>(valueSelector);
  const labelNode = valueNode
    ?.closest<HTMLElement>('.campaign-builder__metric')
    ?.querySelector<HTMLElement>('.campaign-builder__metric-label');

  if (labelNode) {
    labelNode.textContent = label;
  }
}

export function syncCampaignBuilderAudienceView({
  audience,
  audienceChip,
  breadth,
  clicks,
  competition,
  ctr,
  exclusionsCount,
  expansionEnabled,
  interestsCount,
  interestsPriority,
  insights,
  matchingMode,
  profilePriority,
  quality,
  qualityState,
  reach,
}: SyncCampaignBuilderAudienceParams): void {
  document
    .querySelectorAll<HTMLElement>('[data-builder-audience-chip]')
    .forEach((chip) => {
      chip.classList.toggle(
        'campaign-builder__chip--active',
        chip.dataset.chip === audienceChip,
      );
    });

  setText('[data-audience-cities]', audience.cities);
  setText('[data-audience-region-count]', audience.regionsLabel);
  setText('[data-audience-reach]', reach);
  setText('[data-audience-clicks]', clicks);
  setText('[data-audience-quality-text]', quality);
  setText('[data-audience-quality]', qualityState);
  setText('[data-audience-ctr]', ctr);
  setText('[data-audience-breadth]', breadth);
  setText('[data-audience-competition]', competition);
  setText('[data-audience-age-range]', audience.ageRange);
  setText('[data-audience-age-pill]', audience.ageRange);
  setText('[data-audience-profile]', audience.profile);
  setText('[data-audience-profile-count]', audience.profileLabel);
  setText('[data-audience-exclusions]', audience.exclusions);
  setText(
    '[data-audience-exclusions-count]',
    `${exclusionsCount} фильтра`,
  );
  setText('[data-audience-interests]', audience.interests);
  setText('[data-audience-interests-count]', `${interestsCount} темы`);
  setAudienceMetricLabel('[data-audience-reach]', 'Потенциальный охват');
  setAudienceMetricLabel('[data-audience-clicks]', 'Прогноз кликов');
  setAudienceMetricLabel('[data-audience-quality-text]', 'Качество аудитории');
  setAudienceMetricLabel('[data-audience-ctr]', 'Прогноз CTR');
  setAudienceMetricLabel('[data-audience-breadth]', 'Ширина сегмента');
  setAudienceMetricLabel(
    '[data-audience-competition]',
    'Конкуренция в аукционе',
  );

  document
    .querySelectorAll<HTMLElement>(
      '[data-step-panel="audience"] .campaign-builder__metrics > .campaign-builder__metric-label',
    )
    .forEach((label) => label.remove());

  document
    .querySelectorAll<HTMLElement>(
      '[data-audience-recommendation-title], [data-audience-recommendation-text]',
    )
    .forEach((node) =>
      node.closest<HTMLElement>('.campaign-builder__metric')?.remove(),
    );

  setText('[data-audience-matching-note]', insights.matchingNote);
  setText(
    '[data-audience-profile-priority-note]',
    insights.profilePriorityNote,
  );
  setText(
    '[data-audience-interests-priority-note]',
    insights.interestsPriorityNote,
  );
  setText('[data-audience-expansion-state]', insights.expansionState);
  setText('[data-audience-expansion-note]', insights.expansionNote);
  setText('[data-audience-logic-badge]', insights.logicBadge);
  setText('[data-audience-explanation]', insights.explanation);
  setText('[data-audience-risk-tone]', insights.riskToneLabel);

  document
    .querySelectorAll<HTMLElement>(
      '[data-builder-audience-setting="matchingMode"]',
    )
    .forEach((button) => {
      button.classList.toggle(
        'campaign-builder__segmented-button--active',
        button.dataset.value === matchingMode,
      );
    });

  document
    .querySelectorAll<HTMLElement>(
      '[data-builder-audience-setting="profilePriority"]',
    )
    .forEach((button) => {
      button.classList.toggle(
        'campaign-builder__mini-chip--active',
        button.dataset.value === profilePriority,
      );
    });

  document
    .querySelectorAll<HTMLElement>(
      '[data-builder-audience-setting="interestsPriority"]',
    )
    .forEach((button) => {
      button.classList.toggle(
        'campaign-builder__mini-chip--active',
        button.dataset.value === interestsPriority,
      );
    });

  document
    .querySelectorAll<HTMLElement>(
      '[data-builder-audience-toggle="expansionEnabled"]',
    )
    .forEach((button) => {
      button.classList.toggle(
        'campaign-builder__toggle--active',
        expansionEnabled,
      );
      button.setAttribute('aria-pressed', String(expansionEnabled));
    });

  document
    .querySelectorAll<HTMLElement>('[data-audience-risk-tone]')
    .forEach((node) => {
      node.classList.toggle(
        'campaign-builder__pill--danger',
        insights.riskToneDanger,
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-audience-risk-list]')
    .forEach((list) => {
      list.innerHTML = insights.risks
        .map((risk) => `<li class="campaign-builder__risk-item">${risk}</li>`)
        .join('');
    });
}
