import type {
  AudienceDetailKey,
  AudienceModalConfig,
  BuilderState,
} from 'features/campaign-builder/model/types';

export interface ProfileSelectionState {
  canSave: boolean;
  label: string;
  note: string;
  tone: 'warning' | 'success' | 'info';
}

interface SyncProfileSelectionUIParams {
  activeAudienceModal: AudienceDetailKey | null;
  audienceModalOptions: HTMLElement;
  audienceModalSave: HTMLButtonElement | null;
  draftAudienceConfig: BuilderState['audienceConfig'];
  getProfileSelectionState: (profileTags: string[]) => ProfileSelectionState;
}

interface RenderAudienceModalOptionsParams {
  activeAudienceModal: AudienceDetailKey;
  audienceModalOptions: HTMLElement;
  audienceModalSave: HTMLButtonElement | null;
  currentAudienceSearch: string;
  draftAudienceConfig: BuilderState['audienceConfig'];
  getAudienceModalConfig: (key: AudienceDetailKey) => AudienceModalConfig;
  getProfileSelectionState: (profileTags: string[]) => ProfileSelectionState;
  state: BuilderState;
}

function renderAudienceSearchEmptyState(): string {
  return `
    <div class="campaign-builder__modal-empty">
      <img
        class="campaign-builder__modal-empty-image"
        src="/img/Searching - Looking.png"
        alt="Ничего не найдено"
      />
      <strong class="campaign-builder__modal-empty-title">Ничего не найдено</strong>
      <p class="campaign-builder__modal-empty-text">
        Попробуйте изменить запрос или проверить написание названия компании.
      </p>
    </div>
  `;
}

export function syncProfileSelectionUI({
  activeAudienceModal,
  audienceModalOptions,
  audienceModalSave,
  draftAudienceConfig,
  getProfileSelectionState,
}: SyncProfileSelectionUIParams): void {
  const profileState = getProfileSelectionState(draftAudienceConfig.profileTags);
  const countNode = audienceModalOptions.querySelector<HTMLElement>('[data-profile-selected-count]');
  const tagsNode = audienceModalOptions.querySelector<HTMLElement>('[data-profile-selected-tags]');
  const noteNode = audienceModalOptions.querySelector<HTMLElement>('[data-profile-selection-note]');

  if (countNode) {
    countNode.textContent = profileState.label;
  }

  if (tagsNode) {
    tagsNode.innerHTML = draftAudienceConfig.profileTags.length
      ? draftAudienceConfig.profileTags
          .map((value) => `<span class="campaign-builder__profile-tag-chip">${value}</span>`)
          .join('')
      : '<p class="campaign-builder__profile-empty">Добавьте несколько признаков, чтобы сегмент был точнее.</p>';
  }

  if (noteNode) {
    noteNode.textContent = profileState.note;
    noteNode.dataset.tone = profileState.tone;
  }

  if (audienceModalSave) {
    audienceModalSave.disabled =
      activeAudienceModal === 'profile' ? !profileState.canSave : false;
  }
}

export function renderAudienceModalOptions({
  activeAudienceModal,
  audienceModalOptions,
  audienceModalSave,
  currentAudienceSearch,
  draftAudienceConfig,
  getAudienceModalConfig,
  getProfileSelectionState,
  state,
}: RenderAudienceModalOptionsParams): void {
  const config = getAudienceModalConfig(activeAudienceModal);
  const normalizedSearch = currentAudienceSearch.trim().toLowerCase();
  const selectedValues =
    activeAudienceModal === 'geo'
      ? draftAudienceConfig.cities
      : activeAudienceModal === 'age'
        ? [draftAudienceConfig.ageRange || state.audienceConfig.ageRange]
        : activeAudienceModal === 'profile'
          ? draftAudienceConfig.profileTags
          : activeAudienceModal === 'exclusions'
            ? draftAudienceConfig.exclusions
            : draftAudienceConfig.interests;

  if (activeAudienceModal === 'profile') {
    const filteredOptions = config.options.filter((option) => {
      if (!normalizedSearch) {
        return true;
      }

      return `${option.label} ${option.description || ''} ${option.value}`
        .toLowerCase()
        .includes(normalizedSearch);
    });

    const selectedTagsMarkup = selectedValues.length
      ? `
        ${selectedValues
          .map((value) => `<span class="campaign-builder__profile-tag-chip">${value}</span>`)
          .join('')}
      `
      : '<p class="campaign-builder__profile-empty">Добавьте несколько признаков, чтобы сегмент был точнее.</p>';

    const profileSelectionState = getProfileSelectionState(selectedValues);

    audienceModalOptions.innerHTML = `
      <section class="campaign-builder__profile-section">
        <div class="campaign-builder__profile-section-head">
          <div>
            <strong class="campaign-builder__profile-section-title">Профиль аудитории</strong>
            <p class="campaign-builder__profile-section-text">Отметьте роли, признаки и модели поведения, которые подходят под оффер.</p>
          </div>
          <span class="campaign-builder__pill" data-profile-selected-count>${profileSelectionState.label}</span>
        </div>
        <div class="campaign-builder__profile-tags" data-profile-selected-tags>${selectedTagsMarkup}</div>
        <p class="campaign-builder__profile-selection-note" data-profile-selection-note data-tone="${profileSelectionState.tone}">${profileSelectionState.note}</p>
        <div class="campaign-builder__modal-option-list campaign-builder__modal-option-list--profile">
          ${filteredOptions.length
            ? filteredOptions
                .map((option) => {
                  const checked = selectedValues.includes(option.value);
                  return `
                    <label class="campaign-builder__modal-option">
                      <input
                        class="campaign-builder__modal-option-input"
                        type="checkbox"
                        value="${option.value}"
                        data-profile-tag
                        ${checked ? 'checked' : ''}
                      />
                      <span class="campaign-builder__modal-option-copy">
                        <strong class="campaign-builder__modal-option-title">${option.label}</strong>
                        ${option.description ? `<span class="campaign-builder__modal-option-text">${option.description}</span>` : ''}
                      </span>
                    </label>
                  `;
                })
                .join('')
            : renderAudienceSearchEmptyState()}
        </div>
      </section>
    `;

    if (audienceModalSave) {
      audienceModalSave.disabled = !profileSelectionState.canSave;
    }
    return;
  }

  const filteredOptions = config.options.filter((option) => {
    if (!normalizedSearch) {
      return true;
    }

    return `${option.label} ${option.description || ''} ${option.value}`
      .toLowerCase()
      .includes(normalizedSearch);
  });

  audienceModalOptions.innerHTML = filteredOptions
    .length
    ? filteredOptions
        .map((option) => {
          const checked = selectedValues.includes(option.value);
          const controlType =
            config.selectionType === 'single' ? 'radio' : 'checkbox';
          return `
            <label class="campaign-builder__modal-option">
              <input
                class="campaign-builder__modal-option-input"
                type="${controlType}"
                name="audience-modal-selection"
                value="${option.value}"
                ${checked ? 'checked' : ''}
              />
              <span class="campaign-builder__modal-option-copy">
                <strong class="campaign-builder__modal-option-title">${option.label}</strong>
                ${option.description ? `<span class="campaign-builder__modal-option-text">${option.description}</span>` : ''}
              </span>
            </label>
          `;
        })
        .join('')
    : renderAudienceSearchEmptyState();
}
