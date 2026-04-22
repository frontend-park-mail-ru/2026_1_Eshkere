import type { ToastPayload } from '../model/types';

let builderToastTimer: number | null = null;

export function showToast({ title, description }: ToastPayload): void {
  const toast = document.querySelector<HTMLElement>('[data-builder-toast]');
  const titleNode = document.querySelector<HTMLElement>('[data-builder-toast-title]');
  const textNode = document.querySelector<HTMLElement>('[data-builder-toast-text]');

  if (!toast || !titleNode || !textNode) {
    return;
  }

  titleNode.textContent = title;
  textNode.textContent = description;
  toast.hidden = false;

  if (builderToastTimer) {
    window.clearTimeout(builderToastTimer);
  }

  builderToastTimer = window.setTimeout(() => {
    toast.hidden = true;
    builderToastTimer = null;
  }, 3200);
}

export function hideToast(): void {
  const toast = document.querySelector<HTMLElement>('[data-builder-toast]');

  if (toast) {
    toast.hidden = true;
  }

  if (builderToastTimer) {
    window.clearTimeout(builderToastTimer);
    builderToastTimer = null;
  }
}

export function clearToastTimer(): void {
  if (builderToastTimer) {
    window.clearTimeout(builderToastTimer);
    builderToastTimer = null;
  }
}
