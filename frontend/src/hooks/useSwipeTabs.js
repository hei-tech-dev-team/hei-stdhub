import { useMemo, useRef } from "react";
import {
  getAdjacentTab,
  getSwipeTabDirection,
} from "../utils/swipeTabs.js";

const INTERACTIVE_SELECTOR =
  "input, textarea, select, [contenteditable='true'], [data-swipe-ignore]";

const isInteractiveTarget = (target) =>
  typeof target?.closest === "function" &&
  Boolean(target.closest(INTERACTIVE_SELECTOR));

const isHorizontalScroller = (node) => {
  if (!node || typeof node.scrollWidth !== "number") return false;

  const style = window.getComputedStyle(node);
  return (
    (style.overflowX === "auto" || style.overflowX === "scroll") &&
    node.scrollWidth > node.clientWidth
  );
};

const startsInHorizontalScroller = (target, boundary) => {
  let node = target;
  while (node && node !== boundary) {
    if (isHorizontalScroller(node)) return true;
    node = node.parentElement;
  }
  return false;
};

/**
 * Add horizontal swipe navigation to an existing tab group.
 *
 * The hook is intentionally DOM-light: it only records the initial touch and
 * decides on release, so normal vertical scrolling, taps and child controls
 * keep working. Callers spread the returned handlers onto the tab content.
 */
export default function useSwipeTabs({
  tabs,
  activeTab,
  onChange,
  enabled = true,
}) {
  const startRef = useRef(null);

  const handlers = useMemo(() => {
    if (!enabled) return {};

    const handleTouchStart = (event) => {
      if (event.touches.length !== 1) {
        startRef.current = null;
        return;
      }

      if (isInteractiveTarget(event.target)) {
        startRef.current = null;
        return;
      }

      if (startsInHorizontalScroller(event.target, event.currentTarget)) {
        startRef.current = null;
        return;
      }

      const touch = event.touches[0];
      startRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        startedAt: Date.now(),
      };
    };

    const handleTouchEnd = (event) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;

      const touch = event.changedTouches?.[0];
      if (!touch) return;

      const direction = getSwipeTabDirection({
        deltaX: touch.clientX - start.x,
        deltaY: touch.clientY - start.y,
        durationMs: Date.now() - start.startedAt,
        touchCount: event.changedTouches.length,
      });
      if (!direction) return;

      const nextTab = getAdjacentTab(tabs, activeTab, direction);
      if (nextTab && nextTab !== activeTab) onChange(nextTab);
    };

    const handleTouchCancel = () => {
      startRef.current = null;
    };

    return {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    };
  }, [tabs, activeTab, onChange, enabled]);

  return handlers;
}
