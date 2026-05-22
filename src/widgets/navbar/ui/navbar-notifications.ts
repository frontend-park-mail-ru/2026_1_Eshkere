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

  // ── Notification settings ──────────────────────────────────────────────────
  const settingsModal = document.getElementById('navbar-notifications-settings');
  const settingsOpenBtn = document.getElementById('navbar-notifications-settings-open');
  const settingsCloseBtn = document.getElementById('navbar-notifications-settings-close');

  const NOTIF_SETTINGS_KEY = 'notification_settings';

  function loadSettings(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(NOTIF_SETTINGS_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : { inapp: true };
    } catch {
      return { inapp: true };
    }
  }

  function saveSettings(settings: Record<string, boolean>): void {
    try {
      localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  function syncSettingsToggles(): void {
    if (!settingsModal) return;
    const settings = loadSettings();
    settingsModal
      .querySelectorAll<HTMLInputElement>('[data-notif-channel]')
      .forEach((input) => {
        const channel = input.dataset.notifChannel ?? '';
        if (!input.disabled) {
          input.checked = settings[channel] ?? false;
        }
      });
  }

  const syncThresholdDisplays = (): void => {
    if (!settingsModal) return;
    const thresholds = loadThresholds();
    settingsModal
      .querySelectorAll<HTMLElement>('[data-threshold-display]')
      .forEach((el) => {
        const key = el.dataset.thresholdDisplay ?? '';
        if (thresholds[key] !== undefined) {
          el.textContent = thresholds[key].toLocaleString('ru-RU');
        }
      });
  };

  const openSettingsModal = (): void => {
    if (!settingsModal) return;
    closeNotifications();
    syncSettingsToggles();
    syncThresholdDisplays();
    settingsModal.hidden = false;
    if (settingsModal.parentElement !== document.body) {
      document.body.appendChild(settingsModal);
    }
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
    ?.querySelectorAll<HTMLInputElement>('[data-notif-channel]')
    .forEach((input) => {
      input.addEventListener('change', () => {
        if (input.disabled) return;
        const settings = loadSettings();
        settings[input.dataset.notifChannel ?? ''] = input.checked;
        saveSettings(settings);
      }, { signal });
    });

  // ── Threshold editing ──────────────────────────────────────────────────────
  const THRESHOLD_KEY = 'notification_thresholds';

  function loadThresholds(): Record<string, number> {
    try {
      const raw = localStorage.getItem(THRESHOLD_KEY);
      return raw
        ? (JSON.parse(raw) as Record<string, number>)
        : { warning: 500, critical: 100 };
    } catch {
      return { warning: 500, critical: 100 };
    }
  }

  function saveThresholds(thresholds: Record<string, number>): void {
    try {
      localStorage.setItem(THRESHOLD_KEY, JSON.stringify(thresholds));
    } catch {
      // ignore
    }
  }



  // ── Threshold inline edit ──────────────────────────────────────────────────
  const showThresholdError = (card: HTMLElement, message: string): void => {
    const existing = card.querySelector('.navbar__notif-threshold-error');
    if (existing) existing.remove();
    const err = document.createElement('span');
    err.className = 'navbar__notif-threshold-error';
    err.textContent = message;
    card.appendChild(err);
    setTimeout(() => err.remove(), 2500);
  };

  const commitThreshold = (key: string, input: HTMLInputElement, display: HTMLElement): void => {
    const raw = input.value.replace(/\D/g, '');
    const value = Math.max(0, Math.min(999999, Number(raw) || 0));
    const thresholds = loadThresholds();
    const card = input.closest<HTMLElement>('.navbar__notif-threshold');

    if (key === 'warning' && value <= thresholds.critical) {
      if (card) showThresholdError(card, `Должно быть > ${thresholds.critical.toLocaleString('ru-RU')} ₽`);
      input.focus();
      input.select();
      return;
    }

    if (key === 'critical' && value >= thresholds.warning) {
      if (card) showThresholdError(card, `Должно быть < ${thresholds.warning.toLocaleString('ru-RU')} ₽`);
      input.focus();
      input.select();
      return;
    }

    thresholds[key] = value;
    saveThresholds(thresholds);
    display.textContent = value.toLocaleString('ru-RU');
    input.hidden = true;
    display.hidden = false;
    card?.classList.remove('is-editing');
  };

  settingsModal
    ?.querySelectorAll<HTMLElement>('[data-threshold-key]')
    .forEach((card) => {
      const key = card.dataset.thresholdKey ?? '';
      const display = card.querySelector<HTMLElement>(`[data-threshold-display="${key}"]`);
      const input = card.querySelector<HTMLInputElement>(`[data-threshold-input="${key}"]`);
      if (!display || !input) return;

      card.addEventListener('click', (e) => {
        if (e.target === input) return;
        if (!input.hidden) return; // уже в режиме редактирования
        const thresholds = loadThresholds();
        input.value = String(thresholds[key] ?? 0);
        display.hidden = true;
        input.hidden = false;
        card.classList.add('is-editing');
        input.focus();
        input.select();
      }, { signal });

      input.addEventListener('keydown', (e) => {
        if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'].includes(e.key)) {
          e.preventDefault();
        }
        if (e.key === 'Enter') { e.preventDefault(); commitThreshold(key, input, display); }
        if (e.key === 'Escape') {
          input.hidden = true;
          display.hidden = false;
          card.classList.remove('is-editing');
        }
      }, { signal });

      input.addEventListener('blur', () => {
        if (!input.hidden) commitThreshold(key, input, display);
      }, { signal });
    });


  syncNotificationsState();

  return {
    closeNotifications,
    closeNotificationsModal,
  };
}
