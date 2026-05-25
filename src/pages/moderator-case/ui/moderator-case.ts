import './moderator-case.scss';
import {
  getAdminAd,
  updateAdModerationStatus,
  type AdminAdDto,
} from 'features/admin';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import { showToast } from 'shared/lib/toast';
import caseTemplate from './moderator-case.hbs';

const FALLBACK_TEXT = '—';

function getAdIdFromLocation(): number | null {
  const raw = new URLSearchParams(window.location.search).get('id');
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toProxiedUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try { return '/s3' + new URL(url).pathname; } catch { /* fall through */ }
  }
  return url;
}

function cleanText(
  value: string | null | undefined,
  fallback = FALLBACK_TEXT,
): string {
  const text = value?.trim();
  return text ? text : fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getHostLabel(url: string | null | undefined): string {
  const rawUrl = url?.trim();

  if (!rawUrl) {
    return FALLBACK_TEXT;
  }

  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '') || rawUrl;
  } catch {
    return rawUrl;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'approved':
    case 'active':
      return 'Одобрено';
    case 'disapproved':
    case 'rejected':
      return 'Отклонено';
    case 'moderation':
    case 'pending':
      return 'На модерации';
    default:
      return cleanText(status, 'Статус неизвестен');
  }
}

function getCheckState(value: string | null | undefined): 'pass' | 'fail' {
  return value?.trim() ? 'pass' : 'fail';
}

function buildDetail(ad: AdminAdDto) {
  const title = cleanText(ad.title, `Объявление #${ad.id}`);
  const description = cleanText(
    ad.short_desc,
    'Описание объявления не заполнено.',
  );
  const targetUrl = ad.target_url?.trim() ?? '';
  const targetUrlLabel = cleanText(ad.target_url);
  const imageUrl = toProxiedUrl(cleanText(ad.image_url, ''));
  const platform = getHostLabel(ad.target_url);
  const hasImage = Boolean(imageUrl);
  const hasTarget = Boolean(ad.target_url?.trim());

  return {
    id: String(ad.id),
    title,
    objectType: 'Объявление',
    advertiser: 'Рекламодатель не передан',
    status: getStatusLabel(ad.status),
    stage: 'incoming',
    priority:
      !ad.title?.trim() || !ad.short_desc?.trim() || !ad.target_url?.trim()
        ? 'high'
        : 'medium',
    platform,
    campaignId: String(ad.id),
    submittedAt: FALLBACK_TEXT,
    assignedTo: 'Не назначен',
    sla: '60 мин',
    summary: description,
    assets: [
      { label: 'Заголовок', value: title },
      { label: 'Описание', value: description },
      { label: 'Ссылка', value: targetUrlLabel },
    ],
    signals: [
      hasImage ? 'Креатив загружен' : 'Креатив не передан',
      hasTarget ? `Целевая ссылка: ${platform}` : 'Целевая ссылка не передана',
      `Backend-статус: ${cleanText(ad.status, 'unknown')}`,
    ],
    checks: [
      { label: 'Заголовок заполнен', state: getCheckState(ad.title) },
      { label: 'Описание заполнено', state: getCheckState(ad.short_desc) },
      { label: 'Целевая ссылка передана', state: getCheckState(ad.target_url) },
      { label: 'Изображение передано', state: hasImage ? 'pass' : 'warning' },
    ],
    decisions: [
      {
        id: 'approve',
        label: 'Одобрить',
        tone: 'success',
        note: 'Объявление соответствует правилам и будет запущено.',
      },
      {
        id: 'disapprove',
        label: 'Отклонить',
        tone: 'danger',
        note: 'Объявление нарушает правила и не будет показано.',
      },
    ],
    internalNotes: [
      'Данные ниже загружены из текущей admin-ручки объявлений. Поля, которых нет в ответе backend, помечены прочерком.',
    ],
    policyReferences: [
      {
        code: 'ADV-BASE',
        title: 'Базовая проверка объявления',
        description:
          'Проверить заголовок, описание, целевую ссылку и наличие креатива.',
      },
      {
        code: 'ADV-LINK',
        title: 'Проверка целевой страницы',
        description:
          'Убедиться, что ссылка открывается и соответствует содержанию объявления.',
      },
    ],
    messages: [
      {
        id: 'system-status',
        author: 'system',
        authorName: 'Система',
        timestamp: 'Сейчас',
        text: `Объявление находится в статусе «${getStatusLabel(ad.status)}».`,
      },
    ],
    submission: {
      name: title,
      formatLabel: 'Объявление',
      goalLabel: 'Переход по ссылке',
      headline: title,
      description,
      cta: 'Перейти',
      link: targetUrl || '#',
      linkLabel: targetUrlLabel,
      hasLink: hasTarget,
      imageUrl,
      moderationNote:
        'Проверьте заголовок, описание, изображение и ссылку перехода.',
      placements: FALLBACK_TEXT,
      creativeType: hasImage ? 'Изображение объявления' : 'Креатив не передан',
      creativeAssets: hasImage
        ? [
            {
              title: 'Изображение объявления',
              meta: 'Файл из кампании',
              status: 'Загружено',
              note: imageUrl,
            },
          ]
        : [
            {
              title: 'Изображение объявления',
              meta: 'Нет файла',
              status: 'Не передано',
              note: 'Backend не вернул image_url для этого объявления.',
            },
          ],
      audience: {
        cities: FALLBACK_TEXT,
        ageRange: FALLBACK_TEXT,
        profileTags: FALLBACK_TEXT,
        interests: FALLBACK_TEXT,
        exclusions: FALLBACK_TEXT,
        matchingMode: FALLBACK_TEXT,
        expansionLabel: 'Данные аудитории не приходят в текущей admin-ручке.',
      },
      budget: {
        dailyBudget: FALLBACK_TEXT,
        totalBudget: FALLBACK_TEXT,
        period: FALLBACK_TEXT,
        strategy: FALLBACK_TEXT,
        forecastReach: FALLBACK_TEXT,
        forecastClicks: FALLBACK_TEXT,
        forecastCpc: FALLBACK_TEXT,
      },
    },
  };
}

