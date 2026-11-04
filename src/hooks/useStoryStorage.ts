/**
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
