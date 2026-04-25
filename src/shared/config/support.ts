function resolveSupportIframeBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8080';
  }

  return window.location.origin;
}

export const SUPPORT_IFRAME_BASE_URL = resolveSupportIframeBaseUrl();
export const SUPPORT_IFRAME_PATH = '/support-iframe';
