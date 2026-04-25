import './support-fab.scss';
import { authState } from 'features/auth';
import { renderElement } from 'shared/lib/render';
import {
  SUPPORT_IFRAME_BASE_URL,
  SUPPORT_IFRAME_PATH,
} from 'shared/config/support';
import supportFabTemplate from './support-fab.hbs';

const ROOT_ID = 'support-fab-widget';

function renderSupportFab(): HTMLElement {
  const iframeSrc = `${SUPPORT_IFRAME_BASE_URL}${SUPPORT_IFRAME_PATH}`;
  return renderElement(supportFabTemplate, { rootId: ROOT_ID, iframeSrc });
}

function bindSupportFabEvents(root: HTMLElement): void {
  const toggleButton = root.querySelector<HTMLButtonElement>('[data-support-fab-toggle]');
  const panel = root.querySelector<HTMLElement>('[data-support-fab-panel]');
  const iframe = root.querySelector<HTMLIFrameElement>('iframe');

  if (!toggleButton || !panel || !iframe) {
    return;
  }

  panel.hidden = false;

  const postAuthState = (): void => {
    if (!iframe.contentWindow) {
      return;
    }

    const user = authState.getCurrentUser();
    const isAuthenticated =
      authState.isAuthenticated() || Boolean(user);
    const origin = new URL(iframe.src, window.location.origin).origin;

    iframe.contentWindow.postMessage(
      {
        type: 'support:auth-state',
        isAuthenticated,
        userName: user?.name || '',
        userEmail: user?.email || '',
      },
      origin,
    );
  };

  const setOpened = (opened: boolean): void => {
    root.classList.toggle('support-fab--open', opened);
    if (opened) {
      postAuthState();
    }
  };

  setOpened(false);
  iframe.addEventListener('load', postAuthState);

  toggleButton.addEventListener('click', () => {
    setOpened(!root.classList.contains('support-fab--open'));
  });

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpened(false);
    }
  });
}

export function initSupportFab(): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (window.location.pathname === SUPPORT_IFRAME_PATH) {
    return;
  }

  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const root = renderSupportFab();
  document.body.appendChild(root);
  bindSupportFabEvents(root);
}
