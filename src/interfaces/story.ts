/**
 * TypeScript interfaces related to stories.
 *
 * Centralizing interfaces here keeps the type definitions in one place and
 * separates "what the data looks like" from "how the data is used".
 */

/**
 * Represents a single story uploaded by the user.
 *
 * - id:        unique identifier generated when the image is uploaded
 * - base64:    image data encoded as a base64 string (without the data URL prefix)
 * - timestamp: when the story was uploaded (Date.now()), used to compute expiry
 */
export interface StoryItem {
  id: string;
  base64: string;
  timestamp: number;
}

/**
 * Snapshot of the auto-advance timer progress.
 * Used to render the Instagram-style progress bar above each story.
 */
export interface TimerProgressValue {
  time: number; // elapsed milliseconds for the current story
  duration: number; // total milliseconds per story (AUTO_ADVANCE_MS)
  current: number; // index of the story currently being shown (-1 = none)
  length: number; // total number of stories
}
