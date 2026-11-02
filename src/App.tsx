import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  InstaStories,
  Stories,
  Story,
  Page,
  Pages,
  Preview,
  useStoriesContext,
  useViewerContext,
} from "@react-instastories/base";
import "@react-instastories/base/index.css";
import styles from "./App.css";
import { CloseIcon, DeleteIcon, PlusIcon } from "@/icons";

interface StoryItem {
  id: string;
  base64: string;
  timestamp: number;
}

interface ViewerControls {
  show: (index: number) => void;
  open: () => void;
  close: () => void;
}

const STORAGE_KEY = "@@storyImages";
const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1920;
const EXPIRY_MS = 86_400_000; // 24 hours
const MAX_STORIES = 20;

// Generate a unique id compatible with browsers that lack crypto.randomUUID.
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: UUID v4 via crypto.getRandomValues (widely supported)
  const buf = new Uint8Array(16);
  try {
    crypto.getRandomValues(buf);
  } catch {
    for (let i = 0; i < 16; i++) buf[i] = Math.floor(Math.random() * 256);
  }
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

// Internal controller that lives inside InstaStories so it can access the
// library's stories/viewer contexts and expose navigation to the parent.
function StoryControls({
  onReady,
}: {
  onReady: (controls: ViewerControls) => void;
}): null {
  const stories = useStoriesContext();
  const viewer = useViewerContext();

  useEffect(() => {
    onReady({ show: stories.show, open: viewer.open, close: viewer.close });
  }, [stories.show, viewer.open, viewer.close, onReady]);

  return null;
}

export default function App() {
  // Initialize from localStorage on first render (lazy initializer) so the
  // persistence effect never overwrites stored stories with an empty array.
  const [storyItems, setStoryItems] = useState<StoryItem[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const items: StoryItem[] = JSON.parse(stored);
        const now = Date.now();
        const valid = items.filter((item) => now - item.timestamp <= EXPIRY_MS);
        return valid.slice(-MAX_STORIES);
      } catch {
        // Ignore malformed localStorage
      }
    }
    return [];
  });
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Controls exposed by the internal StoryControls component
  const controlsRef = useRef<ViewerControls | null>(null);

  // Persist to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storyItems));
  }, [storyItems]);

  // Cleanup expired stories (run whenever items change)
  useEffect(() => {
    const now = Date.now();
    const valid = storyItems.filter((item) => now - item.timestamp <= EXPIRY_MS);
    const limited = valid.slice(-MAX_STORIES);
    if (limited.length !== storyItems.length) {
      setStoryItems(limited);
    }
  }, [storyItems]);

  const openViewer = useCallback((index: number) => {
    setActiveStoryIndex(index);
    setViewerOpen(true);
    // Defer to allow the overlay to mount before driving the library viewer.
    requestAnimationFrame(() => {
      if (controlsRef.current) {
        controlsRef.current.show(index);
        controlsRef.current.open();
      }
    });
  }, []);

  const closeViewer = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.close();
    }
    setViewerOpen(false);
    setActiveStoryIndex(null);
  }, []);

  // Handle file selection for upload
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate it is an image
    if (!file.type.startsWith("image/")) return;

    const blobUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;

      // Resize if exceeds max dimensions, maintaining aspect ratio
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw to canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      const dataURL = canvas.toDataURL("image/jpeg", 0.9);
      const base64 = dataURL.split(",")[1];

      const newItem: StoryItem = {
        id: generateId(),
        base64,
        timestamp: Date.now(),
      };

      setStoryItems((prev) => {
        const updated = [newItem, ...prev];
        // Keep only last 20
        return updated.slice(0, MAX_STORIES);
      });

      // Reset input value to allow re-selection
      event.target.value = "";
    };
    img.src = blobUrl;
  };

  // Remove story by id
  const removeStory = (id: string) => {
    setStoryItems((prev) => prev.filter((item) => item.id !== id));
    // If the viewer was open on the removed story, close it
    if (
      viewerOpen &&
      activeStoryIndex !== null &&
      storyItems[activeStoryIndex]?.id === id
    ) {
      closeViewer();
    }
  };

  // Swipe navigation state for the story list / viewer
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    },
    []
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - touchStartX.current;
      const dy = endY - touchStartY.current;

      // Only treat as horizontal swipe if mostly horizontal
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx > 0 && activeStoryIndex !== null && activeStoryIndex > 0) {
          // Swipe right → previous story
          const next = activeStoryIndex - 1;
          setActiveStoryIndex(next);
          if (controlsRef.current && viewerOpen) {
            controlsRef.current.show(next);
          }
        } else if (
          dx < 0 &&
          activeStoryIndex !== null &&
          activeStoryIndex < storyItems.length - 1
        ) {
          // Swipe left → next story
          const next = activeStoryIndex + 1;
          setActiveStoryIndex(next);
          if (controlsRef.current && viewerOpen) {
            controlsRef.current.show(next);
          }
        }
      }
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [activeStoryIndex, storyItems.length, viewerOpen]
  );

  const hasStories = storyItems.length > 0;

  return (
    <div
      style={{
        margin: "0",
        padding: "0",
        fontFamily: "system-ui, sans-serif",
        overflowX: "hidden",
        minHeight: "100vh",
        background: "#fff",
      }}
    >
      {/* Top: horizontal scrollable story thumbnails */}
      <div
        data-testid="story-list"
        className={styles.storyList}
      >
        {storyItems.map((item, idx) => (
          <div
            key={item.id}
            data-testid={`story-circle-${idx}`}
            onClick={() => openViewer(idx)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`${styles.storyCircle}${
              activeStoryIndex === idx ? ` ${styles.active}` : ""
            }`}
          >
            <img
              src={`data:image/jpeg;base64,${item.base64}`}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <button
              data-testid={`delete-story-${idx}`}
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
        {/* Plus button to upload */}
        <button
          data-testid="upload-button"
          aria-label="Upload story"
          className={styles.uploadButton}
          onClick={() => fileRef.current?.click()}
        >
          <PlusIcon size={22} color="#fff" />
        </button>
      </div>

      {/* File input (hidden) */}
      <input
        type="file"
        accept="image/*"
        ref={fileRef}
        style={{ display: "none" }}
        onChange={handleUpload}
      />

      {hasStories ? (
        <>
          {/* Full-screen story viewer overlay */}
          <div
            data-testid="story-viewer-overlay"
            className={`${styles.viewerOverlay} ${
              viewerOpen ? "" : styles.hidden
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Story viewer"
            onClick={closeViewer}
          >
            <button
              data-testid="viewer-close"
              aria-label="Close viewer"
              className={styles.viewerClose}
              onClick={(e) => {
                e.stopPropagation();
                closeViewer();
              }}
            >
              <CloseIcon size={24} color="#fff" />
            </button>
            <div
              data-testid="story-viewer-container"
              className={styles.viewerContainer}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <InstaStories>
                <StoryControls
                  onReady={(controls) => {
                    controlsRef.current = controls;
                  }}
                />
                <Stories>
                  {storyItems.map((item, idx) => (
                    <Story key={item.id} duration={3000}>
                      <Preview>
                        <img
                          src={`data:image/jpeg;base64,${item.base64}`}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </Preview>
                      <Pages>
                        <Page>
                          <img
                            src={`data:image/jpeg;base64,${item.base64}`}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        </Page>
                      </Pages>
                    </Story>
                  ))}
                </Stories>
              </InstaStories>
            </div>
          </div>
        </>
      ) : (
        <p
          data-testid="empty-state"
          className={styles.emptyState}
        >
          No stories yet. Upload an image to get started.
        </p>
      )}
    </div>
  );
}
