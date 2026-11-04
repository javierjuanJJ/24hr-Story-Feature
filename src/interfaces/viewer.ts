/**
 * TypeScript interfaces related to the full-screen story viewer.
 *
 * Centralizing interfaces here keeps the type definitions in one place and
 * separates "what the data looks like" from "how the data is used".
 */

/**
 * Imperative handle exposed by ViewerControls.
 *
 * Allows the parent App to programmatically open/close the viewer and
 * navigate between stories (show / next / previous).
 */
export interface ViewerControlsHandle {
  show(index: number): void;
  next(): void;
  previous(): void;
  open(): void;
  close(): void;
}

/**
 * Snapshot of the viewer state reported back to App.
 *
 * - open:  whether the full-screen viewer is currently open
 * - index: index of the story currently displayed inside the viewer
 */
export interface ViewerSnapshot {
  open: boolean;
  index: number;
}
