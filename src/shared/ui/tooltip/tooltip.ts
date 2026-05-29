import './tooltip.scss';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

const TOOLTIP_SELECTOR =
  '[data-tooltip], [title], button[aria-label], a[aria-label], [role="button"][aria-label]';
const SHOW_DELAY_MS = 180;
const TOUCH_DELAY_MS = 420;
const VIEWPORT_PADDING = 12;
const TARGET_GAP = 10;

let initialized = false;
let tooltip: HTMLDivElement | null = null;
let activeTarget: HTMLElement | null = null;
let showTimer: number | null = null;
let touchTimer: number | null = null;
let lastPointerType: string | null = null;

function getTooltipElement(): HTMLDivElement {
  if (tooltip) {
    return tooltip;
  }

  tooltip = document.createElement('div');
  tooltip.className = 'app-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.appendChild(tooltip);
  return tooltip;
}

function clearTimer(timer: number | null): void {
  if (timer !== null) {
    window.clearTimeout(timer);
  }
}

function isDisabled(target: HTMLElement): boolean {
  return (
    target.dataset.tooltipDisabled === 'true' ||
    target.hasAttribute('disabled') ||
    target.getAttribute('aria-disabled') === 'true'
  );
}

function isInteractiveIconOnly(target: HTMLElement): boolean {
  if (
    target.tagName !== 'BUTTON' &&
    target.tagName !== 'A' &&
    target.getAttribute('role') !== 'button'
  ) {
    return false;
  }

  const visibleText = (target.textContent || '').replace(/\s+/g, '').trim();
  return visibleText.length <= 2;
}

function getTooltipText(target: HTMLElement): string {
  const explicitText = target.dataset.tooltip?.trim();
  if (explicitText) {
    return explicitText;
  }

  const titleText = target.getAttribute('title')?.trim();
  if (titleText) {
    return titleText;
  }

  if (isInteractiveIconOnly(target)) {
    return target.getAttribute('aria-label')?.trim() || '';
  }

  return '';
}

function findTooltipTarget(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) {
    return null;
  }

  const target = node.closest<HTMLElement>(TOOLTIP_SELECTOR);
  if (!target || target.closest('.app-tooltip, .tour-tooltip')) {
    return null;
  }

  if (isDisabled(target) || !getTooltipText(target)) {
    return null;
  }

  return target;
}

function storeNativeTitle(target: HTMLElement): void {
  const nativeTitle = target.getAttribute('title');
  if (!nativeTitle) {
    return;
  }

  target.dataset.tooltipNativeTitle = nativeTitle;
  target.removeAttribute('title');
}

function restoreNativeTitle(target: HTMLElement | null): void {
  const nativeTitle = target?.dataset.tooltipNativeTitle;
  if (!target || !nativeTitle) {
    return;
  }

  target.setAttribute('title', nativeTitle);
  delete target.dataset.tooltipNativeTitle;
}

function getPreferredPlacement(target: HTMLElement): TooltipPlacement {
  const placement = target.dataset.tooltipPlacement || target.dataset.tooltipPosition;
  if (
    placement === 'top' ||
    placement === 'bottom' ||
    placement === 'left' ||
    placement === 'right'
  ) {
    return placement;
  }

  return 'top';
}

