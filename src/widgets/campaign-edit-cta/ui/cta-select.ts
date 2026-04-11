interface InitCampaignEditCtaSelectParams<T extends string> {
  getLabel: (value: T) => string;
  onChange: (value: T) => void;
  signal: AbortSignal;
}

export function syncCampaignEditCtaSelect<T extends string>(
  value: T,
  getLabel: (value: T) => string,
): void {
  const select = document.querySelector<HTMLElement>('[data-edit-select="cta"]');
  if (!select) {
    return;
  }

  const label = getLabel(value);
  const valueNode = select.querySelector<HTMLElement>('[data-edit-select-value]');
  if (valueNode) {
    valueNode.textContent = label;
  }

  select
    .querySelectorAll<HTMLElement>('[data-edit-cta-option]')
    .forEach((node) => {
      const isSelected = node.dataset.editCtaOption === value;
      node.classList.toggle('is-selected', isSelected);
      const metaNode = node.querySelector<HTMLElement>(
        '.campaign-edit__select-meta',
      );

      if (isSelected && !metaNode) {
        const meta = document.createElement('span');
        meta.className = 'campaign-edit__select-meta';
        meta.textContent = 'Выбрано';
        node.appendChild(meta);
      }

      if (!isSelected && metaNode) {
        metaNode.remove();
      }
    });
}

export function initCampaignEditCtaSelect<T extends string>({
  getLabel,
  onChange,
  signal,
}: InitCampaignEditCtaSelectParams<T>): void {
  const select = document.querySelector<HTMLElement>('[data-edit-select="cta"]');
  const trigger = select?.querySelector<HTMLElement>('[data-edit-select-trigger]');
  const menu = select?.querySelector<HTMLElement>('[data-edit-select-menu]');

  if (!select || !trigger || !menu) {
    return;
  }

  const setOpen = (open: boolean): void => {
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.hidden = !open;
    select.classList.toggle('is-open', open);
  };

  setOpen(false);

  trigger.addEventListener(
    'click',
    () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      setOpen(!isOpen);
    },
    { signal },
  );

  select
    .querySelectorAll<HTMLElement>('[data-edit-cta-option]')
    .forEach((option) => {
      option.addEventListener(
        'click',
        () => {
          const nextValue = option.dataset.editCtaOption as T | undefined;
          if (!nextValue) {
            return;
          }

          onChange(nextValue);
          setOpen(false);
        },
        { signal },
      );
    });

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (!target.closest('[data-edit-select="cta"]')) {
        setOpen(false);
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    },
    { signal },
  );
}
