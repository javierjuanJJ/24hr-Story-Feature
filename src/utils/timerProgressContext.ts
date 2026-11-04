/**
 * Utility: shared React context for story timer progress.
 *
 * The ViewerControls component (which lives inside <Stories>) computes the
 * auto-advance timer progress, but the StoryTimeline component (which lives
 * outside <Stories>, in the overlay) needs to render it. This context lets
 * ViewerControls pass the progress up to App, which passes it down to
 * StoryTimeline.
 */

/**
 * Context used to share story progress from ViewerControls up to <App />,
 * which renders the overlay timeline.
 *
 * App provides the current timerProgress value; StoryTimeline consumes it to
 * render the Instagram-style progress bar.
 */
import { createContext } from "react";
import { TimerProgressValue } from "@/interfaces";

export const AppTimerProgressContext =
  createContext<TimerProgressValue | null>(null);