function buildUnavailableDetail(
  adId: number,
  title: string,
): ReturnType<typeof buildDetail> {
  return buildDetail({
    id: adId,
    status: '',
    title,
    short_desc: '',
    image_url: '',
    target_url: '',
  });
}

export async function renderModeratorCasePage(): Promise<string> {
  const adId = getAdIdFromLocation();

  if (adId === null) {
    const detail = buildUnavailableDetail(0, 'Объявление не найдено');

    return renderTemplate(caseTemplate, {
      detail,
      initialDecisionId: '',
      initialPolicyCode: detail.policyReferences[0]?.code ?? '',
      canApplyDecision: false,
      loadError: 'Не указан ID объявления.',
    });
  }

  try {
    const ad = await getAdminAd(adId);
    const detail = buildDetail(ad);

    return renderTemplate(caseTemplate, {
      detail,
      initialDecisionId: detail.decisions[0]?.id ?? '',
      initialPolicyCode: detail.policyReferences[0]?.code ?? '',
      canApplyDecision: true,
    });
  } catch (err) {
    const detail = buildUnavailableDetail(adId, `Объявление #${adId}`);
    const message =
      err instanceof Error
        ? err.message
        : 'Не удалось загрузить данные объявления.';

    return renderTemplate(caseTemplate, {
      detail,
      initialDecisionId: '',
      initialPolicyCode: detail.policyReferences[0]?.code ?? '',
      canApplyDecision: false,
      loadError: message,
    });
  }
}

