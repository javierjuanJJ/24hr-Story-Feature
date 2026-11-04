---
description: Organize any React project into feature-based folders (consts, components, hooks, utils, interfaces) with barrel exports and English comments, preserving all existing functionality.
model: nemotron-3.5-super-vl-free
---

# organize-react-project

**Goal:** Reorganize any React project so that all code lives in dedicated folders, with barrel exports and English comments, while preserving all existing functionality.

**Where to run:** Project root of any React project.

**Target folder structure under `src/`:**
```
src/
  consts/        -> application-wide constants
  components/    -> React components
  hooks/         -> custom React hooks
  utils/         -> utilities / transformers / helpers
  interfaces/    -> TypeScript interfaces and types
  icons/         -> custom icons (if present, left unchanged)
```

## Prerequisites

Before starting, confirm the project is a React + TypeScript project:
- Has `src/` directory
- Has `tsconfig.json` with `strict: true` (or at least TypeScript enabled)
- Has a build tool (Vite, Next.js, Create React App, etc.)
- Entry point is `src/main.tsx`, `src/main.jsx`, `src/index.tsx`, or `src/index.jsx`

## Steps

### 1. Explore the project structure

Run these commands to understand the current layout:

```bash
find src -type f | sort
cat package.json | head -40
cat tsconfig.json
```

Identify:
- The app entry file (usually `src/main.tsx` or `src/index.tsx`)
- The root component file (usually `src/App.tsx` or `src/App.jsx`)
- Where constants, interfaces, utilities, hooks, and components currently live (if anywhere)

### 2. Create the destination folders

Create these directories under `src/` if they do not exist yet:

```bash
mkdir -p src/consts src/components src/hooks src/utils src/interfaces
```

### 3. Extract constants to `src/consts`

Find all hardcoded values, magic numbers, API keys, storage keys, limits, and configuration values across the project. Move them into dedicated files under `src/consts/`.

Example file: `src/consts/app.consts.ts`

```ts
/**
 * Application-wide constants.
 *
 * Centralizing these values makes them easy to change and keeps them out of
 * component logic. Each constant is documented in English so a junior
 * programmer can understand what it controls.
 */

/**
 * Key used to read/write data in browser localStorage.
 */
export const STORAGE_KEY = "@@appData";

/**
 * Maximum number of items to keep in localStorage.
 */
export const MAX_ITEMS = 20;

/**
 * Expiration time in milliseconds (24 hours).
 */
export const EXPIRY_MS = 86_400_000;

/**
 * Default timeout in milliseconds for async operations.
 */
export const DEFAULT_TIMEOUT_MS = 30_000;
```

Create `src/consts/index.ts` as a barrel file:

```ts
/**
 * Barrel export for the consts folder.
 *
 * Re-exports every constant so the rest of the app can import from a single
 * path: import { STORAGE_KEY, MAX_ITEMS } from "@/consts";
 */
export { STORAGE_KEY, MAX_ITEMS, EXPIRY_MS, DEFAULT_TIMEOUT_MS } from "./app.consts";
```

### 4. Extract interfaces to `src/interfaces`

Find all TypeScript interfaces and type aliases across the project. Move them into dedicated files under `src/interfaces/`.

Example: `src/interfaces/models.ts`

```ts
/**
 * TypeScript interfaces related to data models.
 *
 * Centralizing interfaces here keeps type definitions in one place and
 * separates "what the data looks like" from "how the data is used".
 */

/**
 * Represents a single item in the application.
 */
export interface Item {
  id: string;
  title: string;
  createdAt: number;
}
```

Create `src/interfaces/index.ts` as a barrel file:

```ts
/**
 * Barrel export for the interfaces folder.
 *
 * Re-exports every TypeScript interface/type so the app can import from a
 * single path: import { Item } from "@/interfaces";
 */
export type { Item } from "./models";
```

### 5. Extract utilities to `src/utils`

Find helper functions, transformers, formatters, validators, and other pure utilities. Move them into dedicated files under `src/utils/`.

Example: `src/utils/id.ts`

```ts
/**
 * Utility for generating unique identifiers.
 *
 * This file contains generateId, which creates a unique ID for new records
 * so they can be told apart in lists and localStorage.
 */

/**
 * Generates a unique identifier.
 *
 * Uses crypto.randomUUID when available, with a manual fallback.
 *
 * @returns a random UUID string
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback implementation...
  return "fallback-id";
}
```

Create `src/utils/index.ts` as a barrel file:

```ts
/**
 * Barrel export for the utils folder.
 *
 * Re-exports every utility so the app can import from a single path.
 */
export { generateId } from "./id";
```

