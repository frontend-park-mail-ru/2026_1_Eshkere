import '../../ad-create/ui/ad-create.scss';
import { getAdsInGroup, updateAdInGroup } from 'features/ads/api/ads';
import { renderTemplate } from 'shared/lib/render';
import { navigateTo } from 'shared/lib/navigation';
import adEditTemplate from './ad-edit.hbs';

function getParams(): { campaignId: number | null; groupId: number | null; adId: number | null } {
  const params = new URLSearchParams(window.location.search);
  const cId = parseInt(params.get('campaignId') ?? '', 10);
  const gId = parseInt(params.get('groupId') ?? '', 10);
  const aId = parseInt(params.get('adId') ?? '', 10);
  return {
    campaignId: Number.isFinite(cId) ? cId : null,
    groupId: Number.isFinite(gId) ? gId : null,
    adId: Number.isFinite(aId) ? aId : null,
  };
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url || 'example.com'; }
}

export async function renderAdEditPage(): Promise<string> {
  const { campaignId, groupId, adId } = getParams();
  if (!campaignId || !groupId || !adId) {
    return '<div style="padding:40px;text-align:center;color:var(--text-soft)">Объявление не найдено</div>';
  }

  const result = await getAdsInGroup(campaignId, groupId).catch(() => null);
  const ad = result?.ads.find((a) => a.id === adId);
  if (!ad) {
    return '<div style="padding:40px;text-align:center;color:var(--text-soft)">Объявление не найдено</div>';
  }

  return renderTemplate(adEditTemplate, {
    title: ad.title,
    short_desc: ad.short_desc,
    target_url: ad.target_url,
    currentImageUrl: ad.image_url || null,
  });
}

export function AdEdit(): VoidFunction {
  const { campaignId, groupId, adId } = getParams();
  const rootEl = document.querySelector<HTMLElement>('[data-ade]');
  if (!rootEl || !campaignId || !groupId || !adId) return () => {};
  const root: HTMLElement = rootEl;

  const controller = new AbortController();
  const { signal } = controller;

  let selectedFile: File | null = null;

  root.querySelector<HTMLElement>('[data-ade-back]')?.addEventListener('click', () => {
    navigateTo(`/ads/campaign?id=${campaignId}`);
  }, { signal });

  const previewTitle = root.querySelector<HTMLElement>('[data-ade-preview-title]');
  const previewDesc = root.querySelector<HTMLElement>('[data-ade-preview-desc]');
  const previewDomain = root.querySelector<HTMLElement>('[data-ade-preview-domain]');
  const previewImg = root.querySelector<HTMLElement>('[data-ade-preview-image]');

  function updatePreview(): void {
    const titleInput = root.querySelector<HTMLInputElement>('[name="title"]');
    const descInput = root.querySelector<HTMLTextAreaElement>('[name="short_desc"]');
    const urlInput = root.querySelector<HTMLInputElement>('[name="target_url"]');
    if (previewTitle) previewTitle.textContent = titleInput?.value.trim() || 'Заголовок объявления';
    if (previewDesc) previewDesc.textContent = descInput?.value.trim() || 'Описание объявления.';
    if (previewDomain) previewDomain.textContent = extractDomain(urlInput?.value.trim() || '');
  }

  (['title', 'short_desc'] as const).forEach((fieldName) => {
    const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${fieldName}"]`);
    if (!input) return;
    const counter = root.querySelector<HTMLElement>(`[data-ade-counter="${fieldName}"]`);
    const max = parseInt(input.getAttribute('maxlength') ?? '0', 10);
    if (counter) counter.textContent = `${input.value.length}/${max}`;
    input.addEventListener('input', () => {
      if (counter) counter.textContent = `${input.value.length}/${max}`;
      updatePreview();
    }, { signal });
  });

  root.querySelector<HTMLInputElement>('[name="target_url"]')?.addEventListener('input', updatePreview, { signal });

  const uploadZone = root.querySelector<HTMLElement>('[data-ade-upload-zone]');
  const fileInput = root.querySelector<HTMLInputElement>('[data-ade-file-input]');
  const uploadPlaceholder = root.querySelector<HTMLElement>('[data-ade-upload-placeholder]');
  const uploadPreview = root.querySelector<HTMLElement>('[data-ade-upload-preview]');
  const uploadImg = root.querySelector<HTMLImageElement>('[data-ade-upload-img]');
  const uploadFilename = root.querySelector<HTMLElement>('[data-ade-upload-filename]');

  function showFile(file: File): void {
    selectedFile = file;
    const url = URL.createObjectURL(file);
    if (uploadPlaceholder) uploadPlaceholder.hidden = true;
    if (uploadPreview) uploadPreview.hidden = false;
    if (uploadImg) uploadImg.src = url;
    if (uploadFilename) uploadFilename.textContent = file.name;

    if (previewImg) {
      const existing = previewImg.querySelector('img');
      if (existing) {
        existing.src = url;
      } else {
        previewImg.innerHTML = '';
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        previewImg.appendChild(img);
      }
    }
  }

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) showFile(file);
  }, { signal });

  root.querySelector<HTMLButtonElement>('[data-ade-upload-remove]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    if (uploadPlaceholder) uploadPlaceholder.hidden = false;
    if (uploadPreview) uploadPreview.hidden = true;
  }, { signal });

  uploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('is-dragover'); }, { signal });
  uploadZone?.addEventListener('dragleave', () => { uploadZone.classList.remove('is-dragover'); }, { signal });
  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('is-dragover');
    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) showFile(file);
  }, { signal });

  const form = root.querySelector<HTMLFormElement>('[data-ade-form]');
  const submitBtn = root.querySelector<HTMLButtonElement>('[data-ade-submit]');
  const formError = root.querySelector<HTMLElement>('[data-ade-form-error]');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const title = (data.get('title') as string).trim();
    const short_desc = (data.get('short_desc') as string).trim();
    const target_url = (data.get('target_url') as string).trim();

    const errors: Record<string, string> = {};
    if (!title) errors['title'] = 'Введите заголовок';
    if (!short_desc) errors['short_desc'] = 'Введите описание';
    if (!target_url) errors['target_url'] = 'Введите ссылку';

    root.querySelectorAll<HTMLElement>('[data-ade-error]').forEach((el) => {
      el.textContent = errors[el.dataset.adeError ?? ''] ?? '';
    });

    if (Object.keys(errors).length > 0) return;

    if (submitBtn) submitBtn.disabled = true;
    if (formError) formError.hidden = true;

    try {
      await updateAdInGroup(campaignId, groupId, adId, { title, short_desc, target_url }, selectedFile ?? undefined);
      navigateTo(`/ads/campaign?id=${campaignId}`);
    } catch {
      if (formError) {
        formError.textContent = 'Не удалось сохранить изменения. Попробуйте ещё раз.';
        formError.hidden = false;
      }
      if (submitBtn) submitBtn.disabled = false;
    }
  }, { signal });

  return () => controller.abort();
}
