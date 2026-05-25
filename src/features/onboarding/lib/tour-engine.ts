import '../ui/onboarding.scss';
import { type TourStep } from './tour-steps';
import { onboardingState } from '../model/onboarding-state';

const SPOTLIGHT_PADDING = 10;
const TOOLTIP_OFFSET = 16;
const TOOLTIP_ARROW_SIZE = 8;

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
let onComplete: (() => void) | null = null;
let onRouteChange: ((route: string, stepIndex: number) => void) | null = null;

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
  el.skipBtn.addEventListener('click', () => stop(true));

  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleDocumentClick);

  return el;
}

function handleDocumentClick(e: MouseEvent): void {
  if (!elements) return;
  if (!elements.tooltip.contains(e.target as Node)) {
    stop(true);
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') stop(true);
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
}

function positionSpotlight(target: Element): DOMRect {
  const rect = target.getBoundingClientRect();

  // Spotlight is position:fixed — viewport coordinates directly from getBoundingClientRect
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

  return rect;
}

function positionTooltip(target: Element | null, placement: TourStep['placement']): void {
  const tooltip = elements!.tooltip;
  tooltip.dataset.placement = placement;

  // Tooltip is position:fixed — all coordinates are viewport-relative, no scrollY needed
  if (!target || placement === 'center') {
    tooltip.style.cssText = `
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    return;
  }

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
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    requestAnimationFrame(() => {
      positionSpotlight(target);
      positionTooltip(target, step.placement);
    });
  } else {
    elements.spotlight.hidden = true;
    elements.overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    positionTooltip(null, 'center');
  }

  elements.tooltip.classList.add('tour-tooltip--visible');
}

function cleanup(): void {
  if (!elements) return;

  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', handleDocumentClick);
  resizeObserver?.disconnect();
  resizeObserver = null;

  elements.overlay.remove();
  elements.spotlight.remove();
  elements.tooltip.remove();
  elements = null;
  currentStep = 0;
  onRouteChange = null;
}

function next(): void {
  if (!elements) return;
  if (currentStep < steps.length - 1) {
    currentStep++;
    const step = steps[currentStep];

    // If this step requires a different page, hand off to the navigation callback
    if (step.route && onRouteChange && !window.location.pathname.startsWith(step.route)) {
      const handler = onRouteChange;
      const savedStep = currentStep;
      cleanup();
      handler(step.route, savedStep);
      return;
    }

    renderStep(currentStep);
  } else {
    stop(false);
  }
}

function prev(): void {
  if (!elements || currentStep === 0) return;
  currentStep--;
  renderStep(currentStep);
}

export function stop(skipped = false): void {
  if (!elements) return;
  cleanup();
  if (!skipped) {
    onboardingState.markCompleted();
  }
  onComplete?.();
  onComplete = null;
}

export function startTour(
  tourSteps: TourStep[],
  fromStep = 0,
  onDone?: () => void,
  navigateFn?: (route: string, stepIndex: number) => void,
): void {
  if (elements) stop(true);

  steps = tourSteps;
  currentStep = fromStep;
  onComplete = onDone ?? null;
  onRouteChange = navigateFn ?? null;

  // Defer createElement so the click that triggered startTour doesn't
  // immediately fire handleDocumentClick and close the tour.
  setTimeout(() => {
    elements = createElement();

    resizeObserver = new ResizeObserver(() => {
      if (elements) renderStep(currentStep);
    });
    resizeObserver.observe(document.body);

    requestAnimationFrame(() => renderStep(currentStep));
  }, 0);
}
