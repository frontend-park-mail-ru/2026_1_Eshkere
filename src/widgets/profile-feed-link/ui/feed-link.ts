import { getAds } from 'features/ads';
import { generateFeedLink } from 'features/feed-link/api/generate';
import { showProfileFeedback } from 'shared/lib/toast';

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
  const campaignSelect = section.querySelector<HTMLSelectElement>('[data-feed-link-campaign]');
  const noCampaignsMsg = section.querySelector<HTMLElement>('[data-feed-link-no-campaigns]');

  function showError(message: string): void {
    if (!errorArea) return;
    errorArea.textContent = message;
    errorArea.hidden = false;
  }

  function clearError(): void {
    if (!errorArea) return;
    errorArea.textContent = '';
    errorArea.hidden = true;
  }

  function showUrl(fullUrl: string): void {
    if (!resultArea || !urlInput) return;
    urlInput.value = fullUrl;
    resultArea.hidden = false;
    if (generateBtn) {
      generateBtn.textContent = 'Перегенерировать ссылку';
    }
  }

  // Загружаем кампании и заполняем select
  getAds().then((result) => {
    if (result.error || result.ads.length === 0) {
      if (noCampaignsMsg) noCampaignsMsg.hidden = false;
      if (generateBtn) generateBtn.disabled = true;
      if (campaignSelect) campaignSelect.hidden = true;
      return;
    }

    if (campaignSelect) {
      campaignSelect.innerHTML = '';
      result.ads.forEach((ad) => {
        if (!ad.id) return;
        const option = document.createElement('option');
        option.value = String(ad.id);
        option.textContent = ad.title || `Кампания #${ad.id}`;
        campaignSelect.appendChild(option);
      });
      campaignSelect.hidden = false;
    }

    if (noCampaignsMsg) noCampaignsMsg.hidden = true;
    if (generateBtn) generateBtn.disabled = false;
  });

  generateBtn?.addEventListener(
    'click',
    async () => {
      clearError();

      const campaignID = campaignSelect ? Number(campaignSelect.value) : 0;
      if (!campaignID) {
        showError('Выберите рекламную кампанию');
        return;
      }

      if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Генерация…';
      }

      try {
        const { url } = await generateFeedLink(campaignID);
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
      if (!url) return;

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
        if (copiedTimer) window.clearTimeout(copiedTimer);
        copiedTimer = window.setTimeout(() => {
          if (copiedLabel) copiedLabel.hidden = true;
          copiedTimer = null;
        }, 2000);
      }
    },
    { signal },
  );
}
