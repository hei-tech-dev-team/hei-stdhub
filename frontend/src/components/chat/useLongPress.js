import { useRef, useCallback } from "react";

export function useLongPress(onLongPress, onTap, delay = 500) {
  const timer = useRef(null);
  const fired = useRef(false);

  const touchStart = useCallback((e) => {
    fired.current = false;
    timer.current = setTimeout(() => {
      fired.current = true;
      onLongPress(e);
    }, delay);
  }, [onLongPress, delay]);

  const touchMove = useCallback(() => {
    clearTimeout(timer.current);
    fired.current = false;
  }, []);

  const touchEnd = useCallback((e) => {
    clearTimeout(timer.current);
    if (!fired.current) {
      onTap?.(e);
    } else {
      e.preventDefault();
    }
  }, [onTap]);

  return {
    onClick: onTap,

    onTouchStart: touchStart,
    onTouchEnd: touchEnd,
    onTouchMove: touchMove,
  };
}