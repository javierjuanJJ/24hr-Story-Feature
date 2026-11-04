#!/usr/bin/env node
/**
 * organize-react-project
 * ======================
 *
 * Command that reorganizes the 24hr Story Feature React project into
 * feature-based folders:
 *
 *   src/consts     -> application-wide constants
 *   src/components -> React components
 *   src/hooks      -> custom React hooks
 *   src/utils      -> utilities / transformers (e.g. image to base64)
 *   src/interfaces -> TypeScript interfaces
 *
 * It also refactors all imports/exports (barrel index files) so nothing
 * loses functionality, and updates the app entry point (main.tsx).
 *
 * Usage:
 *   pnpm run organize-react-project
 *   # or
 *   node scripts/organize-react-project.js
 *
 * Run this from the project root.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a directory (and parents) if it does not exist yet.
 */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Writes (or overwrites) a file under src/ with UTF-8 content.
 */
function writeFile(rel, content) {
  fs.writeFileSync(path.join(SRC, rel), content, "utf8");
  console.log(`  created/updated src/${rel}`);
}

/**
 * Removes a file under src/ if it exists (no error if missing).
 */
function removeFile(rel) {
  fs.rmSync(path.join(SRC, rel), { force: true, recursive: true });
  console.log(`  removed src/${rel}`);
}

/**
 * Replaces the first occurrence of oldStr with newStr in a file under src/.
 */
function replaceInFile(rel, oldStr, newStr) {
  const full = path.join(SRC, rel);
  let content = fs.readFileSync(full, "utf8");
  if (!content.includes(oldStr)) {
    console.log(`  skip (pattern not found): src/${rel}`);
    return;
  }
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(full, content, "utf8");
  console.log(`  updated imports in src/${rel}`);
}

// ---------------------------------------------------------------------------
// Step 1: create the destination folders
// ---------------------------------------------------------------------------

console.log("Creating folders...");
const FOLDERS = ["consts", "components", "hooks", "utils", "interfaces"];
for (const folder of FOLDERS) {
  ensureDir(path.join(SRC, folder));
}

// ---------------------------------------------------------------------------
// Step 2: write the constants (src/consts)
// ---------------------------------------------------------------------------

console.log("\nWriting constants...");
writeFile(
  "consts/story.consts.ts",
  `/**
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
`
);

writeFile(
  "consts/index.ts",
  `/**
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
`
);

// ---------------------------------------------------------------------------
// Step 3: write the interfaces (src/interfaces)
// ---------------------------------------------------------------------------

console.log("\nWriting interfaces...");
writeFile(
  "interfaces/story.ts",
  `/**
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
`
);

writeFile(
  "interfaces/viewer.ts",
  `/**
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
`
);

writeFile(
  "interfaces/index.ts",
  `/**
 * Barrel export for the interfaces folder.
 *
 * Re-exports every TypeScript interface/type so the app can import from a
 * single path: import { StoryItem, ViewerSnapshot } from "@/interfaces";
 */
export type { StoryItem, TimerProgressValue } from "./story";
export type { ViewerControlsHandle, ViewerSnapshot } from "./viewer";
`
);

// ---------------------------------------------------------------------------
// Step 4: write the utilities (src/utils)
// ---------------------------------------------------------------------------

console.log("\nWriting utilities...");
writeFile(
  "utils/id.ts",
  `/**
 * Utility for generating unique identifiers.
 *
 * This file contains the generateId function, which creates a unique ID for
 * each new story so stories can be told apart in the list and localStorage.
 */

/**
 * Generates a unique identifier for a new story.
 *
 * Uses the browser's crypto.randomUUID when available. Falls back to a
 * manual RFC-4122 style UUID built from crypto.getRandomValues, and finally
 * to Math.random as a last resort.
 *
 * @returns a random UUID string
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const buf = new Uint8Array(16);
  try {
    crypto.getRandomValues(buf);
  } catch {
    for (let i = 0; i < 16; i++) buf[i] = Math.floor(Math.random() * 256);
  }

  // Set the UUID version bits (version 4) and variant bits as per RFC 4122.
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;

  const hex = (b: number) => b.toString(16).padStart(2, "0");
  return [
    hex(buf[0]), hex(buf[1]), hex(buf[2]), hex(buf[3]),
    "-", hex(buf[4]), hex(buf[5]), "-",
    hex(buf[6]), hex(buf[7]), "-",
    hex(buf[8]), hex(buf[9]), "-",
    hex(buf[10]), hex(buf[11]), hex(buf[12]), hex(buf[13]), hex(buf[14]), hex(buf[15]),
  ].join("");
}
`
);

