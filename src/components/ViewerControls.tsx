/**
 * ViewerControls component.
 *
 * ViewerControls is rendered as the last child of <Stories>. It is the only
 * place where both StoriesContext (show/next/previous) and ViewerContext
 * (open/close) are available together.
 *
 * Being the last child keeps every <Story> index stable (0..count-1): the
 * library counts this element in `length`, so all bounds come from our own
 * story count instead.
 *
 * This component returns null; all its work happens through the
 * useViewerNavigation hook (imperative handle, snapshot, auto-advance timer).
 *
 * @param handleRef - ref where the imperative navigation handle is stored
 * @param onSnapshot - callback receiving { open, index } when viewer state changes
 * @param setTimerProgress - callback receiving timer progress for the progress bar
 */

import { RefObject } from "react";
import { useViewerNavigation } from "@/hooks/useViewerNavigation";
import { TimerProgressValue } from "@/interfaces";
import { ViewerControlsHandle, ViewerSnapshot } from "@/interfaces";

export function ViewerControls({
  handleRef,
  onSnapshot,
  setTimerProgress,
}: {
  handleRef: RefObject<ViewerControlsHandle | null>;
  onSnapshot: (snapshot: ViewerSnapshot) => void;
  setTimerProgress: (v: TimerProgressValue) => void;
}) {
  useViewerNavigation({ handleRef, onSnapshot, setTimerProgress });
  return null;
}
