export interface ToastPayload {
  title: string;
  description: string;
  tone?: 'success' | 'warning';
}

let feedbackTimer: number | null = null;

export function showProfileFeedback({
  title,
  description,
  tone = 'success',
}: ToastPayload): void {
  const toast = document.querySelector<HTMLElement>('[data-profile-toast]');
  const titleNode = document.querySelector<HTMLElement>('[data-profile-toast-title]');
  const textNode = document.querySelector<HTMLElement>('[data-profile-toast-text]');
  if (!toast || !titleNode || !textNode) {
    return;
  }

  toast.classList.toggle('profile-toast--success', tone === 'success');
  toast.classList.toggle('profile-toast--warning', tone === 'warning');
  titleNode.textContent = title;
  textNode.textContent = description;
  toast.hidden = false;

  if (feedbackTimer) {
    window.clearTimeout(feedbackTimer);
  }

  feedbackTimer = window.setTimeout(() => {
    hideProfileFeedback();
  }, 3500);
}

export function hideProfileFeedback(): void {
  const toast = document.querySelector<HTMLElement>('[data-profile-toast]');
  const titleNode = document.querySelector<HTMLElement>('[data-profile-toast-title]');
  const textNode = document.querySelector<HTMLElement>('[data-profile-toast-text]');

  if (feedbackTimer) {
    window.clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }

  if (toast) {
    toast.hidden = true;
  }
  if (titleNode) {
    titleNode.textContent = '';
  }
  if (textNode) {
    textNode.textContent = '';
  }
}
