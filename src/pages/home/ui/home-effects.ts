import { motionAllowed } from './home-motion';

export function setupReveal(): VoidFunction {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (targets.length === 0) return () => {};

  if (!motionAllowed() || typeof IntersectionObserver === 'undefined') {
    targets.forEach((el) => el.classList.add('is-visible'));
    return () => {};
  }

  const revealIfNearViewport = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const preloadOffset = Math.max(240, viewportHeight * 0.35);
    const shouldReveal =
      rect.bottom < 0 ||
      rect.top <= viewportHeight + preloadOffset;

    if (shouldReveal) {
      el.classList.add('is-visible');
      return true;
    }

    return false;
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.01,
      rootMargin: '0px 0px 40% 0px',
    },
  );

  const pendingTargets: HTMLElement[] = [];

  targets.forEach((el) => {
    if (!revealIfNearViewport(el)) {
      pendingTargets.push(el);
      observer.observe(el);
    }
  });

  let scrollRafId = 0;
  const flushPending = () => {
    scrollRafId = 0;
    for (let index = pendingTargets.length - 1; index >= 0; index -= 1) {
      const el = pendingTargets[index];
      if (revealIfNearViewport(el)) {
        observer.unobserve(el);
        pendingTargets.splice(index, 1);
      }
    }
  };

  const handleScroll = () => {
    if (pendingTargets.length === 0) return;
    if (scrollRafId !== 0) return;
    scrollRafId = window.requestAnimationFrame(flushPending);
  };

  const handleScrollEnd = () => {
    if (pendingTargets.length === 0) return;
    flushPending();
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });
  window.addEventListener('scrollend', handleScrollEnd, { passive: true });

  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleScroll);
    window.removeEventListener('scrollend', handleScrollEnd);
    if (scrollRafId !== 0) window.cancelAnimationFrame(scrollRafId);
  };
}

export function setupMagnetic(): VoidFunction {
  const elements = document.querySelectorAll<HTMLElement>('[data-magnetic]');
  if (elements.length === 0 || !motionAllowed()) return () => {};

  const strength = 0.35;
  const maxOffset = 14;
  const listeners: Array<() => void> = [];

  elements.forEach((el) => {
    const handleMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (event.clientX - cx) * strength;
      const dy = (event.clientY - cy) * strength;
      const clampedX = Math.max(-maxOffset, Math.min(maxOffset, dx));
      const clampedY = Math.max(-maxOffset, Math.min(maxOffset, dy));
      el.style.setProperty('--mx', clampedX.toFixed(2) + 'px');
      el.style.setProperty('--my', clampedY.toFixed(2) + 'px');
    };

    const reset = () => {
      el.style.setProperty('--mx', '0px');
      el.style.setProperty('--my', '0px');
    };

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerleave', reset);
    el.addEventListener('blur', reset);

    listeners.push(() => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', reset);
      el.removeEventListener('blur', reset);
      reset();
    });
  });

  return () => listeners.forEach((off) => off());
}

export function setupTilt(): VoidFunction {
  const cards = document.querySelectorAll<HTMLElement>('[data-tilt]');
  if (cards.length === 0 || !motionAllowed()) return () => {};

  const listeners: Array<() => void> = [];

  cards.forEach((card) => {
    let rafId = 0;
    let pending: { x: number; y: number } | null = null;

    const applyTilt = () => {
      if (!pending) {
        rafId = 0;
        return;
      }
      const rect = card.getBoundingClientRect();
      const relX = (pending.x - rect.left) / rect.width;
      const relY = (pending.y - rect.top) / rect.height;
      card.style.setProperty('--gx', (relX * 100).toFixed(2) + '%');
      card.style.setProperty('--gy', (relY * 100).toFixed(2) + '%');
      pending = null;
      rafId = 0;
    };

    const handleMove = (event: PointerEvent) => {
      pending = { x: event.clientX, y: event.clientY };
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(applyTilt);
      }
    };

    const handleEnter = () => {
      card.classList.add('is-tilting');
    };

    const handleLeave = () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--gx', '50%');
      card.style.setProperty('--gy', '30%');
    };

    card.addEventListener('pointerenter', handleEnter);
    card.addEventListener('pointermove', handleMove);
    card.addEventListener('pointerleave', handleLeave);

    listeners.push(() => {
      card.removeEventListener('pointerenter', handleEnter);
      card.removeEventListener('pointermove', handleMove);
      card.removeEventListener('pointerleave', handleLeave);
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      handleLeave();
    });
  });

  return () => listeners.forEach((off) => off());
}

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
      target.scrollIntoView({
        behavior: motionAllowed() ? 'smooth' : 'auto',
        block: 'start',
      });
    };

    anchor.addEventListener('click', handleClick);
    listeners.push(() => anchor.removeEventListener('click', handleClick));
  });

  return () => listeners.forEach((off) => off());
}

