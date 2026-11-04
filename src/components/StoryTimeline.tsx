/**
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
                    ? `${currentProgress}%`
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
