import { generateFeedLink } from 'features/feed-link/api/generate';
import { showProfileFeedback } from 'widgets/profile-feedback/ui/toast';

function resolveFullUrl(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }
  return `${window.location.origin}${path}`;
}

export function initProfileFeedLink(signal: AbortSignal): void {
  const section = document.querySelector<HTMLElement>('[data-feed-link-section]');
  if (!section) {
    return;
  }

  const generateBtn = section.querySelector<HTMLButtonElement>('[data-generate-feed-link]');
  const resultArea = section.querySelector<HTMLElement>('[data-feed-link-result]');
  const urlInput = section.querySelector<HTMLInputElement>('[data-feed-link-url]');
  const copyBtn = section.querySelector<HTMLButtonElement>('[data-feed-link-copy]');
  const copiedLabel = section.querySelector<HTMLElement>('[data-feed-link-copied]');
  const errorArea = section.querySelector<HTMLElement>('[data-feed-link-error]');

  function showError(message: string): void {
    if (!errorArea) {
      return;
    }
    errorArea.textContent = message;
    errorArea.hidden = false;
  }

  function clearError(): void {
    if (!errorArea) {
      return;
    }
    errorArea.textContent = '';
    errorArea.hidden = true;
  }

  function showUrl(path: string): void {
    if (!resultArea || !urlInput) {
      return;
    }
    urlInput.value = resolveFullUrl(path);
    resultArea.hidden = false;

    if (generateBtn) {
      generateBtn.textContent = 'Перегенерировать ссылку';
    }
  }

  generateBtn?.addEventListener(
    'click',
    async () => {
      clearError();

      if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Генерация…';
      }

      try {
        const { url } = await generateFeedLink();
        showUrl(url);
        showProfileFeedback({
          title: 'Ссылка сгенерирована',
          description: 'Скопируйте её и передайте партнёру для получения фида объявлений.',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось сгенерировать ссылку';
        showError(message);
        if (generateBtn) {
          generateBtn.textContent = 'Сгенерировать ссылку';
        }
      } finally {
        if (generateBtn) {
          generateBtn.disabled = false;
        }
      }
    },
    { signal },
  );

  let copiedTimer: number | null = null;

  copyBtn?.addEventListener(
    'click',
    async () => {
      const url = urlInput?.value;
      if (!url) {
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
      } catch {
        const tempInput = document.createElement('input');
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }

      if (copiedLabel) {
        copiedLabel.hidden = false;
        if (copiedTimer) {
          window.clearTimeout(copiedTimer);
        }
        copiedTimer = window.setTimeout(() => {
          if (copiedLabel) {
            copiedLabel.hidden = true;
          }
          copiedTimer = null;
        }, 2000);
      }
    },
    { signal },
  );
}
