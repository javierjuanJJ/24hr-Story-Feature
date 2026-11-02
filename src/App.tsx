import React, { useEffect, useState, RefObject } from "react";
import {
  InstaStories,
  Stories,
  Story,
  Page,
  Preview,
} from "@react-instastories/base";
import "@react-instastories/base/index.css";

interface StoryItem {
  id: string;
  base64: string;
  timestamp: number;
}

const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1920;
const EXPIRY_MS = 86_400_000; // 24 hours

export default function App() {
  // Load from localStorage on mount
  const [storyItems, setStoryItems] = useState<StoryItem[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

  // Persist to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem("@@storyImages", JSON.stringify(storyItems));
  }, [storyItems]);

  // Initial load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("@@storyImages");
    if (stored) {
      const items: StoryItem[] = JSON.parse(stored);
      const now = Date.now();
      const valid = items.filter((item) => now - item.timestamp <= EXPIRY_MS);
      const limited = valid.slice(-20);
      setStoryItems(limited);
    }
  }, []);

  // Cleanup expired stories (run on mount, also could be periodic)
  useEffect(() => {
    const now = Date.now();
    const valid = storyItems.filter((item) => now - item.timestamp <= EXPIRY_MS);
    const limited = valid.slice(-20);
    if (valid.length !== limited.length || storyItems.length !== limited.length) {
      setStoryItems(limited);
    }
  }, [storyItems]);

  // Handle file selection for upload
  const fileRef: RefObject<HTMLInputElement> = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check dimensions using an Image object
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;
      // Resize if exceeds max dimensions, maintaining aspect ratio
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = width * ratio;
        height = height * ratio;
      }
      // Draw to canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
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
        return updated.slice(0, 20);
      });

      // Reset input value to allow re-selection
      event.target.value = "";
    };
    img.src = blobUrl;
  };

  // Remove story by index
  const removeStory = (id: string) => {
    setStoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div
      style={{
        margin: "0",
        padding: "0",
        fontFamily: "system-ui, sans-serif",
        overflowX: "hidden",
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
            onClick={() => setActiveStoryIndex(idx)}
            style={{
              flex: "0 0 auto",
              width: 80,
              height: 80,
              borderRadius: "50%",
              overflow: "hidden",
              border: activeStoryIndex === idx ? "3px solid #3366ff" : "3px solid transparent",
              cursor: "pointer",
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
        {storyItems.length > 0 ? (
          <InstaStories
            activeStory={activeStoryIndex ?? 0}
            onStoryChange={(index: number) => setActiveStoryIndex(index)}
            renderOuterContainer={(props) => (
              <div
                {...props}
                style={{
                  width: "100%",
                  height: "40vh",
                  border: "2px solid #ddd",
                  overflow: "hidden",
                  position: "relative",
                  background: "#000",
                }}
              />
            }}
          >
            <Stories>
              {storyItems.map((item, idx) => (
                <Story key={item.id}>
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
        ) : (
          <p style={{ textAlign: "center", color: "#666", marginTop: "20px" }}>
            No stories yet. Upload an image to get started.
          </p>
        )}
      </div>
    </div>
  );
}