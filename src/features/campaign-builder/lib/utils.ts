export function clampText(value: string, limit: number): string {
  return value.slice(0, limit);
}

export function setText(
  selector: string,
  value: string,
  parent: ParentNode = document,
): void {
  const node = parent.querySelector<HTMLElement>(selector);

  if (node) {
    node.textContent = value;
  }
}

export function setTextAll(
  selector: string,
  value: string,
  parent: ParentNode = document,
): void {
  parent.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.textContent = value;
  });
}

export function getSelectOptionDefaultMeta(key?: string, value?: string): string {
  if (!key || !value) {
    return '';
  }

  if (key === 'format') {
    if (value === 'feed') return 'Базовый формат';
    if (value === 'stories') return 'Вертикальный';
    if (value === 'video-15') return '15 сек';
  }

  if (key === 'goal') {
    if (value === 'website') return 'Трафик';
    if (value === 'leads') return 'Заявки';
    if (value === 'awareness') return 'Масштаб';
  }

  if (key === 'strategy') {
    if (value === 'even') return 'Контроль';
    if (value === 'smart') return 'Баланс';
    if (value === 'aggressive') return 'Тест';
  }

  return '';
}
