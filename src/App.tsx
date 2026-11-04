import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InstaStories,
  Stories,
  Story,
  Page,
  Pages,
  Preview,
  useStoriesContext,
  useViewerContext,
  useTimerContext,
} from "@react-instastories/base";
import "@react-instastories/base/index.css";
import { Controls } from "@react-instastories/external";
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

/** Imperative handle exposed by <ViewerControls /> (context-based navigation). */
interface ViewerControlsHandle {
  show(index: number): void;
  next(): void;
  previous(): void;
  open(): void;
  close(): void;
}

/** Snapshot of the library viewer state reported up to <App />. */
interface ViewerSnapshot {
  open: boolean;
  index: number;
}

const STORAGE_KEY = "@@storyImages";
const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1920;
const EXPIRY_MS = 86_400_000; // 24 hours
const MAX_STORIES = 20;
const AUTO_ADVANCE_MS = 60_000; // 60 seconds per story

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

/**
 * Rendered as the LAST child of <Stories> — the only place where both
 * StoriesContext (show/next/previous) and ViewerContext (open/close) exist.
 * Being last keeps every <Story> index stable (0..count-1); the library counts
 * this element in `length`, so all bounds come from `count` instead.
 *
 * Also runs the 60s auto-advance timer (next story, or close at the end).
 */
function ViewerControls({
  handleRef,
  count,
  onSnapshot,
}: {
  handleRef: React.RefObject<ViewerControlsHandle | null>;
  count: number;
  onSnapshot: (snapshot: ViewerSnapshot) => void;
}) {
  const stories = useStoriesContext();
  const viewer = useViewerContext();

  const mounted = viewer.mounted;
  const current = stories.current;

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

  useEffect(() => {
    onSnapshot({ open: mounted, index: current });
  }, [mounted, current, onSnapshot]);

  // Latest values for the auto-advance timer (avoids restarting it on renders).
  const actionRef = useRef({ current, next: stories.next, close: viewer.close });
  useEffect(() => {
    actionRef.current = { current, next: stories.next, close: viewer.close };
  });

  // The library's native timer (timer.shouldUseDefault: true) now drives the
  // per-story duration and auto-advance; the progress bar (Controls.Indicator)
  // reflects it. Kept actionRef for the imperative handle only.
  return null;
}

/** Native progress bar: fills with the story timer. When the timer expires,
 *  the library auto-advances to the next story (or closes the viewer when no
 *  stories remain), so the user returns to the main screen.
 */
function StoryProgressBar() {
  const timer = useTimerContext();
  // Always visible while a story is displayed; progress driven by timer.time.
  const progress = timer.duration > 0 ? Math.min(100, (timer.time / timer.duration) * 100) : 0;
  return (
    <div className={styles.progressBarWrap}>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
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
  const [viewerState, setViewerState] = useState<ViewerSnapshot>({
    open: false,
    index: -1,
  });

  const handleSnapshot = useCallback((snapshot: ViewerSnapshot) => {
    setViewerState(snapshot);
  }, []);

  const handleRef = useRef<ViewerControlsHandle | null>(null);

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

  const removeStory = (id: string) => {
    if (viewerState.open) closeViewer();
    setStoryItems((prev) => prev.filter((item) => item.id !== id));
  };

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
  const swipeRef = useRef({ goNext, goPrevious });
  useEffect(() => {
    swipeRef.current = { goNext, goPrevious };
  });

  useEffect(() => {
    if (!viewerState.open) return;

    const handleSwipe = (dx: number, dy: number) => {
      if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) <= 50) return;
      if (dx < 0) swipeRef.current.goNext();
      else swipeRef.current.goPrevious();
    };

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
  }, [viewerState.open]);

  // Kept in a stable object so <InstaStories /> does not reconfigure on
  // every render. NOTE: no `preset` — the library styles every rule with
  // `:not([data-preset])`, so setting one removes all styling.
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

  const hasStories = storyItems.length > 0;
  const viewerOpen = viewerState.open;
  // Bounds come from our own data: <ViewerControls /> is also counted as a
  // child by the library, so its canNext/canPrevious would be off by one.
  const canNext = viewerOpen && viewerState.index >= 0 && viewerState.index < storyItems.length - 1;
  const canPrevious = viewerOpen && viewerState.index > 0;

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "system-ui, sans-serif", overflowX: "hidden", minHeight: "100vh", background: "#fff" }}>
      {/* Story thumbnails */}
      <div data-testid="story-list" className={styles.storyList}>
        {storyItems.map((item, idx) => (
          <div
            key={item.id}
            data-testid={`story-circle-${idx}`}
            onClick={() => openViewer(idx)}
            className={`${styles.storyCircle}${viewerState.open && viewerState.index === idx ? ` ${styles.active}` : ""}`}
          >
            <img src={`data:image/jpeg;base64,${item.base64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        <button data-testid="upload-button" aria-label="Upload story" className={styles.uploadButton} onClick={() => fileRef.current?.click()}>
          <PlusIcon size={22} color="#fff" />
        </button>
      </div>

      <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={handleUpload} />

      {hasStories ? (
        <>
          {/* Library owns the full-screen dialog (portal to document.body).
              Its preview toolbar is hidden via CSS: our own circles above are
              the visible thumbnails. */}
          <InstaStories config={config}>
            <Stories>
              {storyItems.map((item, idx) => (
                <Story key={item.id}>
                  <Preview>
                    <img src={`data:image/jpeg;base64,${item.base64}`} alt="" />
                  </Preview>
                  <Pages>
                    <Page>
                      <img src={`data:image/jpeg;base64,${item.base64}`} alt="" />
                    </Page>
                  </Pages>
                  {/* Native page navigation (next/previous page within a story). */}
                  <Controls.Pages.Next />
                  <Controls.Pages.Previous />
                  {/* Progress bar that fills with the story timer; when the timer
                      expires the library auto-advances to the next story. */}
                  <StoryProgressBar />
                </Story>
              ))}
              {/* Must stay the last child: story indices are positional. */}
              <ViewerControls
                handleRef={handleRef}
                count={storyItems.length}
                onSnapshot={handleSnapshot}
              />
            </Stories>
          </InstaStories>

          {/* Transparent control layer above the library dialog:
              it never blocks the story (pointer-events: none), only the
              buttons are interactive. */}
          <div
            data-testid="story-viewer-overlay"
            className={`${styles.viewerOverlay}${viewerOpen ? "" : ` ${styles.hidden}`}`}
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
              className={`${styles.viewerNavButton} ${styles.viewerNavLeft}`}
              onClick={goPrevious}
              disabled={!canPrevious}
            >
              <LeftIcon size={36} color="#fff" />
            </button>

            <button
              data-testid="story-nav-viewer-right"
              aria-label="Next story"
              className={`${styles.viewerNavButton} ${styles.viewerNavRight}`}
              onClick={goNext}
              disabled={!canNext}
            >
              <RightIcon size={36} color="#fff" />
            </button>
          </div>
        </>
      ) : (
        <p data-testid="empty-state" className={styles.emptyState}>No stories yet. Upload an image to get started.</p>
      )}
    </div>
  );
}
