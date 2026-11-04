/**
 * Hook that adds swipe navigation (left/right) to the story viewer.
 *
 * Works for touch gestures on mobile and mouse drags on desktop.
 * A swipe is detected only when the horizontal movement is clearly larger
 * than the vertical movement and exceeds a 50px threshold.
 *
 * - Swipe left  (dx < 0) -> go to the next story
 * - Swipe right (dx > 0) -> go to the previous story
 *
 * @param viewerOpen - whether the viewer is currently open (handlers only attach when open)
 * @param goNext - callback to move to the next story
 * @param goPrevious - callback to move to the previous story
 */

import { useEffect, useRef } from "react";

export function useSwipe({
  viewerOpen,
  goNext,
  goPrevious,
}: {
  viewerOpen: boolean;
  goNext: () => void;
  goPrevious: () => void;
}) {
  // Keep the latest callbacks in a ref so the event listeners always call
  // the current versions without needing to re-attach listeners.
  const swipeRef = useRef({ goNext, goPrevious });
  useEffect(() => {
    swipeRef.current = { goNext, goPrevious };
  });

  useEffect(() => {
    if (!viewerOpen) return;

    const handleSwipe = (dx: number, dy: number) => {
      // Ignore mostly-vertical gestures and tiny movements.
      if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) <= 50) return;
      if (dx < 0) swipeRef.current.goNext();
      else swipeRef.current.goPrevious();
    };

    // Touch tracking (mobile).
    let touchX = 0;
    let touchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchX = touch.clientX;
      touchY = touch.clientY;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      handleSwipe(touch.clientX - touchX, touch.clientY - touchY);
    };

    // Mouse tracking (desktop).
    let mouseX = 0;
    let mouseY = 0;
    let mouseDown = false;
    const onMouseDown = (event: MouseEvent) => {
      mouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    const onMouseUp = (event: MouseEvent) => {
      if (!mouseDown) return;
      mouseDown = false;
      handleSwipe(event.clientX - mouseX, event.clientY - mouseY);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [viewerOpen]);
}
