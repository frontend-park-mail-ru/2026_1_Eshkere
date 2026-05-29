import './moderator-case.scss';
import { getAdminAd, updateAdModerationStatus, type AdminAdDto } from 'features/admin';
import { sendModeratorSupportMessage } from 'features/support-chat';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import { showToast } from 'shared/lib/toast';
import { renderButton } from 'shared/ui/button/button';
import caseTemplate from './moderator-case.hbs';

function getAdIdFromLocation(): number | null {
  const raw = new URLSearchParams(window.location.search).get('id');
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toProxiedUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const { pathname } = new URL(url);
      return pathname.startsWith('/s3/') ? pathname : '/s3' + pathname;
    } catch { /* fall through */ }
  }
  return url;
}

function getDomain(url: string | null | undefined): string {
  const raw = url?.trim();
  if (!raw) return '—';
  try { return new URL(raw).hostname.replace(/^www\./, '') || raw; } catch { return raw; }
}

function checkState(value: string | null | undefined): 'pass' | 'fail' {
  return value?.trim() ? 'pass' : 'fail';
}

interface DecisionViewModel {
  id: string;
  isPressed: boolean;
  buttonHtml: string;
}

async function buildDecisionButtons(): Promise<DecisionViewModel[]> {
  const decisions: Array<{ id: 'approve' | 'disapprove'; label: string; tone: 'success' | 'danger' }> = [
    { id: 'approve', label: 'Одобрить', tone: 'success' },
    { id: 'disapprove', label: 'Отклонить', tone: 'danger' },
  ];

  return await Promise.all(decisions.map(async (decision, index) => ({
    id: decision.id,
    isPressed: index === 0,
    buttonHtml: await renderButton({
      text: decision.label,
      type: 'button',
      variant: 'secondary',
      className: `mc__decision mc__decision--${decision.tone}${index === 0 ? ' is-active' : ''}`,
    }),
  })));
}

async function buildDetail(ad: AdminAdDto) {
  const title = ad.title?.trim() || `Объявление #${ad.id}`;
  const description = ad.short_desc?.trim() || 'Описание не заполнено.';
  const imageUrl = toProxiedUrl(ad.image_url?.trim() || '');
  const targetUrl = ad.target_url?.trim() || '';
  const hasLink = Boolean(targetUrl);
  const hasImage = Boolean(imageUrl);

  return {
    id: String(ad.id),
    title,
    description,
    imageUrl,
    link: targetUrl || '#',
    linkLabel: getDomain(ad.target_url),
    hasLink,
    checks: [
      { label: 'Заголовок заполнен', state: checkState(ad.title) },
      { label: 'Описание заполнено', state: checkState(ad.short_desc) },
      { label: 'Целевая ссылка', state: checkState(ad.target_url) },
      { label: 'Изображение', state: hasImage ? 'pass' : 'warning' },
    ],
    decisionButtons: await buildDecisionButtons(),
  };
}

async function buildEmpty(adId: number): Promise<Awaited<ReturnType<typeof buildDetail>>> {
  return await buildDetail({ id: adId, status: '', title: '', short_desc: '', image_url: '', target_url: '' });
}

export async function renderModeratorCasePage(): Promise<string> {
  const adId = getAdIdFromLocation();
  const applyDecisionButton = await renderButton({
    text: 'Применить решение',
    type: 'button',
    variant: 'primary',
    className: 'mc__submit',
    id: 'mc-apply-decision',
    disabled: adId === null,
  });

  if (adId === null) {
    return renderTemplate(caseTemplate, {
      detail: await buildEmpty(0),
      applyDecisionButton,
      initialDecisionId: 'approve',
      canApplyDecision: false,
      loadError: 'Не указан ID объявления.',
    });
  }

  try {
    const ad = await getAdminAd(adId);
    const detail = await buildDetail(ad);
    return renderTemplate(caseTemplate, {
      detail,
      applyDecisionButton: await renderButton({
        text: 'Применить решение',
        type: 'button',
        variant: 'primary',
        className: 'mc__submit',
        id: 'mc-apply-decision',
      }),
      initialDecisionId: 'approve',
      canApplyDecision: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось загрузить объявление.';
    return renderTemplate(caseTemplate, {
      detail: await buildEmpty(adId),
      applyDecisionButton: await renderButton({
        text: 'Применить решение',
        type: 'button',
        variant: 'primary',
        className: 'mc__submit',
        id: 'mc-apply-decision',
        disabled: true,
      }),
      initialDecisionId: 'approve',
      canApplyDecision: false,
      loadError: message,
    });
  }
}

export function ModeratorCasePage(): VoidFunction {
  const root = document.querySelector<HTMLElement>('[data-mc]');
  if (!root) return () => {};

  const adId = getAdIdFromLocation();
  const decisionInput = root.querySelector<HTMLInputElement>('[data-decision-input]');
  const applyButton = root.querySelector<HTMLButtonElement>('#mc-apply-decision');
  const statusNote = root.querySelector<HTMLElement>('[data-case-status-text]');
  const publicReply = root.querySelector<HTMLTextAreaElement>('[data-public-reply]');
  const canApply = root.dataset.caseCanApply !== 'false';

  const syncDecision = (id: string): void => {
    root.querySelectorAll<HTMLElement>('[data-decision-option]').forEach((optionNode) => {
      const active = optionNode.dataset.decisionOption === id;
      const btn = optionNode.querySelector<HTMLButtonElement>('.mc__decision');
      btn?.classList.toggle('is-active', active);
      btn?.setAttribute('aria-pressed', String(active));
    });
    if (decisionInput) decisionInput.value = id;
    if (applyButton) applyButton.disabled = !canApply || !id;
  };

  root.addEventListener('click', (event) => {
    const optionNode = (event.target as HTMLElement).closest<HTMLElement>('[data-decision-option]');
    if (!optionNode?.dataset.decisionOption) {
      return;
    }
    syncDecision(optionNode.dataset.decisionOption);
  });

  syncDecision(decisionInput?.value ?? 'approve');

  applyButton?.addEventListener('click', async () => {
    const decisionId = decisionInput?.value ?? '';
    if (!decisionId || adId === null || !canApply) return;
    if (decisionId !== 'approve' && decisionId !== 'disapprove') {
      showToast('Ошибка', 'Выберите «Одобрить» или «Отклонить».', 'error', 3000);
      return;
    }

    const comment = publicReply?.value.trim() ?? '';

    applyButton.disabled = true;

    try {
      await updateAdModerationStatus(adId, decisionId);

      if (comment) {
        const delivered = await sendModeratorSupportMessage(adId, comment);
        if (!delivered) {
          showToast(
            'Внимание',
            'Решение сохранено, но комментарий не удалось отправить в чат поддержки.',
            'error',
            5000,
          );
        }
      }

      const label = decisionId === 'approve' ? 'Одобрено' : 'Отклонено';
      if (statusNote) {
        statusNote.textContent = comment
          ? `Решение зафиксировано: ${label.toLowerCase()}. Комментарий отправлен.`
          : `Решение зафиксировано: ${label.toLowerCase()}.`;
      }

      showToast('Готово', `Объявление ${label.toLowerCase()}.`, 'success', 3000);
      setTimeout(() => navigateTo('/moderator/queue'), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось обновить статус.';
      showToast('Ошибка', msg, 'error', 4000);
      applyButton.disabled = false;
    }
  });

  return () => {};
}
