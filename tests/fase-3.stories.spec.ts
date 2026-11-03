import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

const IMAGE_SMALL = "/home/jj/24hr-Story-Feature/image2.png"; // 500x636
const IMAGE_LARGE = "/home/jj/24hr-Story-Feature/image.png"; // 2272x3579 (>1080x1920)

const RECENT_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Dispatch touchstart + touchend on an element to simulate a swipe, driving
// the component's onTouchStart/onTouchEnd handlers.
async function swipeOn(
  page: import("@playwright/test").Page,
  selector: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number
) {
  await page.evaluate(
    ({ sel, sx, sy, ex, ey }) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const startTouch = new Touch({
        identifier: 0,
        target: el,
        clientX: sx,
        clientY: sy,
      });
      const endTouch = new Touch({
        identifier: 0,
        target: el,
        clientX: ex,
        clientY: ey,
      });

      el.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          cancelable: true,
          touches: [startTouch],
          changedTouches: [startTouch],
        })
      );
      el.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          cancelable: true,
          touches: [],
          changedTouches: [endTouch],
        })
      );
    },
    { sel: selector, sx: startX, sy: startY, ex: endX, ey: endY }
  );
}

async function seedStories(
  page: import("@playwright/test").Page,
  items: Array<{ id: string; base64: string; timestamp: number }>
) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(({ items }) => {
    localStorage.clear();
    localStorage.setItem("@@storyImages", JSON.stringify(items));
  }, { items });
  await page.reload();
  await page.waitForTimeout(1000);
}

