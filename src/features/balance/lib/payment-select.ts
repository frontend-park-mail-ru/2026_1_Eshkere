export function closeBalanceSelect(select: HTMLElement): void {
  select.classList.remove('is-open');

  select
    .querySelector<HTMLElement>('[data-balance-select-trigger]')
    ?.setAttribute('aria-expanded', 'false');

  const menu = select.querySelector<HTMLElement>('[data-balance-select-menu]');
  if (menu) {
    menu.hidden = true;
  }
}

export function openBalanceSelect(select: HTMLElement): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-select].is-open')
    .forEach((node) => {
      if (node !== select) {
        closeBalanceSelect(node);
      }
    });

  select.classList.add('is-open');
  select
    .querySelector<HTMLElement>('[data-balance-select-trigger]')
    ?.setAttribute('aria-expanded', 'true');

  const menu = select.querySelector<HTMLElement>('[data-balance-select-menu]');
  if (menu) {
    menu.hidden = false;
  }
}

export function syncBalanceSelectValue(
  select: HTMLElement,
  value: string,
  label: string,
): void {
  const key = select.dataset.balanceSelect;
  const valueNode = key
    ? select.querySelector<HTMLElement>(`[data-balance-select-value="${key}"]`)
    : null;
  const inputNode = key
    ? select.querySelector<HTMLInputElement>(
        `[data-balance-select-input="${key}"]`,
      )
    : null;

  if (valueNode) {
    valueNode.textContent = label;
  }

  if (inputNode) {
    inputNode.value = value;
  }

  select
    .querySelectorAll<HTMLElement>('[data-balance-select-option]')
    .forEach((option) => {
      const isActive = option.dataset.value === value;
      option.classList.toggle('balance-modal__select-option--active', isActive);
    });
}
