# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fase-3.stories.spec.ts >> fase 3: custom icons, full-screen viewer, responsive design, deletion >> Swipe left/right → cycle through stories in viewer
- Location: tests/fase-3.stories.spec.ts:227:3

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
      - button "Delete story" [ref=f1e6] [cursor=pointer]
      - button "Delete story" [ref=f1e11] [cursor=pointer]
      - button "Upload story" [ref=f1e15] [cursor=pointer]
    - dialog "Story viewer":
      - button "Close viewer" [ref=f1e19] [cursor=pointer]
      - button "Previous story" [disabled] [ref=f1e23]
      - button "Next story" [ref=f1e27] [cursor=pointer]
  - dialog "Viewer of stories" [ref=f1e31]:
    - main "Current story" [ref=f1e32]:
      - group "Pages of story" [ref=f1e33]:
        - article "Page" [ref=f1e34]
```