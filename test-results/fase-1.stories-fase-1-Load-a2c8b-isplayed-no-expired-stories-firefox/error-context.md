# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fase-1.stories.spec.ts >> fase 1: Load page → story circles displayed, no expired stories
- Location: tests/fase-1.stories.spec.ts:10:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.use({ storageState: { cookies: [], origins: [] } });
  4  | 
  5  | test.beforeEach(() => {
  6  |   // Start with a clean localStorage so expired/persisted stories don't leak
  7  |   // between runs. Page reload is handled by test.use or goto below.
  8  | });
  9  | 
  10 | test("fase 1: Load page → story circles displayed, no expired stories", async ({
  11 |   page,
  12 | }) => {
  13 |   // Clear localStorage before navigating so no stale/expired stories appear
  14 |   await page.addInitScript(() => {
  15 |     localStorage.clear();
  16 |   });
  17 | 
> 18 |   await page.goto("/");
     |              ^ Error: page.goto: Test timeout of 30000ms exceeded.
  19 | 
  20 |   // Wait for the app to hydrate
  21 |   await page.waitForTimeout(1000);
  22 | 
  23 |   // Screenshot 1: initial load with no stories -> empty state message
  24 |   await page.screenshot({
  25 |     path: "tests/screenshots/fase-1/01-empty-state.png",
  26 |     fullPage: true,
  27 |   });
  28 | 
  29 |   // When there are no stories, the empty-state message should be visible
  30 |   await expect(
  31 |     page.getByText("No stories yet. Upload an image to get started.")
  32 |   ).toBeVisible();
  33 | 
  34 |   // No story circles should be displayed
  35 |   const storyCircles = page.locator('div[style*="border-radius: 50%"] img');
  36 |   await expect(storyCircles).toHaveCount(0);
  37 | 
  38 |   // Screenshot 2: confirm empty state
  39 |   await page.screenshot({
  40 |     path: "tests/screenshots/fase-1/02-no-story-circles.png",
  41 |     fullPage: true,
  42 |   });
  43 | });
  44 | 
```