import { OPEN_CAMPAIGN_DELETE_MODAL_EVENT } from 'shared/lib/events';
export { OPEN_CAMPAIGN_DELETE_MODAL_EVENT };

export interface CampaignDeleteModalDetail {
  id: number;
  title: string;
  /** Заголовок диалога (по умолчанию — для кампании). */
  headingText?: string;
  /** Основной текст под заголовком (по умолчанию — для кампании). */
  bodyText?: string;
  /** Текст нижней подсказки (по умолчанию — для кампании). */
  noteText?: string;
}

const DEFAULT_DELETE_HEADING = 'Удалить кампанию';
const DEFAULT_DELETE_NOTE =
  'После удаления невозможно будет вернуть эту кампанию снова в работу.';

interface InitCampaignDeleteModalOptions {
  onConfirm?: (detail: CampaignDeleteModalDetail) => Promise<void> | void;
}

export function initCampaignDeleteModal(
  signal: AbortSignal,
  options: InitCampaignDeleteModalOptions = {},
): void {
  const modal = document.getElementById('campaigns-delete-modal');
  const confirmButton = document.getElementById('campaigns-delete-confirm');
  const cancelButton = document.getElementById('campaigns-delete-cancel');
  const titleEl = modal?.querySelector<HTMLElement>('.campaigns-delete-modal__title');
  const textNode = modal?.querySelector<HTMLElement>('.campaigns-delete-modal__text');
  const noteEl = modal?.querySelector<HTMLElement>('.campaigns-delete-modal__note');

  if (!modal || !confirmButton || !cancelButton || !textNode) {
    return;
  }

  let pendingDetail: CampaignDeleteModalDetail | null = null;

  const close = (): void => {
    modal.hidden = true;
    pendingDetail = null;
    confirmButton.removeAttribute('disabled');
  };

  const open = (detail?: CampaignDeleteModalDetail): void => {
    pendingDetail = detail ?? null;
    const heading = detail?.headingText ?? DEFAULT_DELETE_HEADING;
    const note = detail?.noteText ?? DEFAULT_DELETE_NOTE;
    const body =
      detail?.bodyText ??
      (detail?.title
        ? `Кампания «${detail.title}» будет удалена из списка. Это действие нельзя отменить.`
        : 'Кампания будет удалена из списка. Это действие нельзя отменить.');
    if (titleEl) {
      titleEl.textContent = heading;
    }
    textNode.textContent = body;
    if (noteEl) {
      noteEl.textContent = note;
    }
    modal.hidden = false;
  };

  cancelButton.addEventListener('click', close, { signal });
  confirmButton.addEventListener(
    'click',
    async () => {
      if (!pendingDetail) {
        close();
        return;
      }

      confirmButton.setAttribute('disabled', 'true');

      try {
        await options.onConfirm?.(pendingDetail);
        close();
      } catch {
        confirmButton.removeAttribute('disabled');
      }
    },
    { signal },
  );

  modal.addEventListener(
    'click',
    (event) => {
      if (event.target === modal) {
        close();
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && !modal.hidden) {
        close();
      }
    },
    { signal },
  );

  document.addEventListener(
    OPEN_CAMPAIGN_DELETE_MODAL_EVENT,
    (event) => {
      const customEvent = event as CustomEvent<CampaignDeleteModalDetail>;
      open(customEvent.detail);
    },
    { signal },
  );
}