test.describe("fase 3: custom icons, full-screen viewer, responsive design, deletion", () => {
  test("Load page → story circles displayed, no expired stories", async ({
    page,
  }) => {
    const now = Date.now();
    await seedStories(page, [
      { id: "recent-1", base64: RECENT_B64, timestamp: now },
      {
        id: "expired-1",
        base64: RECENT_B64,
        timestamp: now - 86_400_000 - 1000,
      },
    ]);

    await page.screenshot({
      path: "tests/screenshots/fase-3/01-load-with-stories.png",
      fullPage: true,
    });

    await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="story-circle-1"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="empty-state"]')).toBeHidden();
  });

  test("Custom icons render (plus on upload button)", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "tests/screenshots/fase-3/02-custom-icons.png",
      fullPage: true,
    });

    // Upload button should render an SVG icon (PlusIcon) instead of plain text
    const uploadButton = page.locator('[data-testid="upload-button"]');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton.locator("svg")).toHaveCount(1);
  });

  test("Click + → select image → image appears in story list", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "tests/screenshots/fase-3/03-before-upload.png",
      fullPage: true,
    });

    await page.click('[data-testid="upload-button"]');
    await page.setInputFiles('input[type="file"]', IMAGE_SMALL);
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/fase-3/04-after-upload.png",
      fullPage: true,
    });
  });

  test("Delete story removes it from the list", async ({ page }) => {
    const now = Date.now();
    await seedStories(page, [
      { id: "d-1", base64: RECENT_B64, timestamp: now },
      { id: "d-2", base64: RECENT_B64, timestamp: now - 1000 },
    ]);

    await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="story-circle-1"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="delete-story-0"]')
    ).toBeVisible();

    // Click the delete button on the first story circle
    await page.click('[data-testid="delete-story-0"]');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: "tests/screenshots/fase-3/05-after-delete.png",
      fullPage: true,
    });

    // First story removed; second story now at index 0
    await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="story-circle-1"]')).toHaveCount(0);
  });

  test("Open full-screen viewer and close it", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles('input[type="file"]', IMAGE_SMALL);
    await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();

    await page.click('[data-testid="story-circle-0"]');
    await expect(page.locator(".instastories-viewer")).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/fase-3/06-viewer-open.png",
      fullPage: true,
    });

    const overlay = page.locator('[data-testid="story-viewer-overlay"]');
    await expect(overlay).toBeVisible();

    const container = page.locator('[data-testid="story-viewer-container"]');
    await expect(container).toBeVisible();

    const storyImage = page.locator(".instastories-page img").first();
    await expect.poll(() =>
      storyImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)
    ).toBeGreaterThan(0);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const overlay = document.querySelector(
            '[data-testid="story-viewer-overlay"]'
          );
          const box = overlay?.getBoundingClientRect();
          if (!box) return false;
          const topElement = document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2
          );
          return topElement?.closest(".instastories-page") !== null;
        })
      )
      .toBe(true);

    // Close button should be visible
    await expect(page.locator('[data-testid="viewer-close"]')).toBeVisible();

    // Viewer should cover the full viewport (fixed inset 0)
    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    expect(box!.x).toBeLessThanOrEqual(0);
    expect(box!.y).toBeLessThanOrEqual(0);
    expect(box!.width).toBeGreaterThanOrEqual(viewport!.width - 2);
    expect(box!.height).toBeGreaterThanOrEqual(viewport!.height - 2);

    // Click close button → viewer closes
    await page.click('[data-testid="viewer-close"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="story-viewer-overlay"]')).toBeHidden();

    await page.screenshot({
      path: "tests/screenshots/fase-3/07-viewer-closed.png",
      fullPage: true,
    });
  });

  test("Swipe left/right → cycle through stories in viewer", async ({
    page,
  }) => {
    const now = Date.now();
    await seedStories(page, [
      { id: "s-1", base64: RECENT_B64, timestamp: now },
      { id: "s-2", base64: RECENT_B64, timestamp: now - 1000 },
    ]);

    await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="story-circle-1"]')).toBeVisible();

    await page.click('[data-testid="story-circle-0"]');
    await page.waitForTimeout(1000);

    const viewer = page.locator('[data-testid="story-viewer-container"]');
    await expect(viewer).toBeVisible();

    const box = await viewer.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    // Swipe left → next story (dx < 0)
    await swipeOn(page, '[data-testid="story-viewer-container"]', cx + 120, cy, cx - 120, cy);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "tests/screenshots/fase-3/08-swipe-left.png",
      fullPage: true,
    });

    // Swipe right → previous story (dx > 0)
    await swipeOn(page, '[data-testid="story-viewer-container"]', cx - 120, cy, cx + 120, cy);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "tests/screenshots/fase-3/09-swipe-right.png",
      fullPage: true,
    });
  });

  test("Upload image > 1080×1920 → gets resized/constrained", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    await page.click('[data-testid="upload-button"]');
    await page.setInputFiles('input[type="file"]', IMAGE_LARGE);
    await page.waitForTimeout(2000);

    await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/fase-3/10-upload-large-image.png",
      fullPage: true,
    });

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

  test("24h expired story removed from list", async ({ page }) => {
    const now = Date.now();
    await seedStories(page, [
      { id: "recent-1", base64: RECENT_B64, timestamp: now },
      {
        id: "expired-1",
        base64: RECENT_B64,
        timestamp: now - 86_400_000 - 5000,
      },
    ]);

    await page.screenshot({
      path: "tests/screenshots/fase-3/11-expired-removed.png",
      fullPage: true,
    });

    await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="story-circle-1"]')).toHaveCount(0);
  });

  test("localStorage persists after refresh", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    await page.click('[data-testid="upload-button"]');
    await page.setInputFiles('input[type="file"]', IMAGE_SMALL);
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();

    await page.reload();
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/fase-3/12-persists-after-refresh.png",
      fullPage: true,
    });
  });

  test("Responsive: mobile viewport wraps story circles into rows", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForTimeout(1000);

    const storyList = page.locator('[data-testid="story-list"]').first();
    // Should wrap on mobile (flex-wrap: wrap)
    const wrap = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="story-list"]');
      if (!el) return null;
      return getComputedStyle(el).flexWrap;
    });
    expect(wrap).toBe("wrap");

    await page.screenshot({
      path: "tests/screenshots/fase-3/13-mobile-wrap.png",
      fullPage: true,
    });
  });

  test("Responsive: desktop viewport scrolls story circles horizontally", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForTimeout(1000);

    const nowrap = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="story-list"]');
      if (!el) return null;
      return getComputedStyle(el).flexWrap;
    });
    expect(nowrap).toBe("nowrap");

    await page.screenshot({
      path: "tests/screenshots/fase-3/14-desktop-scroll.png",
      fullPage: true,
    });
  });
});
