# Mobile Prototype Agent Guide

## Prototype Instructions

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Project decision (2026-08-11): the public demo explicitly uses `MobileRuntime presentation="direct"`. On phones it fills the viewport like a mini program; on wider screens it stays centered at a readable mobile width. The calibrated device presentation remains available as a runtime option for diagnostics, but do not restore the bezel, camera cutout, status bar, home indicator, custom cursor, or device picker on the public route unless the user asks for them again.
- In direct presentation, retain `PhoneFrame`'s screen portal, keyboard context, `FlowStack`, `MobileScroll`, bottom sheets, local state, and route transitions. Detail headers use no simulated device safe-area; root content and bottom navigation use real browser safe-area environment values.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.

## 周麻婆 V2 Product Decisions

- The selected visual source of truth is `/Users/huangjianfeng/.codex/generated_images/019fec0e-7b89-7482-862c-43bfb9adc957/exec-ac6b02ee-1f5a-4ec4-a4a6-e4481ea0c765.png`.
- Preserve the selected white, warm-red, action-timeline mobile console language. New modules must feel like extensions of that screen rather than a separate design system.
- This demo is manager-only. Employee, headquarters, supplier, POS, Meituan, and Douyin responses are simulated inside the manager experience.
- All business data is fictional and must remain visibly labeled as demo data. Do not add real integrations, authentication, or production credentials in V2.
- The experience is free exploration rather than a forced walkthrough. Every visible core CTA must either advance a workflow, change visible state, or explain why it cannot proceed.
- The five core closed loops are morning meeting, procurement, HR assessment, sold-out/channel sync, and self-claimed growth actions. Persist demo progress locally and keep a reset control available.

## 周麻婆 V3 Product Decisions

- V3 keeps the V2 visual source and direct mobile runtime, then upgrades the product from a manager-only tool into an AI shift supervisor with manager/regional-manager linkage.
- The default state is `08:50` and the primary manager journey advances through morning meeting, lunch inspection, afternoon diagnosis, pre-dinner correction, dinner inventory protection, and closing review. “我的” must keep a demo phase switch for fast QA.
- Manager and regional-manager state share one deterministic mock model in `src/demo-model.ts`; V3 uses only `zhoumapo-manager-assistant-v3` and must not read or overwrite V2 progress.
- The manager is `黄店长 · 三盛广场演示店`; the regional manager is `林阳 · 区域经理`. Formal permissions remain future work; the role switch is explicitly an in-demo control.
- A cross-role task is not complete until it can be issued by the region, accepted/executed by the manager, returned with evidence, and approved or rejected for another photo. Help requests and regional replies must also synchronize across roles.
- Keep one visually dominant action at a time. Business figures must distinguish current revenue, gap to target, forecast revenue, and forecast gap. Completing a revenue correction changes the forecast and health score without falsely changing current revenue.
- Six-dimensional health uses traffic 15%, conversion 15%, ticket 25%, rating 15%, cost 15%, and people 15%. Each health card must lead to causes, data source/update time, confidence, impact, action, effort, and recheck time.
- All stores, money, people, reviews, inventory, channel sync, AI conclusions, and expected impacts remain conspicuously labeled demo data. AI does not punish employees, make payments, or claim that a real platform has synchronized.

## 周麻婆 V4 Product Decisions

- V4 positions the product as the AI regional manager in an ordinary store manager's phone. The manager sees yesterday's result, today's forecast, the plain-language customer/table gap, the next action, and the result after action.
- Remove store composite scores and six-dimension operational scoring from manager and regional surfaces. Translate gaps into guests, tables, orders, portions, and money with an explicit mock conversion basis.
- Keep the manager bottom navigation labels `今日 / 数据 / 任务 / 学院 / 我的`, but redefine them as dynamic cockpit, business answers, operating playbook, contextual knowledge brain, and evidence-based growth.
- The default V4 scene is `08:30` before opening. Do not show meaningless current-day revenue then; lead with yesterday's review and today's ¥8,000 forecast gap, translated as about 25 tables and 65 guests.
- Huang is the only primary role. Regional manager Lin remains a secondary demo entry under `我的`, with cross-role issue, evidence review, rejection, and help reply using direct operating gaps rather than scores.
- Procurement, HR, and sold-out are no longer home modules. They appear only as lightweight actions when a relevant operating problem occurs.
- V4 uses only `zhoumapo-manager-assistant-v4` and must not read or overwrite V2/V3 progress. All figures, weather, members, reservations, evidence, channel results, and AI conclusions remain deterministic demo data.
- V4营业前首页使用自然问候和一句AI晨间判断，不再把昨日营业、今日预测、好坏信号和顾客缺口排成仪表盘。金额、桌数和顾客数只能作为判断依据写进简短叙述，视觉重心必须落在今天第一步行动。

## 周麻婆终局版 Product Decisions

- 终局版选定的首页视觉源是 `/Users/huangjianfeng/.codex/generated_images/019fec0e-7b89-7482-862c-43bfb9adc957/exec-34121e95-f523-4d50-b11d-8df188e8b5f1.png`。实现必须复用其白底、暖红、AI 对话与行动融合主卡、单一红色一级按钮和紧凑经营路线，不再从其他候选稿混搭布局。
- 首页首屏必须同时看到一句经营判断、两条依据、唯一主行动、人工确认提示、下一次复查和五栏导航。标题不超过 26px，正文以 14–15px 为主，不恢复健康值、六维评分、密集数字矩阵或传统后台看板。
- 终局版角色为 `storeManager / regionalManager / headquarters`，三者共享同一个经营问题、行动、证据、求助、验收和策略版本；角色页面按角色懒加载，业务组件只通过适配器读取模拟业务能力。
- AI 只负责分析、预填、生成、初验和追踪。任何正式下发、资源申请、人工验收或总部策略发布，都必须先产生可追溯的人工确认记录。
- 店长是日常主角色；区域经理只看必须介入的门店、待验收和求助；总部只看跨区域重复问题、策略模板和资源需求。订货与排班不做可见页面，仅在接口模型中保留扩展边界。
- 终局版使用独立存储键 `zhoumapo-manager-assistant-final-v1`，不读取或覆盖 V2、V3、V4 演示进度。全量经营、平台、证据和 AI 结论继续显著标注为演示数据。

