# V9 Design QA

- source visual truth: `/Users/huangjianfeng/.codex/generated_images/019fec0e-7b89-7482-862c-43bfb9adc957/exec-ac6b02ee-1f5a-4ec4-a4a6-e4481ea0c765.png`
- secondary visual language: current V8 implementation and the V9 requirement “V2 information completeness + V8 AI judgment/dynamic data”
- implementation URL: `http://127.0.0.1:5174/?direct=1`
- final implementation screenshot: `/tmp/v9-home-qa2.png`
- additional rendered evidence: `/tmp/v9-academy.png`, `/tmp/v9-mine.png`, `/tmp/v9-procurement.png`
- viewport: 393 × 852 CSS px, deviceScaleFactor 1
- source pixels: 853 × 1844; source was visually normalized to the same 393px mobile content width
- implementation pixels: 393 × 852
- state: V9 fresh 08:30, store manager, no prior local progress

## Full-view comparison evidence

The source establishes a warm-white mobile console, compact brand header, one warm-red primary action, concise business evidence, four clearly recognizable store-work shortcuts, persistent five-tab navigation, and content continuing below the first viewport. The final implementation keeps those source traits while using the V8 AI blue-violet judgment card and semantic red/orange/green status system requested for V9.

## Focused region evidence

- First screen: AI judgment, three business figures, primary action, WeChat-style hold-to-talk, task summary and all four store-work shortcuts are visible above the fixed navigation.
- Voice control: idle is a light recessed bar with microphone disc and explicit 350ms/up-swipe instruction; pressed state changes to brand red with waveform.
- Academy: real course thumbnails, six categories, progress bar, course list and paths use the same card rhythm; no placeholder boxes or custom SVG art.
- Mine: profile, daily summary, four work entries, evidence-based growth and promotion path are readable without becoming a BI matrix.
- Procurement: alert, AI draft, six-step state, human confirmation and no-auto-payment note form a complete narrow mobile flow.

## Comparison history

### Iteration 1 — blocked

- [P1] Home shortcuts were overlapped by the fixed bottom navigation.
  - Evidence: `/tmp/v9-home-fresh.png`; shortcut top 678px, bottom 756px, navigation top 742px.
  - Impact: the user could not fully see the four V9 core store-work entries without scrolling, violating the first-screen requirement.
  - Fix: reduced AI card padding/avatar/title rhythm, removed duplicate morning confirmation note and kept the red action plus light voice strip.

- [P2] The initial V9 home had no red primary action because the voice bar was serving as the only CTA.
  - Evidence: initial screenshot `/tmp/v9-home.png` and computed red button count 0.
  - Impact: primary hierarchy drifted from the selected V2 visual and made “hold to talk” look like a generic action.
  - Fix: restored one warm-red “开始晨会” button and kept hold-to-talk as a separate recessed input surface.

### Iteration 2 — passed

- Post-fix evidence: `/tmp/v9-home-qa2.png`.
- AI card bottom is 518.95px; shortcut grid spans 635.95–713.95px; fixed navigation begins at 742px. All four shortcuts are fully visible with 28px clearance.
- Home scroll ratio is 1.407 viewports, within the required 1.35–1.65 range.
- One visible solid red primary button remains on the home first screen.

## Required fidelity surfaces

- Fonts and typography: Chinese system stack follows the existing app; 19px judgment and 18px action title stay below the requested 22–24px page-title ceiling. Small metadata is visually secondary and not used for the core judgment.
- Spacing and rhythm: 18px page margins, 14–22px radii, compact 7–9px gaps and light elevation follow V2/V8. No first-screen overlap remains.
- Colors and tokens: brand red only for the primary action and urgent badges; blue-violet for AI; orange for opportunities; green for verified outcomes. Warm white remains dominant.
- Image quality: existing source/AI-generated demo photos use `object-fit: cover`, meaningful alt text and demo/source labels. No fake ASCII, emoji, inline SVG or CSS illustration substitutes were introduced.
- Copy and content: manager language uses guests, tables, inventory days and concrete actions. Store-manager pages contain no health score, six-dimension score or “找林阳帮忙” copy.
- Icons and states: Radix icons are consistent; task, category, voice, learning, operation and promotion states are visible and interactive.
- Responsiveness and accessibility: automated 320/393/412/427 checks pass with no horizontal overflow and 44px minimum visible touch targets. Reduced-motion, keyboard voice trigger, up-swipe cancel and alt text checks pass.

## Findings

No remaining actionable P0/P1/P2 findings.

## Follow-up polish

- [P3] A future production build can replace repeated demo course thumbnails with a larger approved brand media library without changing the course model.

## Primary interactions tested

- Five bottom tabs and four home shortcuts.
- Meeting transcription/confirmation, inspection photo, procurement and sold-out flows.
- Six academy categories, three paths, 18 course records, quiz, bookmark and practice.
- Voice hold/release/cancel/click fallback and keyboard operation.
- My tasks/reports/learning/favorites/promotion.
- Region/HQ shared state, evidence review and template publication.

## Console and runtime

- Protected runtime integrity check passed.
- TypeScript and production build passed.
- Automated manager workflow suite: 45 passed.
- No application console errors observed during screenshot and interaction capture.

final result: passed
