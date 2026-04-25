import './appeals.scss';
import {
  getAppealById,
  getAppeals,
  type AppealCategory,
  type AppealResponse,
} from 'features/appeals';
import { isOfflineErrorMessage } from 'shared/lib/request';
import { renderTemplate } from 'shared/lib/render';
import appealsTemplate from './appeals.hbs';

interface AppealRowViewModel {
  id: number;
  title: string;
  categoryLabel: string;
  statusLabel: string;
  statusKey: 'open' | 'in_progress' | 'closed' | 'unknown';
  statusTone: 'open' | 'in-progress' | 'closed' | 'unknown';
}

function mapCategory(category: AppealCategory): string {
  if (category === 'bug') return 'Баг';
  if (category === 'suggestion') return 'Предложение';
  if (category === 'complaint') return 'Жалоба';
  return 'Вопрос';
}

function normalizeStatus(status: string): AppealRowViewModel['statusKey'] {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'open' || normalized === 'opened' || normalized === 'new') return 'open';
  if (normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'pending') {
    return 'in_progress';
  }
  if (normalized === 'closed' || normalized === 'done' || normalized === 'resolved') return 'closed';
  return 'unknown';
}

function getStatusLabel(statusKey: AppealRowViewModel['statusKey']): string {
  if (statusKey === 'open') return 'Открыто';
  if (statusKey === 'in_progress') return 'В работе';
  if (statusKey === 'closed') return 'Закрыто';
  return 'Неизвестно';
}

function mapAppeal(item: AppealResponse): AppealRowViewModel {
  const statusKey = normalizeStatus(item.status || '');
  return {
    id: item.id,
    title: item.title || '',
    categoryLabel: mapCategory(item.category),
    statusKey,
    statusTone: statusKey === 'in_progress' ? 'in-progress' : statusKey,
    statusLabel: getStatusLabel(statusKey),
  };
}

function resolveAppealAnswer(appeal: AppealResponse): string {
  const candidates = [appeal.answer, appeal.response, appeal.reply];
  const resolved = candidates.find((value) => typeof value === 'string' && value.trim());
  return resolved?.trim() || '';
}

function bindLogoutProxy(signal: AbortSignal): void {
  const logoutButton = document.getElementById('logout-button');
  const navbarLogoutButton = document.getElementById('navbar-logout-button');

  if (!logoutButton || !navbarLogoutButton) {
    return;
  }

  logoutButton.addEventListener(
    'click',
    () => {
      navbarLogoutButton.click();
    },
    { signal },
  );
}

let appealsPageLifecycleController: AbortController | null = null;

export async function renderAppealsPage(): Promise<string> {
  const result = await getAppeals();
  const appeals = result.appeals.map(mapAppeal);

  return renderTemplate(appealsTemplate, {
    appeals,
    hasAppeals: appeals.length > 0,
    loadError:
      result.error && !isOfflineErrorMessage(result.message)
        ? (result.message ?? '')
        : '',
  });
}

export function Appeals(): void | VoidFunction {
  if (appealsPageLifecycleController) {
    appealsPageLifecycleController.abort();
  }

  const controller = new AbortController();
  appealsPageLifecycleController = controller;
  const { signal } = controller;

  bindLogoutProxy(signal);

  const loadError = document.querySelector<HTMLElement>('[data-appeals-load-error]');
  if (loadError) {
    loadError.hidden = false;
  }

  const modal = document.querySelector<HTMLElement>('[data-appeal-modal]');
  const modalTitle = document.getElementById('appeal-modal-title');
  const modalCategory = document.querySelector<HTMLElement>('[data-appeal-modal-category]');
  const modalStatus = document.querySelector<HTMLElement>('[data-appeal-modal-status]');
  const modalDescription = document.querySelector<HTMLElement>('[data-appeal-modal-description]');
  const modalAnswer = document.querySelector<HTMLElement>('[data-appeal-modal-answer]');
  const modalAnswerBlock = document.querySelector<HTMLElement>('[data-appeal-modal-answer-block]');
  const modalCloseElements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-appeal-modal-close]'),
  );
  const rows = Array.from(document.querySelectorAll<HTMLElement>('.appeal-row[data-appeal-id]'));

  const closeModal = (): void => {
    if (!modal || modal.hidden) {
      return;
    }
    modal.classList.remove('is-open');
    window.setTimeout(() => {
      if (!modal.classList.contains('is-open')) {
        modal.hidden = true;
      }
    }, 190);
  };

  const openModal = (): void => {
    if (!modal) {
      return;
    }
    modal.hidden = false;
    window.requestAnimationFrame(() => {
      modal.classList.add('is-open');
    });
  };

  const fillModal = (appeal: AppealResponse): void => {
    const statusKey = normalizeStatus(appeal.status || '');
    const answer = resolveAppealAnswer(appeal);

    if (modalTitle) {
      modalTitle.textContent = appeal.title || 'Обращение без темы';
    }
    if (modalCategory) {
      modalCategory.textContent = mapCategory(appeal.category);
    }
    if (modalStatus) {
      modalStatus.textContent = getStatusLabel(statusKey);
    }
    if (modalDescription) {
      modalDescription.textContent = appeal.description || 'Описание отсутствует.';
    }
    if (modalAnswer) {
      modalAnswer.textContent = answer;
    }
    if (modalAnswerBlock) {
      modalAnswerBlock.hidden = !answer;
    }
  };

  const openAppealDetails = async (appealId: number): Promise<void> => {
    if (!modalDescription) {
      return;
    }
    openModal();
    if (modalTitle) {
      modalTitle.textContent = `Обращение #${appealId}`;
    }
    if (modalCategory) {
      modalCategory.textContent = 'Загрузка...';
    }
    if (modalStatus) {
      modalStatus.textContent = 'Загрузка...';
    }
    modalDescription.textContent = 'Загружаем детали обращения...';
    if (modalAnswerBlock) {
      modalAnswerBlock.hidden = true;
    }

    try {
      const appeal = await getAppealById(appealId);
      fillModal(appeal);
    } catch (error: unknown) {
      if (modalCategory) {
        modalCategory.textContent = 'Ошибка';
      }
      if (modalStatus) {
        modalStatus.textContent = 'Не удалось загрузить';
      }
      modalDescription.textContent =
        error instanceof Error
          ? error.message
          : 'Не удалось получить данные обращения. Попробуйте позже.';
    }
  };

  rows.forEach((row) => {
    const rowAppealId = Number(row.dataset['appealId']);
    if (!Number.isFinite(rowAppealId)) {
      return;
    }

    row.addEventListener(
      'click',
      () => {
        void openAppealDetails(rowAppealId);
      },
      { signal },
    );

    row.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void openAppealDetails(rowAppealId);
        }
      },
      { signal },
    );
  });

  modalCloseElements.forEach((element) => {
    element.addEventListener(
      'click',
      () => {
        closeModal();
      },
      { signal },
    );
  });

  document.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    },
    { signal },
  );

  return () => {
    if (appealsPageLifecycleController === controller) {
      appealsPageLifecycleController = null;
    }
    controller.abort();
  };
}
