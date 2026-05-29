import '../ui/onboarding.scss';
import { type TourStep } from './tour-steps';
import { onboardingState } from '../model/onboarding-state';

const SPOTLIGHT_PADDING = 10;
const TOOLTIP_OFFSET = 16;
const TOOLTIP_ARROW_SIZE = 8;
const MOBILE_BREAKPOINT = 600;

interface TourElements {
  overlay: HTMLElement;
  spotlight: HTMLElement;
  tooltip: HTMLElement;
  title: HTMLElement;
  text: HTMLElement;
  counter: HTMLElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  skipBtn: HTMLButtonElement;
}

let elements: TourElements | null = null;
let steps: TourStep[] = [];
let currentStep = 0;
let resizeObserver: ResizeObserver | null = null;
let scrollCleanup: (() => void) | null = null;
let scrollLockCleanup: (() => void) | null = null;
let routeChangeCleanup: (() => void) | null = null;
let onComplete: (() => void) | null = null;
let onRouteChange: ((route: string, stepIndex: number) => void) | null = null;

function isMobile(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function createElement(): TourElements {
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const spotlight = document.createElement('div');
  spotlight.className = 'tour-spotlight';

  const tooltip = document.createElement('div');
  tooltip.className = 'tour-tooltip';
  tooltip.setAttribute('role', 'dialog');
  tooltip.setAttribute('aria-modal', 'true');
  tooltip.setAttribute('aria-labelledby', 'tour-tooltip-title');

  tooltip.innerHTML = `
    <div class="tour-tooltip__head">
      <span class="tour-tooltip__title" id="tour-tooltip-title"></span>
      <button class="tour-tooltip__skip" type="button" aria-label="Пропустить обучение">Пропустить</button>
    </div>
    <p class="tour-tooltip__text"></p>
    <div class="tour-tooltip__footer">
      <button class="tour-tooltip__btn tour-tooltip__btn--prev" type="button">Назад</button>
      <span class="tour-tooltip__counter"></span>
      <button class="tour-tooltip__btn tour-tooltip__btn--next" type="button">Далее</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(spotlight);
  document.body.appendChild(tooltip);

  const el: TourElements = {
    overlay,
    spotlight,
    tooltip,
    title: tooltip.querySelector('.tour-tooltip__title')!,
    text: tooltip.querySelector('.tour-tooltip__text')!,
    counter: tooltip.querySelector('.tour-tooltip__counter')!,
    prevBtn: tooltip.querySelector('.tour-tooltip__btn--prev')!,
    nextBtn: tooltip.querySelector('.tour-tooltip__btn--next')!,
    skipBtn: tooltip.querySelector('.tour-tooltip__skip')!,
  };

  el.nextBtn.addEventListener('click', () => next());
  el.prevBtn.addEventListener('click', () => prev());
  el.skipBtn.addEventListener('click', () => stop());
  el.overlay.addEventListener('click', handleOverlayClick);

  document.addEventListener('keydown', handleKeydown);

  return el;
}

function handleOverlayClick(e: MouseEvent): void {
  e.preventDefault();
  e.stopPropagation();
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    stop();
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    next();
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prev();
  }
}

function lockPageScroll(): void {
  if (scrollLockCleanup) return;

  const scrollY = window.scrollY;
  const previousBodyStyles = {
    position: document.body.style.position,
    top: document.body.style.top,
    left: document.body.style.left,
    right: document.body.style.right,
    width: document.body.style.width,
    overflow: document.body.style.overflow,
  };
  const previousHtmlOverflow = document.documentElement.style.overflow;

  document.documentElement.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';

  scrollLockCleanup = () => {
    document.documentElement.style.overflow = previousHtmlOverflow;
    document.body.style.position = previousBodyStyles.position;
    document.body.style.top = previousBodyStyles.top;
    document.body.style.left = previousBodyStyles.left;
    document.body.style.right = previousBodyStyles.right;
    document.body.style.width = previousBodyStyles.width;
    document.body.style.overflow = previousBodyStyles.overflow;
    scrollLockCleanup = null;
    window.scrollTo(0, scrollY);
  };
}

function unlockPageScroll(): void {
  scrollLockCleanup?.();
}

function positionSpotlight(target: Element): void {
  const rect = target.getBoundingClientRect();

  const top = rect.top - SPOTLIGHT_PADDING;
  const left = rect.left - SPOTLIGHT_PADDING;
  const width = rect.width + SPOTLIGHT_PADDING * 2;
  const height = rect.height + SPOTLIGHT_PADDING * 2;

  elements!.spotlight.style.cssText = `
    top: ${top}px;
    left: ${left}px;
    width: ${width}px;
    height: ${height}px;
  `;
}

function positionTooltip(target: Element | null, placement: TourStep['placement']): void {
  const tooltip = elements!.tooltip;

  if (!target || placement === 'center') {
    tooltip.dataset.placement = 'center';
    tooltip.style.cssText = 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
    return;
  }

  // Mobile: dock to bottom of viewport as a sheet
  if (isMobile()) {
    tooltip.dataset.placement = 'bottom-sheet';
    tooltip.style.cssText = 'bottom: 12px; left: 12px; right: 12px; top: auto; transform: none;';
    return;
  }

  tooltip.dataset.placement = placement;

  const rect = target.getBoundingClientRect();
  const tw = tooltip.offsetWidth || 440;
  const th = tooltip.offsetHeight || 180;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (placement) {
    case 'right':
      top = rect.top + rect.height / 2 - th / 2;
      left = rect.right + TOOLTIP_OFFSET + TOOLTIP_ARROW_SIZE;
      if (left + tw > vw - 16) {
        left = rect.left - tw - TOOLTIP_OFFSET - TOOLTIP_ARROW_SIZE;
        tooltip.dataset.placement = 'left';
      }
      break;
    case 'left':
      top = rect.top + rect.height / 2 - th / 2;
      left = rect.left - tw - TOOLTIP_OFFSET - TOOLTIP_ARROW_SIZE;
      if (left < 16) {
        left = rect.right + TOOLTIP_OFFSET + TOOLTIP_ARROW_SIZE;
        tooltip.dataset.placement = 'right';
      }
      break;
    case 'bottom':
      top = rect.bottom + TOOLTIP_OFFSET + TOOLTIP_ARROW_SIZE;
      left = rect.left + rect.width / 2 - tw / 2;
      if (top + th > vh - 16) {
        top = rect.top - th - TOOLTIP_OFFSET - TOOLTIP_ARROW_SIZE;
        tooltip.dataset.placement = 'top';
      }
      break;
    case 'top':
      top = rect.top - th - TOOLTIP_OFFSET - TOOLTIP_ARROW_SIZE;
      left = rect.left + rect.width / 2 - tw / 2;
      if (top < 16) {
        top = rect.bottom + TOOLTIP_OFFSET + TOOLTIP_ARROW_SIZE;
        tooltip.dataset.placement = 'bottom';
      }
      break;
  }

  left = Math.max(16, Math.min(left, vw - tw - 16));
  top = Math.max(16, Math.min(top, vh - th - 16));

  tooltip.style.cssText = `top: ${top}px; left: ${left}px; transform: none;`;
}

function repositionCurrent(): void {
  if (!elements) return;
  const step = steps[currentStep];
  const target = step.target ? document.querySelector(step.target) : null;
  if (target) {
    positionSpotlight(target);
    positionTooltip(target, step.placement);
  }
}

function renderStep(index: number): void {
  if (!elements) return;

  const step = steps[index];
  const target = step.target ? document.querySelector(step.target) : null;

  elements.title.textContent = step.title;
  elements.text.textContent = step.text;
  elements.counter.textContent = `${index + 1} / ${steps.length}`;
  elements.prevBtn.hidden = index === 0;
  elements.nextBtn.textContent = index === steps.length - 1 ? 'Готово' : 'Далее';

  if (target) {
    elements.overlay.style.background = 'transparent';
    elements.spotlight.hidden = false;

    const rect = target.getBoundingClientRect();
    const alreadyInView = rect.top >= 0 && rect.bottom <= window.innerHeight;

    const doPosition = () => {
      if (!elements) return;
      positionSpotlight(target);
      positionTooltip(target, step.placement);
    };

    if (alreadyInView) {
      lockPageScroll();
      requestAnimationFrame(doPosition);
    } else {
      unlockPageScroll();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });

      let done = false;
      const settle = () => {
        if (done) return;
        done = true;
        window.removeEventListener('scrollend', settle);
        lockPageScroll();
        doPosition();
      };

      // scrollend fires when smooth scroll completes (Chrome 109+, Firefox 109+)
      window.addEventListener('scrollend', settle, { once: true });
      // Fallback for older browsers or when element is already close to view
      setTimeout(settle, 420);
    }
  } else {
    lockPageScroll();
    elements.spotlight.hidden = true;
    elements.overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    positionTooltip(null, 'center');
  }

  elements.tooltip.classList.add('tour-tooltip--visible');
}

function cleanup(): void {
  if (!elements) return;

  document.removeEventListener('keydown', handleKeydown);
  resizeObserver?.disconnect();
  resizeObserver = null;
  scrollCleanup?.();
  scrollCleanup = null;
  routeChangeCleanup?.();
  routeChangeCleanup = null;
  unlockPageScroll();

  elements.overlay.remove();
  elements.spotlight.remove();
  elements.tooltip.remove();
  elements = null;
  currentStep = 0;
  onRouteChange = null;
}

export function cancelTour(): void {
  if (!elements) return;
  cleanup();
  onComplete = null;
}

function next(): void {
  if (!elements) return;
  if (currentStep < steps.length - 1) {
    currentStep++;
    const step = steps[currentStep];

    if (step.route && onRouteChange && !window.location.pathname.startsWith(step.route)) {
      const handler = onRouteChange;
      const savedStep = currentStep;
      cleanup();
      handler(step.route, savedStep);
      return;
    }

    renderStep(currentStep);
  } else {
    stop();
  }
}

function prev(): void {
  if (!elements || currentStep === 0) return;
  currentStep--;
  renderStep(currentStep);
}

export function stop(): void {
  if (!elements) return;
  cleanup();
  onboardingState.markCompleted();
  onComplete?.();
  onComplete = null;
}

export function startTour(
  tourSteps: TourStep[],
  fromStep = 0,
  onDone?: () => void,
  navigateFn?: (route: string, stepIndex: number) => void,
): void {
  if (elements) cancelTour();

  steps = tourSteps;
  currentStep = fromStep;
  onComplete = onDone ?? null;
  onRouteChange = navigateFn ?? null;

  setTimeout(() => {
    elements = createElement();

    // Re-position spotlight on scroll (user may scroll manually)
    const onScroll = () => repositionCurrent();
    window.addEventListener('scroll', onScroll, { passive: true });
    scrollCleanup = () => window.removeEventListener('scroll', onScroll);

    const handleRouteChange = () => cancelTour();
    window.addEventListener('locationchange', handleRouteChange);
    routeChangeCleanup = () => window.removeEventListener('locationchange', handleRouteChange);

    // Re-render on resize / orientation change
    resizeObserver = new ResizeObserver(() => {
      if (elements) renderStep(currentStep);
    });
    resizeObserver.observe(document.body);

    requestAnimationFrame(() => renderStep(currentStep));
  }, 0);
}
