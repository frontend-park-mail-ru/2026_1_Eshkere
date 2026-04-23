import './navbar.scss';
import { renderTemplate } from 'shared/lib/render';
import { formatPrice } from 'shared/lib/format';
import { authState, logoutUser, type AuthUser } from 'features/auth';
import { navigateTo } from 'app/navigation';
import navbarTemplate from './navbar.hbs';

let navbarLifecycleController: AbortController | null = null;
const themeStorageKey = 'ui-theme';

const navbarNotifications = [
  {
    tone: 'primary',
    title: 'Кампания "iPhone 14" набирает показы',
    text: 'За последние 24 часа CTR вырос. Есть смысл проверить площадки и бюджет.',
    time: '5 минут назад',
  },
  {
    tone: 'success',
    title: 'Баланс пополнен',
    text: 'На кабинет зачислено 20 000 ₽. Средств достаточно для активных кампаний.',
    time: 'Сегодня, 11:20',
  },
  {
    tone: 'neutral',
    title: 'Есть новая рекомендация',
    text: 'Система предлагает усилить Ленту: там сейчас лучший отклик по кампании.',
    time: 'Вчера, 18:40',
  },
] as const;

/**
 * Рендерит публичную навигационную панель.
 *
 * @param {string} [pathname="/"] - Активный путь приложения.
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderNavbar(pathname = '/'): Promise<string> {
  const isAuth = authState.isAuthenticated();
  const currentUser: AuthUser =
  authState.getCurrentUser() ?? {
    id: 0,
    email: '',
    phone: '',
  };
  const user = {
    ...currentUser,
    name: currentUser.email || currentUser.name || 'Профиль',
    balance: typeof currentUser.balance === 'number' ? currentUser.balance : 0,
    balanceLabel: formatPrice(
      typeof currentUser.balance === 'number' ? currentUser.balance : 0,
    ),
    avatar: currentUser.avatar || '/img/avatar-placeholder.png',
  };

  return await renderTemplate(navbarTemplate, {
    isLogin: pathname === '/login',
    isRegister: pathname === '/register',
    isAuthenticated: isAuth,
    user: user,
    notifications: navbarNotifications,
  });
}

/**
 * Подключает обработчик выхода из верхней панели профиля.
 *
 * @return {void}
 */