writeFile(
  "utils/image.ts",
  `/**
 * Utility for transforming image files.
 *
 * This file contains imageFileToBase64, the "transformer" utility referenced
 * in the project requirements: it transforms a raw File selected by the user
 * into a storable base64 representation, resizing it if needed.
 */

/**
 * Converts an uploaded image file into a base64 string, resizing it first
 * if it exceeds the maximum allowed dimensions while preserving aspect ratio.
 *
 * @param file - the image file selected by the user
 * @param maxWidth - maximum allowed width in pixels
 * @param maxHeight - maximum allowed height in pixels
 * @returns a Promise that resolves to the base64 payload (without the data URL
 *          prefix), or null if the image could not be processed
 */
export function imageFileToBase64(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<string | null> {
  return new Promise((resolve) => {
    // Create a temporary URL for the file so the browser can load it into an Image.
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Release the temporary URL as soon as we have the image data.
      URL.revokeObjectURL(blobUrl);

      let { width, height } = img;

      // Downscale only when the image exceeds the max dimensions, keeping aspect ratio.
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw the (possibly resized) image onto a canvas and export as JPEG.
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataURL = canvas.toDataURL("image/jpeg", 0.9);

      // Strip the "data:image/jpeg;base64," prefix to store only the payload.
      const base64 = dataURL.split(",")[1];
      resolve(base64);
    };

    img.src = blobUrl;
  });
}
`
);

writeFile(
  "utils/timerProgressContext.ts",
  `/**
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
`
);

writeFile(
  "utils/index.ts",
  `/**
 * Barrel export for the utils folder.
 *
 * Re-exports every utility so the app can import from a single path.
 */
export { generateId } from "./id";
export { imageFileToBase64 } from "./image";
export { AppTimerProgressContext } from "./timerProgressContext";
`
);

// ---------------------------------------------------------------------------
// Step 5: write the hooks (src/hooks)
// ---------------------------------------------------------------------------

console.log("\nWriting hooks...");
writeFile(
  "hooks/useStoryStorage.ts",
  `/**
 * Hook for reading, saving, and cleaning up stories in localStorage.
 *
 * This hook encapsulates all localStorage logic so the rest of the app does
 * not need to know how stories are persisted.
 */

import { STORAGE_KEY, EXPIRY_MS, MAX_STORIES } from "@/consts";
import { StoryItem } from "@/interfaces";

/**
 * Reads the persisted stories from localStorage.
 *
 * Removes any stories that have expired (older than 24 hours) and keeps only
 * the most recent MAX_STORIES entries.
 *
 * @returns the list of valid, non-expired StoryItem objects
 */
export function loadStories(): StoryItem[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const items: StoryItem[] = JSON.parse(stored);
    const now = Date.now();
    const valid = items.filter((item) => now - item.timestamp <= EXPIRY_MS);
    return valid.slice(-MAX_STORIES);
  } catch {
    // If localStorage contains corrupted JSON, start with an empty list.
    return [];
  }
}

/**
 * Persists the full story list to localStorage.
 */
export function saveStories(items: StoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Removes expired stories from a list and enforces the MAX_STORIES limit.
 *
 * @param items - the current story list
 * @returns a cleaned list containing only recent stories, capped at MAX_STORIES
 */
export function cleanupExpiredStories(items: StoryItem[]): StoryItem[] {
  const now = Date.now();
  const valid = items.filter((item) => now - item.timestamp <= EXPIRY_MS);
  return valid.slice(-MAX_STORIES);
}
`
);

