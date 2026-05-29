import {
  getNotificationSettings,
  updateNotificationSettings,
} from 'features/ads/api/notification-settings';
import { markMotionUpdated, setupMotionEnhancements } from 'shared/lib/animations';

export function initNavbarNotifications(signal: AbortSignal, closeProfileMenu: () => void): {
  closeNotifications: () => void;
  closeNotificationsModal: () => void;
} {
  const notificationsToggleButton = document.getElementById(
    'navbar-notifications-toggle',
  );
  const notificationsMenu = document.getElementById('navbar-notifications-menu');
  const notificationsBadge = notificationsMenu?.querySelector<HTMLElement>(
    '.navbar__notifications-badge',
  );
  let lastVisibleNotifications = Number(
    notificationsBadge?.textContent?.trim() || '0',
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
  const notificationsAllButton = document.getElementById('navbar-notifications-all');
  const notificationsModal = document.getElementById('navbar-notifications-modal');
  const notificationsEmptyState = document.getElementById('navbar-notifications-empty');
  const notificationsModalCloseButton = document.getElementById(
    'navbar-notifications-close',
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

    closeProfileMenu();
    notificationsMenu.hidden = false;
    notificationsToggleButton.setAttribute('aria-expanded', 'true');
    setupMotionEnhancements(notificationsMenu);
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
    closeProfileMenu();
    notificationsModal.hidden = false;
    setupMotionEnhancements(notificationsModal);
  };

  const syncNotificationsState = () => {
    if (!notificationsMenu || !notificationsBadge) {
      return;
    }

    const visibleItems = notificationItems.filter(
      (item) => !item.classList.contains('is-hidden'),
    );
    notificationsBadge.textContent = String(visibleItems.length);
    if (visibleItems.length !== lastVisibleNotifications) {
      markMotionUpdated(notificationsBadge, 'motion-navbar-badge', 520);
      markMotionUpdated(notificationsToggleButton, 'motion-navbar-bell', 520);
      lastVisibleNotifications = visibleItems.length;
    }
    notificationsMenu.classList.toggle('is-empty', visibleItems.length === 0);
    notificationsModal?.classList.toggle('is-empty', visibleItems.length === 0);
    notificationsEmptyState?.toggleAttribute('hidden', visibleItems.length !== 0);
    if (visibleItems.length === 0) {
      markMotionUpdated(notificationsEmptyState, 'motion-empty-state', 420);
    }
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

  // ── Notification settings ──────────────────────────────────────────────────
  const settingsModal = document.getElementById('navbar-notifications-settings');
  const settingsOpenBtn = document.getElementById('navbar-notifications-settings-open');
  const settingsCloseBtn = document.getElementById('navbar-notifications-settings-close');

  let cachedEmailEnabled: boolean | null = null;

  function applyEmailEnabled(enabled: boolean): void {
    cachedEmailEnabled = enabled;
    if (!settingsModal) return;
    settingsModal.querySelectorAll<HTMLInputElement>('[data-notif-channel="email"]').forEach((input) => {
      if (!input.disabled) input.checked = enabled;
    });
  }

  const openSettingsModal = (): void => {
    if (!settingsModal) return;
    closeNotifications();
    settingsModal.hidden = false;
    if (settingsModal.parentElement !== document.body) {
      document.body.appendChild(settingsModal);
    }
    getNotificationSettings().then((s) => applyEmailEnabled(s.email_enabled)).catch(() => {});
  };

  const closeSettingsModal = (): void => {
    if (settingsModal) settingsModal.hidden = true;
  };

  settingsOpenBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openSettingsModal();
  }, { signal });

  settingsCloseBtn?.addEventListener('click', closeSettingsModal, { signal });

  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  }, { signal });

  settingsModal
    ?.querySelectorAll<HTMLInputElement>('[data-notif-channel="email"]')
    .forEach((input) => {
      input.addEventListener('change', () => {
        if (input.disabled) return;
        const newValue = input.checked;
        updateNotificationSettings({ email_enabled: newValue })
          .then((s) => applyEmailEnabled(s.email_enabled))
          .catch(() => {
            if (cachedEmailEnabled !== null) applyEmailEnabled(cachedEmailEnabled);
          });
      }, { signal });
    });

  // Threshold cards are hidden — thresholds are determined by the backend
  settingsModal
    ?.querySelectorAll<HTMLElement>('[data-threshold-key]')
    .forEach((card) => {
      card.hidden = true;
    });


  syncNotificationsState();

  return {
    closeNotifications,
    closeNotificationsModal,
  };
}
