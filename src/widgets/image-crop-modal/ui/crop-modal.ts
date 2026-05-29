import './crop-modal.scss';

export type ImageCropRatio = 'feed' | 'stories' | 'square';

interface CropConfig {
  canvasW: number;
  canvasH: number;
  outputW: number;
  outputH: number;
  label: string;
}

const CONFIGS: Record<ImageCropRatio, CropConfig> = {
  feed:    { canvasW: 380, canvasH: 199, outputW: 1200, outputH: 628,  label: 'Лента · 1200×628' },
  stories: { canvasW: 180, canvasH: 320, outputW: 1080, outputH: 1920, label: 'Stories · 1080×1920' },
  square:  { canvasW: 260, canvasH: 260, outputW: 400,  outputH: 400,  label: 'Квадрат · 400×400' },
};

export interface ImageCropResult {
  blob: Blob;
  dataUrl: string;
  file: File;
}

export function openImageCropModal(file: File, ratio: ImageCropRatio): Promise<ImageCropResult | null> {
  const cfg = CONFIGS[ratio];
  const { canvasW, canvasH, outputW, outputH } = cfg;

  return new Promise((resolve) => {
    document.getElementById('image-crop-modal')?.remove();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="img-crop-modal" id="image-crop-modal" aria-hidden="true">
        <div class="img-crop-modal__dialog" role="dialog" aria-modal="true" aria-label="Выбрать область изображения">
          <div class="img-crop-modal__header">
            <h3 class="img-crop-modal__title">Выберите область</h3>
            <p class="img-crop-modal__subtitle">${cfg.label} · перетащите и масштабируйте</p>
          </div>
          <div class="img-crop-modal__stage">
            <canvas class="img-crop-modal__canvas" data-crop-canvas width="${canvasW}" height="${canvasH}"></canvas>
          </div>
          <div class="img-crop-modal__zoom">
            <span class="img-crop-modal__zoom-icon" aria-hidden="true">−</span>
            <input class="img-crop-modal__zoom-slider" data-crop-zoom type="range" min="1" max="3" step="0.01" value="1" aria-label="Масштаб">
            <span class="img-crop-modal__zoom-icon" aria-hidden="true">+</span>
          </div>
          <div class="img-crop-modal__actions">
            <button class="img-crop-modal__btn img-crop-modal__btn--secondary" data-crop-cancel type="button">Отмена</button>
            <button class="img-crop-modal__btn img-crop-modal__btn--primary" data-crop-confirm type="button">Применить</button>
          </div>
        </div>
      </div>
    `.trim();

    const modal = wrapper.firstElementChild as HTMLElement;
    document.body.appendChild(modal);

    const canvas = modal.querySelector<HTMLCanvasElement>('[data-crop-canvas]')!;
    const zoomSlider = modal.querySelector<HTMLInputElement>('[data-crop-zoom]')!;
    const cancelBtn = modal.querySelector<HTMLButtonElement>('[data-crop-cancel]')!;
    const confirmBtn = modal.querySelector<HTMLButtonElement>('[data-crop-confirm]')!;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    let zoom = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartOffsetX = 0;
    let dragStartOffsetY = 0;

    function getDisplayScale(): number {
      return canvas.getBoundingClientRect().width / canvasW;
    }

    function baseScale(): number {
      return Math.max(canvasW / img.naturalWidth, canvasH / img.naturalHeight);
    }

    function clampOffset(ox: number, oy: number, z: number): [number, number] {
      const scale = baseScale() * z;
      const scaledW = img.naturalWidth * scale;
      const scaledH = img.naturalHeight * scale;
      const maxX = Math.max(0, (scaledW - canvasW) / 2);
      const maxY = Math.max(0, (scaledH - canvasH) / 2);
      return [
        Math.max(-maxX, Math.min(maxX, ox)),
        Math.max(-maxY, Math.min(maxY, oy)),
      ];
    }

    function draw(): void {
      ctx.clearRect(0, 0, canvasW, canvasH);
      const scale = baseScale() * zoom;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const x = (canvasW - drawW) / 2 + offsetX;
      const y = (canvasH - drawH) / 2 + offsetY;
      ctx.drawImage(img, x, y, drawW, drawH);
    }

    img.onload = () => {
      zoom = 1;
      offsetX = 0;
      offsetY = 0;
      zoomSlider.value = '1';
      draw();
    };

    zoomSlider.addEventListener('input', () => {
      zoom = parseFloat(zoomSlider.value);
      [offsetX, offsetY] = clampOffset(offsetX, offsetY, zoom);
      draw();
    });

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartOffsetX = offsetX;
      dragStartOffsetY = offsetY;
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const ds = getDisplayScale();
      const dx = (e.clientX - dragStartX) / ds;
      const dy = (e.clientY - dragStartY) / ds;
      [offsetX, offsetY] = clampOffset(dragStartOffsetX + dx, dragStartOffsetY + dy, zoom);
      draw();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragStartOffsetX = offsetX;
      dragStartOffsetY = offsetY;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const ds = getDisplayScale();
      const dx = (e.touches[0].clientX - dragStartX) / ds;
      const dy = (e.touches[0].clientY - dragStartY) / ds;
      [offsetX, offsetY] = clampOffset(dragStartOffsetX + dx, dragStartOffsetY + dy, zoom);
      draw();
    }, { passive: true });

    canvas.addEventListener('touchend', () => { isDragging = false; });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      zoom = Math.max(1, Math.min(3, zoom + delta));
      zoomSlider.value = String(zoom);
      [offsetX, offsetY] = clampOffset(offsetX, offsetY, zoom);
      draw();
    }, { passive: false });

    function close(): void {
      modal.remove();
      URL.revokeObjectURL(objectUrl);
    }

    function cancel(): void {
      close();
      resolve(null);
    }

    cancelBtn.onclick = cancel;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) cancel();
    });

    confirmBtn.onclick = () => {
      const out = document.createElement('canvas');
      out.width = outputW;
      out.height = outputH;
      const outCtx = out.getContext('2d')!;
      outCtx.drawImage(canvas, 0, 0, canvasW, canvasH, 0, 0, outputW, outputH);
      out.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        const dataUrl = out.toDataURL('image/jpeg', 0.9);
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const croppedFile = new File([blob], `${baseName}_crop.jpg`, { type: 'image/jpeg' });
        close();
        resolve({ blob, dataUrl, file: croppedFile });
      }, 'image/jpeg', 0.9);
    };

    modal.setAttribute('aria-hidden', 'false');
  });
}