writeFile(
  "hooks/useStories.ts",
  `/**
 * Hook that manages the story list state and its persistence.
 *
 * Responsibilities:
 *  - Initialize storyItems from localStorage on mount (via lazy initializer).
 *  - Save storyItems to localStorage whenever they change.
 *  - Auto-remove expired stories and cap the list at MAX_STORIES.
 *  - Expose addStory and removeStory helpers so components can mutate the list.
 *
 * @returns an object with storyItems, addStory, and removeStory
 */

import { useCallback, useEffect, useState } from "react";
import { MAX_STORIES } from "@/consts";
import { StoryItem } from "@/interfaces";
import {
  loadStories,
  saveStories,
  cleanupExpiredStories,
} from "./useStoryStorage";

export function useStories() {
  // Lazy initializer: runs only on the first render, reads from localStorage.
  const [storyItems, setStoryItems] = useState<StoryItem[]>(loadStories);

  // Persist to localStorage whenever the story list changes.
  useEffect(() => {
    saveStories(storyItems);
  }, [storyItems]);

  // Cleanup expired stories and enforce the max count on every change.
  useEffect(() => {
    const cleaned = cleanupExpiredStories(storyItems);
    if (cleaned.length !== storyItems.length) {
      setStoryItems(cleaned);
    }
  }, [storyItems]);

  // Adds a new story at the front of the list, keeping only MAX_STORIES.
  const addStory = useCallback((newItem: StoryItem) => {
    setStoryItems((prev) => [newItem, ...prev].slice(0, MAX_STORIES));
  }, []);

  // Removes the story with the given id from the list.
  const removeStory = useCallback((id: string) => {
    setStoryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { storyItems, addStory, removeStory };
}
`
);

writeFile(
  "hooks/useViewerNavigation.ts",
  `/**
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
`
);

writeFile(
  "hooks/useSwipe.ts",
  `/**
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
`
);

writeFile(
  "hooks/index.ts",
  `/**
 * Barrel export for the hooks folder.
 *
 * Re-exports every custom hook so the app can import from a single path.
 */
export { loadStories, saveStories, cleanupExpiredStories } from "./useStoryStorage";
export { useStories } from "./useStories";
export { useViewerNavigation } from "./useViewerNavigation";
export { useSwipe } from "./useSwipe";
`
);

// ---------------------------------------------------------------------------
// Step 6: write the components (src/components)
// ---------------------------------------------------------------------------

console.log("\nWriting components...");
writeFile(
  "components/ViewerControls.tsx",
  `/**
 * ViewerControls component.
 *
 * ViewerControls is rendered as the last child of <Stories>. It is the only
 * place where both StoriesContext (show/next/previous) and ViewerContext
 * (open/close) are available together.
 *
 * Being the last child keeps every <Story> index stable (0..count-1): the
 * library counts this element in \`length\`, so all bounds come from our own
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
`
);

