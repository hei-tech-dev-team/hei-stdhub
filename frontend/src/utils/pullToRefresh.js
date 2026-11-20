export const PULL_START_THRESHOLD_PX = 8;
export const PULL_TRIGGER_THRESHOLD_PX = 64;
export const PULL_MAX_DISTANCE_PX = 96;
export const PULL_RESISTANCE = 0.55;
export const PULL_VERTICAL_DOMINANCE = 1.1;

/**
 * A pull-to-refresh gesture must be a deliberate downward drag started at the
 * top of the scroll container. Requiring vertical dominance keeps horizontal
 * tab swipes and normal vertical scrolling usable.
 */
export function shouldStartPull({
  deltaX,
  deltaY,
  scrollTop,
  touchCount = 1,
}) {
  if (touchCount !== 1) return false;
  if (scrollTop > 0) return false;
  if (deltaY <= PULL_START_THRESHOLD_PX) return false;

  return deltaY > Math.abs(deltaX) * PULL_VERTICAL_DOMINANCE;
}

/**
 * Damp the raw finger movement so the indicator moves naturally and never
 * pushes the content too far down.
 */
export function getPullDistance(deltaY) {
  if (!Number.isFinite(deltaY) || deltaY <= 0) return 0;
  return Math.min(deltaY * PULL_RESISTANCE, PULL_MAX_DISTANCE_PX);
}

export function shouldTriggerRefresh(pullDistance) {
  return pullDistance >= PULL_TRIGGER_THRESHOLD_PX;
}
