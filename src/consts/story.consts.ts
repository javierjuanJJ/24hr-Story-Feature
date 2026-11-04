/**
 * Application-wide constants for the 24hr story feature.
 *
 * Centralizing these values in one place makes them easy to change and keeps
 * them out of the component logic. Each constant is documented so a junior
 * programmer can understand what it controls.
 */

/**
 * Key used to read/write story images in browser localStorage.
 * Each stored item has the shape { base64: string, timestamp: number }.
 */
export const STORAGE_KEY = "@@storyImages";

/**
 * Maximum allowed width for an uploaded story image, in pixels.
 * Images wider than this are downscaled before being stored.
 */
export const MAX_WIDTH = 1080;

/**
 * Maximum allowed height for an uploaded story image, in pixels.
 * Images taller than this are downscaled before being stored.
 */
export const MAX_HEIGHT = 1920;

/**
 * Story expiration time in milliseconds.
 * Stories older than 24 hours (86_400_000 ms) are considered expired
 * and are removed from the list.
 */
export const EXPIRY_MS = 86_400_000; // 24 hours

/**
 * Maximum number of stories to keep in localStorage.
 * Only the most recent 20 stories are stored to prevent unbounded growth.
 */
export const MAX_STORIES = 20;

/**
 * Time each story is shown in the viewer before auto-advancing,
 * in milliseconds (60 seconds = 60_000 ms).
 */
export const AUTO_ADVANCE_MS = 60_000; // 60 seconds per story
