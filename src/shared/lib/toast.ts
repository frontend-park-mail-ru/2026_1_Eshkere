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
    existing.classList.remove('app-toast--shake');
    void existing.offsetWidth; // reflow для перезапуска анимации
    existing.classList.add('app-toast--shake');
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'app-toast app-toast--in';
  toast.innerHTML = `
    <span class="app-toast__dot"></span>
    <div class="app-toast__copy">
      <span class="app-toast__title"></span>
      <p class="app-toast__text"></p>
    </div>
    <button class="app-toast__close" type="button" aria-label="Закрыть">&#215;</button>
  `;

  (toast.querySelector<HTMLElement>('.app-toast__dot')!).style.background = DOT_COLORS[type];
  toast.querySelector<HTMLElement>('.app-toast__title')!.textContent = title;
  toast.querySelector<HTMLElement>('.app-toast__text')!.textContent  = text;

  const close = toast.querySelector<HTMLButtonElement>('.app-toast__close')!;
  const remove = (): void => {
    toast.classList.remove('app-toast--in');
    toast.classList.add('app-toast--out');
    setTimeout(() => toast.remove(), 260);
  };
  const timer = setTimeout(remove, duration);
  close.addEventListener('click', () => { clearTimeout(timer); remove(); }, { once: true });

  container.appendChild(toast);
}

let currentProfileToast: HTMLElement | null = null;

export function showProfileFeedback(payload: ToastPayload): void {
  if (currentProfileToast) {
    currentProfileToast.classList.add('app-toast--out');
    setTimeout(() => currentProfileToast?.remove(), 260);
    currentProfileToast = null;
  }
  showToast(payload.title, payload.description ?? '', payload.tone ?? 'success');
  const container = getContainer();
  currentProfileToast = container.lastElementChild as HTMLElement | null;
}

export function hideProfileFeedback(): void {
  if (currentProfileToast) {
    currentProfileToast.classList.add('app-toast--out');
    setTimeout(() => {
      currentProfileToast?.remove();
      currentProfileToast = null;
    }, 260);
  }
}