## 周麻婆 V6 Product Decisions

- V6 选定视觉源为 `/Users/huangjianfeng/.codex/generated_images/019fec0e-7b89-7482-862c-43bfb9adc957/exec-fdc9be24-3063-4d05-ba50-2552e2952a34.png`。复用其 AI 判断、三项证据、单一行动、语义路线和五栏导航骨架，不复制其中“机会度87%”等抽象分数。
- 经营语义色固定为：行动红 `#D83328`、AI蓝紫 `#5B57E8`、机会橙 `#F39A22`、结果绿 `#35A85B`。每屏最多两个强调色和一个状态色，颜色只传达意义。
- 主线按 `08:30晨间简报 → 08:45晨会 → 12:00午市拍照 → 14:30晚市判断 → 17:30顾客追回 → 18:30现场体验 → 21:30收官` 推进。完成动作自动推进；“我的”保留手动跳时段用于QA。
- 当前收入、正常进度、预计收官和动作影响必须分字段。会员召回先补回31人，预约跟进再补18人，两项验收后缺口才由65人降至16人；任何预测影响都不得直接增加当前收入，手动跳到21:30不得伪造¥100,600。
- 成长采用证据标签与趋势，不展示营业管理、顾客经营等抽象分数。收官页顺序固定为经营结果、明日第一件事、成长证据。
- 周麻婆案例按当前问题一次主动出现一项；保留总部SOP、优秀门店、历史复盘或待确认来源。爆炒鲜椒鸡图片必须裁掉未经供应链确认的“120天”口径。
- V6 使用独立存储键 `zhoumapo-manager-assistant-final-v2`，不读取或覆盖 final-v1 及 V2–V4 进度。

## 周麻婆 V7 Product Decisions

- V7 不改变 V6 首页与一日经营主线；“数据”页升级为经营报告中心，避免首页再次变成数据看板。
- 报告统一采用“结论 → 证据 → 趋势 → 原因 → 行动 → 效果复查”，原始公式和来源折叠显示。
- 店长看本店行动，区域看跨店缺口和介入优先级，总部看有效方法与案例沉淀；三角色共享同一证据与审批记录。
- 行动效果必须区分预计、预约、实际到店与实际营业；预测不得直接增加当前营业额。
- 报表转行动、生成外发草稿、区域验收与总部发布均保留人工确认边界。
- V7 使用独立存储键 `zhoumapo-manager-assistant-final-v3`，不读取或覆盖 V2—V6 进度。

## 周麻婆 V8 Product Decisions

- V8 延续 V6 选定视觉源和 V7 经营报告，不改成后台；店长仍是70%主线，区域与总部只在求助、验收与方法沉淀出现。
- 首页必须同时呈现当前时段/更新状态、AI一句判断、实际/正常进度/预测与顾客缺口、一个主行动、紧凑路线和五栏导航。
- 今日、数据、任务和学院共用 `HoldToTalk`：350毫秒后开始、松开解析、上滑取消、点击备用话术、键盘可操作。Demo不申请真实麦克风权限。
- 经营数据只能因实时帧或已验证动作而变化，必须附带触发原因；中间预约只改预测和顾客缺口，不改实际营业额。
- 晨会、午市巡检、菜品和案例可使用图片，但必须有替代文本、来源和“演示场景”标识；首页不放大图。
- V8 使用独立存储键 `zhoumapo-manager-assistant-final-v4`，不读取或覆盖 V2—V7 进度。

## 周麻婆 V9 Product Decisions

- V9 恢复 V2 被验证好用的信息完整度，同时继承 V8 的 AI 判断、活数据、经营语义色与人工确认闭环；不能再把“简洁”做成首页下拉为空。
- 首页滚动长度保持约1.35—1.65个手机视口。首屏必须同时出现经营判断、一个实心红色主行动、微信式按住说话、今日任务概况、晨会/巡检/采购/沽清四个入口和五栏导航；下半屏继续展示动态、推荐课程和经营路线。
- 学院固定为“麻婆经营大学”，必须提供六大分类、三条路径和至少18个可打开内容。课程详情有合适图片或演示素材、三步方法、现场小测、来源版本和实操入口；学习、收藏及小测进度需要持久化。
- “我的”是店长个人工作中心，优先显示任务、报表、学习、收藏、有效方法、晋升和经营记录；角色切换、时段和重置只能放在折叠的“演示与帮助”。
- 采购与沽清只做轻量可点击闭环。AI可预填，但不能自动付款、完成正式审批或声称真实平台已同步。
- `HoldToTalk` 静止态使用浅色、有下沉层次的触控条；长按350毫秒后才变品牌红并显示波形，松开发送、上滑48px取消。任何正式动作仍需人工确认。
- 店长日常文案不得出现健康值、六维评分或“找林阳帮忙”等指定个人求助表达。区域与总部在店长端只显示业务来源、审批或支持结果。
- V9 使用独立存储键 `zhoumapo-manager-assistant-final-v5`，不读取或覆盖 V2—V8 进度。
