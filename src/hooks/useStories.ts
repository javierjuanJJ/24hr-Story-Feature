/**
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
