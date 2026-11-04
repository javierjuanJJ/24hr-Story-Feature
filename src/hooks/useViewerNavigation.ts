/**
 * Hook that drives the full-screen story viewer navigation and the
 * auto-advance timer.
 *
 * It must be rendered inside <Stories> so that useStoriesContext and
 * useViewerContext can read the library context provided there.
 *
 * Responsibilities:
 *  - Keep an imperative handle (handleRef.current) up to date so the parent
 *    can call show / next / previous / open / close.
 *  - Report viewer open/close and current index back to the parent via
 *    onSnapshot.
 *  - Run a 60s auto-advance timer that updates the progress bar and moves to
 *    the next story (or closes the viewer) when time runs out.
 *
 * @param handleRef - ref where the imperative navigation handle is stored
 * @param onSnapshot - callback receiving { open, index } when viewer state changes
 * @param setTimerProgress - callback receiving timer progress for the progress bar
 */

import { useCallback, useEffect, useRef } from "react";
import { useStoriesContext, useViewerContext } from "@react-instastories/base";
import { AUTO_ADVANCE_MS } from "@/consts";
import { TimerProgressValue } from "@/interfaces";
import { ViewerControlsHandle, ViewerSnapshot } from "@/interfaces";

export function useViewerNavigation({
  handleRef,
  onSnapshot,
  setTimerProgress,
}: {
  handleRef: React.RefObject<ViewerControlsHandle | null>;
  onSnapshot: (snapshot: ViewerSnapshot) => void;
  setTimerProgress: (v: TimerProgressValue) => void;
}) {
  const stories = useStoriesContext();
  const viewer = useViewerContext();

  const mounted = viewer.mounted;
  const current = stories.current;
  const length = stories.length;

  // Refresh the imperative handle after every render so <App /> always calls
  // the latest context functions.
  useEffect(() => {
    handleRef.current = {
      show: (index: number) => stories.show(index),
      next: () => stories.next(),
      previous: () => stories.previous(),
      open: () => viewer.open(),
      close: () => viewer.close(),
    };
  });

  // Notify the parent whenever the viewer open state or current index changes.
  useEffect(() => {
    onSnapshot({ open: mounted, index: current });
  }, [mounted, current, onSnapshot]);

  // Own timer so the progress bar works reliably.
  // duration comes from the library config (AUTO_ADVANCE_MS), time advances
  // every 100 ms while the viewer is open and a story is active.
  const duration = AUTO_ADVANCE_MS;
  const timeRef = useRef(0);

  useEffect(() => {
    if (!mounted || current < 0) {
      timeRef.current = 0;
      setTimerProgress({ time: 0, duration, current: -1, length });
      return;
    }
    timeRef.current = 0;
    setTimerProgress({ time: 0, duration, current, length });
    const id = window.setInterval(() => {
      timeRef.current = Math.min(timeRef.current + 100, duration);
      setTimerProgress({ time: timeRef.current, duration, current, length });
    }, 100);
    return () => window.clearInterval(id);
  }, [mounted, current, duration, length, setTimerProgress]);
}