writeFile(
  "components/StoryTimeline.tsx",
  `/**
 * StoryTimeline component.
 *
 * Instagram-style story progress timeline shown at the top of the viewer.
 *
 * Renders one segment per story:
 *  - Completed segments are filled completely.
 *  - The current segment fills progressively as time passes.
 *  - Future segments are empty.
 *
 * Also shows how much time is left before advancing to the next story.
 *
 * @param storyItems - the full list of stories (used for count and age)
 * @param currentIndex - index of the story currently being shown
 * @param onClose - callback to close the viewer
 */

import { useContext } from "react";
import { AppTimerProgressContext } from "@/utils/timerProgressContext";
import styles from "../App.module.css";
import { CloseIcon } from "@/icons";
import { StoryItem } from "@/interfaces";

export function StoryTimeline({
  storyItems,
  currentIndex,
  onClose,
}: {
  storyItems: StoryItem[];
  currentIndex: number;
  onClose: () => void;
}) {
  const progress = useContext(AppTimerProgressContext);
  const now = Date.now();

  // Nothing to render while the viewer is between stories.
  if (!progress || currentIndex < 0 || currentIndex >= storyItems.length) {
    return null;
  }

  const { time, duration } = progress;
  const currentProgress =
    duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const item = storyItems[currentIndex];
  const ageHours = item
    ? Math.max(0, Math.floor((now - item.timestamp) / 3_600_000))
    : 0;
  const secondsLeft =
    duration > 0 ? Math.max(0, Math.ceil((duration - time) / 1000)) : 0;

  return (
    <div className={styles.storyTimeline}>
      <div className={styles.storyTimelineHeader}>
        <div className={styles.storyTimelineUser}>
          <span className={styles.storyTimelineUserName}>usuario</span>
          <span className={styles.storyTimelineTime}>{ageHours}h</span>
        </div>
        <span className={styles.storyTimelineSeconds}>{secondsLeft}s</span>
        <button
          data-testid="viewer-close-timeline"
          aria-label="Close viewer"
          className={styles.storyTimelineClose}
          onClick={onClose}
        >
          <CloseIcon size={20} color="#fff" />
        </button>
      </div>
      <div className={styles.storyTimelineBar}>
        {storyItems.map((_, i) => (
          <div key={i} className={styles.storyTimelineSegment}>
            <div
              className={styles.storyTimelineFill}
              style={{
                width:
                  i < currentIndex
                    ? "100%"
                    : i === currentIndex
                    ? \`\${currentProgress}%\`
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
`
);