export function Navbar(): VoidFunction {
  if (navbarLifecycleController) {
    navbarLifecycleController.abort();
  }

  const controller = new AbortController();
  navbarLifecycleController = controller;
  const { signal } = controller;

  const navbar = document.querySelector('.navbar');
  const notificationsToggleButton = document.getElementById(
    'navbar-notifications-toggle',
  );
  const notificationsMenu = document.getElementById('navbar-notifications-menu');
  const notificationsBadge = notificationsMenu?.querySelector(
    '.navbar__notifications-badge',
  );
  const notificationItems = Array.from(
    notificationsMenu?.querySelectorAll<HTMLElement>('[data-notification-item]') ?? [],
  );
  const notificationModalItems = Array.from(
    document.querySelectorAll<HTMLElement>('[data-notification-modal-item]'),
  );
  const notificationDismissButtons = Array.from(
    notificationsMenu?.querySelectorAll<HTMLButtonElement>('[data-notification-dismiss]') ?? [],
  );
  const notificationModalDismissButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-notification-modal-dismiss]'),
  );
  const profileToggleButton = document.getElementById('navbar-profile-toggle');
  const profileMenu = document.getElementById('navbar-profile-menu');
  const notificationsAllButton = document.getElementById('navbar-notifications-all');
  const notificationsModal = document.getElementById('navbar-notifications-modal');
  const notificationsEmptyState = document.getElementById('navbar-notifications-empty');
  const notificationsModalCloseButton = document.getElementById(
    'navbar-notifications-close',
  );
  const logoutButton = document.getElementById('navbar-logout-button');
  const sidebarLogoutButton = document.getElementById('logout-button');
  const logoutModal = document.getElementById('navbar-logout-modal');
  const themeToggle = document.getElementById('navbar-theme-toggle') as HTMLElement | null;
  const themeToggleTitle = document.getElementById('navbar-theme-toggle-title');
  const logoutConfirmButton = document.getElementById(
    'navbar-logout-confirm',
  ) as HTMLButtonElement | null;
  const logoutCancelButton = document.getElementById('navbar-logout-cancel');

  const applyTheme = (theme: 'light' | 'dark') => {
    const isDarkTheme = theme === 'dark';
    document.documentElement.dataset.theme = theme;
    if (themeToggleTitle) {
      themeToggleTitle.textContent = isDarkTheme ? 'Светлая тема' : 'Темная тема';
    }
    if (themeToggle) {
      themeToggle.setAttribute(
        'aria-label',
        isDarkTheme ? 'Включить светлую тему' : 'Включить тёмную тему',
      );
    }
  };

  const resolveInitialTheme = (): 'light' | 'dark' => {
    const storedTheme = localStorage.getItem(themeStorageKey);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  applyTheme(resolveInitialTheme());

  if (logoutModal && logoutModal.parentElement !== document.body) {
    document.body.appendChild(logoutModal);
  }

  if (notificationsModal && notificationsModal.parentElement !== document.body) {
    document.body.appendChild(notificationsModal);
  }

  if (navbar) {
    const syncScrollState = () => {
      navbar.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    syncScrollState();
    window.addEventListener('scroll', syncScrollState, {
      passive: true,
      signal,
    });
  }

  if (!logoutButton || !logoutModal || !logoutConfirmButton || !logoutCancelButton) {
    return () => {
      if (navbarLifecycleController === controller) {
        navbarLifecycleController = null;
      }
      controller.abort();
    };
  }

  const toggleTheme = () => {
    const isDarkTheme = document.documentElement.dataset.theme === 'dark';
    const nextTheme: 'light' | 'dark' = isDarkTheme ? 'light' : 'dark';
    localStorage.setItem(themeStorageKey, nextTheme);
    applyTheme(nextTheme);  
  };

  themeToggle?.addEventListener('click', toggleTheme, { signal });

  themeToggle?.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleTheme();
      }
    },
    { signal },
  );

  const closeNotifications = () => {
    if (!notificationsMenu || !notificationsToggleButton) {
      return;
    }

    notificationsMenu.hidden = true;
    notificationsToggleButton.setAttribute('aria-expanded', 'false');
  };

  const openNotifications = () => {
    if (!notificationsMenu || !notificationsToggleButton) {
      return;
    }

    closeMenu();
    notificationsMenu.hidden = false;
    notificationsToggleButton.setAttribute('aria-expanded', 'true');
  };

  const closeMenu = () => {
    if (!profileMenu || !profileToggleButton) {
      return;
    }

    profileMenu.hidden = true;
    profileToggleButton.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    if (!profileMenu || !profileToggleButton) {
      return;
    }

    closeNotifications();
    profileMenu.hidden = false;
    profileToggleButton.setAttribute('aria-expanded', 'true');
  };

  const closeLogoutModal = () => {
    logoutModal.hidden = true;
  };

  const openLogoutModal = () => {
    logoutModal.hidden = false;
  };

  const closeNotificationsModal = () => {
    if (!notificationsModal) {
      return;
    }

    notificationsModal.hidden = true;
  };

  const openNotificationsModal = () => {
    if (!notificationsModal) {
      return;
    }

    closeNotifications();
    closeMenu();
    notificationsModal.hidden = false;
  };

  const syncNotificationsState = () => {
    if (!notificationsMenu || !notificationsBadge) {
      return;
    }

    const visibleItems = notificationItems.filter(
      (item) => !item.classList.contains('is-hidden'),
    );
    notificationsBadge.textContent = String(visibleItems.length);
    notificationsMenu.classList.toggle('is-empty', visibleItems.length === 0);
    notificationsModal?.classList.toggle('is-empty', visibleItems.length === 0);
    notificationsEmptyState?.toggleAttribute('hidden', visibleItems.length !== 0);
  };

  notificationsToggleButton?.addEventListener(
    'click',
    () => {
      if (!notificationsMenu) {
        return;
      }

      if (notificationsMenu.hidden) {
        openNotifications();
        return;
      }

      closeNotifications();
    },
    { signal },
  );

  profileToggleButton?.addEventListener(
    'click',
    () => {
      if (!profileMenu) {
        return;
      }

      if (profileMenu.hidden) {
        openMenu();
        return;
      }

      closeMenu();
    },
    { signal },
  );

  notificationDismissButtons.forEach((button) => {
    button.addEventListener(
      'click',
      (event) => {
        event.stopPropagation();

        const card = button.closest<HTMLElement>('[data-notification-item]');
        if (!card) {
          return;
        }

        const notificationId = card.dataset.notificationId;
        card.classList.add('is-hidden');

        if (notificationId) {
          notificationModalItems
            .filter((item) => item.dataset.notificationId === notificationId)
            .forEach((item) => {
              item.classList.add('is-hidden');
            });
        }

        syncNotificationsState();
      },
      { signal },
    );
  });

  notificationModalDismissButtons.forEach((button) => {
    button.addEventListener(
      'click',
      (event) => {
        event.stopPropagation();

        const card = button.closest<HTMLElement>('[data-notification-modal-item]');
        if (!card) {
          return;
        }

        const notificationId = card.dataset.notificationId;
        card.classList.add('is-hidden');

        if (notificationId) {
          notificationItems
            .filter((item) => item.dataset.notificationId === notificationId)
            .forEach((item) => {
              item.classList.add('is-hidden');
            });
        }

        syncNotificationsState();
      },
      { signal },
    );
  });

  notificationsAllButton?.addEventListener(
    'click',
    () => {
      openNotificationsModal();
    },
    { signal },
  );

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        !target.closest('.navbar__actions-user')
      ) {
        closeNotifications();
        closeMenu();
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && notificationsMenu && !notificationsMenu.hidden) {
        closeNotifications();
      }

      if (event.key === 'Escape' && profileMenu && !profileMenu.hidden) {
        closeMenu();
      }

      if (event.key === 'Escape' && !logoutModal.hidden) {
        closeLogoutModal();
      }

      if (event.key === 'Escape' && notificationsModal && !notificationsModal.hidden) {
        closeNotificationsModal();
      }
    },
    { signal },
  );

  logoutButton.addEventListener(
    'click',
    () => {
      closeMenu();
      closeNotifications();
      openLogoutModal();
    },
    { signal },
  );

  sidebarLogoutButton?.addEventListener(
    'click',
    () => {
      closeMenu();
      closeNotifications();
      openLogoutModal();
    },
    { signal },
  );

  logoutCancelButton.addEventListener(
    'click',
    () => {
      closeLogoutModal();
    },
    { signal },
  );

  logoutModal.addEventListener(
    'click',
    (event) => {
      if (event.target === logoutModal) {
        closeLogoutModal();
      }
    },
    { signal },
  );

  logoutConfirmButton.addEventListener(
    'click',
    async () => {
      logoutConfirmButton.disabled = true;

      try {
        await logoutUser();
        navigateTo('/login', { replace: true });
        closeLogoutModal();
      } finally {
        logoutConfirmButton.disabled = false;
      }
    },
    { signal },
  );

  notificationsModal?.addEventListener(
    'click',
    (event) => {
      if (event.target === notificationsModal) {
        closeNotificationsModal();
      }
    },
    { signal },
  );

  notificationsModalCloseButton?.addEventListener(
    'click',
    () => {
      closeNotificationsModal();
    },
    { signal },
  );

  syncNotificationsState();

  return () => {
    if (navbarLifecycleController === controller) {
      navbarLifecycleController = null;
    }
    controller.abort();
  };
}
