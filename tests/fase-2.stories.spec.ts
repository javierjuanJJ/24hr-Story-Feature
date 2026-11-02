import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

const IMAGE_SMALL = "/home/jj/24hr-Story-Feature/image2.png"; // 500x636
const IMAGE_LARGE = "/home/jj/24hr-Story-Feature/image.png"; // 2272x3579 (>1080x1920)

test.beforeEach(async ({ page }) => {
  // Start with a clean localStorage so expired/persisted stories don't leak
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test("fase 2: Load page → story circles displayed, no expired stories", async ({
  page,
}) => {
  // Seed localStorage with one recent and one expired story before load
  const now = Date.now();
  await page.addInitScript((now) => {
    const recent = {
      id: "recent-1",
      base64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      timestamp: now,
    };
    const expired = {
      id: "expired-1",
      base64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      timestamp: now - 86_400_000 - 1000, // 24h + 1s ago
    };
    localStorage.setItem("@@storyImages", JSON.stringify([recent, expired]));
  }, now);

  await page.goto("/");
  await page.waitForTimeout(1000);

  // Screenshot: initial load with stories (expired filtered out)
  await page.screenshot({
    path: "tests/screenshots/fase-2/01-load-with-stories.png",
    fullPage: true,
  });

  // Only the recent (non-expired) story circle should be displayed
  await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  await expect(page.locator('[data-testid="story-circle-1"]')).toHaveCount(0);

  // Empty state should NOT be visible
  await expect(page.locator('[data-testid="empty-state"]')).toBeHidden();
});

test("fase 2: Click + → select image → image appears in story list", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: "tests/screenshots/fase-2/02-before-upload.png",
    fullPage: true,
  });

  // Click the plus upload button
  await page.click('[data-testid="upload-button"]');

  // Select a small image file
  await page.setInputFiles('input[type="file"]', IMAGE_SMALL);
  await page.waitForTimeout(1500);

  // Image should appear in the story list
  await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/fase-2/03-after-upload.png",
    fullPage: true,
  });
});

test("fase 2: Swipe left/right → cycle through stories", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1000);

  // Upload two images so we can cycle
  await page.click('[data-testid="upload-button"]');
  await page.setInputFiles('input[type="file"]', IMAGE_SMALL);
  await page.waitForTimeout(1500);

  await page.click('[data-testid="upload-button"]');
  await page.setInputFiles('input[type="file"]', "/home/jj/24hr-Story-Feature/image3.png");
  await page.waitForTimeout(1500);

  await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  await expect(page.locator('[data-testid="story-circle-1"]')).toBeVisible();

  // Open the viewer by clicking the first story circle
  await page.click('[data-testid="story-circle-0"]');
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: "tests/screenshots/fase-2/04-viewer-open-story-0.png",
    fullPage: true,
  });

  const viewer = page.locator('[data-testid="story-viewer-container"]');
  await expect(viewer).toBeVisible();

  const box = await viewer.boundingBox();
  expect(box).not.toBeNull();

  // Swipe left → next story (start X high, end X low)
  await page.touchscreen.touchstart(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.touchscreen.touchmove(box!.x + 100, box!.y + box!.height / 2);
  await page.touchscreen.touchend(box!.x + 100, box!.y + box!.height / 2);
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: "tests/screenshots/fase-2/05-after-swipe-left.png",
    fullPage: true,
  });

  // Swipe right → previous story (start X low, end X high)
  await page.touchscreen.touchstart(box!.x + 100, box!.y + box!.height / 2);
  await page.touchscreen.touchmove(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.touchscreen.touchend(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: "tests/screenshots/fase-2/06-after-swipe-right.png",
    fullPage: true,
  });
});

test("fase 2: Upload image > 1080×1920 → gets resized/constrained", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(1000);

  await page.click('[data-testid="upload-button"]');
  await page.setInputFiles('input[type="file"]', IMAGE_LARGE);
  await page.waitForTimeout(2000);

  await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/fase-2/07-upload-large-image.png",
    fullPage: true,
  });

  // Verify the stored base64 decodes to an image within max dimensions
  const withinLimits = await page.evaluate(() => {
    const stored = localStorage.getItem("@@storyImages");
    if (!stored) return false;
    const items: Array<{ base64: string }> = JSON.parse(stored);
    if (items.length === 0) return false;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width <= 1080 && img.height <= 1920);
      img.src = `data:image/jpeg;base64,${items[0].base64}`;
    });
  });

  expect(withinLimits).toBe(true);
});

test("fase 2: 24h expired story removed from list", async ({ page }) => {
  const now = Date.now();

  // Seed one recent + one expired story
  await page.addInitScript((now) => {
    const recent = {
      id: "recent-1",
      base64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      timestamp: now,
    };
    const expired = {
      id: "expired-1",
      base64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      timestamp: now - 86_400_000 - 5000,
    };
    localStorage.setItem("@@storyImages", JSON.stringify([recent, expired]));
  }, now);

  await page.goto("/");
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: "tests/screenshots/fase-2/08-expired-removed.png",
    fullPage: true,
  });

  await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  await expect(page.locator('[data-testid="story-circle-1"]')).toHaveCount(0);
});

test("fase 2: localStorage persists after refresh", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1000);

  await page.click('[data-testid="upload-button"]');
  await page.setInputFiles('input[type="file"]', IMAGE_SMALL);
  await page.waitForTimeout(1500);

  await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();

  // Refresh the page
  await page.reload();
  await page.waitForTimeout(1000);

  // Story should still be there after refresh
  await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();

  await page.screenshot({
    path: "tests/screenshots/fase-2/09-persists-after-refresh.png",
    fullPage: true,
  });
});
