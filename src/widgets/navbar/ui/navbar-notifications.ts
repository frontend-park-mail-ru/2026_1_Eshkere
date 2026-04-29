export function initNavbarNotifications(signal: AbortSignal, closeProfileMenu: () => void): {
  closeNotifications: () => void;
  closeNotificationsModal: () => void;
} {
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

  syncNotificationsState();

  return {
    closeNotifications,
    closeNotificationsModal,
  };
}
