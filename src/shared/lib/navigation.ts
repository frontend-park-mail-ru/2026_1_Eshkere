let navigationInitialized = false;

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function normalizeNavigationTarget(target: string): string {
  const url = new URL(target, window.location.origin);
  const normalizedPathname = normalizePath(url.pathname);
  return `${normalizedPathname}${url.search}${url.hash}`;
}

export function getCurrentPath(): string {
  return normalizePath(window.location.pathname);
}

function dispatchLocationChange(): void {
  window.dispatchEvent(new Event('locationchange'));
}

function patchHistoryMethods(): void {
  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = function (...args): void {
    originalPushState(...args);
    dispatchLocationChange();
  };

  window.history.replaceState = function (...args): void {
    originalReplaceState(...args);
    dispatchLocationChange();
  };
}

function shouldHandleAnchorClick(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute('href');

  if (!href || href.startsWith('#')) {
    return false;
  }

  if (anchor.target && anchor.target !== '_self') {
    return false;
  }

  if (anchor.hasAttribute('download')) {
    return false;
  }

  const url = new URL(anchor.href, window.location.origin);
  return url.origin === window.location.origin;
}

export function initNavigation(onLocationChange: () => void): void {
  if (navigationInitialized) {
    return;
  }

  navigationInitialized = true;

  if (window.location.hash.startsWith('#/')) {
    window.history.replaceState({}, '', window.location.hash.slice(1));
  }

  patchHistoryMethods();

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) {
      return;
    }

    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest('a');
    if (!(anchor instanceof HTMLAnchorElement)) {
      return;
    }

    if (!shouldHandleAnchorClick(anchor)) {
      return;
    }

    const url = new URL(anchor.href, window.location.origin);
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl =
      `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl === currentUrl) {
      return;
    }

    event.preventDefault();
    window.history.pushState({}, '', nextUrl);
  });

  window.addEventListener('popstate', dispatchLocationChange);
  window.addEventListener('locationchange', onLocationChange);
}

export function navigateTo(path: string, options?: { replace?: boolean }): void {
  const normalizedPath = normalizeNavigationTarget(path);
  const currentUrl = normalizeNavigationTarget(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );

  if (normalizedPath === currentUrl) {
    return;
  }

  if (options?.replace) {
    window.history.replaceState({}, '', normalizedPath);
    return;
  }

  window.history.pushState({}, '', normalizedPath);
}
