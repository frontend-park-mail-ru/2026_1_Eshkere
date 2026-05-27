export function initCampaignBuilderSelectArrows(
  root: ParentNode = document,
  signal?: AbortSignal,
): void {
  const options = signal ? { signal } : undefined;

  root.querySelectorAll<HTMLSelectElement>('select.campaign-builder__input').forEach((select) => {
    const field = select.closest<HTMLElement>('.campaign-builder__field');
    if (!field) {
      return;
    }

    const open = (): void => {
      field.classList.add('is-select-open');
    };

    const close = (): void => {
      field.classList.remove('is-select-open');
    };

    const isOpen = (): boolean => field.classList.contains('is-select-open');

    select.addEventListener(
      'mousedown',
      () => {
        if (isOpen()) {
          close();
        } else {
          open();
        }
      },
      options,
    );

    select.addEventListener('change', close, options);

    select.addEventListener(
      'blur',
      () => {
        window.setTimeout(() => {
          if (document.activeElement !== select) {
            close();
          }
        }, 200);
      },
      options,
    );
  });
}
