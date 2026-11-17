import { useEffect, useRef, useState } from "react";
import {
  PULL_TRIGGER_THRESHOLD_PX,
  getPullDistance,
  shouldStartPull,
  shouldTriggerRefresh,
} from "../utils/pullToRefresh.js";

const IGNORE_SELECTOR =
  "input, textarea, select, [contenteditable='true'], [data-pull-to-refresh-ignore]";

const getScrollContainer = (target) => {
  let node = target;
  while (node && node !== document.documentElement) {
    if (typeof node.getBoundingClientRect !== "function") {
      node = node.parentElement;
      continue;
    }

    const style = window.getComputedStyle(node);
    if (style.overflowY === "auto" || style.overflowY === "scroll") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

const shouldIgnoreTarget = (target, boundary) => {
  let node = target;
  while (node && node !== boundary) {
    if (typeof node.getBoundingClientRect !== "function") {
      node = node.parentElement;
      continue;
    }

    if (
      node.matches?.(IGNORE_SELECTOR) ||
      node.getAttribute?.("role") === "dialog" ||
      node.getAttribute?.("aria-modal") === "true"
    ) {
      return true;
    }

    // Modals and fixed panels are rendered inside list pages. They must never
    // start a page refresh, even when their content is at scrollTop 0.
    if (window.getComputedStyle(node).position === "fixed") return true;
    node = node.parentElement;
  }
  return false;
};

/**
 * Add pull-to-refresh to a scroll container without duplicating fetch logic.
 * The caller supplies its existing reload function and spreads the returned
 * indicator values into the shared PullToRefreshIndicator component.
 */
export default function usePullToRefresh({
  rootRef,
  onRefresh,
  enabled = true,
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const gestureRef = useRef(null);
  const refreshingRef = useRef(false);
  const mountedRef = useRef(true);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      gestureRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) {
      gestureRef.current = null;
      setPullDistance(0);
      return undefined;
    }

    const resetGesture = () => {
      gestureRef.current = null;
      if (mountedRef.current) setPullDistance(0);
    };

    const handleTouchStart = (event) => {
      if (refreshingRef.current || event.touches.length !== 1) {
        resetGesture();
        return;
      }

      if (shouldIgnoreTarget(event.target, root)) {
        resetGesture();
        return;
      }

      const scrollContainer = getScrollContainer(event.target) ?? root;
      if (scrollContainer.scrollTop > 0) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        scrollContainer,
        claimed: false,
        distance: 0,
      };
    };

    const handleTouchMove = (event) => {
      const gesture = gestureRef.current;
      if (!gesture) return;

      if (event.touches.length !== 1) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (!gesture.claimed) {
        // Let horizontal swipes and upward scrolling continue untouched.
        if (deltaY <= 0 || Math.abs(deltaX) > deltaY) {
          resetGesture();
          return;
        }

        if (
          !shouldStartPull({
            deltaX,
            deltaY,
            scrollTop: gesture.scrollContainer.scrollTop,
          })
        ) {
          return;
        }

        gesture.claimed = true;
      }

      if (gesture.scrollContainer.scrollTop > 0) {
        resetGesture();
        return;
      }

      if (event.cancelable) event.preventDefault();
      gesture.distance = getPullDistance(deltaY);
      setPullDistance(gesture.distance);
    };

    const handleTouchEnd = async () => {
      const gesture = gestureRef.current;
      gestureRef.current = null;

      if (!gesture?.claimed || !shouldTriggerRefresh(gesture.distance)) {
        if (mountedRef.current) setPullDistance(0);
        return;
      }

      if (refreshingRef.current) {
        if (mountedRef.current) setPullDistance(0);
        return;
      }

      refreshingRef.current = true;
      setRefreshing(true);
      setPullDistance(PULL_TRIGGER_THRESHOLD_PX);

      try {
        await onRefreshRef.current?.();
      } catch (err) {
        console.error("Pull-to-refresh failed:", err);
      } finally {
        refreshingRef.current = false;
        if (mountedRef.current) {
          setRefreshing(false);
          setPullDistance(0);
        }
      }
    };

    const handleTouchCancel = () => {
      resetGesture();
    };

    root.addEventListener("touchstart", handleTouchStart, { passive: true });
    root.addEventListener("touchmove", handleTouchMove, { passive: false });
    root.addEventListener("touchend", handleTouchEnd);
    root.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      root.removeEventListener("touchstart", handleTouchStart);
      root.removeEventListener("touchmove", handleTouchMove);
      root.removeEventListener("touchend", handleTouchEnd);
      root.removeEventListener("touchcancel", handleTouchCancel);
      gestureRef.current = null;
    };
  }, [enabled, rootRef]);

  return { pullDistance, refreshing };
}
