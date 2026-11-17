import { useEffect, useRef } from "react";
import {
  getSwipeTabDirection,
  isInteractiveTarget,
  startsInFixedLayer,
  startsInHorizontalScroller,
} from "../utils/swipeTabs.js";

/**
 * Page-level horizontal swipe detection.
 *
 * The hook only observes touches and never calls preventDefault, which keeps
 * vertical scrolling and pull-to-refresh untouched. The caller decides which
 * routes are eligible and where a recognised direction should navigate.
 */
export default function usePageSwipe({ enabled = true, onSwipe }) {
  const startRef = useRef(null);
  const onSwipeRef = useRef(onSwipe);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  useEffect(() => {
    if (!enabled) {
      startRef.current = null;
      return undefined;
    }

    const handleTouchStart = (event) => {
      if (event.touches.length !== 1) {
        startRef.current = null;
        return;
      }

      if (
        isInteractiveTarget(event.target) ||
        startsInHorizontalScroller(event.target, document.documentElement) ||
        startsInFixedLayer(event.target)
      ) {
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
      if (direction) onSwipeRef.current?.(direction);
    };

    const handleTouchCancel = () => {
      startRef.current = null;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
      startRef.current = null;
    };
  }, [enabled]);
}
