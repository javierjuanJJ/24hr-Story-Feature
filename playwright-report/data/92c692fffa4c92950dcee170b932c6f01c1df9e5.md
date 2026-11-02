# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fase-2.stories.spec.ts >> fase 2: Swipe left/right → cycle through stories
- Location: tests/fase-2.stories.spec.ts:107:1

# Error details

```
Error: page.evaluate: Touch is not defined
@debugger eval code line 370 > eval:10:24
evaluate@debugger eval code:372:16
@debugger eval code:1:44
@debugger eval code:1:62

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e3]:
    - generic [ref=f1e4]:
      - generic [ref=f1e5] [cursor=pointer]
      - generic [ref=f1e6] [cursor=pointer]
      - button "+" [ref=f1e7] [cursor=pointer]
    - toolbar "List of stories" [ref=f1e10]:
      - button "Open story" [ref=f1e11] [cursor=pointer]
      - button "Open story" [ref=f1e12] [cursor=pointer]
  - dialog "Viewer of stories" [ref=f1e13]
```