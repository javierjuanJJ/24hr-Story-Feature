# 24hr Story Feature - AGENTS.md

## Setup & Development

### Install dependencies
```bash
pnpm install
```
This pulls React, TypeScript, `react-instastories`, Playwright, and project deps.

### Start dev server
```bash
pnpm run dev
```
Runs Vite/React dev server at http://localhost:5173. The app is client-side only.

### Build for production
```bash
pnpm run build
```

## Architecture & Key Decisions

### Technology stack
- **React** + **strict TypeScript** (`tsconfig.json` has `strict: true`)
- **react-instastories** (mcp context7) — the `<Story />` component wraps individual story images. Do not attempt to rebuild the story carousel from scratch; use the library's API.
- **Custom icons** (mcp context7) — import from the project's icon set; do not use external icon fonts.
- **Playwright** (mcp playwright) — E2E tests + screenshots. See Testing section.

### Story data flow
- Images are converted to **base64** on upload and stored in **localStorage** under key `@@storyImages`.
- Each stored item: `{ base64: string, timestamp: number }` (timestamp = Date.now() when uploaded).
- Stories expire after **24 hours** (86_400_000 ms). A cleanup run on mount removes any expired entries.
- Only keep the **last 20** story entries to avoid unbounded localStorage growth.

### Image constraints
- Max dimensions: **1080 × 1920px**.
- On upload, if image exceeds dimensions, downscale maintaining aspect ratio before base64 conversion.
- Recommended: use `<input type="file" accept="image/*" />` + Canvas to draw/resize, then `canvas.toDataURL()`.

### Story list component
- Top of viewport: horizontal scrollable list of story circles/frames.
- Clicking a story frame displays the full‑screen story viewer.
- Optional swipe navigation (left/right) to cycle through stories. Use `react-instastories` swipe props or implement with `pointerevents`.

### Upload (Plus button)
- Opens file picker.
- On selection: validate image size (< 1080×1920), resize if needed, convert to base64, store with timestamp.
- Show preview in the story list immediately.

## TypeScript / Strict Mode

- `tsconfig.json` enforces `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`.
- Avoid `any`; if you must use it, add a `// TODO: review type` comment above.
- Component props must be fully typed. Use interfaces for story items:
  ```ts
  interface StoryItem {
    id: string;           // unique generated ID
    base64: string;
    timestamp: number;   // when uploaded
  }
  ```

## Playwright Testing & Screenshots

### Test command
```bash
pnpm test      # runs vitest unit tests
npx playwright test   # runs E2E tests
```

### Screenshot workflow (per the user's phased requirement)
After **each development phase**:
1. Run `npx playwright test --debug` or specific test.
2. Generate screenshots: `npx playwright test --snapshot-dir=tests/screenshots/<phase-name>`.
3. Review images to confirm: stories appear, upload works, 24‑h expired stories are hidden, swipe navigation functions.
4. Commit screenshots alongside test changes so future agents have visual regression baseline.

### Key test scenarios (add to test files)
- [ ] Load page → story circles displayed, no expired stories.
- [ ] Click + → select image → image appears in story list.
- [ ] Swipe left/right → cycle through stories (if swipe enabled).
- [ ] Wait 24h (simulate by advancing `timestamp` forward/backward) → expired story removed from list.
- [ ] Upload image > 1080×1920 → gets resized/constrained.
- [ ] localStorage persists after refresh.

## Responsive Design

- **Desktop** (image.png / image2.png mockups): story grid shows 4–5 circles across, full‑screen viewer centered.
- **Tablet/mobile** (image3.png mockup): story circles stack vertically or show fewer per row; viewer fills available width.
- Use CSS `max-width: 100%` and `height: auto` for story images; media queries to adjust grid column count (e.g., `grid-template-columns: repeat(auto-fill, minmax(60px, 1fr))`).
- The `react-instastories` container should be `width: 100%; height: 40vh` (or similar) with `object-fit: contain`.

## Common Gotchas

| What an agent might miss | Fix / reminder |
|---|---|
| Forgetting to cleanup expired stories | `useEffect` on mount runs `cleanupExpiredStories()` — call it once. |
| base64 string too large → slow load | Resize on canvas before `toDataURL()`. |
| Playwright tests failing because localStorage is cleared between tests | Use `test.beforeEach(() => localStorage.clear())` or preserve with `test.use({ storageState: 'localStorage.json' })`. |
| Icons not displaying | Import from `@/icons` (project‑specific path); do not import from node_modules unless explicitly added. |
| TypeScript error on `react-instastories` props | Check the library's `@types/react-instastories` or add JSDoc typings. |

## Commands Summary

| Action | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm run dev` |
| Build | `pnpm run build` |
| Unit tests | `pnpm test` |
| E2E tests + screenshots | `npx playwright test` |
| Run Playwright show | `npx playwright show last-report` |

---

*This file is intentionally compact. Every line answers "Would an agent likely miss this without help?" If a topic is routine (e.g., "use `pnpm run build`"), it's omitted. Project‑specific gotchas are kept; generic advice is excluded.*