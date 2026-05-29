import { markMotionUpdated } from 'shared/lib/animations';

interface CreativeSlotView {
  accept: string;
  buttonLabel: string;
  key: string;
  meta: string;
  multiple?: boolean;
  status: string;
  text: string;
  title: string;
}

interface SyncCampaignBuilderContentParams {
  creative: string;
  creativeCount: string;
  creativePlacements: string;
  creativeSlots: CreativeSlotView[];
  descriptionCount: number;
  formatLabel: string;
  goalLabel: string;
  headlineCount: number;
  name: string;
  previewCta: string;
  previewDescription: string;
  previewHeadline: string;
  selectedValues: {
    format: string;
    goal: string;
    strategy: string;
  };
}

function setText(
  selector: string,
  value: string,
  parent: ParentNode = document,
): void {
  const node = parent.querySelector<HTMLElement>(selector);
  if (node) {
    const changed = node.textContent !== value;
    node.textContent = value;
    if (changed) {
      markMotionUpdated(node);
    }
  }
}

function setTextAll(
  selector: string,
  value: string,
  parent: ParentNode = document,
): void {
  parent.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    const changed = node.textContent !== value;
    node.textContent = value;
    if (changed) {
      markMotionUpdated(
        node,
        selector.startsWith('[data-preview-]')
          ? 'motion-preview-text'
          : 'motion-updated',
        420,
      );
    }
  });
}

function syncPreviewFormat(format: string): void {
  document.querySelectorAll<HTMLElement>('.campaign-preview__frame').forEach((frame) => {
    const nextClass = `campaign-preview__frame--${format}`;
    const changed = frame.dataset.previewFormat !== format;

    frame.classList.remove(
      'campaign-preview__frame--feed-card',
      'campaign-preview__frame--stories',
      'campaign-preview__frame--video-15',
    );
    frame.classList.add(nextClass);
    frame.dataset.previewFormat = format;

    if (changed) {
      markMotionUpdated(frame, 'motion-preview-morph', 520);
    }
  });
}

export function syncCampaignBuilderContentView({
  creative,
  creativeCount,
  creativePlacements,
  creativeSlots,
  descriptionCount,
  formatLabel,
  goalLabel,
  headlineCount,
  name,
  previewCta,
  previewDescription,
  previewHeadline,
  selectedValues,
}: SyncCampaignBuilderContentParams): void {
  setTextAll('[data-preview-headline]', previewHeadline);
  setTextAll('[data-preview-description]', previewDescription);
  setTextAll('[data-preview-cta]', previewCta);
  setTextAll('[data-preview-format]', formatLabel);
  setTextAll('[data-preview-goal]', goalLabel);
  syncPreviewFormat(selectedValues.format);
  setText('[data-summary-name]', name);
  setTextAll('[data-summary-format]', formatLabel);
  setTextAll('[data-summary-goal]', goalLabel);
  setText('[data-builder-select-value="format"]', formatLabel);
  setText('[data-builder-select-value="goal"]', goalLabel);
  setText('[data-builder-headline-count]', String(headlineCount));
  setText('[data-builder-description-count]', String(descriptionCount));

  document
    .querySelectorAll<HTMLElement>('[data-builder-creative]')
    .forEach((item) => {
      item.classList.toggle(
        'campaign-builder__creative--active',
        item.dataset.creative === creative,
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-creative-slot]')
    .forEach((slot) => {
      const key = slot.dataset.slotKey;
      const config = creativeSlots.find((item) => item.key === key);

      if (!config) {
        slot.hidden = true;
        return;
      }

      const wasHidden = slot.hidden;
      slot.hidden = false;
      if (wasHidden) {
        markMotionUpdated(slot, 'motion-slot-enter', 420);
      }
      setText('[data-builder-slot-title]', config.title, slot);
      setText('[data-builder-slot-text]', config.text, slot);
      setText('[data-builder-slot-meta]', config.meta, slot);
      setText('[data-builder-slot-status]', config.status, slot);
      setText('[data-builder-slot-button-label]', config.buttonLabel, slot);

      const input = slot.querySelector<HTMLInputElement>(
        '[data-builder-slot-input]',
      );
      if (input) {
        input.accept = config.accept;
        input.multiple = Boolean(config.multiple);
      }
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-select-option]')
    .forEach((option) => {
      const key = option.dataset.selectKey;
      const value = option.dataset.value;
      const isActive =
        (key === 'format' && value === selectedValues.format) ||
        (key === 'goal' && value === selectedValues.goal) ||
        (key === 'strategy' && value === selectedValues.strategy);

      option.classList.toggle(
        'campaign-builder__select-option--active',
        isActive,
      );

      const meta = option.querySelector<HTMLElement>(
        '.campaign-builder__select-option-meta',
      );

      if (meta) {
        meta.textContent = isActive ? 'Выбрано' : meta.dataset.defaultMeta || '';
      }
    });

  document
    .querySelectorAll<HTMLElement>('.campaign-builder__format-card')
    .forEach((card) => {
      const isActive = card.dataset.value === selectedValues.format;
      card.classList.toggle('campaign-builder__format-card--active', isActive);
      const dot = card.querySelector<HTMLElement>('.campaign-builder__format-card-dot');
      if (dot) {
        dot.classList.toggle('campaign-builder__format-card-dot--active', isActive);
      }
    });

  setTextAll('[data-summary-creatives]', creativeCount);
  setText('[data-summary-creatives-aside]', creativeCount);
  setTextAll('[data-summary-placement]', creativePlacements);
  setText('[data-summary-placement-aside]', creativePlacements);
}
