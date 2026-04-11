interface BuilderHealthView {
  badge: string;
  isPositive: boolean;
}

interface SyncCampaignBuilderValidationParams {
  errors: Record<string, string>;
}

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) {
    node.textContent = value;
  }
}

export function syncCampaignBuilderHealthView(
  health: BuilderHealthView,
): void {
  setText('[data-builder-completion-state]', health.badge);

  const badge = document.querySelector<HTMLElement>(
    '[data-builder-completion-state]',
  );

  if (badge) {
    badge.classList.toggle(
      'campaign-builder__hero-meta-badge--success',
      health.isPositive,
    );
  }
}

export function syncCampaignBuilderValidationView({
  errors,
}: SyncCampaignBuilderValidationParams): void {
  document
    .querySelectorAll<HTMLElement>('[data-builder-error]')
    .forEach((node) => {
      const key = node.dataset.builderError;
      const field = node.closest<HTMLElement>('.campaign-builder__field');
      const message = key ? errors[key] || '' : '';

      node.textContent = message;
      node.hidden = !message;
      field?.classList.toggle(
        'campaign-builder__field--error',
        Boolean(message),
      );
    });
}

export function syncCampaignBuilderSaveStateView(label: string): void {
  setText('[data-builder-save-state]', label);
}

export function syncCampaignBuilderModeCopyView(): void {
  setText(
    '[data-step-panel="publication"] .campaign-builder__card--review-summary .campaign-builder__card-title',
    'Что сохранится после правок',
  );
  setText(
    '[data-step-panel="publication"] .campaign-builder__card--review-summary .campaign-builder__card-subtitle',
    'Финальная конфигурация объявления после редактирования.',
  );
  setText(
    '[data-step-panel="publication"] .campaign-builder__card--review-checks .campaign-builder__card-title',
    'Перед сохранением',
  );
  setText(
    '[data-step-panel="publication"] .campaign-builder__card--review-checks .campaign-builder__card-subtitle',
    'Пункты, которые стоит открыть и сверить перед сохранением.',
  );
  setText(
    '[data-step-panel="publication"] .campaign-builder__review-next .campaign-builder__review-section-title',
    'После сохранения',
  );
  setText(
    '[data-step-panel="publication"] .campaign-builder__panel-note',
    'После сохранения изменения останутся в кабинете. Если правки затрагивают креатив, текст или площадки, объявление может уйти на повторную модерацию.',
  );
}
