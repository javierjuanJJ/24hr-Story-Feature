# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fase-3.stories.spec.ts >> fase 3: custom icons, full-screen viewer, responsive design, deletion >> Delete story removes it from the list
- Location: tests/fase-3.stories.spec.ts:135:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="story-circle-0"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[data-testid="story-circle-0"]') with timeout 5000ms
  - waiting for locator('[data-testid="story-circle-0"]')

```

# Test source

```ts
  42  |           touches: [startTouch],
  43  |           changedTouches: [startTouch],
  44  |         })
  45  |       );
  46  |       el.dispatchEvent(
  47  |         new TouchEvent("touchend", {
  48  |           bubbles: true,
  49  |           cancelable: true,
  50  |           touches: [],
  51  |           changedTouches: [endTouch],
  52  |         })
  53  |       );
  54  |     },
  55  |     { sel: selector, sx: startX, sy: startY, ex: endX, ey: endY }
  56  |   );
  57  | }
  58  | 
  59  | async function seedStories(
  60  |   page: import("@playwright/test").Page,
  61  |   items: Array<{ id: string; base64: string; timestamp: number }>
  62  | ) {
  63  |   await page.goto("/");
  64  |   await page.waitForLoadState("domcontentloaded");
  65  |   await page.evaluate(({ items }) => {
  66  |     localStorage.clear();
  67  |     localStorage.setItem("@@storyImages", JSON.stringify(items));
  68  |   }, { items });
  69  |   await page.reload();
  70  |   await page.waitForTimeout(1000);
  71  | }
  72  | 
  73  | test.describe("fase 3: custom icons, full-screen viewer, responsive design, deletion", () => {
  74  |   test("Load page → story circles displayed, no expired stories", async ({
  75  |     page,
  76  |   }) => {
  77  |     const now = Date.now();
  78  |     await seedStories(page, [
  79  |       { id: "recent-1", base64: RECENT_B64, timestamp: now },
  80  |       {
  81  |         id: "expired-1",
  82  |         base64: RECENT_B64,
  83  |         timestamp: now - 86_400_000 - 1000,
  84  |       },
  85  |     ]);
  86  | 
  87  |     await page.screenshot({
  88  |       path: "tests/screenshots/fase-3/01-load-with-stories.png",
  89  |       fullPage: true,
  90  |     });
  91  | 
  92  |     await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  93  |     await expect(page.locator('[data-testid="story-circle-1"]')).toHaveCount(0);
  94  |     await expect(page.locator('[data-testid="empty-state"]')).toBeHidden();
  95  |   });
  96  | 
  97  |   test("Custom icons render (plus on upload button)", async ({ page }) => {
  98  |     await page.goto("/");
  99  |     await page.waitForTimeout(1000);
  100 | 
  101 |     await page.screenshot({
  102 |       path: "tests/screenshots/fase-3/02-custom-icons.png",
  103 |       fullPage: true,
  104 |     });
  105 | 
  106 |     // Upload button should render an SVG icon (PlusIcon) instead of plain text
  107 |     const uploadButton = page.locator('[data-testid="upload-button"]');
  108 |     await expect(uploadButton).toBeVisible();
  109 |     await expect(uploadButton.locator("svg")).toHaveCount(1);
  110 |   });
  111 | 
  112 |   test("Click + → select image → image appears in story list", async ({
  113 |     page,
  114 |   }) => {
  115 |     await page.goto("/");
  116 |     await page.waitForTimeout(1000);
  117 | 
  118 |     await page.screenshot({
  119 |       path: "tests/screenshots/fase-3/03-before-upload.png",
  120 |       fullPage: true,
  121 |     });
  122 | 
  123 |     await page.click('[data-testid="upload-button"]');
  124 |     await page.setInputFiles('input[type="file"]', IMAGE_SMALL);
  125 |     await page.waitForTimeout(1500);
  126 | 
  127 |     await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
  128 | 
  129 |     await page.screenshot({
  130 |       path: "tests/screenshots/fase-3/04-after-upload.png",
  131 |       fullPage: true,
  132 |     });
  133 |   });
  134 | 
  135 |   test("Delete story removes it from the list", async ({ page }) => {
  136 |     const now = Date.now();
  137 |     await seedStories(page, [
  138 |       { id: "d-1", base64: RECENT_B64, timestamp: now },
  139 |       { id: "d-2", base64: RECENT_B64, timestamp: now - 1000 },
  140 |     ]);
  141 | 
> 142 |     await expect(page.locator('[data-testid="story-circle-0"]')).toBeVisible();
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
  143 |     await expect(page.locator('[data-testid="story-circle-1"]')).toBeVisible();
  144 |     await expect(
  145 |       page.locator('[data-testid="delete-story-0"]')
  146 |     ).toBeVisible();
  147 | 
  148 |     // Click the delete button on the first story circle
  149 |     await page.click('[data-testid="delete-story-0"]');
  150 |     await page.waitForTimeout(500);
  151 | 
  152 |     await page.screenshot({
  153 |       path: "tests/screenshots/fase-3/05-after-delete.png",
  154 |       fullPage: true,
  155 |     });
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
```