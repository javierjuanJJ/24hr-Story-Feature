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
  // Load from localStorage on mount
  const [storyItems, setStoryItems] = useState<StoryItem[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Controls exposed by the internal StoryControls component
  const controlsRef = useRef<ViewerControls | null>(null);

  // Persist to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storyItems));
  }, [storyItems]);

  // Initial load from localStorage + cleanup expired + keep last 20
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const items: StoryItem[] = JSON.parse(stored);
        const now = Date.now();
        const valid = items.filter((item) => now - item.timestamp <= EXPIRY_MS);
        const limited = valid.slice(-MAX_STORIES);
        setStoryItems(limited);
      } catch {
        // Ignore malformed localStorage
        setStoryItems([]);
      }
    }
  }, []);

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
    if (controlsRef.current) {
      controlsRef.current.show(index);
      controlsRef.current.open();
    }
    setViewerOpen(true);
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
        id: crypto.randomUUID(),
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
        style={{
          padding: "12px",
          display: "flex",
          overflowX: "auto",
          gap: "8px",
          alignItems: "center",
          justifyContent: "flex-start",
          background: "#fafafa",
          borderBottom: "1px solid #eee",
        }}
      >
        {storyItems.map((item, idx) => (
          <div
            key={item.id}
            data-testid={`story-circle-${idx}`}
            onClick={() => openViewer(idx)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              flex: "0 0 auto",
              width: 80,
              height: 80,
              borderRadius: "50%",
              overflow: "hidden",
              border:
                activeStoryIndex === idx ? "3px solid #3366ff" : "3px solid transparent",
              cursor: "pointer",
              boxSizing: "border-box",
            }}
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
          </div>
        ))}
        {/* Plus button to upload */}
        <button
          data-testid="upload-button"
          onClick={() => fileRef.current?.click()}
          style={{
            flex: "0 0 auto",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#3366ff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: "24px",
            marginLeft: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
          }}
        >
          +
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

      {/* Instastories full-screen viewer */}
      <div style={{ padding: "12px" }}>
        {hasStories ? (
          <div
            data-testid="story-viewer-container"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              width: "100%",
              height: "40vh",
              border: "2px solid #ddd",
              overflow: "hidden",
              position: "relative",
              background: "#000",
              borderRadius: "8px",
            }}
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
        ) : (
          <p
            data-testid="empty-state"
            style={{ textAlign: "center", color: "#666", marginTop: "20px" }}
          >
            No stories yet. Upload an image to get started.
          </p>
        )}
      </div>
    </div>
  );
}
