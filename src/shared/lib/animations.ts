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
  charts: [
    '.overview-chart__bar',
    '.overview-status__fill',
  ].join(','),
  emptyStates: [
    '.campaigns-empty',
    '.overview-empty',
    '.balance-table__empty',
    '.partner-empty',
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
  numberValues: [
    '.overview-stat__value',
    '.overview-chart__value',
    '.overview-status__row strong',
    '.overview-balance strong',
    '.overview-campaign__status',
    '.balance-stat__value',
    '.balance-summary__value',
    '.balance-modal__summary-value',
    '.balance-log__summary-value',
    '.partner-stat__value',
    '.stats-card__value',
    '[data-balance-stat]',
    '[data-balance-summary]',
  ].join(','),
  statuses: [
    '.status-badge',
    '.overview-status',
    '.balance-pill',
    '.balance-alert',
    '.global-balance-alert',
  ].join(','),
};

interface ParsedNumberText {
  decimals: number;
  end: number;
  prefix: string;
  suffix: string;
}

const animatedNumbers = new WeakMap<HTMLElement, string>();

function queryMotionElements(root: ParentNode, selector: string): HTMLElement[] {
  const rootElement =
    root instanceof HTMLElement && root.matches(selector) ? [root] : [];

  return [
    ...rootElement,
    ...Array.from(root.querySelectorAll<HTMLElement>(selector)),
  ];
}

function parseNumberText(text: string): ParsedNumberText | null {
  const match = text.match(/-?\d[\d\s.,]*/);

  if (!match || typeof match.index !== 'number') {
    return null;
  }

  const rawNumber = match[0].trim();
  const normalized = rawNumber.replace(/\s/g, '').replace(',', '.');
  const numericValue = Number(normalized);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  const decimalPart = normalized.split('.')[1];

  return {
    decimals: decimalPart?.length ?? 0,
    end: numericValue,
    prefix: text.slice(0, match.index),
    suffix: text.slice(match.index + match[0].length),
  };
}

function formatAnimatedNumber(value: number, decimals: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

function animateNumber(element: HTMLElement): void {
  const originalText = element.textContent?.trim() ?? '';
  const parsed = parseNumberText(originalText);

  if (!parsed || animatedNumbers.get(element) === originalText) {
    return;
  }

  animatedNumbers.set(element, originalText);
  element.classList.add('motion-count-up');

  if (parsed.end === 0) {
    return;
  }

  const duration = 720;
  const startedAt = performance.now();
  const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

  const step = (now: number): void => {
    if (!element.isConnected) {
      return;
    }

    const progress = Math.min((now - startedAt) / duration, 1);
    const value = parsed.end * easeOut(progress);
    element.textContent = `${parsed.prefix}${formatAnimatedNumber(
      value,
      parsed.decimals,
    )}${parsed.suffix}`;

    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }

    element.textContent = originalText;
  };

  element.textContent = `${parsed.prefix}${formatAnimatedNumber(
    0,
    parsed.decimals,
  )}${parsed.suffix}`;
  requestAnimationFrame(step);
}

function setupCountUp(root: ParentNode): void {
  const elements = queryMotionElements(root, MOTION_SELECTORS.numberValues);

  if (elements.length === 0) {
    return;
  }

  const visible = (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  };

  const animate = (element: HTMLElement): void => {
    if (visible(element)) {
      animateNumber(element);
    }
  };

  if (!('IntersectionObserver' in window)) {
    elements.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateNumber(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.25 },
  );

  elements.forEach((element) => {
    if (visible(element)) {
      animateNumber(element);
      return;
    }

    observer.observe(element);
  });
}

function setupStatusMotion(root: ParentNode): void {
  const statuses = queryMotionElements(root, MOTION_SELECTORS.statuses);

  statuses.forEach((element) => {
    element.classList.add('motion-status');

    const className = element.className;
    const tone =
      className.match(/(?:status-badge|overview-status|balance-pill|balance-alert|global-balance-alert)--([\w-]+)/)?.[1] ??
      element.dataset['globalBalanceAlert'] ??
      '';

    if (tone) {
      element.classList.add(`motion-status--${tone}`);
    }
  });
}

function addMotionClass(
  root: ParentNode,
  selector: string,
  className: string,
  limit = Number.POSITIVE_INFINITY,
): void {
  const elements = queryMotionElements(root, selector);

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
  addMotionClass(root, MOTION_SELECTORS.charts, 'motion-chart');
  addMotionClass(root, MOTION_SELECTORS.emptyStates, 'motion-empty-state');
  addMotionClass(root, MOTION_SELECTORS.listItems, 'motion-list-item', 40);
  addMotionClass(root, MOTION_SELECTORS.dropdowns, 'motion-dropdown');
  addMotionClass(root, MOTION_SELECTORS.modals, 'motion-modal');
  setupStatusMotion(root);
  setupCountUp(root);
}