function getOppositePlacement(placement: TooltipPlacement): TooltipPlacement {
  switch (placement) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

function getPlacementOrder(preferred: TooltipPlacement): TooltipPlacement[] {
  const fallback: TooltipPlacement[] = ['top', 'bottom', 'right', 'left'];
  return [
    preferred,
    getOppositePlacement(preferred),
    ...fallback.filter(
      (placement) =>
        placement !== preferred && placement !== getOppositePlacement(preferred),
    ),
  ];
}

function getCandidatePosition(
  placement: TooltipPlacement,
  targetRect: DOMRect,
  tooltipRect: DOMRect,
): { top: number; left: number } {
  switch (placement) {
    case 'bottom':
      return {
        top: targetRect.bottom + TARGET_GAP,
        left: targetRect.left + targetRect.width / 2 - tooltipRect.width / 2,
      };
    case 'left':
      return {
        top: targetRect.top + targetRect.height / 2 - tooltipRect.height / 2,
        left: targetRect.left - tooltipRect.width - TARGET_GAP,
      };
    case 'right':
      return {
        top: targetRect.top + targetRect.height / 2 - tooltipRect.height / 2,
        left: targetRect.right + TARGET_GAP,
      };
    case 'top':
    default:
      return {
        top: targetRect.top - tooltipRect.height - TARGET_GAP,
        left: targetRect.left + targetRect.width / 2 - tooltipRect.width / 2,
      };
  }
}

function fitsViewport(position: { top: number; left: number }, rect: DOMRect): boolean {
  return (
    position.top >= VIEWPORT_PADDING &&
    position.left >= VIEWPORT_PADDING &&
    position.top + rect.height <= window.innerHeight - VIEWPORT_PADDING &&
    position.left + rect.width <= window.innerWidth - VIEWPORT_PADDING
  );
}

function clampPosition(position: { top: number; left: number }, rect: DOMRect): {
  top: number;
  left: number;
} {
  return {
    top: Math.max(
      VIEWPORT_PADDING,
      Math.min(position.top, window.innerHeight - rect.height - VIEWPORT_PADDING),
    ),
    left: Math.max(
      VIEWPORT_PADDING,
      Math.min(position.left, window.innerWidth - rect.width - VIEWPORT_PADDING),
    ),
  };
}

function positionTooltip(target: HTMLElement): void {
  const tip = getTooltipElement();
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tip.getBoundingClientRect();
  const placements = getPlacementOrder(getPreferredPlacement(target));
  let selectedPlacement = placements[0];
  let selectedPosition = getCandidatePosition(
    selectedPlacement,
    targetRect,
    tooltipRect,
  );

  for (const placement of placements) {
    const position = getCandidatePosition(placement, targetRect, tooltipRect);
    if (fitsViewport(position, tooltipRect)) {
      selectedPlacement = placement;
      selectedPosition = position;
      break;
    }
  }

  const clamped = clampPosition(selectedPosition, tooltipRect);
  tip.dataset.placement = selectedPlacement;
  tip.style.top = `${Math.round(clamped.top)}px`;
  tip.style.left = `${Math.round(clamped.left)}px`;
}

function hideTooltip(): void {
  clearTimer(showTimer);
  clearTimer(touchTimer);
  showTimer = null;
  touchTimer = null;

  const tip = getTooltipElement();
  tip.classList.remove('app-tooltip--visible');
  tip.hidden = true;
  restoreNativeTitle(activeTarget);
  activeTarget = null;
}

function showTooltip(target: HTMLElement): void {
  const text = getTooltipText(target);
  if (!text) {
    return;
  }

  if (activeTarget && activeTarget !== target) {
    restoreNativeTitle(activeTarget);
  }

  activeTarget = target;
  storeNativeTitle(target);

  const tip = getTooltipElement();
  tip.textContent = text;
  tip.hidden = false;
  tip.classList.remove('app-tooltip--visible');

  requestAnimationFrame(() => {
    if (activeTarget !== target) {
      return;
    }

    positionTooltip(target);
    tip.classList.add('app-tooltip--visible');
  });
}

function scheduleTooltip(target: HTMLElement, delay: number): void {
  clearTimer(showTimer);
  showTimer = window.setTimeout(() => showTooltip(target), delay);
}

function handlePointerOver(event: PointerEvent): void {
  if (event.pointerType === 'touch') {
    return;
  }

  lastPointerType = event.pointerType;
  const target = findTooltipTarget(event.target);
  if (!target || target === activeTarget) {
    return;
  }

  scheduleTooltip(target, SHOW_DELAY_MS);
}

function handlePointerOut(event: PointerEvent): void {
  if (!activeTarget && showTimer === null) {
    return;
  }

  const relatedTarget = event.relatedTarget;
  if (relatedTarget instanceof Node && activeTarget?.contains(relatedTarget)) {
    return;
  }

  hideTooltip();
}

function handlePointerDown(event: PointerEvent): void {
  lastPointerType = event.pointerType;

  if (event.pointerType !== 'touch') {
    hideTooltip();
    return;
  }

  const target = findTooltipTarget(event.target);
  if (!target) {
    hideTooltip();
    return;
  }

  clearTimer(touchTimer);
  touchTimer = window.setTimeout(() => showTooltip(target), TOUCH_DELAY_MS);
}

function handlePointerUp(): void {
  clearTimer(touchTimer);
  touchTimer = null;
}

function handleFocusIn(event: FocusEvent): void {
  if (lastPointerType === 'mouse') {
    return;
  }

  const target = findTooltipTarget(event.target);
  if (target) {
    scheduleTooltip(target, 0);
  }
}

function handleFocusOut(): void {
  hideTooltip();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    hideTooltip();
  }
}

function handleViewportChange(): void {
  if (activeTarget) {
    positionTooltip(activeTarget);
  }
}

export function initCustomTooltips(): void {
  if (initialized) {
    return;
  }

  initialized = true;
  document.addEventListener('pointerover', handlePointerOver);
  document.addEventListener('pointerout', handlePointerOut);
  document.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('pointerup', handlePointerUp);
  document.addEventListener('pointercancel', handlePointerUp);
  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('focusout', handleFocusOut);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('scroll', hideTooltip, { passive: true });
  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('locationchange', hideTooltip);
}
