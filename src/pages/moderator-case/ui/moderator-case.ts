import './moderator-case.scss';
import { getModerationCaseById } from 'features/moderation/model/mock';
import { renderTemplate } from 'shared/lib/render';
import caseTemplate from './moderator-case.hbs';

function getCaseIdFromLocation(): string {
  return new URLSearchParams(window.location.search).get('id') || '5821';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function renderModeratorCasePage(): Promise<string> {
  const detail = getModerationCaseById(getCaseIdFromLocation());

  return renderTemplate(caseTemplate, {
    detail,
    initialDecisionId: detail.decisions[0]?.id ?? '',
    initialPolicyCode: detail.policyReferences[0]?.code ?? '',
  });
}

function switchCaseTab(root: HTMLElement, nextTabId: string): void {
  const tabs = Array.from(root.querySelectorAll<HTMLElement>('[data-case-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-case-panel]'));

  tabs.forEach((tab) => {
    const isActive = tab.dataset.caseTab === nextTabId;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  panels.forEach((panel) => {
    const isActive = panel.dataset.casePanel === nextTabId;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
  });
}

function syncSelectedDecision(root: HTMLElement, decisionId: string): void {
  const decisionButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-decision-option]'));
  const selectedLabel = root.querySelector<HTMLElement>('[data-selected-decision]');
  const applyButton = root.querySelector<HTMLButtonElement>('[data-apply-decision]');
  const hiddenInput = root.querySelector<HTMLInputElement>('[data-decision-input]');

  hiddenInput?.setAttribute('value', decisionId);

  decisionButtons.forEach((button) => {
    const isActive = button.dataset.decisionOption === decisionId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  const activeButton = decisionButtons.find((button) => button.dataset.decisionOption === decisionId);
  const label = activeButton?.querySelector('strong')?.textContent?.trim() ?? 'Не выбрано';

  if (selectedLabel) {
    selectedLabel.textContent = label;
  }

  if (applyButton) {
    applyButton.disabled = !decisionId;
  }
}

function syncSelectedPolicy(root: HTMLElement, policyCode: string): void {
  const policyButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-policy-option]'));
  const selectedLabel = root.querySelector<HTMLElement>('[data-selected-policy]');
  const hiddenInput = root.querySelector<HTMLInputElement>('[data-policy-input]');

  hiddenInput?.setAttribute('value', policyCode);

  policyButtons.forEach((button) => {
    const isActive = button.dataset.policyOption === policyCode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  const activeButton = policyButtons.find((button) => button.dataset.policyOption === policyCode);
  const label = activeButton?.querySelector('strong')?.textContent?.trim() ?? 'Без ссылки';

  if (selectedLabel) {
    selectedLabel.textContent = label;
  }
}

function appendTimelineEvent(root: HTMLElement, title: string, description: string): void {
  const timeline = root.querySelector<HTMLElement>('[data-case-timeline]');

  if (!timeline) {
    return;
  }

  const item = document.createElement('article');
  item.className = 'moderator-timeline__item moderator-timeline__item--draft';
  item.innerHTML = `
    <div class="moderator-timeline__dot" aria-hidden="true"></div>
    <div class="moderator-timeline__content">
      <strong>${escapeHtml(title)}</strong>
      <span>Только что</span>
      <p>${escapeHtml(description)}</p>
    </div>
  `;

  timeline.prepend(item);
}

function appendThreadMessage(root: HTMLElement, text: string): void {
  const thread = root.querySelector<HTMLElement>('[data-case-thread]');

  if (!thread) {
    return;
  }

  const item = document.createElement('article');
  item.className = 'moderator-thread__item moderator-thread__item--moderator';
  item.innerHTML = `
    <div class="moderator-thread__head">
      <strong>Вы</strong>
      <span>Только что</span>
    </div>
    <p>${escapeHtml(text)}</p>
  `;

  thread.append(item);
}

export function ModeratorCasePage(): VoidFunction {
  const root = document.querySelector<HTMLElement>('.moderator-case-page');

  if (!root) {
    return () => {};
  }

  const defaultTab = root.querySelector<HTMLElement>('[data-case-tab].is-active')?.dataset.caseTab ?? 'materials';
  const defaultDecision =
    root.querySelector<HTMLElement>('[data-decision-option].is-active')?.dataset.decisionOption ?? '';
  const defaultPolicy = root.querySelector<HTMLElement>('[data-policy-option].is-active')?.dataset.policyOption ?? '';

  switchCaseTab(root, defaultTab);
  syncSelectedDecision(root, defaultDecision);
  syncSelectedPolicy(root, defaultPolicy);

  root.querySelectorAll<HTMLButtonElement>('[data-case-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.dataset.caseTab) {
        switchCaseTab(root, tab.dataset.caseTab);
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-decision-option]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.decisionOption) {
        syncSelectedDecision(root, button.dataset.decisionOption);
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-policy-option]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.policyOption) {
        syncSelectedPolicy(root, button.dataset.policyOption);
      }
    });
  });

  const applyButton = root.querySelector<HTMLButtonElement>('[data-apply-decision]');
  const publicReply = root.querySelector<HTMLTextAreaElement>('[data-public-reply]');
  const internalNote = root.querySelector<HTMLTextAreaElement>('[data-internal-note]');
  const statusBadge = root.querySelector<HTMLElement>('[data-case-status]');
  const statusText = root.querySelector<HTMLElement>('[data-case-status-text]');
  const nextStep = root.querySelector<HTMLElement>('[data-case-next-step]');

  applyButton?.addEventListener('click', () => {
    const decisionId = root.querySelector<HTMLInputElement>('[data-decision-input]')?.value ?? '';
    const policyCode = root.querySelector<HTMLInputElement>('[data-policy-input]')?.value ?? '';
    const replyText = publicReply?.value.trim() ?? '';
    const noteText = internalNote?.value.trim() ?? '';

    const activeDecision = root.querySelector<HTMLElement>(`[data-decision-option="${decisionId}"] strong`);
    const decisionLabel = activeDecision?.textContent?.trim() ?? 'Решение обновлено';

    if (statusBadge) {
      statusBadge.textContent = decisionLabel;
    }

    if (statusText) {
      statusText.textContent = policyCode
        ? `Решение связано с правилом ${policyCode} и зафиксировано в карточке кейса.`
        : 'Решение зафиксировано в карточке кейса.';
    }

    if (nextStep) {
      nextStep.textContent = replyText
        ? 'Ответ клиенту подготовлен, кейс можно перевести в следующий этап.'
        : 'Нужно добавить публичный комментарий, если решение требует обратной связи клиенту.';
    }

    if (replyText) {
      appendThreadMessage(root, replyText);
      if (publicReply) {
        publicReply.value = '';
      }
    }

    if (noteText) {
      appendTimelineEvent(root, 'Добавлена внутренняя заметка', noteText);
      if (internalNote) {
        internalNote.value = '';
      }
    }

    appendTimelineEvent(
      root,
      'Решение обновлено',
      policyCode ? `${decisionLabel}. Основание: ${policyCode}.` : decisionLabel,
    );
  });

  return () => {};
}
