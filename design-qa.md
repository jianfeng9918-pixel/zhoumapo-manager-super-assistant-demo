# V6 Design QA

- Source visual truth: `/Users/huangjianfeng/.codex/generated_images/019fec0e-7b89-7482-862c-43bfb9adc957/exec-fdc9be24-3063-4d05-ba50-2552e2952a34.png`
- Normalized source: `audit/v6-visual/reference-393x852.jpg`
- Implementation: `audit/v6-visual/implementation-08-30-393x852.png`
- Additional states: `audit/v6-visual/implementation-12-00-393x852.png`, `audit/v6-visual/implementation-17-30-393x852.png`, `audit/v6-visual/implementation-21-30-393x852.png`
- Viewport: 393 × 852 CSS px, deviceScaleFactor 1, direct mobile presentation
- Source pixels: 853 × 1844; normalized to 393 × 852
- Implementation pixels: 393 × 852
- State: 店长08:30晨间简报；补充核验12:00、17:30、21:30

## Full-view comparison evidence

参考稿与实现同样采用：品牌头、自然问候、蓝紫AI判断主卡、三项经营证据、独立行动区、单一红色按钮、三节点语义路线、知识匹配条和五栏导航。实现有意删除参考稿的“机会度87%”，将空间让给店长可理解的经营证据。393×852首屏无需滚动即可看到主判断、主行动、路线和导航。

## Focused region comparison evidence

- AI主卡：实现保持蓝紫主表面和真实AI头像；文字字号缩到22–24px标题、14–15px正文范围，避免先前的大字与长篇幅。
- 证据条：参考稿的昨日、预测、缺口三列在实现中保留，并分别使用中性、橙色、红色语义；未恢复数据矩阵。
- 行动卡：参考稿独立暖红行动卡被合并进AI主卡下半段，以确保393×852内主行动和导航同时可见；仍保持清晰分隔与唯一实心红色按钮。
- 路线与知识：橙色午市、绿色召回、蓝紫收官与知识匹配均使用标准图标库，无手绘SVG、emoji或CSS图形替代。
- 图片：首页不使用菜品图；午市证据和知识页使用真实演示图片。爆炒鲜椒鸡图片已裁掉未经确认的“120天”口径。

## Required fidelity surfaces

- Fonts and typography: 使用系统中文字体栈；标题24px以内，正文主要14–15px，卡片辅助文字缩小但保持对比。未发现标题截断、异常换行或字重冲突。
- Spacing and layout rhythm: 18px页面边距、22px主卡圆角、8–12px模块间距；主卡、路线、知识条与底部导航分层明确。320、393、412、427宽度自动化无横向溢出。
- Colors and tokens: 行动红 `#D83328`、AI蓝紫 `#5B57E8`、机会橙 `#F39A22`、结果绿 `#35A85B`；每个首页状态只突出主行动和当前时段语义。
- Image quality: AI头像、品牌logo、现场证据和菜品裁图均为实际图片资产，使用object-fit避免拉伸，生产与Pages路径由测试覆盖。
- Copy and content: 所有数字回答“所以呢”和“怎么办”；当前收入、正常进度、预测和动作影响分开。21:30未闭环状态明确显示真实未完成结果。
- Icons: 使用Radix统一线性图标；尺寸与文字基线一致。
- Accessibility: 核心触控区不小于44px；按钮有语义名称；图片有alt；支持prefers-reduced-motion。

## Comparison history

### Iteration 1

- P1: 手动切到17:30仍显示“开晨会”，时段判断与主行动不一致。
- P1: 21:30固定显示¥100,600，预测影响与真实结果混淆。
- P2: 首屏只有暖红和白色，缺少AI、机会、结果的可扫读语义。

Fixes: 新增经营阶段快照和自动推进；主行动按阶段选择；收官由已闭环动作和支持状态计算；引入蓝紫、橙、绿语义色。

### Iteration 2

- P2: 午市主行动仍显示“确认后下发负责人”，与拍照巡检动作不符。

Fix: 人工确认提示按当前行动动态切换，午市明确为演示图片识别，晚市区分行动确认与证据验收。

Post-fix evidence: 08:30、12:00、17:30、21:30四张393×852截图；经营故事测试与8项手机运行框架测试通过。召回与预约跟进已拆为两次执行、两次AI初验和两次区域人工验收。

## Findings

没有剩余P0、P1或P2问题。

P3 follow-up: 参考稿人物头像尺寸更大；实现为首屏密度和不同阶段文案预留空间而缩小。此差异属于有意的产品约束，不影响AI身份识别。

## Implementation checklist

- [x] 首屏唯一红色主按钮
- [x] 三项经营证据
- [x] 四类经营语义色
- [x] 08:30至21:30状态与主行动一致
- [x] 结果由动作闭环推导
- [x] 320–427宽度和减少动态效果通过
- [x] 真实图片无拉伸且口径边界明确

final result: passed
