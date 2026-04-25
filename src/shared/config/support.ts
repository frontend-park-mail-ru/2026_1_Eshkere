function resolveSupportIframeBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://support.localhost:8080';
  }

  const { protocol, hostname, origin, port } = window.location;

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return origin;
  }

  const supportHost = `support.${hostname}`;
  const includePort = port && port !== '80' && port !== '443';
  const portPart = includePort ? `:${port}` : '';

  return `${protocol}//${supportHost}${portPart}`;
}

export const SUPPORT_IFRAME_BASE_URL = resolveSupportIframeBaseUrl();
export const SUPPORT_IFRAME_PATH = '/support-iframe';
