import './moderator-navbar.scss';
import { navigateTo } from 'app/navigation';
import { authState, logoutUser } from 'features/auth';
import { renderTemplate } from 'shared/lib/render';
import moderatorNavbarTemplate from './moderator-navbar.hbs';

const themeStorageKey = 'ui-theme';

function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = theme;
}

function resolveInitialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(themeStorageKey);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function toggleTheme(): void {
  const next: 'light' | 'dark' =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(themeStorageKey, next);
  applyTheme(next);
}

function getUserTitle(): string {
  const user = authState.getCurrentUser();

  if (!user) {
    return 'Модератор';
  }

  return user.name || user.email || 'Модератор';
}

function getSectionMeta(pathname: string): { currentSection: string; currentSectionHint: string } {
  if (pathname === '/moderator' || pathname === '/moderator/queue') {
    return {
      currentSection: 'Очередь модерации',
      currentSectionHint: 'Триаж новых кейсов, SLA и распределение потока.',
    };
  }

  if (pathname === '/moderator/case') {
    return {
      currentSection: 'Карточка кейса',
      currentSectionHint: 'Проверка рекламы, решение по policy и ответ клиенту.',
    };
  }

  if (pathname === '/moderator/messages') {
    return {
      currentSection: 'Диалоги с клиентами',
      currentSectionHint: 'Правки, документы и объяснение решений клиенту.',
    };
  }

  if (pathname === '/moderator/appeals') {
    return {
      currentSection: 'Апелляции',
      currentSectionHint: 'Повторные проверки и спорные кейсы после решения.',
    };
  }

  if (pathname === '/moderator/policies') {
    return {
      currentSection: 'Policy и правила',
      currentSectionHint: 'База правил и оснований для решений.',
    };
  }

  if (pathname === '/moderator/audit') {
    return {
      currentSection: 'Аудит действий',
      currentSectionHint: 'История решений команды и изменения статусов.',
    };
  }

  return {
    currentSection: 'Центр модерации',
    currentSectionHint: 'Рабочая зона модератора без логики рекламного кабинета.',
  };
}

export async function renderModeratorNavbar(pathname = '/moderator'): Promise<string> {
  return renderTemplate(moderatorNavbarTemplate, {
    pathname,
    userTitle: getUserTitle(),
    ...getSectionMeta(pathname),
  });
}

export function initModeratorNavbar(): VoidFunction {
  const controller = new AbortController();
  const { signal } = controller;
  const logoutButton = document.getElementById('moderator-navbar-logout') as HTMLButtonElement | null;
  const adsButton = document.getElementById('moderator-navbar-ads-link');
  const themeBtn = document.getElementById('moderator-navbar-theme-btn');

  applyTheme(resolveInitialTheme());
  themeBtn?.addEventListener('click', toggleTheme, { signal });

  adsButton?.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      navigateTo('/ads');
    },
    { signal },
  );

  logoutButton?.addEventListener(
    'click',
    async () => {
      if (logoutButton.disabled) {
        return;
      }

      logoutButton.disabled = true;

      try {
        await logoutUser();
        navigateTo('/login', { replace: true });
      } finally {
        logoutButton.disabled = false;
      }
    },
    { signal },
  );

  return () => {
    controller.abort();
  };
}
