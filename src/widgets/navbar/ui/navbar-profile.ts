import { logoutUser } from 'features/auth';
import { navigateTo } from 'app/navigation';

export function initNavbarProfileMenu(
  signal: AbortSignal,
  closeNotifications: () => void,
): {
  closeMenu: () => void;
  closeLogoutModal: () => void;
} {
  const profileToggleButton = document.getElementById('navbar-profile-toggle');
  const profileMenu = document.getElementById('navbar-profile-menu');
  const logoutButton = document.getElementById('navbar-logout-button');
  const sidebarLogoutButton = document.getElementById('logout-button');
  const logoutModal = document.getElementById('navbar-logout-modal');
  const logoutConfirmButton = document.getElementById(
    'navbar-logout-confirm',
  ) as HTMLButtonElement | null;
  const logoutCancelButton = document.getElementById('navbar-logout-cancel');

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
    if (logoutModal) {
      logoutModal.hidden = true;
    }
  };

  const openLogoutModal = () => {
    if (logoutModal) {
      logoutModal.hidden = false;
    }
  };

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

  if (!logoutButton || !logoutModal || !logoutConfirmButton || !logoutCancelButton) {
    return {
      closeMenu,
      closeLogoutModal,
    };
  }

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

  return {
    closeMenu,
    closeLogoutModal,
  };
}