writeFile(
  "components/App.tsx",
  `/**
 * App component - the root of the 24hr story feature application.
 *
 * This component orchestrates the story list, the upload flow, and the
 * full-screen viewer. All the logic that used to live inline in this file
 * has been extracted into focused, single-responsibility pieces:
 *
 *  - src/consts        -> application-wide constants
 *  - src/interfaces    -> TypeScript interfaces (StoryItem, ViewerSnapshot, ...)
 *  - src/utils         -> utilities (generateId, imageFileToBase64, timerProgressContext)
 *  - src/hooks         -> custom hooks (useStories, useViewerNavigation, useSwipe, useStoryStorage)
 *  - src/components    -> presentational components (ViewerControls, StoryTimeline)
 *
 * Everything is re-exported through barrel index files so imports stay short
 * and stable (for example, import { StoryItem } from "@/interfaces").
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
} from "react";
import {
  InstaStories,
  Stories,
  Story,
  Page,
  Pages,
  Preview,
} from "@react-instastories/base";
import "@react-instastories/base/index.css";
import styles from "../App.module.css";
import {
  CloseIcon,
  DeleteIcon,
  PlusIcon,
  LeftIcon,
  RightIcon,
} from "@/icons";

// Application-wide constants.
import { MAX_WIDTH, MAX_HEIGHT, AUTO_ADVANCE_MS } from "@/consts";

// TypeScript interfaces.
import {
  StoryItem,
  ViewerControlsHandle,
  ViewerSnapshot,
  TimerProgressValue,
} from "@/interfaces";

// Custom hooks for state, navigation and swiping.
import { useStories, useViewerNavigation, useSwipe } from "@/hooks";

// Utilities for ids, image transformation and the shared timer context.
import { generateId, imageFileToBase64, AppTimerProgressContext } from "@/utils";

// Presentational components extracted from this file.
import { ViewerControls } from "./ViewerControls";
import { StoryTimeline } from "./StoryTimeline";

export default function App() {
  // --- Story list state and persistence -----------------------------------
  // useStories handles: loading from localStorage, saving on change,
  // removing expired stories, capping at MAX_STORIES, and add/remove helpers.
  const { storyItems, addStory, removeStory } = useStories();

  // --- Viewer state -------------------------------------------------------
  const [viewerState, setViewerState] = useState<ViewerSnapshot>({
    open: false,
    index: -1,
  });

  // --- Auto-advance timer progress ----------------------------------------
  const [timerProgress, setTimerProgress] = useState<TimerProgressValue>({
    time: 0,
    duration: AUTO_ADVANCE_MS,
    current: -1,
    length: 0,
  });

  // Updates viewerState whenever ViewerControls reports a snapshot.
  const handleSnapshot = useCallback((snapshot: ViewerSnapshot) => {
    setViewerState(snapshot);
  }, []);

  // Ref to the imperative viewer navigation handle (show/next/previous/open/close).
  const handleRef = useRef<ViewerControlsHandle | null>(null);

  // Ref to the hidden file input used to pick images.
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Upload flow --------------------------------------------------------
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    // Transform the selected image file into a resized base64 string.
    imageFileToBase64(file, MAX_WIDTH, MAX_HEIGHT).then((base64) => {
      if (!base64) return;

      const newItem: StoryItem = {
        id: generateId(),
        base64,
        timestamp: Date.now(),
      };
      addStory(newItem);
      event.target.value = "";
    });
  };

  // --- Viewer navigation helpers ------------------------------------------
  const closeViewer = useCallback(() => {
    handleRef.current?.close();
  }, []);

  // When the native timer runs out of stories (index === -1), close the viewer
  // and return to the main screen.
  useEffect(() => {
    if (viewerState.open && viewerState.index === -1) {
      closeViewer();
    }
  }, [viewerState.open, viewerState.index, closeViewer]);

  const openViewer = (index: number) => {
    const handle = handleRef.current;
    if (!handle || index < 0 || index >= storyItems.length) return;
    handle.show(index);
    handle.open();
  };

  const goNext = () => {
    const { open, index } = viewerState;
    if (!open || index < 0 || index >= storyItems.length - 1) return;
    handleRef.current?.next();
  };

  const goPrevious = () => {
    const { open, index } = viewerState;
    if (!open || index <= 0) return;
    handleRef.current?.previous();
  };

  // Swipe navigation (works for touches on the dialog, which bubble to
  // document, and for mouse drags on desktop).
  useSwipe({ viewerOpen: viewerState.open, goNext, goPrevious });

  // --- Library configuration ----------------------------------------------
  // Kept in a stable object so <InstaStories /> does not reconfigure on
  // every render. NOTE: no \`preset\` — the library styles every rule with
  // \`:not([data-preset])\`, so setting one removes all styling.
  const config = useMemo(
    () => ({
      animation: "immediately" as const,
      duration: AUTO_ADVANCE_MS,
      preview: { shouldMount: true as const },
      timer: { shouldUseDefault: true as const },
      viewer: { shouldMount: false as const },
    }),
    []
  );

  // --- Derived values -----------------------------------------------------
  const hasStories = storyItems.length > 0;
  const viewerOpen = viewerState.open;
  // Bounds come from our own data: <ViewerControls /> is also counted as a
  // child by the library, so its canNext/canPrevious would be off by one.
  const canNext =
    viewerOpen &&
    viewerState.index >= 0 &&
    viewerState.index < storyItems.length - 1;
  const canPrevious = viewerOpen && viewerState.index > 0;

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        fontFamily: "system-ui, sans-serif",
        overflowX: "hidden",
        minHeight: "100vh",
        background: "#fff",
      }}
    >
      {/* Story thumbnails */}
      <div data-testid="story-list" className={styles.storyList}>
        {storyItems.map((item, idx) => (
          <div
            key={item.id}
            data-testid={\`story-circle-\${idx}\`}
            onClick={() => openViewer(idx)}
            className={\`\${styles.storyCircle}\${viewerState.open && viewerState.index === idx ? \` \${styles.active}\` : ""}\`}
          >
            <img
              src={\`data:image/jpeg;base64,\${item.base64}\`}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <button
              data-testid={\`delete-story-\${idx}\`}
              aria-label="Delete story"
              className={styles.storyCircleDelete}
              onClick={(e) => {
                e.stopPropagation();
                removeStory(item.id);
              }}
            >
              <DeleteIcon size={14} color="#b91c1c" />
            </button>
          </div>
        ))}
        <button
          data-testid="upload-button"
          aria-label="Upload story"
          className={styles.uploadButton}
          onClick={() => fileRef.current?.click()}
        >
          <PlusIcon size={22} color="#fff" />
        </button>
      </div>

      <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={handleUpload} />

      {hasStories ? (
        <AppTimerProgressContext.Provider value={timerProgress}>
          <>
            {/* Library owns the full-screen dialog (portal to document.body).
                Its preview toolbar is hidden via CSS: our own circles above are
                the visible thumbnails. */}
            <InstaStories config={config}>
              <Stories>
                {storyItems.map((item, idx) => (
                  <Story key={item.id}>
                    <Preview>
                      <img src={\`data:image/jpeg;base64,\${item.base64}\`} alt="" />
                    </Preview>
                    <Pages>
                      <Page>
                        <img src={\`data:image/jpeg;base64,\${item.base64}\`} alt="" />
                      </Page>
                    </Pages>
                  </Story>
                ))}
                {/* Must stay the last child: story indices are positional. */}
                <ViewerControls
                  handleRef={handleRef}
                  onSnapshot={handleSnapshot}
                  setTimerProgress={setTimerProgress}
                />
              </Stories>
            </InstaStories>

            {/* Transparent control layer above the library dialog:
                it never blocks the story (pointer-events: none), only the
                buttons are interactive. */}
            <div
              data-testid="story-viewer-overlay"
              className={\`\${styles.viewerOverlay}\${viewerOpen ? "" : \` \${styles.hidden}\`}\`}
              role="dialog"
              aria-modal="true"
              aria-label="Story viewer"
            >
              <div data-testid="story-viewer-container" className={styles.viewerContainer} />

              <button
                data-testid="viewer-close"
                aria-label="Close viewer"
                className={styles.viewerClose}
                onClick={closeViewer}
              >
                <CloseIcon size={24} color="#fff" />
              </button>

              <button
                data-testid="story-nav-viewer-left"
                aria-label="Previous story"
                className={\`\${styles.viewerNavButton} \${styles.viewerNavLeft}\`}
                onClick={goPrevious}
                disabled={!canPrevious}
              >
                <LeftIcon size={36} color="#fff" />
              </button>

              <button
                data-testid="story-nav-viewer-right"
                aria-label="Next story"
                className={\`\${styles.viewerNavButton} \${styles.viewerNavRight}\`}
                onClick={goNext}
                disabled={!canNext}
              >
                <RightIcon size={36} color="#fff" />
              </button>

              {/* Instagram-style progress timeline at the top of the viewer. */}
              {timerProgress.current >= 0 && (
                <StoryTimeline
                  storyItems={storyItems}
                  currentIndex={timerProgress.current}
                  onClose={closeViewer}
                />
              )}
            </div>
          </>
        </AppTimerProgressContext.Provider>
      ) : (
        <p data-testid="empty-state" className={styles.emptyState}>
          No stories yet. Upload an image to get started.
        </p>
      )}
    </div>
  );
}
`
);

