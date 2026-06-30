import { useRef, useCallback } from "react";

export function useLongPress(onLongPress, onTap, delay = 500) {
  const timer = useRef(null);
  const fired = useRef(false);
  const touched = useRef(false);
  const moved = useRef(false);

  const touchStart = useCallback((e) => {
    e.preventDefault();
    touched.current = true;
    fired.current = false;
    moved.current = false;
    timer.current = setTimeout(() => {
      fired.current = true;
      onLongPress(e);
    }, delay);
  }, [onLongPress, delay]);

  const touchMove = useCallback(() => {
    clearTimeout(timer.current);
    moved.current = true;
  }, []);

  const touchEnd = useCallback((e) => {
    clearTimeout(timer.current);
    if (fired.current) {
      e.preventDefault();
    } else if (!moved.current) {
      e.preventDefault();
      onTap?.(e);
    }
  }, [onTap]);

  return {
    onClick: (e) => {
      if (touched.current) { touched.current = false; return; }
      if (!fired.current) onTap?.(e);
    },
    onTouchStart: touchStart,
    onTouchEnd: touchEnd,
    onTouchMove: touchMove,
  };
}