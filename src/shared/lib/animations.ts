const reducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('is-visible');
    } else {
      observer.observe(el);
    }
  });

  return () => observer.disconnect();
}

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

export function triggerPageEnter(outlet: HTMLElement): void {
  if (reducedMotion()) return;
  outlet.classList.remove('page-entering');
  void outlet.offsetWidth;
  outlet.classList.add('page-entering');
}

const MOTION_SELECTORS = {
  pressable: [
    'button:not([disabled])',
    'a[class*="button"]',
    'a[class*="action"]',
    'a[role="button"]',
    '.ui-button',
    '[class*="__button"]',
    '[class*="__btn"]',
    '[class*="-button"]',
  ].join(','),
  cards: [
    '.auth-card',
    '.bento-card',
    '.feature-card',
    '.forgot-password-panel',
    '.overview-card',
    '.overview-stat',
    '.partner-panel',
    '.partner-stat',
    '.partner-row',
    '.balance-card',
    '.balance-stat',
    '.stats-card',
    '.campaign-builder__card',
    '.agc__card',
    '.adc__card',
    '.ad-group-card',
    '.ad-card',
    '.profile-card',
    '.moderator-card',
  ].join(','),
  listItems: [
    '.campaign-row',
    '.balance-table__row',
    '.partner-site-row',
    '.partner-row',
    '.navbar__notification-card',
  ].join(','),
  dropdowns: [
    '.campaign-row__menu',
    '.campaigns-filter-dropdown',
    '.navbar__profile-menu',
    '.navbar__notifications-menu',
  ].join(','),
  modals: [
    '.modal',
    '.campaigns-delete-modal',
    '.campaigns-status-modal',
    '.balance-modal',
    '.request-error-modal',
    '.offline-modal',
    '.mobile-warning-modal',
    '.feed-link-modal',
    '.avatar-crop-modal',
    '.navbar__logout-modal',
    '.navbar__notifications-modal',
  ].join(','),
};

function addMotionClass(
  root: ParentNode,
  selector: string,
  className: string,
  limit = Number.POSITIVE_INFINITY,
): void {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));

  elements.slice(0, limit).forEach((element, index) => {
    element.classList.add(className);

    if (className === 'motion-list-item' || className === 'motion-card') {
      element.style.setProperty('--motion-item-i', String(Math.min(index, 12)));
    }
  });
}

export function setupMotionEnhancements(root: ParentNode = document): void {
  if (reducedMotion()) return;

  addMotionClass(root, MOTION_SELECTORS.pressable, 'motion-pressable');
  addMotionClass(root, MOTION_SELECTORS.cards, 'motion-card', 40);
  addMotionClass(root, MOTION_SELECTORS.listItems, 'motion-list-item', 40);
  addMotionClass(root, MOTION_SELECTORS.dropdowns, 'motion-dropdown');
  addMotionClass(root, MOTION_SELECTORS.modals, 'motion-modal');
}
