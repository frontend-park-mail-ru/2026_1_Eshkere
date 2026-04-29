import './public-layout.scss';
import { renderTemplate } from 'shared/lib/render';
import { renderNavbar } from 'widgets/navbar';
import publicLayoutTemplate from './public-layout.hbs';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const SCROLL_HUE_RANGE = 22;

/* ------------------------------------------------------------------ */
/* Merged scroll handler: parallax layers + progress bar + hue drift   */
/* all run in a single rAF per scroll event instead of three separate. */
/* ------------------------------------------------------------------ */
function bootstrapScrollEffects(): () => void {
  const reduced = prefersReducedMotion();
  const root = document.querySelector<HTMLElement>('.public-layout');
  const scrollBar = document.querySelector<HTMLElement>(
    '[data-scroll-progress] .public-layout__scroll-progress-bar',
  );
  const parallaxLayers = reduced
    ? ([] as HTMLElement[])
    : Array.from(
        document.querySelectorAll<HTMLElement>('[data-parallax-root] [data-parallax-speed]'),
      );

  let pending = false;

  const apply = () => {
    pending = false;
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = docHeight > 0 ? scrollY / docHeight : 0;
    const clamped = Math.max(0, Math.min(1, ratio));

    if (scrollBar) {
      scrollBar.style.width = (clamped * 100).toFixed(2) + '%';
    }

    if (!reduced) {
      parallaxLayers.forEach((layer) => {
        const speed = Number(layer.dataset.parallaxSpeed ?? 0);
        layer.style.setProperty('--py', (-scrollY * speed).toFixed(1) + 'px');
      });

      if (root) {
        root.style.setProperty('--scroll-progress', clamped.toFixed(4));
        root.style.setProperty(
          '--scroll-hue',
          `${(clamped * SCROLL_HUE_RANGE).toFixed(2)}deg`,
        );
      }
    }
  };

  const onScroll = () => {
    if (!pending) {
      pending = true;
      window.requestAnimationFrame(apply);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.requestAnimationFrame(apply);

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  };
}

/* ------------------------------------------------------------------ */
/* Spotlight: cursor-following glow. Element is cached once on init.  */
/* ------------------------------------------------------------------ */
function bootstrapSpotlight(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (prefersReducedMotion()) return () => {};
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return () => {};

  const spotlight = document.querySelector<HTMLElement>('[data-spotlight]');
  if (!spotlight) return () => {};

  let pendingX = 0;
  let pendingY = 0;
  let pending = false;

  const apply = () => {
    pending = false;
    spotlight.style.setProperty('--mx', pendingX + 'px');
    spotlight.style.setProperty('--my', pendingY + 'px');
  };

  const onMove = (event: PointerEvent) => {
    pendingX = event.clientX;
    pendingY = event.clientY;
    if (!pending) {
      pending = true;
      window.requestAnimationFrame(apply);
    }
    if (!spotlight.classList.contains('is-active')) {
      spotlight.classList.add('is-active');
    }
  };

  const onLeave = () => spotlight.classList.remove('is-active');

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);

  return () => {
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
    spotlight.classList.remove('is-active');
  };
}

const SECTION_HUE_DEFAULTS: Record<string, number> = {
  hero: 0,
  trusted: -6,
  how: 10,
  bento: 20,
  testimonials: -14,
  faq: 30,
  features: 14,
  pricing: -20,
};

/* ------------------------------------------------------------------ */
/* Section aura: shifts --section-aura-h on the layout root based on  */
/* whichever [data-scroll-section] is most visible.                    */
/* ------------------------------------------------------------------ */
function bootstrapSectionAura(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (typeof IntersectionObserver === 'undefined') return () => {};

  const root = document.querySelector<HTMLElement>('.public-layout');
  if (!root) return () => {};

  const sections = Array.from(
    document.querySelectorAll<HTMLElement>('[data-scroll-section]'),
  );
  if (sections.length === 0) return () => {};

  const visibility = new Map<HTMLElement, number>();
  let rafPending = false;

  const pickActive = () => {
    rafPending = false;
    let best: HTMLElement | null = null;
    let bestRatio = 0;
    visibility.forEach((ratio, el) => {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = el;
      }
    });
    if (!best) return;
    const active = best as HTMLElement;
    const name = active.dataset.scrollSection ?? 'hero';
    const override = active.dataset.auraHue;
    const hue =
      override !== undefined ? Number(override) : (SECTION_HUE_DEFAULTS[name] ?? 0);
    root.style.setProperty('--section-aura-h', `${hue}deg`);
    root.dataset['activeSection'] = name;
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        visibility.set(entry.target as HTMLElement, entry.intersectionRatio);
      });
      if (!rafPending) {
        rafPending = true;
        window.requestAnimationFrame(pickActive);
      }
    },
    {
      threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      rootMargin: '-15% 0px -25% 0px',
    },
  );

  sections.forEach((s) => io.observe(s));

  return () => {
    io.disconnect();
    visibility.clear();
  };
}

function bootstrapAllPublicLayoutFx(): () => void {
  const cleanups = [
    bootstrapScrollEffects(),
    bootstrapSpotlight(),
    bootstrapSectionAura(),
  ];
  return () => cleanups.forEach((c) => c());
}

let _layoutCleanup: (() => void) | null = null;

export async function renderPublicLayout(
  content: string,
  pathname: string = '/',
): Promise<string> {
  _layoutCleanup?.();
  _layoutCleanup = null;

  const navbar = await renderNavbar(pathname);

  if (typeof window !== 'undefined') {
    window.queueMicrotask(() => {
      _layoutCleanup = bootstrapAllPublicLayoutFx();
    });
  }

  return await renderTemplate(publicLayoutTemplate, {
    navbar,
    content,
    layoutClass:
      pathname === '/login' || pathname === '/register'
        ? 'public-layout--auth-static'
        : '',
  });
}

export async function updatePublicNavbarSlot(
  pathname: string = '/',
): Promise<void> {
  const layoutRoot = document.querySelector('.public-layout');
  if (layoutRoot) {
    layoutRoot.classList.toggle(
      'public-layout--auth-static',
      pathname === '/login' || pathname === '/register',
    );
  }

  const slot = document.getElementById('app-navbar-slot');
  if (!slot) {
    return;
  }
  slot.innerHTML = await renderNavbar(pathname);
}
