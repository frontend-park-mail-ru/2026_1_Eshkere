import { formatCount, motionAllowed } from './home-motion';

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

export function setupCounters(): VoidFunction {
  const counters = document.querySelectorAll<HTMLElement>('[data-counter]');
  if (counters.length === 0) return () => {};

  if (!motionAllowed() || typeof IntersectionObserver === 'undefined') {
    counters.forEach((el) => {
      const target = Number(el.dataset.counter ?? 0);
      const suffix = el.dataset.suffix ?? '';
      el.textContent = formatCount(target) + suffix;
    });
    return () => {};
  }

  const duration = 1800;
  const activeRafs = new Set<number>();

  const runCounter = (el: HTMLElement) => {
    const target = Number(el.dataset.counter ?? 0);
    const suffix = el.dataset.suffix ?? '';
    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      activeRafs.delete(frameId);

      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = formatCount(current) + suffix;
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
        activeRafs.add(frameId);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    activeRafs.add(frameId);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCounter(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.2,
      rootMargin: '0px 0px 12% 0px',
    },
  );

  counters.forEach((el) => observer.observe(el));

  return () => {
    observer.disconnect();
    activeRafs.forEach((id) => window.cancelAnimationFrame(id));
    activeRafs.clear();
  };
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

export function setupMarqueePause(): VoidFunction {
  const marquees = document.querySelectorAll<HTMLElement>('[data-marquee]');
  if (marquees.length === 0 || typeof IntersectionObserver === 'undefined') {
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          el.removeAttribute('data-marquee-paused');
        } else {
          el.setAttribute('data-marquee-paused', 'true');
        }
      });
    },
    { threshold: 0 },
  );

  marquees.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}

export function setupSectionParallax(): VoidFunction {
  if (!motionAllowed()) return () => {};

  const home = document.querySelector<HTMLElement>('.home');
  if (!home) return () => {};

  const sections: Array<[string, string]> = [
    ['.hero', '--hero-progress'],
    ['.trusted', '--trusted-progress'],
    ['.how', '--how-progress'],
    ['.bento', '--bento-progress'],
    ['.testimonials', '--testimonials-progress'],
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

export function setupFirstScrollConfetti(): VoidFunction {
  if (!motionAllowed() || typeof window === 'undefined') return () => {};

  const anchor =
    document.querySelector<HTMLElement>('.hero__button--primary') ||
    document.querySelector<HTMLElement>('.hero');
  if (!anchor) return () => {};

  const colors = [
    '#897eff', '#c191ff', '#ff8cd2', '#6eb9ff',
    '#ffd59a', '#9ee5ff', '#b464ff', '#ffb4ea',
  ];

  let fired = false;
  const timeouts: number[] = [];

  const burst = () => {
    if (fired) return;
    fired = true;

    const rect = anchor.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const container = document.createElement('div');
    container.className = 'home-confetti';
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:30',
      'overflow:hidden',
    ].join(';');
    document.body.appendChild(container);

    const count = 28;
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('span');
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radius = 160 + Math.random() * 200;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius - 80 - Math.random() * 60;
      const size = 6 + Math.random() * 8;
      const rot = Math.random() * 360;
      const color = colors[i % colors.length];
      const dur = 1100 + Math.random() * 700;

      p.style.cssText = [
        'position:absolute',
        `left:${cx}px`,
        `top:${cy}px`,
        `width:${size}px`,
        `height:${size * 0.45}px`,
        `background:${color}`,
        `border-radius:${Math.random() > 0.4 ? '2px' : '50%'}`,
        `box-shadow:0 0 10px ${color}99, 0 0 18px ${color}55`,
        `transform:translate3d(-50%,-50%,0) rotate(${rot}deg)`,
        'opacity:1',
        `transition:transform ${dur}ms cubic-bezier(0.16,1,0.3,1), opacity ${dur}ms ease-out`,
        'will-change:transform,opacity',
      ].join(';');
      container.appendChild(p);

      window.requestAnimationFrame(() => {
        p.style.transform =
          `translate3d(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px), 0) ` +
          `rotate(${(rot + 540).toFixed(0)}deg)`;
        p.style.opacity = '0';
      });

      timeouts.push(
        window.setTimeout(() => {
          p.remove();
        }, dur + 80),
      );
    }

    timeouts.push(
      window.setTimeout(() => {
        container.remove();
      }, 2200),
    );

    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', onScroll);
    window.removeEventListener('touchmove', onScroll);
  };

  const onScroll = () => {
    if (window.scrollY < 6) return;
    burst();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', onScroll, { passive: true });
  window.addEventListener('touchmove', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', onScroll);
    window.removeEventListener('touchmove', onScroll);
    timeouts.forEach((id) => window.clearTimeout(id));
    const lingering = document.querySelector('.home-confetti');
    if (lingering) lingering.remove();
  };
}
