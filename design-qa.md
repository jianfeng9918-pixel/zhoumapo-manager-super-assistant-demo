# V8 Design QA

## Artifacts

- source visual truth: `/Users/huangjianfeng/.codex/generated_images/019fec0e-7b89-7482-862c-43bfb9adc957/exec-fdc9be24-3063-4d05-ba50-2552e2952a34.png`
- implementation screenshot: `audit/v8-design-qa/implementation-393x852-pass2.png` (local QA artifact, intentionally excluded from release commit)
- combined comparison: `audit/v8-design-qa/combined-pass2.png` (local QA artifact, intentionally excluded from release commit)
- additional rendered states: `audit/v8-design-qa/data-393x852.png`, `audit/v8-design-qa/voice-393x852.png`, `audit/v8-design-qa/meeting-393x852.png`
- viewport: `393 x 852` CSS px, device scale factor 1
- source pixels: `853 x 1844`; normalized to `393 x 852`
- implementation pixels: `393 x 852`
- state: `08:30 · 黄店长 · 三盛广场演示店 · 全新V8本地存储`

## Full-view comparison evidence

The normalized source and second implementation capture were placed in one `786 x 852` comparison image. Both show, without scrolling: brand/date, manager greeting, AI judgment, three business facts, one dominant action, compact day route, knowledge context and five bottom tabs. The implementation intentionally removes the source's decorative opportunity score and folds judgment/evidence/action into one tighter card, as required by V8.

## Focused state evidence

- Data screen: period switch, living conclusion card, voice entry, reports and persistent navigation were inspected at `393 x 852`.
- Voice fallback: the two contextual phrases appear in a phone-scoped surface and do not hide the current report conclusion.
- Morning meeting: generated scene image is sharp, correctly cropped, labelled `演示场景 · AI生成`, and the manual-confirmation action remains visually dominant.
- No separate crop was needed for the home header because the 1:1 combined image keeps all logo, typography, data and button details readable.

## Findings and comparison history

### Pass 1

- [P2] Header and evidence typography were visibly smaller than the selected source.
  - Evidence: first implementation capture used a 148px logo, 11px subtitle and 10px evidence values; the source placed more weight on brand and operational numbers.
  - Fix: increased logo to 158px, subtitle to 12px, judgment to 20px, evidence labels to 10px and evidence values to 12px while preserving the 393x852 first-screen fit.
- [P3] The V8 card is more compact than the source.
  - Classification: intentional. V8 requires the same design genes but removes the decorative opportunity score and keeps the main action in the first screen.

### Pass 2

- Fonts and typography: hierarchy now matches the source intent; line wrapping is controlled, app-specific Chinese copy remains readable, and no oversized V4-style title returns.
- Spacing and layout rhythm: consistent 18px page margins, compact card rhythm, one primary action, and bottom navigation visible without scrolling.
- Colors and visual tokens: action red, AI blue-purple, opportunity orange and result green are semantic; no health score or decorative multi-color dashboard appears.
- Image quality and asset fidelity: brand and AI identity use existing assets; meeting/inspection/product imagery uses real raster assets with correct crop, source, alt text and demo labels. No fake SVG/CSS placeholder substitutes visible source imagery.
- Copy and content: the screen directly answers what happened, what to do now and what requires confirmation; predicted and actual results remain separate.
- Responsiveness/accessibility: automated checks pass at 320/393/412/427; visible controls remain at least 44px; reduced-motion behavior passes.

No actionable P0/P1/P2 differences remain. The remaining compactness difference is an intentional V8 product constraint and does not reduce the selected visual language.

## Primary interactions tested

- hold, release, upward cancel, click fallback and keyboard-compatible voice entry
- morning meeting preview and manual confirmation boundary
- today/7-day/month report switch, report drill-down and image evidence
- lunch inspection image and AI annotation
- store/region/headquarters shared state, evidence return and manual approval through automated acceptance tests

## Browser and console

- Browser-rendered evidence captured in the Codex in-app browser.
- Browser console warnings/errors checked on home, data, voice and morning meeting states: none.
- Protected mobile runtime check: passed.

final result: passed