writeFile(
  "components/index.ts",
  `/**
 * Barrel export for the components folder.
 *
 * Re-exports every component so the app can import from a single path.
 */

export { default as App } from "./App";
export { ViewerControls } from "./ViewerControls";
export { StoryTimeline } from "./StoryTimeline";
`
);

// ---------------------------------------------------------------------------
// Step 7: remove the old monolithic src/App.tsx
// ---------------------------------------------------------------------------

console.log("\nRemoving old monolithic App.tsx...");
removeFile("App.tsx");

// ---------------------------------------------------------------------------
// Step 8: update the app entry point (src/main.tsx)
// ---------------------------------------------------------------------------

console.log("\nUpdating src/main.tsx import...");
replaceInFile("main.tsx", 'import App from "./App";', 'import App from "./components/App";');

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

console.log("\n✅  Project reorganized successfully!");
console.log("   New structure under src/:");
console.log("     consts/      application-wide constants");
console.log("     components/  React components (App, ViewerControls, StoryTimeline)");
console.log("     hooks/       custom hooks (useStories, useViewerNavigation, useSwipe, useStoryStorage)");
console.log("     utils/       utilities (generateId, imageFileToBase64, timerProgressContext)");
console.log("     interfaces/  TypeScript interfaces (StoryItem, ViewerSnapshot, ...)");
console.log("     icons/       custom icons (unchanged)");
console.log("\n   Next: run  pnpm run build  (or  pnpm run dev)  to verify everything works.");
