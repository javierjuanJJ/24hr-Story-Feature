# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fase-3.stories.spec.ts >> fase 3: custom icons, full-screen viewer, responsive design, deletion >> Responsive: desktop viewport scrolls story circles horizontally
- Location: tests/fase-3.stories.spec.ts:345:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "nowrap"
Received: null
```

# Test source

```ts
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
> 357 |     expect(nowrap).toBe("nowrap");
      |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  358 | 
  359 |     await page.screenshot({
  360 |       path: "tests/screenshots/fase-3/14-desktop-scroll.png",
  361 |       fullPage: true,
  362 |     });
  363 |   });
  364 | });
  365 | 
```