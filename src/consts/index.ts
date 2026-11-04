/**
 * Barrel export for the consts folder.
 *
 * Re-exports every constant so the rest of the app can import from a single
 * path: import { STORAGE_KEY, MAX_WIDTH } from "@/consts";
 */
export {
  STORAGE_KEY,
  MAX_WIDTH,
  MAX_HEIGHT,
  EXPIRY_MS,
  MAX_STORIES,
  AUTO_ADVANCE_MS,
} from "./story.consts";
