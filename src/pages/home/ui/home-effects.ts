export function setupSmoothAnchors(): VoidFunction {
  const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
  if (anchors.length === 0) return () => {};

  const listeners: Array<() => void> = [];

  anchors.forEach((anchor) => {
    const handleClick = (event: MouseEvent) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    anchor.addEventListener('click', handleClick);
    listeners.push(() => anchor.removeEventListener('click', handleClick));
  });

  return () => listeners.forEach((off) => off());
}
