import { formatPrice } from 'shared/lib/format';
import type { ProfileState } from 'features/profile/model/types';

interface SyncProfileViewParams {
  getAccountActionText: (status: ProfileState['accountStatus']) => string;
  getAccountStatusLabel: (status: ProfileState['accountStatus']) => string;
  getInitials: (firstName: string, lastName: string) => string;
  getTariffMeta: (
    tariffKey: ProfileState['tariffKey'],
  ) => { description: string; label: string };
  state: ProfileState;
}

function updateTextContent(selector: string, value: string): void {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function updateTextContentAll(selector: string, value: string): void {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function syncNavbarIdentity(state: ProfileState, fullName: string): void {
  const navbarAvatar = state.avatar || '/img/avatar-placeholder.png';
  const navbarName = fullName || state.email || 'Профиль';

  document
    .querySelectorAll<HTMLImageElement>('.navbar__avatar, .navbar__profile-menu-avatar')
    .forEach((node) => {
      node.src = navbarAvatar;
      node.alt = navbarName;
      node.onerror = () => {
        node.onerror = null;
        node.src = '/img/avatar-placeholder.png';
      };
    });

  document
    .querySelectorAll<HTMLElement>('.navbar__profile-menu-name')
    .forEach((node) => {
      node.textContent = navbarName;
    });
}

function syncAvatarView({
  getInitials,
  state,
}: Pick<SyncProfileViewParams, 'getInitials' | 'state'>): void {
  const hasAvatar = Boolean(state.avatar);
  const avatarImage = document.querySelector<HTMLImageElement>(
    '[data-profile-avatar-image]',
  );
  const avatarInitials = document.querySelector<HTMLElement>(
    '[data-profile-avatar-initials]',
  );
  const avatarButton = document.querySelector<HTMLElement>(
    '[data-profile-avatar-button]',
  );

  if (avatarImage) {
    avatarImage.onerror = null;
    if (hasAvatar) {
      avatarImage.src = state.avatar;
      avatarImage.hidden = false;
      avatarImage.onerror = () => {
        avatarImage.onerror = null;
        avatarImage.hidden = true;
        if (avatarInitials) {
          avatarInitials.hidden = false;
        }
        avatarButton?.classList.remove('profile-hero__avatar--image');
      };
    } else {
      avatarImage.src = '';
      avatarImage.hidden = true;
    }
  }

  if (avatarInitials) {
    avatarInitials.hidden = hasAvatar;
    avatarInitials.textContent = getInitials(state.firstName, state.lastName);
  }

  avatarButton?.classList.toggle('profile-hero__avatar--image', hasAvatar);
}

export function syncProfileView({
  getAccountActionText,
  getAccountStatusLabel,
  getInitials,
  getTariffMeta,
  state,
}: SyncProfileViewParams): void {
  const tariff = getTariffMeta(state.tariffKey);
  const fullName = `${state.firstName} ${state.lastName}`.trim() || 'Новый профиль';
  const accountStatusLabel = getAccountStatusLabel(state.accountStatus);

  updateTextContent('[data-profile-full-name]', fullName);
  updateTextContent('[data-profile-balance]', formatPrice(state.balanceValue));
  updateTextContent('.navbar__balance', formatPrice(state.balanceValue));
  updateTextContent('[data-profile-tariff]', tariff.label);
  updateTextContent('[data-profile-tariff-description]', tariff.description);
  updateTextContent('[data-profile-campaigns]', String(state.activeCampaigns));
  updateTextContent('[data-profile-last-action]', state.lastAction);
  updateTextContent('[data-profile-card]', state.cardMasked);
  updateTextContent('[data-profile-last-top-up]', state.lastTopUp);
  updateTextContent('[data-profile-password-status]', state.passwordStatus);
  updateTextContentAll('[data-profile-account-status]', accountStatusLabel);
  syncNavbarIdentity(state, fullName);

  document
    .querySelectorAll<HTMLElement>('[data-profile-account-badge]')
    .forEach((badge) => {
      badge.classList.toggle(
        'profile-hero__badge--success',
        state.accountStatus === 'verified',
      );
      badge.classList.toggle(
        'profile-hero__badge--warning',
        state.accountStatus !== 'verified',
      );
    });

  document
    .querySelectorAll<HTMLElement>(
      '.profile-security__status[data-profile-account-status]',
    )
    .forEach((node) => {
      node.classList.toggle(
        'profile-security__status--warning',
        state.accountStatus !== 'verified',
      );
    });

  const accountActionText = getAccountActionText(state.accountStatus);
  document
    .querySelectorAll<HTMLElement>('[data-profile-confirmation-button-label]')
    .forEach((node) => {
      node.textContent = accountActionText;
    });

  document.querySelectorAll<HTMLElement>('[data-profile-field]').forEach((field) => {
    const key = field.dataset.profileField;
    if (!key) {
      return;
    }

    const valueNode = field.matches('[data-profile-field-value]')
      ? field
      : field.querySelector<HTMLElement>('[data-profile-field-value]');
    const nextValue = state[key as keyof ProfileState];

    if (valueNode && typeof nextValue === 'string') {
      valueNode.textContent = nextValue;
    }
  });

  syncAvatarView({ getInitials, state });
}
