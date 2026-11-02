# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fase-3.stories.spec.ts >> fase 3: custom icons, full-screen viewer, responsive design, deletion >> Upload image > 1080×1920 → gets resized/constrained
- Location: tests/fase-3.stories.spec.ts:250:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-testid="upload-button"]')

```

# Test source

```ts
  156 | 
  157 |     // First story removed; second story now at index 0
  158 |     await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  159 |     await expect(page.locator('[data-testid="story-circle-1"]')).toHaveCount(0);
  160 |   });
  161 | 
  162 |   test("Open full-screen viewer and close it", async ({ page }) => {
  163 |     const now = Date.now();
  164 |     await seedStories(page, [
  165 |       { id: "v-1", base64: RECENT_B64, timestamp: now },
  166 |       { id: "v-2", base64: RECENT_B64, timestamp: now - 1000 },
  167 |     ]);
  168 | 
  169 |     await page.click('[data-testid="story-circle-0"]');
  170 |     await page.waitForTimeout(1000);
  171 | 
  172 |     await page.screenshot({
  173 |       path: "tests/screenshots/fase-3/06-viewer-open.png",
  174 |       fullPage: true,
  175 |     });
  176 | 
  177 |     const overlay = page.locator('[data-testid="story-viewer-overlay"]');
  178 |     await expect(overlay).toBeVisible();
  179 | 
  180 |     const container = page.locator('[data-testid="story-viewer-container"]');
  181 |     await expect(container).toBeVisible();
  182 | 
  183 |     // Close button should be visible
  184 |     await expect(page.locator('[data-testid="viewer-close"]')).toBeVisible();
  185 | 
  186 |     // Viewer should cover the full viewport (fixed inset 0)
  187 |     const box = await overlay.boundingBox();
  188 |     expect(box).not.toBeNull();
  189 |     const viewport = page.viewportSize();
  190 |     expect(viewport).not.toBeNull();
  191 |     expect(box!.x).toBeLessThanOrEqual(0);
  192 |     expect(box!.y).toBeLessThanOrEqual(0);
  193 |     expect(box!.width).toBeGreaterThanOrEqual(viewport!.width - 2);
  194 |     expect(box!.height).toBeGreaterThanOrEqual(viewport!.height - 2);
  195 | 
  196 |     // Click close button → viewer closes
  197 |     await page.click('[data-testid="viewer-close"]');
  198 |     await page.waitForTimeout(500);
  199 | 
  200 |     await expect(page.locator('[data-testid="story-viewer-overlay"]')).toBeHidden();
  201 | 
  202 |     await page.screenshot({
  203 |       path: "tests/screenshots/fase-3/07-viewer-closed.png",
  204 |       fullPage: true,
  205 |     });
  206 |   });
  207 | 
  208 |   test("Swipe left/right → cycle through stories in viewer", async ({
  209 |     page,
  210 |   }) => {
  211 |     const now = Date.now();
  212 |     await seedStories(page, [
  213 |       { id: "s-1", base64: RECENT_B64, timestamp: now },
  214 |       { id: "s-2", base64: RECENT_B64, timestamp: now - 1000 },
  215 |     ]);
  216 | 
  217 |     await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  218 |     await expect(page.locator('[data-testid="story-circle-1"]')).toBeVisible();
  219 | 
  220 |     await page.click('[data-testid="story-circle-0"]');
  221 |     await page.waitForTimeout(1000);
  222 | 
  223 |     const viewer = page.locator('[data-testid="story-viewer-container"]');
  224 |     await expect(viewer).toBeVisible();
  225 | 
  226 |     const box = await viewer.boundingBox();
  227 |     expect(box).not.toBeNull();
  228 |     const cx = box!.x + box!.width / 2;
  229 |     const cy = box!.y + box!.height / 2;
  230 | 
  231 |     // Swipe left → next story (dx < 0)
  232 |     await swipeOn(page, '[data-testid="story-viewer-container"]', cx + 120, cy, cx - 120, cy);
  233 |     await page.waitForTimeout(1000);
  234 | 
  235 |     await page.screenshot({
  236 |       path: "tests/screenshots/fase-3/08-swipe-left.png",
  237 |       fullPage: true,
  238 |     });
  239 | 
  240 |     // Swipe right → previous story (dx > 0)
  241 |     await swipeOn(page, '[data-testid="story-viewer-container"]', cx - 120, cy, cx + 120, cy);
  242 |     await page.waitForTimeout(1000);
  243 | 
  244 |     await page.screenshot({
  245 |       path: "tests/screenshots/fase-3/09-swipe-right.png",
  246 |       fullPage: true,
  247 |     });
  248 |   });
  249 | 
  250 |   test("Upload image > 1080×1920 → gets resized/constrained", async ({
  251 |     page,
  252 |   }) => {
  253 |     await page.goto("/");
  254 |     await page.waitForTimeout(1000);
  255 | 
> 256 |     await page.click('[data-testid="upload-button"]');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  257 |     await page.setInputFiles('input[type="file"]', IMAGE_LARGE);
  258 |     await page.waitForTimeout(2000);
  259 | 
  260 |     await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  261 | 
  262 |     await page.screenshot({
  263 |       path: "tests/screenshots/fase-3/10-upload-large-image.png",
  264 |       fullPage: true,
  265 |     });
  266 | 
  267 |     const withinLimits = await page.evaluate(() => {
  268 |       const stored = localStorage.getItem("@@storyImages");
  269 |       if (!stored) return false;
  270 |       const items: Array<{ base64: string }> = JSON.parse(stored);
  271 |       if (items.length === 0) return false;
  272 |       return new Promise((resolve) => {
  273 |         const img = new Image();
  274 |         img.onload = () => resolve(img.width <= 1080 && img.height <= 1920);
  275 |         img.src = `data:image/jpeg;base64,${items[0].base64}`;
  276 |       });
  277 |     });
  278 | 
  279 |     expect(withinLimits).toBe(true);
  280 |   });
  281 | 
  282 |   test("24h expired story removed from list", async ({ page }) => {
  283 |     const now = Date.now();
  284 |     await seedStories(page, [
  285 |       { id: "recent-1", base64: RECENT_B64, timestamp: now },
  286 |       {
  287 |         id: "expired-1",
  288 |         base64: RECENT_B64,
  289 |         timestamp: now - 86_400_000 - 5000,
  290 |       },
  291 |     ]);
  292 | 
  293 |     await page.screenshot({
  294 |       path: "tests/screenshots/fase-3/11-expired-removed.png",
  295 |       fullPage: true,
  296 |     });
  297 | 
  298 |     await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  299 |     await expect(page.locator('[data-testid="story-circle-1"]')).toHaveCount(0);
  300 |   });
  301 | 
  302 |   test("localStorage persists after refresh", async ({ page }) => {
  303 |     await page.goto("/");
  304 |     await page.waitForTimeout(1000);
  305 | 
  306 |     await page.click('[data-testid="upload-button"]');
  307 |     await page.setInputFiles('input[type="file"]', IMAGE_SMALL);
  308 |     await page.waitForTimeout(1500);
  309 | 
  310 |     await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  311 | 
  312 |     await page.reload();
  313 |     await page.waitForTimeout(1000);
  314 | 
  315 |     await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  316 | 
  317 |     await page.screenshot({
  318 |       path: "tests/screenshots/fase-3/12-persists-after-refresh.png",
  319 |       fullPage: true,
  320 |     });
  321 |   });
  322 | 
  323 |   test("Responsive: mobile viewport wraps story circles into rows", async ({
  324 |     page,
  325 |   }) => {
  326 |     await page.setViewportSize({ width: 375, height: 667 });
  327 |     await page.goto("/");
  328 |     await page.waitForTimeout(1000);
  329 | 
  330 |     const storyList = page.locator('[data-testid="story-list"]').first();
  331 |     // Should wrap on mobile (flex-wrap: wrap)
  332 |     const wrap = await page.evaluate(() => {
  333 |       const el = document.querySelector('[data-testid="story-list"]');
  334 |       if (!el) return null;
  335 |       return getComputedStyle(el).flexWrap;
  336 |     });
  337 |     expect(wrap).toBe("wrap");
  338 | 
  339 |     await page.screenshot({
  340 |       path: "tests/screenshots/fase-3/13-mobile-wrap.png",
  341 |       fullPage: true,
  342 |     });
  343 |   });
  344 | 
  345 |   test("Responsive: desktop viewport scrolls story circles horizontally", async ({
  346 |     page,
  347 |   }) => {
  348 |     await page.setViewportSize({ width: 1280, height: 800 });
  349 |     await page.goto("/");
  350 |     await page.waitForTimeout(1000);
  351 | 
  352 |     const nowrap = await page.evaluate(() => {
  353 |       const el = document.querySelector('[data-testid="story-list"]');
  354 |       if (!el) return null;
  355 |       return getComputedStyle(el).flexWrap;
  356 |     });
```