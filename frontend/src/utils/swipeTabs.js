export const SWIPE_MIN_HORIZONTAL_PX = 50;
export const SWIPE_MAX_VERTICAL_PX = 40;
export const SWIPE_MAX_DURATION_MS = 700;
export const SWIPE_HORIZONTAL_RATIO = 1.5;

export const SWIPE_INTERACTIVE_SELECTOR =
  "input, textarea, select, [contenteditable='true'], [data-swipe-ignore]";

export function isInteractiveTarget(target) {
  return (
    typeof target?.closest === "function" &&
    Boolean(target.closest(SWIPE_INTERACTIVE_SELECTOR))
  );
}

export function isHorizontalScroller(node) {
  if (!node || typeof node.scrollWidth !== "number") return false;

  const style = window.getComputedStyle(node);
  return (
    (style.overflowX === "auto" || style.overflowX === "scroll") &&
    node.scrollWidth > node.clientWidth
  );
}

export function startsInHorizontalScroller(target, boundary = null) {
  let node = target;
  while (node && node !== boundary) {
    if (isHorizontalScroller(node)) return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * Fixed layers (modals, drawers, action sheets) own their own gestures and
 * must never trigger page navigation.
 */
export function startsInFixedLayer(target) {
  let node = target;
  while (node && node !== document.documentElement) {
    if (
      node.getAttribute?.("role") === "dialog" ||
      node.getAttribute?.("aria-modal") === "true"
    ) {
      return true;
    }

    if (window.getComputedStyle(node).position === "fixed") return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * Resolve a horizontal touch gesture into tab navigation direction.
 *
 * The thresholds keep vertical scrolling and taps usable: a gesture must be
 * clearly horizontal, short enough, and start with a single finger. Returning
 * `null` means "not a tab swipe" so callers leave the current tab untouched.
 */
export function getSwipeTabDirection({
  deltaX,
  deltaY,
  durationMs,
  touchCount = 1,
}) {
  if (touchCount !== 1) return null;
  if (durationMs > SWIPE_MAX_DURATION_MS) return null;

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < SWIPE_MIN_HORIZONTAL_PX) return null;
  if (absY >= SWIPE_MAX_VERTICAL_PX) return null;
  if (absX <= absY * SWIPE_HORIZONTAL_RATIO) return null;

  return deltaX < 0 ? "next" : "previous";
}

/**
 * Return the neighbour tab for a given direction, or `null` at the edges.
 * Keeping this separate from the gesture detection makes the wrap/no-wrap
 * behaviour explicit and easy to test.
 */
export function getAdjacentTab(tabs, activeTab, direction) {
  const index = tabs.indexOf(activeTab);
  if (index === -1) return null;

  const nextIndex = direction === "next" ? index + 1 : index - 1;
  return tabs[nextIndex] ?? null;
}
