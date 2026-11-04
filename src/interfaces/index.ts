/**
 * Barrel export for the interfaces folder.
 *
 * Re-exports every TypeScript interface/type so the app can import from a
 * single path: import { StoryItem, ViewerSnapshot } from "@/interfaces";
 */
export type { StoryItem, TimerProgressValue } from "./story";
export type { ViewerControlsHandle, ViewerSnapshot } from "./viewer";
