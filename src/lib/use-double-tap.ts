import { useRef } from "react";

/** Single tap vs double tap. Double tap wins if the second tap arrives within `ms`. */
export function useDoubleTap(onDouble: () => void, onSingle?: () => void, ms = 280) {
  const last = useRef(0);
  const timer = useRef<number | null>(null);

  return () => {
    const now = Date.now();
    if (now - last.current < ms) {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      last.current = 0;
      onDouble();
      return;
    }
    last.current = now;
    if (!onSingle) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onSingle();
    }, ms);
  };
}
