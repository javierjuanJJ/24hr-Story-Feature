import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  InstaStories,
  Stories,
  Story,
  Page,
  Pages,
  Preview,
} from "@react-instastories/base";
import "@react-instastories/base/index.css";
import styles from "./App.module.css";
import {
  CloseIcon,
  DeleteIcon,
  PlusIcon,
  LeftIcon,
  RightIcon,
} from "@/icons";

interface StoryItem {
  id: string;
  base64: string;
  timestamp: number;
}

const STORAGE_KEY = "@@storyImages";
const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1920;
const EXPIRY_MS = 86_400_000; // 24 hours
const MAX_STORIES = 20;

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
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

export default function App() {
  const [storyItems, setStoryItems] = useState<StoryItem[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const items: StoryItem[] = JSON.parse(stored);
        const now = Date.now();
        const valid = items.filter((item) => now - item.timestamp <= EXPIRY_MS);
        return valid.slice(-MAX_STORIES);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [storyTimer, setStoryTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storyItems));
  }, [storyItems]);

  useEffect(() => {
    const now = Date.now();
    const valid = storyItems.filter((item) => now - item.timestamp <= EXPIRY_MS);
    const limited = valid.slice(-MAX_STORIES);
    if (limited.length !== storyItems.length) {
      setStoryItems(limited);
    }
  }, [storyItems]);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      const dataURL = canvas.toDataURL("image/jpeg", 0.9);
      const base64 = dataURL.split(",")[1];

      const newItem: StoryItem = { id: generateId(), base64, timestamp: Date.now() };
      setStoryItems((prev) => [newItem, ...prev].slice(0, MAX_STORIES));
      event.target.value = "";
    };
    img.src = blobUrl;
  };

  const removeStory = (id: string) => {
    setStoryItems((prev) => prev.filter((item) => item.id !== id));
    if (viewerOpen && activeStoryIndex !== null && storyItems[activeStoryIndex]?.id === id) {
      setViewerOpen(false);
      setActiveStoryIndex(null);
    }
  };

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartX.current;
    const dy = endY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0 && activeStoryIndex !== null && activeStoryIndex > 0) {
        setActiveStoryIndex((prev) => (prev !== null ? prev - 1 : 0));
      } else if (dx < 0 && activeStoryIndex !== null && activeStoryIndex < storyItems.length - 1) {
        setActiveStoryIndex((prev) => (prev !== null ? prev + 1 : 0));
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [activeStoryIndex, storyItems.length]);

  const hasStories = storyItems.length > 0;

  const openViewer = useCallback((index: number) => {
    setActiveStoryIndex(index);
    setViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    setActiveStoryIndex(null);
  }, []);

  // Auto-advance after 60 seconds
  useEffect(() => {
    if (storyTimer) clearTimeout(storyTimer);
    if (viewerOpen && activeStoryIndex !== null && storyItems.length > 0) {
      const timer = setTimeout(() => {
        if (activeStoryIndex < storyItems.length - 1) {
          setActiveStoryIndex((prev) => (prev !== null ? prev + 1 : 0));
        } else {
          setViewerOpen(false);
          setActiveStoryIndex(null);
        }
      }, 60_000);
      setStoryTimer(timer);
    }
    return () => { if (storyTimer) clearTimeout(storyTimer); };
  }, [viewerOpen, activeStoryIndex, storyItems.length, storyTimer]);

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "system-ui, sans-serif", overflowX: "hidden", minHeight: "100vh", background: "#fff" }}>
      {/* Story thumbnails */}
      <div data-testid="story-list" className={styles.storyList}>
        {storyItems.map((item, idx) => (
          <div
            key={item.id}
            data-testid={`story-circle-${idx}`}
            onClick={() => openViewer(idx)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`${styles.storyCircle}${activeStoryIndex === idx ? ` ${styles.active}` : ""}`}
          >
            <img src={`data:image/jpeg;base64,${item.base64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button data-testid={`delete-story-${idx}`} aria-label="Delete story" className={styles.storyCircleDelete} onClick={(e) => { e.stopPropagation(); removeStory(item.id); }}>
              <DeleteIcon size={14} color="#b91c1c" />
            </button>
          </div>
        ))}
        <button data-testid="upload-button" aria-label="Upload story" className={styles.uploadButton} onClick={() => fileRef.current?.click()}>
          <PlusIcon size={22} color="#fff" />
        </button>
      </div>

      <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={handleUpload} />

      {hasStories ? (
        <>
          <div
            data-testid="story-viewer-overlay"
            className={`${styles.viewerOverlay}${viewerOpen ? "" : ` ${styles.hidden}`}`}
            role="dialog"
            aria-modal="true"
            aria-label="Story viewer"
          >
            <button data-testid="viewer-close" aria-label="Close viewer" className={styles.viewerClose} onClick={(e) => { e.stopPropagation(); closeViewer(); }}>
              <CloseIcon size={24} color="#fff" />
            </button>

            <button data-testid="story-nav-viewer-left" aria-label="Previous story" className={styles.viewerNavButton} onClick={(e) => { e.stopPropagation(); if (activeStoryIndex !== null && activeStoryIndex > 0) setActiveStoryIndex((p) => p! - 1); }} disabled={activeStoryIndex === null || activeStoryIndex === 0}>
              <LeftIcon size={36} color="#fff" />
            </button>

            <button data-testid="story-nav-viewer-right" aria-label="Next story" className={styles.viewerNavButton} onClick={(e) => { e.stopPropagation(); if (activeStoryIndex !== null && activeStoryIndex < storyItems.length - 1) setActiveStoryIndex((p) => p! + 1); }} disabled={activeStoryIndex === null || activeStoryIndex === storyItems.length - 1}>
              <RightIcon size={36} color="#fff" />
            </button>

            {/* key forces InstaStories to remount when story index changes */}
            <div key={`viewer-${activeStoryIndex}`} data-testid="story-viewer-container" className={styles.viewerContainer} onClick={(e) => e.stopPropagation()} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <InstaStories
                config={{
                  animation: "fade",
                  duration: 3000,
                  preset: "default",
                  timer: { shouldUseDefault: true, interval: 3000 },
                  viewer: { shouldMount: true, story: activeStoryIndex ?? 0 },
                }}
              >
                <Stories>
                  {storyItems.map((item, idx) => (
                    <Story key={item.id} duration={3000}>
                      <Preview>
                        <img src={`data:image/jpeg;base64,${item.base64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </Preview>
                      <Pages>
                        <Page>
                          <img src={`data:image/jpeg;base64,${item.base64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
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
        <p data-testid="empty-state" className={styles.emptyState}>No stories yet. Upload an image to get started.</p>
      )}
    </div>
  );
}