function switchCaseTab(root: HTMLElement, nextTabId: string): void {
  const tabs = Array.from(
    root.querySelectorAll<HTMLElement>('[data-case-tab]'),
  );
  const panels = Array.from(
    root.querySelectorAll<HTMLElement>('[data-case-panel]'),
  );

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
  const decisionButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-decision-option]'),
  );
  const selectedLabel = root.querySelector<HTMLElement>(
    '[data-selected-decision]',
  );
  const applyButton = root.querySelector<HTMLButtonElement>(
    '[data-apply-decision]',
  );
  const hiddenInput = root.querySelector<HTMLInputElement>(
    '[data-decision-input]',
  );
  const canApplyDecision = root.dataset.caseCanApply !== 'false';

  hiddenInput?.setAttribute('value', decisionId);

  decisionButtons.forEach((button) => {
    const isActive = button.dataset.decisionOption === decisionId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  const activeButton = decisionButtons.find(
    (button) => button.dataset.decisionOption === decisionId,
  );
  const label =
    activeButton?.querySelector('strong')?.textContent?.trim() ?? 'Не выбрано';

  if (selectedLabel) {
    selectedLabel.textContent = label;
  }

  if (applyButton) {
    applyButton.disabled = !canApplyDecision || !decisionId;
  }
}

function syncSelectedPolicy(root: HTMLElement, policyCode: string): void {
  const policyButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-policy-option]'),
  );
  const selectedLabel = root.querySelector<HTMLElement>(
    '[data-selected-policy]',
  );
  const hiddenInput = root.querySelector<HTMLInputElement>(
    '[data-policy-input]',
  );

  hiddenInput?.setAttribute('value', policyCode);

  policyButtons.forEach((button) => {
    const isActive = button.dataset.policyOption === policyCode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  const activeButton = policyButtons.find(
    (button) => button.dataset.policyOption === policyCode,
  );
  const label =
    activeButton?.querySelector('strong')?.textContent?.trim() ?? 'Без ссылки';

  if (selectedLabel) {
    selectedLabel.textContent = label;
  }
}

function appendTimelineEvent(
  root: HTMLElement,
  title: string,
  description: string,
): void {
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

  const adId = getAdIdFromLocation();

  const defaultTab =
    root.querySelector<HTMLElement>('[data-case-tab].is-active')?.dataset
      .caseTab ?? 'materials';
  const defaultDecision =
    root.querySelector<HTMLElement>('[data-decision-option].is-active')?.dataset
      .decisionOption ?? '';
  const defaultPolicy =
    root.querySelector<HTMLElement>('[data-policy-option].is-active')?.dataset
      .policyOption ?? '';

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

  root
    .querySelectorAll<HTMLButtonElement>('[data-decision-option]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.decisionOption) {
          syncSelectedDecision(root, button.dataset.decisionOption);
        }
      });
    });

  root
    .querySelectorAll<HTMLButtonElement>('[data-policy-option]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.policyOption) {
          syncSelectedPolicy(root, button.dataset.policyOption);
        }
      });
    });

  const applyButton = root.querySelector<HTMLButtonElement>(
    '[data-apply-decision]',
  );
  const publicReply = root.querySelector<HTMLTextAreaElement>(
    '[data-public-reply]',
  );
  const internalNote = root.querySelector<HTMLTextAreaElement>(
    '[data-internal-note]',
  );
  const statusBadge = root.querySelector<HTMLElement>('[data-case-status]');
  const statusText = root.querySelector<HTMLElement>('[data-case-status-text]');
  const nextStep = root.querySelector<HTMLElement>('[data-case-next-step]');

  applyButton?.addEventListener('click', async () => {
    const decisionId =
      root.querySelector<HTMLInputElement>('[data-decision-input]')?.value ??
      '';

    if (!decisionId || adId === null || root.dataset.caseCanApply === 'false') {
      return;
    }

    if (decisionId !== 'approve' && decisionId !== 'disapprove') {
      showToast(
        'Ошибка',
        'Выберите «Одобрить» или «Отклонить».',
        'error',
        3000,
      );
      return;
    }

    if (applyButton) applyButton.disabled = true;

    try {
      await updateAdModerationStatus(adId, decisionId);

      const policyCode =
        root.querySelector<HTMLInputElement>('[data-policy-input]')?.value ??
        '';
      const replyText = publicReply?.value.trim() ?? '';
      const noteText = internalNote?.value.trim() ?? '';

      const activeDecision = root.querySelector<HTMLElement>(
        `[data-decision-option="${decisionId}"] strong`,
      );
      const decisionLabel =
        activeDecision?.textContent?.trim() ?? 'Решение обновлено';

      if (statusBadge) statusBadge.textContent = decisionLabel;
      if (statusText) {
        statusText.textContent = policyCode
          ? `Решение связано с правилом ${policyCode} и зафиксировано.`
          : 'Решение зафиксировано.';
      }
      if (nextStep) {
        nextStep.textContent =
          decisionId === 'approve'
            ? 'Объявление одобрено и будет запущено.'
            : 'Объявление отклонено. Уведомите рекламодателя о причинах.';
      }

      if (replyText) {
        appendThreadMessage(root, replyText);
        if (publicReply) publicReply.value = '';
      }
      if (noteText) {
        appendTimelineEvent(root, 'Добавлена внутренняя заметка', noteText);
        if (internalNote) internalNote.value = '';
      }
      appendTimelineEvent(root, 'Решение принято', decisionLabel);

      showToast(
        'Готово',
        `Статус объявления обновлён: ${decisionLabel.toLowerCase()}.`,
        'success',
        3000,
      );

      setTimeout(() => navigateTo('/moderator/queue'), 1500);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Не удалось обновить статус.';
      showToast('Ошибка', msg, 'error', 4000);
      if (applyButton) applyButton.disabled = false;
    }
  });

  return () => {};
}
