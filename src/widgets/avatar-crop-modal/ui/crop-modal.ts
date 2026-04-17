import './crop-modal.scss';

interface CropResult {
  blob: Blob;
  dataUrl: string;
}

const OUTPUT_SIZE = 400;
const CROP_INSET = 28;

function buildModal(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="avatar-crop-modal" id="avatar-crop-modal" aria-hidden="true">
      <div class="avatar-crop-modal__backdrop"></div>
      <div class="avatar-crop-modal__dialog" role="dialog" aria-modal="true" aria-label="Обрезать фото">
        <div class="avatar-crop-modal__header">
          <h3 class="avatar-crop-modal__title">Обрезать фото</h3>
          <p class="avatar-crop-modal__subtitle">Перетащите фото и настройте масштаб</p>
        </div>
        <div class="avatar-crop-modal__stage">
          <canvas class="avatar-crop-modal__canvas" data-crop-canvas></canvas>
          <div class="avatar-crop-modal__mask" aria-hidden="true"></div>
        </div>
        <div class="avatar-crop-modal__zoom">
          <span class="avatar-crop-modal__zoom-icon">−</span>
          <input class="avatar-crop-modal__zoom-slider" data-crop-zoom type="range" min="1" max="3" step="0.01" value="1">
          <span class="avatar-crop-modal__zoom-icon">+</span>
        </div>
        <div class="avatar-crop-modal__actions">
          <button class="avatar-crop-modal__btn avatar-crop-modal__btn--secondary" data-crop-cancel type="button">Отмена</button>
          <button class="avatar-crop-modal__btn avatar-crop-modal__btn--primary" data-crop-confirm type="button">Применить</button>
        </div>
      </div>
    </div>
  `.trim();
  return el.firstElementChild as HTMLElement;
}

export function openAvatarCropModal(file: File): Promise<CropResult | null> {
  return new Promise((resolve) => {
    let modal = document.getElementById('avatar-crop-modal') as HTMLElement | null;
    if (!modal) {
      modal = buildModal();
      document.body.appendChild(modal);
    }

    const canvas = modal.querySelector<HTMLCanvasElement>('[data-crop-canvas]')!;
    const zoomSlider = modal.querySelector<HTMLInputElement>('[data-crop-zoom]')!;
    const cancelBtn = modal.querySelector<HTMLButtonElement>('[data-crop-cancel]')!;
    const confirmBtn = modal.querySelector<HTMLButtonElement>('[data-crop-confirm]')!;
    const ctx = canvas.getContext('2d')!;

    const CANVAS_SIZE = 320;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

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

    function clampOffset(ox: number, oy: number, z: number): [number, number] {
      const scaledW = img.naturalWidth * (CANVAS_SIZE / Math.min(img.naturalWidth, img.naturalHeight)) * z;
      const scaledH = img.naturalHeight * (CANVAS_SIZE / Math.min(img.naturalWidth, img.naturalHeight)) * z;
      const maxX = (scaledW - CANVAS_SIZE) / 2;
      const maxY = (scaledH - CANVAS_SIZE) / 2;
      return [
        Math.max(-maxX, Math.min(maxX, ox)),
        Math.max(-maxY, Math.min(maxY, oy)),
      ];
    }

    function draw(): void {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const baseScale = CANVAS_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
      const scale = baseScale * zoom;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const x = (CANVAS_SIZE - drawW) / 2 + offsetX;
      const y = (CANVAS_SIZE - drawH) / 2 + offsetY;

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
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
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
      const dx = e.touches[0].clientX - dragStartX;
      const dy = e.touches[0].clientY - dragStartY;
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
      modal!.setAttribute('aria-hidden', 'true');
      URL.revokeObjectURL(objectUrl);
    }

    cancelBtn.onclick = () => {
      close();
      resolve(null);
    };

    confirmBtn.onclick = () => {
      const out = document.createElement('canvas');
      out.width = OUTPUT_SIZE;
      out.height = OUTPUT_SIZE;
      const outCtx = out.getContext('2d')!;

      const baseScale = CANVAS_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
      const scale = baseScale * zoom;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const x = (CANVAS_SIZE - drawW) / 2 + offsetX;
      const y = (CANVAS_SIZE - drawH) / 2 + offsetY;

      const cropSize = CANVAS_SIZE - CROP_INSET * 2;
      outCtx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      outCtx.drawImage(canvas, CROP_INSET, CROP_INSET, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      out.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        const dataUrl = out.toDataURL('image/jpeg', 0.9);
        close();
        resolve({ blob, dataUrl });
      }, 'image/jpeg', 0.9);

      void x; void y; void drawW; void drawH;
    };

    modal.setAttribute('aria-hidden', 'false');
  });
}
