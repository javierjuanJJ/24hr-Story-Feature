# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fase-2.stories.spec.ts >> fase 2: localStorage persists after refresh
- Location: tests/fase-2.stories.spec.ts:200:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.reload: Test timeout of 30000ms exceeded.
Call log:
  - waiting for navigation until "load"
    - navigated to "http://localhost:5173/"

```

# Test source

```ts
  111 |   await page.click('[data-testid="story-circle-0"]');
  112 |   await page.waitForTimeout(1000);
  113 | 
  114 |   await page.screenshot({
  115 |     path: "tests/screenshots/fase-2/04-viewer-open-story-0.png",
  116 |     fullPage: true,
  117 |   });
  118 | 
  119 |   const viewer = page.locator('[data-testid="story-viewer-container"]');
  120 |   await expect(viewer).toBeVisible();
  121 | 
  122 |   const box = await viewer.boundingBox();
  123 |   expect(box).not.toBeNull();
  124 | 
  125 |   const cx = box!.x + box!.width / 2;
  126 |   const cy = box!.y + box!.height / 2;
  127 | 
  128 |   // Swipe left → next story (start X high, end X low => dx < 0)
  129 |   await swipeOn(page, '[data-testid="story-viewer-container"]', cx + 120, cy, cx - 120, cy);
  130 |   await page.waitForTimeout(1000);
  131 | 
  132 |   await page.screenshot({
  133 |     path: "tests/screenshots/fase-2/05-after-swipe-left.png",
  134 |     fullPage: true,
  135 |   });
  136 | 
  137 |   // Swipe right → previous story (start X low, end X high => dx > 0)
  138 |   await swipeOn(page, '[data-testid="story-viewer-container"]', cx - 120, cy, cx + 120, cy);
  139 |   await page.waitForTimeout(1000);
  140 | 
  141 |   await page.screenshot({
  142 |     path: "tests/screenshots/fase-2/06-after-swipe-right.png",
  143 |     fullPage: true,
  144 |   });
  145 | });
  146 | 
  147 | test("fase 2: Upload image > 1080×1920 → gets resized/constrained", async ({
  148 |   page,
  149 | }) => {
  150 |   await page.goto("/");
  151 |   await page.waitForTimeout(1000);
  152 | 
  153 |   await page.click('[data-testid="upload-button"]');
  154 |   await page.setInputFiles('input[type="file"]', IMAGE_LARGE);
  155 |   await page.waitForTimeout(2000);
  156 | 
  157 |   await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  158 | 
  159 |   await page.screenshot({
  160 |     path: "tests/screenshots/fase-2/07-upload-large-image.png",
  161 |     fullPage: true,
  162 |   });
  163 | 
  164 |   // Verify the stored base64 decodes to an image within max dimensions
  165 |   const withinLimits = await page.evaluate(() => {
  166 |     const stored = localStorage.getItem("@@storyImages");
  167 |     if (!stored) return false;
  168 |     const items: Array<{ base64: string }> = JSON.parse(stored);
  169 |     if (items.length === 0) return false;
  170 |     return new Promise((resolve) => {
  171 |       const img = new Image();
  172 |       img.onload = () => resolve(img.width <= 1080 && img.height <= 1920);
  173 |       img.src = `data:image/jpeg;base64,${items[0].base64}`;
  174 |     });
  175 |   });
  176 | 
  177 |   expect(withinLimits).toBe(true);
  178 | });
  179 | 
  180 | test("fase 2: 24h expired story removed from list", async ({ page }) => {
  181 |   const now = Date.now();
  182 |   await seedStories(page, [
  183 |     { id: "recent-1", base64: RECENT_B64, timestamp: now },
  184 |     {
  185 |       id: "expired-1",
  186 |       base64: RECENT_B64,
  187 |       timestamp: now - 86_400_000 - 5000,
  188 |     },
  189 |   ]);
  190 | 
  191 |   await page.screenshot({
  192 |     path: "tests/screenshots/fase-2/08-expired-removed.png",
  193 |     fullPage: true,
  194 |   });
  195 | 
  196 |   await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  197 |   await expect(page.locator('[data-testid="story-circle-1"]')).toHaveCount(0);
  198 | });
  199 | 
  200 | test("fase 2: localStorage persists after refresh", async ({ page }) => {
  201 |   await page.goto("/");
  202 |   await page.waitForTimeout(1000);
  203 | 
  204 |   await page.click('[data-testid="upload-button"]');
  205 |   await page.setInputFiles('input[type="file"]', IMAGE_SMALL);
  206 |   await page.waitForTimeout(1500);
  207 | 
  208 |   await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  209 | 
  210 |   // Refresh the page
> 211 |   await page.reload();
      |              ^ Error: page.reload: Test timeout of 30000ms exceeded.
  212 |   await page.waitForTimeout(1000);
  213 | 
  214 |   // Story should still be there after refresh
  215 |   await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  216 | 
  217 |   await page.screenshot({
  218 |     path: "tests/screenshots/fase-2/09-persists-after-refresh.png",
  219 |     fullPage: true,
  220 |   });
  221 | });
  222 | 
```