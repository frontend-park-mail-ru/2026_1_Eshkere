import {
  getNotificationSettings,
  updateNotificationSettings,
} from 'features/balance/api/notification-settings';

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
  const settingsErrorNode = document.createElement('p');
  settingsErrorNode.className = 'navbar__notif-section-sub';
  settingsErrorNode.dataset.notifSettingsError = 'true';
  settingsErrorNode.style.color = 'var(--color-danger-500, #ff4d4f)';
  settingsErrorNode.hidden = true;
  settingsModal?.querySelector('.navbar__notifications-settings-body')?.prepend(settingsErrorNode);

  let notificationSettings = {
    email_enabled: false,
    warning_threshold: 500,
    critical_threshold: 100,
  };

  function parseThreshold(value: string): number {
    const digits = value.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  }

  function setSettingsError(message: string): void {
    settingsErrorNode.textContent = message;
    settingsErrorNode.hidden = !message;
  }

  function syncSettingsInputs(): void {
    if (!settingsModal) return;

    settingsModal
      .querySelectorAll<HTMLInputElement>('[data-notif-channel]')
      .forEach((input) => {
        const channel = input.dataset.notifChannel ?? '';
        if (channel === 'inapp') {
          input.checked = true;
          input.disabled = true;
          return;
        }

        if (channel === 'email') {
          input.checked = notificationSettings.email_enabled;
        }
      });

    settingsModal
      .querySelectorAll<HTMLElement>('[data-threshold-key]')
      .forEach((card) => {
        card.hidden = false;
      });

    const warningInput = settingsModal.querySelector<HTMLInputElement>(
      '[data-threshold-input="warning"]',
    );
    const criticalInput = settingsModal.querySelector<HTMLInputElement>(
      '[data-threshold-input="critical"]',
    );
    const warningDisplay = settingsModal.querySelector<HTMLElement>(
      '[data-threshold-display="warning"]',
    );
    const criticalDisplay = settingsModal.querySelector<HTMLElement>(
      '[data-threshold-display="critical"]',
    );

    if (warningInput) {
      warningInput.hidden = false;
      warningInput.value = String(notificationSettings.warning_threshold);
    }
    if (criticalInput) {
      criticalInput.hidden = false;
      criticalInput.value = String(notificationSettings.critical_threshold);
    }
    if (warningDisplay) {
      warningDisplay.textContent = String(notificationSettings.warning_threshold);
    }
    if (criticalDisplay) {
      criticalDisplay.textContent = String(notificationSettings.critical_threshold);
    }
  }

  async function persistNotificationSettings(nextSettings: {
    email_enabled: boolean;
    warning_threshold: number;
    critical_threshold: number;
  }): Promise<void> {
    if (nextSettings.warning_threshold <= nextSettings.critical_threshold) {
      setSettingsError('Порог предупреждения должен быть больше критического.');
      syncSettingsInputs();
      return;
    }

    try {
      notificationSettings = await updateNotificationSettings(nextSettings);
      setSettingsError('');
      syncSettingsInputs();
    } catch {
      setSettingsError('Не удалось сохранить настройки уведомлений. Попробуйте позже.');
      syncSettingsInputs();
    }
  }

  const openSettingsModal = (): void => {
    if (!settingsModal) return;
    closeNotifications();
    setSettingsError('');
    settingsModal.hidden = false;
    if (settingsModal.parentElement !== document.body) {
      document.body.appendChild(settingsModal);
    }

    void getNotificationSettings()
      .then((settings) => {
        notificationSettings = settings;
        syncSettingsInputs();
      })
      .catch(() => {
        setSettingsError('Не удалось загрузить настройки уведомлений.');
        syncSettingsInputs();
      });
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
        const channel = input.dataset.notifChannel ?? '';
        if (channel !== 'email') {
          return;
        }

        void persistNotificationSettings({
          ...notificationSettings,
          email_enabled: input.checked,
        });
      }, { signal });
    });

  settingsModal
    ?.querySelectorAll<HTMLInputElement>('[data-threshold-input]')
    .forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.thresholdInput;
        const value = parseThreshold(input.value);
        input.value = String(value || '');

        if (key === 'warning') {
          notificationSettings = {
            ...notificationSettings,
            warning_threshold: value,
          };
          const warningDisplay = settingsModal?.querySelector<HTMLElement>(
            '[data-threshold-display="warning"]',
          );
          if (warningDisplay) {
            warningDisplay.textContent = String(value || 0);
          }
        }

        if (key === 'critical') {
          notificationSettings = {
            ...notificationSettings,
            critical_threshold: value,
          };
          const criticalDisplay = settingsModal?.querySelector<HTMLElement>(
            '[data-threshold-display="critical"]',
          );
          if (criticalDisplay) {
            criticalDisplay.textContent = String(value || 0);
          }
        }
      }, { signal });

      input.addEventListener('change', () => {
        const warning = parseThreshold(
          (
            settingsModal?.querySelector<HTMLInputElement>(
              '[data-threshold-input="warning"]',
            )?.value ?? ''
          ),
        );
        const critical = parseThreshold(
          (
            settingsModal?.querySelector<HTMLInputElement>(
              '[data-threshold-input="critical"]',
            )?.value ?? ''
          ),
        );

        void persistNotificationSettings({
          ...notificationSettings,
          warning_threshold: warning,
          critical_threshold: critical,
        });
      }, { signal });
    });

  syncSettingsInputs();

  syncNotificationsState();

  return {
    closeNotifications,
    closeNotificationsModal,
  };
}
