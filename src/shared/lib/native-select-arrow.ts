interface InitNativeSelectArrowsParams {
  root?: ParentNode;
  signal?: AbortSignal;
  selectSelector: string;
  fieldSelector: string;
  openClass?: string;
}

export function initNativeSelectArrows({
  root = document,
  signal,
  selectSelector,
  fieldSelector,
  openClass = 'is-select-open',
}: InitNativeSelectArrowsParams): void {
  const options = signal ? { signal } : undefined;

  root.querySelectorAll<HTMLSelectElement>(selectSelector).forEach((select) => {
    const field = select.closest<HTMLElement>(fieldSelector);
    if (!field) {
      return;
    }

    const open = (): void => {
      field.classList.add(openClass);
    };

    const close = (): void => {
      field.classList.remove(openClass);
    };

    const isOpen = (): boolean => field.classList.contains(openClass);

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
