let motionCache: boolean | null = null;

export function resetMotionCache(): void {
  motionCache = null;
}

export function motionAllowed(): boolean {
  if (motionCache !== null) return motionCache;
  if (typeof window === 'undefined' || !window.matchMedia) {
    motionCache = true;
    return motionCache;
  }

  motionCache = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return motionCache;
}
