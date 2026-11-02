# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fase-2.stories.spec.ts >> fase 2: Load page → story circles displayed, no expired stories
- Location: tests/fase-2.stories.spec.ts:53:1

# Error details

```
Error: Channel closed
```

```
Error: page.goto: Target page, context or browser has been closed
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

```
Error: browserContext.close: Target page, context or browser has been closed
```