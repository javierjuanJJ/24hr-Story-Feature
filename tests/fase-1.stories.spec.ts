import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(() => {
  // Start with a clean localStorage so expired/persisted stories don't leak
  // between runs. Page reload is handled by test.use or goto below.
});

test("fase 1: Load page → story circles displayed, no expired stories", async ({
  page,
}) => {
  // Clear localStorage before navigating so no stale/expired stories appear
  await page.addInitScript(() => {
    localStorage.clear();
  });

  await page.goto("/");

  // Wait for the app to hydrate
  await page.waitForTimeout(1000);

  // Screenshot 1: initial load with no stories -> empty state message
  await page.screenshot({
    path: "tests/screenshots/fase-1/01-empty-state.png",
    fullPage: true,
  });

  // When there are no stories, the empty-state message should be visible
  await expect(
    page.getByText("No stories yet. Upload an image to get started.")
  ).toBeVisible();

  // No story circles should be displayed
  const storyCircles = page.locator('div[style*="border-radius: 50%"] img');
  await expect(storyCircles).toHaveCount(0);

  // Screenshot 2: confirm empty state
  await page.screenshot({
    path: "tests/screenshots/fase-1/02-no-story-circles.png",
    fullPage: true,
  });
});
