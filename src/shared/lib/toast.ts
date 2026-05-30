import './toast.scss';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastPayload {
  title: string;
  description?: string;
  tone?: ToastType;
}

const DOT_COLORS: Record<ToastType, string> = {
  success: '#66d07d',
  error:   '#ff6b6b',
  warning: '#ffc46a',
};

function getContainer(): HTMLElement {
  let container = document.getElementById('app-toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toasts';
    container.className = 'app-toasts';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(
  title: string,
  text: string,
  type: ToastType = 'success',
  duration = 4000,
): void {
  const container = getContainer();

  // Если уже есть тост с таким же заголовком — встряхнуть и не дублировать
  const existing = Array.from(container.querySelectorAll<HTMLElement>('.app-toast')).find(
    (el) => el.querySelector('.app-toast__title')?.textContent === title,
  );
  if (existing) {
    existing.classList.remove('app-toast--pulse');
    void existing.offsetWidth;
    existing.classList.add('app-toast--pulse');
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'app-toast';
  toast.style.setProperty('--toast-duration', `${duration}ms`);
  toast.innerHTML = `
    <span class="app-toast__dot"></span>
    <div class="app-toast__copy">
      <span class="app-toast__title"></span>
      <p class="app-toast__text"></p>
    </div>
    <span class="app-toast__progress" aria-hidden="true"></span>
    <button class="app-toast__close" type="button" aria-label="Закрыть">&#215;</button>
  `;

  (toast.querySelector<HTMLElement>('.app-toast__dot')!).style.background = DOT_COLORS[type];
  toast.querySelector<HTMLElement>('.app-toast__title')!.textContent = title;
  toast.querySelector<HTMLElement>('.app-toast__text')!.textContent  = text;

  const close = toast.querySelector<HTMLButtonElement>('.app-toast__close')!;
  let closed = false;
  const remove = (): void => {
    if (closed) {
      return;
    }

    closed = true;
    toast.classList.add('app-toast--out');
    window.setTimeout(() => {
      toast.remove();
    }, 180);
  };
  const timer = duration > 0 ? window.setTimeout(remove, duration) : 0;
  close.addEventListener('click', () => { clearTimeout(timer); remove(); }, { once: true });

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('app-toast--visible');
  });
}

let currentProfileToast: HTMLElement | null = null;

export function showProfileFeedback(payload: ToastPayload): void {
  if (currentProfileToast) {
    currentProfileToast.remove();
    currentProfileToast = null;
  }
  showToast(payload.title, payload.description ?? '', payload.tone ?? 'success');
  const container = getContainer();
  currentProfileToast = container.lastElementChild as HTMLElement | null;
}

export function hideProfileFeedback(): void {
  if (currentProfileToast) {
    currentProfileToast.remove();
    currentProfileToast = null;
  }
}