export function setupSectionParallax(): VoidFunction {
  if (!motionAllowed()) return () => {};

  const home = document.querySelector<HTMLElement>('.home');
  if (!home) return () => {};

  const sections: Array<[string, string]> = [
    ['.hero', '--hero-progress'],
    ['.how', '--how-progress'],
    ['.bento', '--bento-progress'],
  ];

  const tracked = sections
    .map(([sel, varName]) => {
      const el = document.querySelector<HTMLElement>(sel);
      return el ? { el, varName } : null;
    })
    .filter((x): x is { el: HTMLElement; varName: string } => x !== null);

  if (tracked.length === 0) return () => {};

  let rafId = 0;

  const apply = () => {
    rafId = 0;
    const vh = window.innerHeight;
    tracked.forEach(({ el, varName }) => {
      const rect = el.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, (vh - rect.top) / (vh + el.offsetHeight)),
      );
      home.style.setProperty(varName, progress.toFixed(4));
    });
  };

  const onScroll = () => {
    if (rafId === 0) {
      rafId = window.requestAnimationFrame(apply);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.requestAnimationFrame(apply);

  return () => {
    window.removeEventListener('scroll', onScroll);
    if (rafId !== 0) window.cancelAnimationFrame(rafId);
    tracked.forEach(({ varName }) => home.style.removeProperty(varName));
  };
}

export function setupAuroraBg(): VoidFunction {
  if (!motionAllowed()) return () => {};

  const bg = document.querySelector<HTMLElement>('.public-layout__bg');
  if (!bg) return () => {};

  const el = document.createElement('div');
  el.className = 'home-aurora';
  el.setAttribute('aria-hidden', 'true');
  bg.appendChild(el);

  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  if (isCoarse) {
    el.classList.add('home-aurora--auto');
    return () => el.remove();
  }

  const layersConfig: Array<{ cls: string; lerp: number; sx: number; sy: number }> = [
    { cls: 'home-aurora__a', lerp: 0.022, sx: 1.0, sy: 1.0 },
    { cls: 'home-aurora__b', lerp: 0.014, sx: -0.7, sy: 0.65 },
    { cls: 'home-aurora__c', lerp: 0.032, sx: 0.5, sy: -0.8 },
  ];

  const layers = layersConfig.map(({ cls, lerp, sx, sy }) => {
    const node = document.createElement('span');
    node.className = cls;
    el.appendChild(node);
    return { node, lerp, sx, sy, cx: 0.38, cy: 0.38 };
  });

  let mouseX = 0.38;
  let mouseY = 0.38;
  let rafId = 0;

  const onMove = (e: PointerEvent) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
  };

  const tick = (ts: number) => {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const breathe = 1 + Math.sin(ts * 0.00055) * 0.08;

    layers.forEach((layer) => {
      layer.cx += (mouseX * layer.sx + (1 - Math.abs(layer.sx)) * 0.5 - layer.cx) * layer.lerp;
      layer.cy += (mouseY * layer.sy + (1 - Math.abs(layer.sy)) * 0.5 - layer.cy) * layer.lerp;

      const halfW = vpW * 0.44;
      const halfH = vpH * 0.44;
      const tx = layer.cx * vpW - halfW;
      const ty = layer.cy * vpH - halfH;
      layer.node.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${breathe.toFixed(4)})`;
    });

    rafId = window.requestAnimationFrame(tick);
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  rafId = window.requestAnimationFrame(tick);

  return () => {
    window.removeEventListener('pointermove', onMove);
    window.cancelAnimationFrame(rafId);
    el.remove();
  };
}

