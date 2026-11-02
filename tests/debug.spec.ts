import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("debug: localStorage set -> reload -> read", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const before = await page.evaluate(() => {
    localStorage.setItem("@@storyImages", JSON.stringify([{ id: "a", base64: "x", timestamp: Date.now() }]));
    return localStorage.getItem("@@storyImages");
  });
  console.log("AFTER SET (same page):", before);

  await page.reload();
  await page.waitForTimeout(1500);

  const after = await page.evaluate(() => localStorage.getItem("@@storyImages"));
  console.log("AFTER RELOAD:", after);

  const circles = page.locator('div[data-testid="story-circle-0"], img[src*="data:image"]');
  console.log("CIRCLE COUNT:", await circles.count());
});
