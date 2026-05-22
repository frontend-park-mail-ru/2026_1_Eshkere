const reducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Scroll reveal ────────────────────────────────────────────────────────────
// Наблюдает за [data-reveal] и добавляет .is-visible при появлении в viewport.
// [data-reveal-delay="N"] → transition-delay = N * 80ms через CSS custom prop.
export function setupReveal(): VoidFunction {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (targets.length === 0) return () => {};

  if (reducedMotion()) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -32px 0px' },
  );

  targets.forEach((el) => {
    const delay = el.dataset['revealDelay'];
    if (delay) el.style.setProperty('--reveal-delay', delay);

    // Элементы уже в viewport показываем сразу
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('is-visible');
    } else {
      observer.observe(el);
    }
  });

  return () => observer.disconnect();
}

// ─── Hero stagger ─────────────────────────────────────────────────────────────
// Последовательно анимирует блоки hero-секции при загрузке страницы.
// selectors — список CSS-селекторов в порядке появления.
export function setupHeroEntrance(
  selectors: string[] = [
    '.hero__badge',
    '.hero__title',
    '.hero__description',
    '.hero__actions',
    '.hero__stats',
  ],
): VoidFunction {
  const elements: HTMLElement[] = [];

  selectors.forEach((sel, i) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) return;
    el.style.setProperty('--stagger-i', String(i));
    el.classList.add('hero-stagger');
    elements.push(el);
  });

  if (elements.length === 0) return () => {};

  if (reducedMotion()) {
    elements.forEach((el) => el.classList.add('is-visible'));
  } else {
    // Два rAF: первый даёт браузеру применить начальные стили,
    // второй запускает переход — иначе transition не сработает.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        elements.forEach((el) => el.classList.add('is-visible'));
      });
    });
  }

  return () => {
    elements.forEach((el) => {
      el.classList.remove('hero-stagger', 'is-visible');
      el.style.removeProperty('--stagger-i');
    });
  };
}

// ─── Page transition ──────────────────────────────────────────────────────────
// Вызывается роутером после outlet.innerHTML = content.
// Снимает класс (сбрасывает анимацию), форсирует reflow, ставит снова.
export function triggerPageEnter(outlet: HTMLElement): void {
  if (reducedMotion()) return;
  outlet.classList.remove('page-entering');
  void outlet.offsetWidth; // reflow чтобы animation перезапустилась
  outlet.classList.add('page-entering');
}
