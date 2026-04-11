const CAMPAIGN_EDIT_TOAST_DELAY = 3200;

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) {
    node.textContent = value;
  }
}

export function createCampaignEditToastController() {
  let timer: number | null = null;

  return {
    hide(): void {
      const toast = document.querySelector<HTMLElement>('[data-edit-toast]');
      if (toast) {
        toast.hidden = true;
      }

      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    },
    show(title: string, text: string): void {
      const toast = document.querySelector<HTMLElement>('[data-edit-toast]');
      if (!toast) {
        return;
      }

      setText('[data-edit-toast-title]', title);
      setText('[data-edit-toast-text]', text);
      toast.hidden = false;

      if (timer) {
        window.clearTimeout(timer);
      }

      timer = window.setTimeout(() => {
        toast.hidden = true;
        timer = null;
      }, CAMPAIGN_EDIT_TOAST_DELAY);
    },
  };
}
