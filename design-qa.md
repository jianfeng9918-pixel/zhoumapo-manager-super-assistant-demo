# V9.1 Design QA

- source visual truth: `/Users/huangjianfeng/.codex/generated_images/019fec0e-7b89-7482-862c-43bfb9adc957/exec-ac6b02ee-1f5a-4ec4-a4a6-e4481ea0c765.png`
- product baseline: V9 public home and task screens captured on 2026-08-12
- implementation URL: `http://127.0.0.1:5175/?direct=1`
- implementation screenshots: `/tmp/v9-1-home-voice-idle-393x852.png`, `/tmp/v9-1-task-workbench-393x852.png`
- viewport: 393 × 852 CSS px, deviceScaleFactor 1
- source pixels: 853 × 1844, normalized to the same 393px mobile content width
- implementation pixels: 393 × 852
- state: fresh 08:30, store manager, no previous V9.1 progress

## Full-view comparison evidence

The selected V2 visual establishes the warm-white mobile console, compact brand header, clear role/time hierarchy, warm-red action color, visible work progress and fixed five-tab navigation. V9.1 intentionally retains the V9 home layout and applies the same compact card language to a newly structured task workbench rather than creating a new visual system.

## Focused region comparison evidence

- Home voice input: idle state remains a recessed light control below the red primary action; text now says `按下立即说 · 上滑取消` and exposes no technical 350ms threshold.
- Task first screen: the former duplicate red “先完成这一件” card is removed. The first viewport now shows status summary, four responsibility groups, five operating checkpoints, pending evidence/review and a secondary voice input.
- Fixed navigation remains visible at 393 × 852; task content continues below it without horizontal overflow.

## Comparison history

### Iteration 1 — blocked

- [P1] Short click and immediate voice capture conflicted, so the existing click-to-show-phrases accessibility test failed.
  - Fix: press gives immediate recording feedback; a very short tap opens common phrases; a normal press-and-release resolves speech; upward movement still cancels.
- [P2] Initial V9.1 task layout retained operational source/status language in the first card and duplicated the home decision.
  - Fix: replaced it with manager-language responsibility groups and operating checkpoints; task source remains available in details and audit state.

### Iteration 2 — passed

- Four targeted tests pass: quick tap fallback, immediate press/release, swipe cancel and task workbench structure.
- Browser inspection at 393 × 852 reports zero horizontal overflow, 44px minimum visible touch target and no console warnings/errors.

## Required fidelity surfaces

- Fonts and typography: existing Chinese system stack, 21px task heading and 8–11px metadata preserve the V2/V9 density and hierarchy.
- Spacing and layout rhythm: 18px page margins, 7–9px gaps, 13–15px cards and fixed five-tab navigation remain consistent; the task screen avoids the previous oversized duplicate action card.
- Colors and tokens: brand red marks the active operating checkpoint and voice pressed state; blue-violet, orange and green identify responsibility, attention and verified states without adding decorative color.
- Image quality: no new imagery was needed for these interaction and information-architecture changes; existing logo and app assets remain intact.
- Copy and content: task language answers `谁负责 / 什么节点 / 待回传 / 待验收`; voice copy is user-facing rather than implementation-facing.
- Accessibility and interaction: press/release, upward cancel, quick-tap phrases and Space/Enter use the same semantic button; every visible touch target is at least 44px.

## Findings

No actionable P0/P1/P2 findings remain.

## Primary interactions tested

- Home quick tap reveals common voice phrases.
- Pointer down immediately shows recording state; release produces only an AI draft and still requires human confirmation.
- Upward drag cancels without creating an intent or formal action.
- Task responsibility cards filter the all-work list.
- Five operating checkpoints open their relevant workflow.
- Pending evidence and pending review remain visible as dedicated result queues.

## Console and runtime

- Protected runtime integrity check passed during build.
- TypeScript and production build passed.
- Targeted V9.1 interaction suite: 4 passed.
- Browser console: no warnings or errors observed.

final result: passed
