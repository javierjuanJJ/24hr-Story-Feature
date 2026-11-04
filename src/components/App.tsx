/**
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
            data-testid={`story-circle-${idx}`}
            onClick={() => openViewer(idx)}
            className={`${styles.storyCircle}${viewerState.open && viewerState.index === idx ? ` ${styles.active}` : ""}`}
          >
            <img
              src={`data:image/jpeg;base64,${item.base64}`}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
                      <img src={`data:image/jpeg;base64,${item.base64}`} alt="" />
                    </Preview>
                    <Pages>
                      <Page>
                        <img src={`data:image/jpeg;base64,${item.base64}`} alt="" />
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