### 6. Extract hooks to `src/hooks`

Find all custom React hooks (functions starting with `use`). Move them into dedicated files under `src/hooks/`.

Example: `src/hooks/useItems.ts`

```ts
/**
 * Hook that manages the items list state and persistence.
 *
 * Responsibilities:
 *  - Load items from localStorage on mount.
 *  - Save items to localStorage on change.
 *  - Expose addItem and removeItem helpers.
 *
 * @returns an object with items, addItem, and removeItem
 */

import { useCallback, useEffect, useState } from "react";
import { Item } from "@/interfaces";
import { STORAGE_KEY, MAX_ITEMS } from "@/consts";

export function useItems() {
  const [items, setItems] = useState<Item[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored).slice(-MAX_ITEMS);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((newItem: Item) => {
    setItems((prev) => [newItem, ...prev].slice(0, MAX_ITEMS));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { items, addItem, removeItem };
}
```

Create `src/hooks/index.ts` as a barrel file:

```ts
/**
 * Barrel export for the hooks folder.
 *
 * Re-exports every custom hook so the app can import from a single path.
 */
export { useItems } from "./useItems";
```

### 7. Move components to `src/components`

Move all React components into `src/components/`. Each component should live in its own file (or folder with an index file if it has sub-components/styles).

Example: `src/components/App.tsx`

```tsx
/**
 * App component - the root of the application.
 *
 * This component orchestrates the UI. Logic has been extracted into focused,
 * single-responsibility pieces under consts/, interfaces/, utils/, and hooks/.
 */

import { useItems } from "@/hooks";
import { Item } from "@/interfaces";

export default function App() {
  const { items, addItem, removeItem } = useItems();

  return (
    <div>
      <h1>My App</h1>
      {/* Render items here */}
    </div>
  );
}
```

Create `src/components/index.ts` as a barrel file:

```ts
/**
 * Barrel export for the components folder.
 *
 * Re-exports every component so the app can import from a single path.
 */

export { default as App } from "./App";
```

### 8. Update path aliases (if needed)

Check `tsconfig.json` and the build tool config (e.g., `vite.config.ts`, `next.config.js`) for path aliases.

Make sure `@/*` points to `./src/*` so imports like `@/consts`, `@/interfaces`, `@/hooks`, `@/utils`, and `@/components` work.

Example `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Example `vite.config.ts`:
```ts
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 9. Update imports throughout the project

Update all import statements to use the new folder structure:

- `import { STORAGE_KEY } from "./consts"` → `import { STORAGE_KEY } from "@/consts"`
- `import { Item } from "./interfaces"` → `import { Item } from "@/interfaces"`
- `import { generateId } from "./utils"` → `import { generateId } from "@/utils"`
- `import { useItems } from "./hooks"` → `import { useItems } from "@/hooks"`
- `import App from "./App"` → `import App from "@/components/App"` (or `./components/App`)

Update the app entry file (e.g., `src/main.tsx` or `src/index.tsx`) to import from the new component location:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/components/App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 10. Remove duplicate/old files

Delete the old root-level files that have been moved:

- `src/App.tsx` (if its content now lives in `src/components/App.tsx`)
- Any other files duplicated in the new folders

Keep `src/App.module.css` (or similar stylesheets) in place; components can still import them via relative paths.

### 11. Add English comments to all code

Every file moved or created must have comments in English explaining:

- What the file does
- What each exported function/constant/interface is for
- How to use it (parameters, return values)

This helps junior programmers understand the reorganization.

### 12. Verify nothing lost functionality

Run the TypeScript type check:

```bash
./node_modules/.bin/tsc --noEmit
```

It must exit with code 0 and no errors.

Run the production build:

```bash
# For Vite:
./node_modules/.bin/vite build

# For Next.js:
./node_modules/.bin/next build

# For Create React App:
./node_modules/.bin/react-scripts build

# Or generically:
pnpm run build
# or
npm run build
# or
yarn build
```

The build must complete successfully.

### 13. Confirm the new tree

Run:

```bash
find src -type f | sort
```

You should see files under `consts/`, `components/`, `hooks/`, `utils/`, `interfaces/`, and (if present) `icons/`, with no duplicate root-level `App.tsx` unless intentionally kept.

## Done

When all steps pass, the React project is reorganized. All existing functionality is preserved — the app behaves exactly as before — but now the code is split into single-responsibility folders with English comments a junior programmer can follow.

**Barrel import pattern used throughout:**

```tsx
import { STORAGE_KEY } from "@/consts";
import { Item } from "@/interfaces";
import { generateId } from "@/utils";
import { useItems } from "@/hooks";
import App from "@/components/App";
```
