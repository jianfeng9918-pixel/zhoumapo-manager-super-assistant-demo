import type {
  ActionInstance,
  ActionTemplate,
  BusinessSignal,
  DailyReview,
  Evidence,
  KnowledgeCase,
  MetricDefinition,
  LiveOperatingFrame,
  OperatingReport,
  OperatingSnapshot,
  OperatingStageId,
  ReportAnswer,
  ReportExport,
  ReportId,
  ReportQuestionId,
  ReportScope,
  TerminalState,
  VisualReport,
  VoiceResolution,
  VoiceSession,
  WorkRequest,
} from "../domain/types";
import type {
  BusinessDataAdapter,
  DecisionEngineAdapter,
  KnowledgeAdapter,
  KnowledgeMatch,
  MeetingAnalysis,
  OperatingAdapters,
  ReportingAdapter,
  VoiceInteractionAdapter,
  WorkflowAdapter,
} from "./contracts";

const pause = (milliseconds = 520) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const metricDictionary: MetricDefinition[] = [
  {
    code: "revenue.actual",
    name: "实际营业额",
    formula: "已完成订单实收金额之和",
    unit: "元",
    grain: "门店/日/时段",
    source: ["POS"],
    owner: "财务与经营中心",
    freshness: "不晚于5分钟",
    managerLanguage: "今天已经真正收到多少钱",
  },
  {
    code: "revenue.forecast",
    name: "预计收官营业额",
    formula: "当前营业额 + 剩余时段预测",
    unit: "元",
    grain: "门店/日",
    source: ["POS", "预约", "会员", "历史同星期"],
    owner: "经营中心",
    freshness: "每30分钟",
    managerLanguage: "按现在情况，今晚大约能做到多少钱",
  },
  {
    code: "guest.gap",
    name: "预计顾客缺口",
    formula: "预计营业缺口 ÷ 预计人均消费",
    unit: "位",
    grain: "门店/日/时段",
    source: ["POS", "客流", "预约"],
    owner: "经营中心",
    freshness: "每30分钟",
    managerLanguage: "还需要多来多少位顾客",
  },
  {
    code: "table.gap",
    name: "预计桌数缺口",
    formula: "预计顾客缺口 ÷ 预计每桌人数",
    unit: "桌",
    grain: "门店/日/时段",
    source: ["POS", "桌台", "预约"],
    owner: "经营中心",
    freshness: "每30分钟",
    managerLanguage: "还需要补回多少桌",
  },
];

const signals: BusinessSignal[] = [
  {
    id: "signal-dinner-guest-gap",
    title: "晚市顾客不足",
    managerLanguage: "晚市预计少65位顾客，约25桌。",
    gap: { money: 8000, guests: 65, tables: 25 },
    impactObject: "今日营业目标",
    evidence: ["昨天18点后少32位顾客", "今天晚市预约少11桌"],
    confidence: 92,
    triggerRule: "预计收官低于目标5%以上，且客单价稳定",
    sourceUpdatedAt: "08:30",
  },
  {
    id: "signal-waiting-time",
    title: "午市等菜偏慢",
    managerLanguage: "3桌顾客提到等菜久，晚市需要店长现场关注。",
    gap: { tables: 3 },
    impactObject: "晚市顾客体验",
    evidence: ["午市首轮出菜比标准慢6分钟", "3桌顾客现场反馈"],
    confidence: 88,
    triggerRule: "同一时段出现3桌以上同类反馈",
    sourceUpdatedAt: "14:20",
  },
];

const storeReports: OperatingReport[] = [
  {
    id: "today",
    scope: "store",
    title: "今日经营战报",
    period: "8月11日",
    question: "今天能不能达标？",
    conclusion: "按当前经营节奏，预计还差25桌、65位顾客。",
    hero: { label: "预计收官", value: "¥92,000", note: "目标 ¥100,000", tone: "risk" },
    evidence: [
      { label: "昨日实际", value: "¥98,600", note: "目标完成98.6%", tone: "neutral" },
      { label: "今日缺口", value: "25桌", note: "约65位顾客", tone: "risk" },
      { label: "客单情况", value: "+¥18", note: "不是当前主因", tone: "result" },
    ],
    series: [
      { label: "12:00", value: 26800, benchmark: 30000, unit: "元" },
      { label: "14:30", value: 48600, benchmark: 48600, unit: "元" },
      { label: "17:30", value: 62000, benchmark: 70000, unit: "元" },
      { label: "预计", value: 92000, benchmark: 100000, unit: "元" },
    ],
    reasonChain: ["昨天晚市比正常少32位顾客", "今天晚市预约少11桌", "每桌消费没有下降，问题集中在顾客数量"],
    source: "POS、预约、会员与历史同星期 · 确定性模拟",
    updatedAt: "08:30",
    confidence: 92,
    recheckAt: "12:00",
    conversionBasis: "按预计人均¥123、每桌2.6位顾客模拟换算",
    recommendedActionId: "member-recall",
    recommendedActionTitle: "先召回会员，再跟进未确认预约",
  },
  {
    id: "sevenDay",
    scope: "store",
    title: "7日经营复盘",
    period: "8月5日—8月11日",
    question: "最近一周，问题重复发生在哪里？",
    conclusion: "最近7天晚市共少36桌，周一至周三最明显。",
    hero: { label: "7日晚市缺口", value: "36桌", note: "约94位顾客", tone: "risk" },
    evidence: [
      { label: "周一至周三", value: "24桌", note: "占一周缺口67%", tone: "risk" },
      { label: "周末", value: "5桌", note: "接近正常", tone: "result" },
      { label: "重复原因", value: "预约不足", note: "客单保持稳定", tone: "ai" },
    ],
    series: [
      { label: "周一", value: 8, benchmark: 4, unit: "桌" },
      { label: "周二", value: 7, benchmark: 4, unit: "桌" },
      { label: "周三", value: 9, benchmark: 4, unit: "桌" },
      { label: "周四", value: 4, benchmark: 4, unit: "桌" },
      { label: "周五", value: 3, benchmark: 4, unit: "桌" },
      { label: "周六", value: 2, benchmark: 4, unit: "桌" },
      { label: "周日", value: 3, benchmark: 4, unit: "桌" },
    ],
    reasonChain: ["周一至周三会员触达次数比周末少2次", "晚市预约确认率从78%降至69%", "高峰承接能力正常，不是现场接待限制"],
    source: "POS、预约与会员触达 · 7日模拟复盘",
    updatedAt: "8月11日 08:25",
    confidence: 89,
    recheckAt: "8月18日 08:30",
    recommendedActionId: "member-recall",
    recommendedActionTitle: "把周一至周三会员召回固化为门店动作",
  },
  {
    id: "month",
    scope: "store",
    title: "本月目标进度",
    period: "8月1日—8月31日",
    question: "本月照现在做，能不能完成目标？",
    conclusion: "本月预计还差¥160,000，关键不是每天冲刺，而是修复8个弱晚市。",
    hero: { label: "预计月度完成", value: "¥2,940,000", note: "目标¥3,100,000", tone: "opportunity" },
    evidence: [
      { label: "已完成", value: "¥1,046,800", note: "截至8月11日", tone: "neutral" },
      { label: "预测缺口", value: "¥160,000", note: "约500桌", tone: "risk" },
      { label: "修复重点", value: "8个晚市", note: "每次补约20桌", tone: "ai" },
    ],
    series: [
      { label: "第1周", value: 712000, benchmark: 700000, unit: "元" },
      { label: "第2周", value: 654000, benchmark: 700000, unit: "元" },
      { label: "第3周", value: 688000, benchmark: 700000, unit: "元" },
      { label: "第4周", value: 726000, benchmark: 700000, unit: "元" },
    ],
    reasonChain: ["午市预计达成101%", "晚市预计只达成91%", "8个工作日晚市贡献了主要月度缺口"],
    source: "月度目标、POS与排期预测 · 演示数据",
    updatedAt: "8月11日 08:30",
    confidence: 86,
    recheckAt: "每周一08:30",
    recommendedActionId: "member-recall",
    recommendedActionTitle: "生成8个弱晚市的固定经营剧本",
  },
  {
    id: "traffic",
    scope: "store",
    title: "客流与桌数",
    period: "今日 + 近7日",
    question: "顾客到底少在哪里？",
    conclusion: "每100位看过门店的顾客，比平时少成交3桌；晚市预约是最大缺口。",
    hero: { label: "晚市预约缺口", value: "11桌", note: "约29位顾客", tone: "risk" },
    evidence: [
      { label: "美团曝光", value: "正常", note: "不是曝光不足", tone: "neutral" },
      { label: "到店成交", value: "-3桌/百人", note: "需要召回与跟进", tone: "risk" },
      { label: "区域平均", value: "74%", note: "达到后可多6桌", tone: "opportunity" },
    ],
    series: [
      { label: "自然到店", value: 52, benchmark: 60, unit: "%" },
      { label: "会员预约", value: 41, benchmark: 55, unit: "%" },
      { label: "平台团购", value: 68, benchmark: 70, unit: "%" },
    ],
    reasonChain: ["平台曝光与近7日平均基本一致", "预约确认率低9个百分点", "会员近7天触达比优秀门店少2次"],
    source: "平台流量、预约、桌台与会员数据 · 演示数据",
    updatedAt: "08:30",
    confidence: 91,
    recheckAt: "17:00",
    conversionBasis: "每桌按2.6位顾客换算；渠道比例为演示口径",
    recommendedActionId: "member-recall",
    recommendedActionTitle: "向180位近期会员发送召回内容",
  },
  {
    id: "product",
    scope: "store",
    title: "菜品经营",
    period: "近7日",
    question: "哪道菜值得多推荐？",
    conclusion: "爆炒鲜椒鸡口碑稳定，但员工主动推荐比上周少18次。",
    hero: { label: "少推荐", value: "18次", note: "预计少卖9份", tone: "opportunity" },
    evidence: [
      { label: "顾客好评", value: "92%", note: "产品表现稳定", tone: "result" },
      { label: "主动推荐", value: "-18次", note: "员工动作减少", tone: "risk" },
      { label: "预计机会", value: "+9份", note: "约¥531营业额", tone: "opportunity" },
    ],
    series: [
      { label: "爆炒鲜椒鸡", value: 76, benchmark: 85, unit: "份" },
      { label: "麻婆豆腐", value: 91, benchmark: 88, unit: "份" },
      { label: "回锅肉", value: 68, benchmark: 70, unit: "份" },
    ],
    reasonChain: ["菜品好评率没有下降", "推荐次数下降但自然点单保持稳定", "问题在员工动作，不需要更改菜品"],
    source: "POS菜品销售、员工推荐记录与评价 · 演示数据",
    updatedAt: "8月11日 08:20",
    confidence: 84,
    recheckAt: "20:30",
    recommendedActionId: "product-recommendation",
    recommendedActionTitle: "晨会训练一句爆炒鲜椒鸡推荐话术",
  },
  {
    id: "reputation",
    scope: "store",
    title: "顾客口碑",
    period: "近7日",
    question: "评分下降，顾客真正不满意什么？",
    conclusion: "3桌顾客提到等菜久，集中在18:30—19:30；不是菜品口味问题。",
    hero: { label: "同类反馈", value: "3桌", note: "高峰等菜时间", tone: "risk" },
    evidence: [
      { label: "等菜时间", value: "3桌", note: "首轮慢6分钟", tone: "risk" },
      { label: "服务态度", value: "0条", note: "未发现异常", tone: "result" },
      { label: "菜品口味", value: "1条", note: "低频分散", tone: "neutral" },
    ],
    series: [
      { label: "等菜", value: 3, benchmark: 1, unit: "条" },
      { label: "服务", value: 0, benchmark: 1, unit: "条" },
      { label: "口味", value: 1, benchmark: 1, unit: "条" },
    ],
    reasonChain: ["反馈集中在高峰时段", "午市巡检发现传菜口等待偏久", "菜品口味评价没有连续异常"],
    source: "美团评价、现场反馈与午市照片识别 · 演示数据",
    updatedAt: "14:20",
    confidence: 88,
    recheckAt: "20:30",
    recommendedActionId: "dinner-experience",
    recommendedActionTitle: "晚市关注10桌顾客体验并复查传菜口",
  },
  {
    id: "member",
    scope: "store",
    title: "会员经营",
    period: "本周",
    question: "会员有没有真正带顾客回来？",
    conclusion: "可触达会员1,286人，本周召回到店率12.4%，仍比优秀门店低2.6个百分点。",
    hero: { label: "本周到店率", value: "12.4%", note: "优秀门店15.0%", tone: "opportunity" },
    evidence: [
      { label: "可触达", value: "1,286人", note: "近60天到店", tone: "neutral" },
      { label: "已触达", value: "420人", note: "仍有空间", tone: "opportunity" },
      { label: "真实到店", value: "52人", note: "不是只看发送量", tone: "result" },
    ],
    series: [
      { label: "已触达", value: 420, benchmark: 540, unit: "位" },
      { label: "有回复", value: 86, benchmark: 98, unit: "位" },
      { label: "已到店", value: 52, benchmark: 63, unit: "位" },
    ],
    reasonChain: ["可触达会员池充足", "门店本周只触达会员池的33%", "实际到店复查已纳入总部策略v4.0"],
    source: "会员、预约与POS回链 · 演示数据",
    updatedAt: "8月11日 08:15",
    confidence: 90,
    recheckAt: "17:30",
    recommendedActionId: "member-recall",
    recommendedActionTitle: "筛选180位近期会员并人工确认召回",
  },
  {
    id: "actionEffect",
    scope: "store",
    title: "行动效果账本",
    period: "近7日",
    question: "做了这么多事，哪一项真的有效？",
    conclusion: "近7天9项经营行动中，4项已有真实结果，会员召回最值得复用。",
    hero: { label: "已验证有效", value: "4项", note: "其余仍待实际复查", tone: "result" },
    evidence: [
      { label: "执行行动", value: "9项", note: "总部/区域/门店", tone: "neutral" },
      { label: "证据完整", value: "7项", note: "2项需补充", tone: "opportunity" },
      { label: "可复用", value: "3项", note: "已沉淀方法", tone: "result" },
    ],
    series: [
      { label: "会员召回", value: 9, benchmark: 6, unit: "桌" },
      { label: "预约跟进", value: 6, benchmark: 5, unit: "桌" },
      { label: "菜品训练", value: 4, benchmark: 5, unit: "份" },
      { label: "现场体验", value: 2, benchmark: 2, unit: "条" },
    ],
    reasonChain: ["只有完成证据回传与真实结果复查才算有效", "预测提升不会计入实际收入", "可复用动作需至少两次得到相同方向结果"],
    source: "行动、证据、审批与POS结果回链 · 演示数据",
    updatedAt: "8月11日 08:30",
    confidence: 94,
    recheckAt: "21:30",
    recommendedActionTitle: "继续完成今日行动，收官后更新实际效果",
  },
];

const initialActionEffects = [
  {
    id: "effect-history-recall",
    actionId: "history-member-recall",
    title: "8月8日晚市会员召回",
    problem: "晚市预约少9桌",
    owner: "王小丽",
    executedAt: "8月8日 16:20",
    expected: { guests: 21, tables: 8, forecastLift: 2800 },
    measured: { guests: 23, tables: 9, actualRevenue: 2980, note: "POS确认9桌实际到店" },
    evidenceIds: ["history-receipt", "history-pos-link"],
    status: "verified" as const,
    verdict: "已验证有效" as const,
    reusable: true,
    recheckAt: "已完成",
    source: "会员触达回执 + 预约 + POS模拟回链",
  },
  {
    id: "effect-member-recall",
    actionId: "member-recall",
    title: "今日会员召回",
    problem: "晚市预计少25桌、65位顾客",
    owner: "王小丽",
    executedAt: "待执行 · 16:20",
    expected: { guests: 31, tables: 12, forecastLift: 3800 },
    measured: { guests: 0, tables: 0, actualRevenue: 0, note: "等待行动证据与实际到店复查" },
    evidenceIds: [],
    status: "forecast" as const,
    verdict: "待执行" as const,
    reusable: false,
    recheckAt: "17:30",
    source: "总部SOP v4.0 · 当前仅为预计影响",
  },
  {
    id: "effect-lunch-inspection",
    actionId: "lunch-inspection",
    title: "午市现场巡检",
    problem: "传菜口等待偏久",
    owner: "黄店长",
    executedAt: "待执行 · 12:00",
    expected: { guests: 0, tables: 0, forecastLift: 0 },
    measured: { guests: 0, tables: 0, actualRevenue: 0, note: "目标是避免等菜问题重复，不直接承诺营业提升" },
    evidenceIds: [],
    status: "forecast" as const,
    verdict: "待执行" as const,
    reusable: false,
    recheckAt: "20:30",
    source: "用户旅程责任链 · 演示数据",
  },
];

const dailyReview: DailyReview = {
  targetRevenue: 100000,
  actualRevenue: 100600,
  closedActions: 5,
  effectiveActions: ["会员召回带回19桌预约", "晚市现场关注避免新增差评"],
  remainingItems: ["6桌顾客缺口的复盘原因转入明日"],
  conclusions: [
    "今天真正有效的是会员召回，不是继续提高客单。",
    "区域补充曝光让晚市预约更快回升。",
    "午市等菜问题晚市没有重复发生。",
  ],
  tomorrowFirstAction: "08:40复盘会员召回到店率",
  generated: false,
  outcome: "pending",
};

const snapshots: OperatingSnapshot[] = [
  {
    stage: "morningBrief",
    time: "08:30",
    currentRevenue: null,
    expectedRevenueNow: null,
    forecastRevenue: 92000,
    actualRevenue: null,
    guestGap: 65,
    tableGap: 25,
    judgment: "今天重点不是继续提客单，而是补回晚市顾客。",
    evidence: ["昨日营业 ¥98,600", "今日预计 ¥92,000", "预计少25桌 · 65位顾客"],
    nextRecheckAt: "12:00",
  },
  {
    stage: "morningMeeting",
    time: "08:45",
    currentRevenue: null,
    expectedRevenueNow: null,
    forecastRevenue: 92000,
    actualRevenue: null,
    guestGap: 65,
    tableGap: 25,
    judgment: "先让每个人知道晚市还要补回多少顾客。",
    evidence: ["目标缺口65位顾客", "预约少11桌", "3位负责人待确认"],
    nextRecheckAt: "08:55",
  },
  {
    stage: "lunchReview",
    time: "12:00",
    currentRevenue: 26800,
    expectedRevenueNow: 30000,
    forecastRevenue: 89000,
    actualRevenue: null,
    guestGap: 26,
    tableGap: 10,
    judgment: "午市比正常少10桌，先拍现场看看问题在哪。",
    evidence: ["当前 ¥26,800", "正常应 ¥30,000", "少10桌 · 26位顾客"],
    nextRecheckAt: "14:30",
  },
  {
    stage: "afternoonDecision",
    time: "14:30",
    currentRevenue: 48600,
    expectedRevenueNow: 48600,
    forecastRevenue: 91000,
    actualRevenue: null,
    guestGap: 29,
    tableGap: 11,
    judgment: "晚市预约还少11桌，现在确认顾客追回剧本。",
    evidence: ["当前 ¥48,600", "晚市预约少11桌", "预计收官 ¥91,000"],
    nextRecheckAt: "16:20",
  },
  {
    stage: "dinnerRecovery",
    time: "17:30",
    currentRevenue: 62000,
    expectedRevenueNow: 70000,
    forecastRevenue: 92000,
    actualRevenue: null,
    guestGap: 65,
    tableGap: 25,
    judgment: "现在不是提客单，是立即把晚市顾客追回来。",
    evidence: ["当前 ¥62,000", "正常应 ¥70,000", "仍少25桌 · 65位顾客"],
    nextRecheckAt: "18:30",
  },
  {
    stage: "dinnerExperience",
    time: "18:30",
    currentRevenue: 62000,
    expectedRevenueNow: 70000,
    forecastRevenue: 98000,
    actualRevenue: null,
    guestGap: 16,
    tableGap: 6,
    judgment: "已经补回49位顾客，接下来守住体验并再补6桌。",
    evidence: ["新增预约19桌", "预计升至 ¥98,000", "还差6桌 · 16位顾客"],
    nextRecheckAt: "20:30",
  },
  {
    stage: "closingReview",
    time: "21:30",
    currentRevenue: null,
    expectedRevenueNow: null,
    forecastRevenue: 98000,
    actualRevenue: null,
    guestGap: 0,
    tableGap: 0,
    judgment: "先核对真实收官，再判断哪些动作有效。",
    evidence: ["目标 ¥100,000", "预测与实际分开", "未闭环事项转明日"],
    nextRecheckAt: "明日08:40",
  },
  {
    stage: "completed",
    time: "21:35",
    currentRevenue: 100600,
    expectedRevenueNow: null,
    forecastRevenue: 98000,
    actualRevenue: 100600,
    guestGap: 0,
    tableGap: 0,
    judgment: "今天有效补回了晚市顾客，明天复用有效方法。",
    evidence: ["实际 ¥100,600", "目标达成100.6%", "明日08:40复盘到店率"],
    nextRecheckAt: "明日08:40",
  },
];

function buildLiveFrame(stage: OperatingStageId, state: TerminalState): LiveOperatingFrame {
  const snapshot = state.snapshots.find((item) => item.stage === stage) ?? state.snapshots[0];
  const recovered = state.gapProgress.recoveredGuests > 0;
  const actualRevenue = stage === "closingReview" || stage === "completed"
    ? state.dailyReview.actualRevenue
    : snapshot.currentRevenue;
  const forecastRevenue = recovered ? state.brief.forecastRevenue : snapshot.forecastRevenue;
  const transitions = recovered
    ? [
        { id: "forecast-lift", label: "预计收官", before: 92000, after: forecastRevenue, unit: "元" as const, kind: "forecast" as const, trigger: "会员召回与预约跟进新增19桌预约" },
        { id: "guest-gap", label: "顾客缺口", before: 65, after: state.gapProgress.remainingGuests, unit: "位" as const, kind: "measured" as const, trigger: "已确认预约结果，实际到店待21:30复查" },
      ]
    : [{ id: `live-${stage}`, label: "当前经营", before: snapshot.expectedRevenueNow, after: snapshot.currentRevenue, unit: "元" as const, kind: "actual" as const, trigger: snapshot.currentRevenue === null ? "营业前不展示无意义实时收入" : "POS模拟数据刚刚更新" }];
  return {
    stage,
    time: snapshot.time,
    updatedAt: `${snapshot.time}:00`,
    freshnessLabel: snapshot.time === "08:30" ? "08:30已核对" : "刚刚更新",
    actualRevenue,
    expectedRevenueNow: snapshot.expectedRevenueNow,
    forecastRevenue,
    guestGap: recovered ? state.gapProgress.remainingGuests : snapshot.guestGap,
    tableGap: recovered ? state.gapProgress.remainingTables : snapshot.tableGap,
    judgment: recovered ? state.brief.judgment : snapshot.judgment,
    nextRecheckAt: state.brief.nextRecheckAt,
    transitions,
  };
}

const knowledgeCases: KnowledgeCase[] = [
  {
    id: "case-member-recall",
    topic: "traffic",
    title: "会员不是名单，要能被找到和再次触达",
    judgment: "今天顾客少，先召回近期到店会员，再追未确认预约。",
    result: "演示案例：30分钟新增19桌预约、49位顾客。",
    sourceType: "总部SOP",
    sourceNote: "会员经营方法底稿 · 演示数据",
    applicableStages: ["morningBrief", "afternoonDecision", "dinnerRecovery"],
    applicableWhen: ["晚市顾客缺口超过30位", "会员池可触达超过100人"],
    disabledWhen: ["门店承载能力不足", "会员当天已触达"],
    evidenceRequired: ["触达人数", "新增预约", "实际到店"],
    actions: ["筛选180位近期会员", "店长确认召回内容", "30分钟后追未确认预约"],
    reviewStatus: "published",
    version: 4,
  },
  {
    id: "case-15-second-message",
    topic: "people",
    title: "高峰期15秒，只说顾客能马上听懂的价值",
    judgment: "员工不要讲复杂权益，只讲一个到店理由和一个立即动作。",
    result: "用于806储值与会员触达话术的短表达原则。",
    sourceType: "总部SOP",
    sourceNote: "周麻婆会员经营底稿 · 演示口径",
    applicableStages: ["morningMeeting", "dinnerRecovery"],
    applicableWhen: ["需要员工快速表达活动价值"],
    disabledWhen: ["权益尚未经过总部确认"],
    evidenceRequired: ["员工复述", "顾客反馈"],
    actions: ["说清顾客得到什么", "说清今天为什么来", "说清下一步怎么做"],
    reviewStatus: "published",
    version: 1,
  },
  {
    id: "case-chili-chicken",
    topic: "product",
    title: "爆炒鲜椒鸡：一句话让员工敢推荐",
    judgment: "推荐菜不要背参数，先说口感、锅气和趁热吃。",
    result: "保守话术：鲜椒提香、猛火现炒，锅气十足，趁热更香。",
    sourceType: "总部SOP",
    sourceNote: "菜品上菜话术复核稿；未经供应链确认的宣传口径已剔除",
    applicableStages: ["morningMeeting", "dinnerExperience"],
    applicableWhen: ["晚市需要重点菜推荐", "新人不会推荐"],
    disabledWhen: ["供应链宣传口径未确认"],
    evidenceRequired: ["员工复述", "顾客反馈"],
    actions: ["示范一句保守话术", "新人现场复述", "晚市抽查3桌"],
    reviewStatus: "pendingVerification",
    version: 1,
    imageUrl: "/assets/explosive-chili-chicken.png",
    imageAlt: "爆炒鲜椒鸡演示菜品图",
  },
  {
    id: "case-journey-waiting",
    topic: "rating",
    title: "等菜问题用一条责任链闭环",
    judgment: "先找到发生在哪个触点，再明确动作、负责人和验收。",
    result: "问题 → 动作 → 负责人 → 时间 → 验收，避免只说加强服务。",
    sourceType: "历史复盘",
    sourceNote: "周麻婆用户旅程课程底稿 · 演示数据",
    applicableStages: ["lunchReview", "dinnerExperience"],
    applicableWhen: ["3桌以上顾客反馈等待"],
    disabledWhen: ["没有现场证据"],
    evidenceRequired: ["现场照片", "问题区域", "整改后复查"],
    actions: ["拍午市现场", "锁定问题触点", "18点前复查整改"],
    reviewStatus: "published",
    version: 2,
    imageUrl: "/assets/task-evidence.jpg",
    imageAlt: "门店顾客体验回传演示照片",
  },
  {
    id: "case-regional-support",
    topic: "support",
    title: "门店资源不够时，带着完整经营上下文求助",
    judgment: "先做门店能做的，再申请商场会员群或区域市场资源。",
    result: "求助必须带缺口、已执行动作、需要资源和复查时间。",
    sourceType: "优秀门店案例",
    sourceNote: "区域市场协同复盘 · 演示数据",
    applicableStages: ["dinnerRecovery"],
    applicableWhen: ["门店行动不足以补回剩余缺口"],
    disabledWhen: ["门店尚未执行基础行动"],
    evidenceRequired: ["资源回复", "实际到店复查"],
    actions: ["带入经营缺口", "说明门店已做什么", "由林阳人工确认支持"],
    reviewStatus: "published",
    version: 2,
  },
];

function action(
  input: Pick<ActionInstance, "id" | "templateId" | "title" | "time" | "owner" | "source" | "method" | "dueAt" | "expectedImpact" | "evidenceRequired" | "recheckAt"> &
    Partial<Pick<ActionInstance, "status" | "released" | "impact">>,
): ActionInstance {
  return {
    ...input,
    templateVersion: 3,
    status: input.status ?? "aiSuggested",
    released: input.released ?? false,
    businessProblemId: "signal-dinner-guest-gap",
    evidenceIds: [],
    approvalRecordIds: [],
  };
}

function createInitialState(): TerminalState {
  const baseState = {
    schemaVersion: 4 as const,
    role: "storeManager",
    operatingMoment: "preOpen",
    operatingStage: "morningBrief",
    snapshots,
    gapProgress: {
      initialGuests: 65,
      initialTables: 25,
      recoveredGuests: 0,
      recoveredTables: 0,
      remainingGuests: 65,
      remainingTables: 25,
      forecastBefore: 92000,
      forecastAfter: 92000,
    },
    activeTabs: { storeManager: "today", regionalManager: "today", headquarters: "today" },
    brief: {
      date: "8月11日",
      storeName: "三盛广场演示店",
      managerName: "黄店长",
      yesterdayTarget: 100000,
      yesterdayActual: 98600,
      todayTarget: 100000,
      forecastRevenue: 92000,
      forecastGuestGap: 65,
      forecastTableGap: 25,
      currentRevenue: null,
      expectedRevenueNow: null,
      judgment: "今天重点不是继续提客单，而是补回晚市顾客。",
      evidence: ["昨日营业 ¥98,600", "今日预计 ¥92,000", "预计少25桌 · 65位顾客"],
      nextRecheckAt: "12:00",
      conversionBasis: "按预计人均 ¥123、每桌2.6位顾客模拟换算",
    },
    signals,
    decisions: [
      {
        id: "decision-dinner-gap",
        signalId: "signal-dinner-guest-gap",
        judgment: "今日第一优先级是补回晚市顾客",
        rationale: ["客单价比上周高 ¥18", "晚市顾客与预约同时不足"],
        suggestedActionIds: ["morning-meeting", "member-recall", "reservation-followup"],
        humanConfirmer: "黄店长",
        status: "pendingConfirmation",
        version: "3.0",
        recheckAt: "12:00",
      },
    ],
    templates: [
      {
        id: "template-member-recall",
        title: "晚市会员召回",
        ownerDepartment: "总部市场中心",
        version: 3,
        status: "published",
        applicableWhen: ["晚市预计顾客缺口大于30位", "会员池可触达人数大于100"],
        disabledWhen: ["门店承载能力不足", "会员当天已触达"],
        evidenceRequired: ["触达人数回执", "新增预约结果"],
        expectedImpact: "预计补回12至20桌",
        steps: ["筛选近60天到店会员", "发送门店专属召回内容", "30分钟后回收预约"],
        publishedAt: "8月8日 10:00",
      },
      {
        id: "template-dinner-experience",
        title: "晚市10桌顾客体验",
        ownerDepartment: "总部运营中心",
        version: 3,
        status: "published",
        applicableWhen: ["当天出现等待反馈"],
        disabledWhen: ["无晚市营业"],
        evidenceRequired: ["现场照片", "一句话反馈"],
        expectedImpact: "避免1至2条新增差评",
        steps: ["18点前确认人员", "关注10桌体验", "收官前复盘"],
        publishedAt: "8月5日 18:00",
      },
    ],
    actions: [
      action({
        id: "morning-meeting",
        templateId: "template-member-recall",
        title: "召开3分钟晨会",
        time: "08:45",
        owner: "黄店长",
        source: "AI建议",
        method: "语音",
        status: "pendingConfirmation",
        released: true,
        dueAt: "08:50",
        expectedImpact: "让3位负责人知道晚市还需补65位顾客",
        evidenceRequired: ["晨会语音", "员工接收回执"],
        recheckAt: "08:55",
      }),
      action({
        id: "member-recall",
        templateId: "template-member-recall",
        title: "向180位会员发送召回内容",
        time: "16:20",
        owner: "王小丽",
        source: "AI建议",
        method: "系统回执",
        dueAt: "16:35",
        expectedImpact: "预计新增12桌、31位顾客",
        evidenceRequired: ["触达人数回执", "新增预约结果"],
        recheckAt: "17:00",
        impact: { actionId: "member-recall", recoveredGuests: 31, recoveredTables: 12, forecastLift: 3800, actualRevenueLift: 0, measuredAt: "17:00", status: "expected" },
      }),
      action({
        id: "reservation-followup",
        templateId: "template-member-recall",
        title: "跟进10桌未确认预约",
        time: "16:40",
        owner: "李主管",
        source: "AI建议",
        method: "确认",
        dueAt: "17:00",
        expectedImpact: "预计确认7桌、18位顾客",
        evidenceRequired: ["预约确认记录"],
        recheckAt: "17:10",
        impact: { actionId: "reservation-followup", recoveredGuests: 18, recoveredTables: 7, forecastLift: 2200, actualRevenueLift: 0, measuredAt: "17:10", status: "expected" },
      }),
      action({
        id: "dinner-experience",
        templateId: "template-dinner-experience",
        title: "店长关注10桌顾客体验",
        time: "18:00",
        owner: "黄店长",
        source: "总部策略",
        method: "照片",
        dueAt: "20:00",
        expectedImpact: "避免等待问题重复发生",
        evidenceRequired: ["现场照片", "语音反馈"],
        recheckAt: "20:30",
        impact: { actionId: "dinner-experience", recoveredGuests: 0, recoveredTables: 0, forecastLift: 0, actualRevenueLift: 0, measuredAt: "20:30", status: "expected" },
      }),
      action({
        id: "regional-support",
        templateId: "template-member-recall",
        title: "区域补充晚市曝光支持",
        time: "16:30",
        owner: "黄店长",
        source: "区域行动",
        method: "确认",
        dueAt: "17:00",
        expectedImpact: "预计再带回4至6桌",
        evidenceRequired: ["区域方案接收确认"],
        recheckAt: "17:30",
      }),
      action({
        id: "product-recommendation",
        templateId: "template-dinner-experience",
        title: "训练一句爆炒鲜椒鸡推荐话术",
        time: "16:50",
        owner: "李主管",
        source: "AI建议",
        method: "语音",
        dueAt: "17:00",
        expectedImpact: "预计增加9份主动推荐成交",
        evidenceRequired: ["员工复述语音", "晚市推荐记录"],
        recheckAt: "20:30",
      }),
      action({
        id: "closing-review",
        templateId: "template-dinner-experience",
        title: "完成今日经营复盘",
        time: "21:30",
        owner: "黄店长",
        source: "AI建议",
        method: "确认",
        dueAt: "21:45",
        expectedImpact: "保留有效动作并生成明日第一件事",
        evidenceRequired: ["收银结果", "行动闭环记录"],
        recheckAt: "明日08:30",
      }),
    ],
    workRequests: [
      {
        id: "request-market-support",
        title: "申请晚市补充曝光支持",
        fromRole: "storeManager",
        fromName: "黄店长",
        targetRole: "regionalManager",
        context: "预计收官少 ¥8,000，约25桌、65位顾客；门店已确认执行会员召回。",
        requestedResource: "请区域提供商场会员群或附近门店联动曝光支持",
        status: "draft",
        approvalRecordIds: [],
      },
    ],
    evidence: [],
    approvals: [],
    benchmarks: [
      {
        id: "benchmark-dinner-arrival",
        label: "晚市到店",
        anonymousStore: "匿名优秀门店：预约确认后到店率82%",
        regionAverage: "区域平均：74%",
        theoreticalStandard: "标准建议：不低于78%",
        translatedGap: "三盛广场店若达到区域平均，可多到店约6桌",
        sourceAt: "近28天 · 8月11日08:20更新",
      },
    ],
    knowledgeCases,
    growthEvidence: [
      { id: "growth-streak", label: "连续完成", trend: "2/7天", reason: "连续两天完成收官复盘", actionId: "closing-review", earned: true },
      { id: "growth-method", label: "有效方法", trend: "待验证", reason: "会员召回需区域验收后才记录", actionId: "member-recall", earned: false },
      { id: "growth-coaching", label: "带教改善", trend: "+1次", reason: "晨会行动落实到三位负责人", actionId: "morning-meeting", earned: false },
      { id: "growth-evidence", label: "证据完整", trend: "近7天 90%", reason: "照片、语音和系统回执可追溯", actionId: "dinner-experience", earned: true },
    ],
    notifications: [
      {
        id: "notice-brief-ready",
        role: "storeManager",
        title: "今日经营判断已准备好",
        body: "晚市预计少65位顾客，第一步先开晨会。",
        createdAt: "08:30",
        read: false,
        target: "today",
      },
    ],
    regionStores: [
      { id: "sansheng", name: "三盛广场演示店", manager: "黄店长", guestGap: 65, tableGap: 25, forecastGap: 8000, unresolvedActions: 3, pendingEvidence: 0, helpUrgency: "normal" },
      { id: "dongerhuan", name: "东二环演示店", manager: "张店长", guestGap: 102, tableGap: 39, forecastGap: 12600, unresolvedActions: 5, pendingEvidence: 1, helpUrgency: "urgent" },
      { id: "cangshan", name: "仓山万达演示店", manager: "林店长", guestGap: 21, tableGap: 8, forecastGap: 2600, unresolvedActions: 2, pendingEvidence: 0, helpUrgency: "none" },
      { id: "daxuecheng", name: "大学城演示店", manager: "王店长", guestGap: 39, tableGap: 15, forecastGap: 4800, unresolvedActions: 3, pendingEvidence: 0, helpUrgency: "normal" },
      { id: "fuxin", name: "福新中路演示店", manager: "陈店长", guestGap: 10, tableGap: 4, forecastGap: 1200, unresolvedActions: 1, pendingEvidence: 0, helpUrgency: "none" },
      { id: "wanxiang", name: "万象城演示店", manager: "周店长", guestGap: 8, tableGap: 3, forecastGap: 900, unresolvedActions: 1, pendingEvidence: 0, helpUrgency: "none" },
    ],
    repeatedIssues: [
      { id: "repeat-dinner-gap", title: "晚市顾客不足", affectedStores: 6, affectedRegions: 2, translatedImpact: "预计合计少173桌、约450位顾客", templateId: "template-member-recall" },
      { id: "repeat-waiting", title: "首轮出菜偏慢", affectedStores: 4, affectedRegions: 2, translatedImpact: "共17桌顾客反馈等菜久", templateId: "template-dinner-experience" },
    ],
    reports: storeReports,
    actionEffects: initialActionEffects,
    reportExports: [],
    liveFrame: {} as LiveOperatingFrame,
    metricTransitions: [],
    storyMedia: [
      { id: "media-meeting", src: "/assets/morning-briefing-demo.png", alt: "店长与三位员工召开晨会的演示场景", usage: "meeting" as const, source: "AI生成演示场景", demo: true },
      { id: "media-inspection", src: "/assets/lunch-inspection-demo.png", alt: "店长在午市传菜口拍照巡检的演示场景", usage: "inspection" as const, source: "AI生成演示场景", demo: true },
      { id: "media-product", src: "/assets/explosive-chili-chicken.png", alt: "爆炒鲜椒鸡演示菜品图", usage: "product" as const, source: "周麻婆演示菜品素材", demo: true },
      { id: "media-service", src: "/assets/task-evidence.jpg", alt: "店员服务顾客的演示场景", usage: "knowledge" as const, source: "演示场景素材", demo: true },
    ],
    voiceSession: { id: "voice-idle", status: "idle" as const, startedAt: null, durationMs: 0, transcript: "", intent: null, confidence: 0, cancelled: false },
    dailyReview,
    meetingStage: 0,
    meetingTranscript: [],
    meetingMissingItem: "还没安排谁负责跟进未确认预约",
    activity: [
      { id: "audit-initial-1", time: "08:30", actor: "AI经营助手", event: "生成今日经营判断 v3.0", entityId: "decision-dinner-gap" },
    ],
  };
  const initial = baseState as TerminalState;
  initial.liveFrame = buildLiveFrame(initial.operatingStage, initial);
  initial.metricTransitions = initial.liveFrame.transitions;
  return initial;
}

class MockBusinessData implements BusinessDataAdapter {
  getInitialState() {
    return createInitialState();
  }

  async getMetricDictionary() {
    await pause(180);
    return metricDictionary;
  }

  async refreshSignals() {
    await pause();
    return signals;
  }

  async getSnapshot(stage: OperatingStageId, state: TerminalState) {
    await pause(220);
    return state.snapshots.find((item) => item.stage === stage) ?? state.snapshots[0];
  }

  async getLiveFrame(stage: OperatingStageId, state: TerminalState) {
    await pause(240);
    return buildLiveFrame(stage, state);
  }

  subscribeLiveFrames(_listener: (frame: LiveOperatingFrame) => void) {
    return () => undefined;
  }

  async buildClosingReview(state: TerminalState) {
    await pause(620);
    const criticalClosed = state.actions.filter((item) =>
      ["member-recall", "reservation-followup", "dinner-experience"].includes(item.id) && item.status === "closed",
    ).length;
    const supportBlocked = state.workRequests.some((item) => item.status === "pendingRegional" || item.status === "escalatedToHQ");
    const improved = criticalClosed >= 3 && state.gapProgress.remainingGuests <= 16 && !supportBlocked;
    return {
      ...dailyReview,
      actualRevenue: improved ? 100600 : 94100,
      outcome: improved ? "improved" as const : "partial" as const,
      effectiveActions: improved ? dailyReview.effectiveActions : ["已完成晨会启动，但关键经营行动尚未闭环"],
      remainingItems: improved ? dailyReview.remainingItems : ["会员召回证据待验收", "晚市现场体验待回传"],
      conclusions: improved
        ? dailyReview.conclusions
        : [
            "今日仍有关键行动未闭环，不能把预测影响当成实际结果。",
            "实际收官低于目标，晚市顾客缺口仍需继续复盘。",
            "明早先补齐证据，再决定是否复用召回方法。",
          ],
      tomorrowFirstAction: improved ? dailyReview.tomorrowFirstAction : "08:35补齐昨日未闭环证据",
    };
  }
}

class MockWorkflow implements WorkflowAdapter {
  async issueActions(actions: ActionInstance[]) {
    await pause(640);
    return actions.map((item) => ({ owner: item.owner, status: "received" as const }));
  }

  async submitEvidence(_evidence: Evidence) {
    await pause(560);
    return { receiptId: "DEMO-EV-811", receivedAt: "17:02" };
  }

  async submitWorkRequest(_request: WorkRequest) {
    await pause(520);
    return { receiptId: "DEMO-REQ-811", receivedAt: "16:22" };
  }

  async publishTemplate(_template: ActionTemplate) {
    await pause(650);
    return { receiptId: "DEMO-STRATEGY-811", publishedAt: "17:10" };
  }
}

class MockDecisionEngine implements DecisionEngineAdapter {
  async analyzeMeeting(): Promise<MeetingAnalysis> {
    await pause(720);
    return {
      transcript: [
        "今天晚市还需要多来65位顾客。",
        "王小丽负责会员召回，李主管跟进预约。",
        "晚市每人重点关注顾客等菜体验。",
      ],
      extracted: [
        { label: "今日目标", value: "晚市补回65位顾客" },
        { label: "会员召回", value: "王小丽 · 16:20" },
        { label: "现场体验", value: "黄店长 · 18:00" },
      ],
      missingItem: "还没安排谁负责跟进10桌未确认预约",
      generatedActions: ["会员召回", "预约跟进", "晚市10桌体验"],
    };
  }

  async inspectEvidence(evidence: Evidence) {
    await pause(740);
    const systemNote = evidence.actionId === "member-recall"
      ? "已识别触达180位会员、新增预约12桌；建议区域经理人工确认。"
      : "已识别10桌预约跟进记录，其中7桌已确认；建议区域经理人工确认。";
    return {
      result: "passed" as const,
      note: evidence.type === "systemReceipt"
        ? systemNote
        : "照片清晰，时间与门店信息完整；建议区域经理人工确认。",
    };
  }

  async explainSignal(signal: BusinessSignal) {
    await pause(420);
    return { summary: signal.managerLanguage, nextAction: "先执行会员召回，再于17:00复查预约" };
  }

  async judgeStage(snapshot: OperatingSnapshot) {
    await pause(380);
    return { judgment: snapshot.judgment, nextAction: snapshot.nextRecheckAt };
  }

  async recalculateGap(state: TerminalState) {
    await pause(360);
    const recallClosed = state.actions.some((item) => item.id === "member-recall" && item.status === "closed");
    const reservationClosed = state.actions.some((item) => item.id === "reservation-followup" && item.status === "closed");
    const recoveredGuests = (recallClosed ? 31 : 0) + (reservationClosed ? 18 : 0);
    const recoveredTables = (recallClosed ? 12 : 0) + (reservationClosed ? 7 : 0);
    return {
      ...state.gapProgress,
      recoveredGuests,
      recoveredTables,
      remainingGuests: 65 - recoveredGuests,
      remainingTables: 25 - recoveredTables,
      forecastAfter: 92000 + (recallClosed ? 3800 : 0) + (reservationClosed ? 2200 : 0),
    };
  }
}

const knowledgeMatches: Record<"traffic" | "rating" | "people", KnowledgeMatch> = {
  traffic: {
    judgment: "今天不是消费问题，而是晚市顾客不足。",
    caseTitle: "匿名优秀门店：30分钟召回17桌",
    caseResult: "先筛60天到店会员，再由店长确认发送，30分钟后只追未确认预约。",
    source: "优秀门店复盘模拟数据 · 总部市场SOP",
    actions: ["筛选180位近期会员", "发送门店专属召回内容", "30分钟后跟进未确认预约"],
  },
  rating: {
    judgment: "评分风险来自等菜时间，不是菜品口味。",
    caseTitle: "仓山匿名门店：高峰首轮出菜提速6分钟",
    caseResult: "店长只盯首轮出菜和10桌体验，收官前回收反馈。",
    source: "总部服务SOP · 历史复盘模拟数据",
    actions: ["高峰前确认出菜顺序", "店长关注10桌体验", "20:30回收顾客反馈"],
  },
  people: {
    judgment: "新人不是不会服务，而是不知道今天该推荐什么。",
    caseTitle: "福新匿名门店：3分钟晨会让推荐率提升",
    caseResult: "晨会只讲一个顾客目标、一个重点菜和每个人的一项动作。",
    source: "总部带教SOP · 优秀店长案例",
    actions: ["示范一句推荐话术", "让新人现场复述", "晚市抽查3桌"],
  },
};

class MockKnowledge implements KnowledgeAdapter {
  async matchProblem(topic: "traffic" | "rating" | "people") {
    await pause(580);
    return knowledgeMatches[topic];
  }


  async matchCurrentCase(state: TerminalState) {
    await pause(420);
    const candidate = knowledgeCases.find((item) =>
      item.applicableStages.includes(state.operatingStage) && item.reviewStatus === "published",
    );
    return candidate ?? knowledgeCases[0];
  }

  async listCases() {
    await pause(180);
    return knowledgeCases;
  }
}

function currentStoreReports(state: TerminalState): OperatingReport[] {
  const gap = state.gapProgress;
  const actualKnown = state.operatingStage === "closingReview" || state.operatingStage === "completed";
  return state.reports.map((report) => {
    if (report.id === "today") {
      const conclusion = actualKnown
        ? `今日实际收官¥${state.dailyReview.actualRevenue.toLocaleString("zh-CN")}，${state.dailyReview.outcome === "improved" ? "目标已完成。" : "仍有经营动作未闭环。"}`
        : gap.recoveredGuests > 0
          ? `两项行动已补回${gap.recoveredTables}桌、${gap.recoveredGuests}位顾客，预计还差${gap.remainingTables}桌。`
          : `按当前经营节奏，预计还差${state.brief.forecastTableGap}桌、${state.brief.forecastGuestGap}位顾客。`;
      return {
        ...report,
        conclusion,
        hero: actualKnown
          ? { label: "实际收官", value: `¥${state.dailyReview.actualRevenue.toLocaleString("zh-CN")}`, note: `目标¥${state.dailyReview.targetRevenue.toLocaleString("zh-CN")}`, tone: state.dailyReview.outcome === "improved" ? "result" : "risk" }
          : { ...report.hero, value: `¥${state.brief.forecastRevenue.toLocaleString("zh-CN")}`, note: `还差${state.brief.forecastTableGap}桌 · ${state.brief.forecastGuestGap}位顾客` },
        evidence: actualKnown
          ? [
              { label: "目标", value: "¥100,000", note: "今日口径", tone: "neutral" },
              { label: "实际", value: `¥${state.dailyReview.actualRevenue.toLocaleString("zh-CN")}`, note: "POS模拟结果", tone: state.dailyReview.outcome === "improved" ? "result" : "risk" },
              { label: "已闭环", value: `${state.actions.filter((item) => item.status === "closed").length}项`, note: "含人工验收", tone: "ai" },
            ]
          : [
              { label: "当前收入", value: state.brief.currentRevenue === null ? "未营业" : `¥${state.brief.currentRevenue.toLocaleString("zh-CN")}`, note: "实际口径", tone: "neutral" },
              { label: "预计收官", value: `¥${state.brief.forecastRevenue.toLocaleString("zh-CN")}`, note: "不等于实际", tone: "opportunity" },
              { label: "仍需补回", value: `${state.brief.forecastTableGap}桌`, note: `约${state.brief.forecastGuestGap}位顾客`, tone: "risk" },
            ],
        updatedAt: state.brief.currentRevenue === null ? "08:30" : state.snapshots.find((item) => item.stage === state.operatingStage)?.time ?? "08:30",
        recheckAt: state.brief.nextRecheckAt,
      };
    }
    if (report.id === "actionEffect") {
      const verified = state.actionEffects.filter((item) => item.status === "verified").length;
      const measuring = state.actionEffects.filter((item) => item.status === "measuring").length;
      return {
        ...report,
        conclusion: `${state.actionEffects.length}项行动有完整效果记录，${verified}项已验证有效${measuring ? `，${measuring}项等待实际到店复查` : ""}。`,
        hero: { label: "已验证有效", value: `${verified}项`, note: `${measuring}项仍在复查`, tone: "result" },
      };
    }
    return report;
  });
}

function scopeReports(scope: ReportScope, state: TerminalState): OperatingReport[] {
  if (scope === "store") return currentStoreReports(state);
  if (scope === "region") {
    const totalTables = state.regionStores.reduce((sum, store) => sum + store.tableGap, 0);
    const totalGuests = state.regionStores.reduce((sum, store) => sum + store.guestGap, 0);
    const base = currentStoreReports(state).find((report) => report.id === "sevenDay")!;
    return [{
      ...base,
      scope,
      title: "区域7日经营复盘",
      question: "六家店哪里需要区域介入？",
      conclusion: `6家店预计合计少${totalTables}桌、${totalGuests}位顾客；东二环与三盛广场优先介入。`,
      hero: { label: "区域桌数缺口", value: `${totalTables}桌`, note: `${state.regionStores.filter((store) => store.unresolvedActions > 2).length}家店行动未闭环`, tone: "risk" },
      evidence: [
        { label: "急需介入", value: "2家", note: "缺口+求助排序", tone: "risk" },
        { label: "待验收", value: `${state.actions.filter((item) => item.status === "pendingHumanReview").length}项`, note: "AI初验后", tone: "opportunity" },
        { label: "已验证方法", value: `${state.actionEffects.filter((item) => item.status === "verified").length}项`, note: "可跨店复用", tone: "result" },
      ],
      series: state.regionStores.map((store) => ({ label: store.name.replace("演示店", ""), value: store.tableGap, benchmark: 8, unit: "桌" as const })),
      reasonChain: ["东二环预计缺口最大且已有求助", "三盛广场关键行动等待闭环", "仓山、福新和万象城接近正常，不需要统一催办"],
      source: "6家演示门店经营快照、任务与求助 · 匿名展示",
      updatedAt: "8月11日 17:10",
      confidence: 93,
      recheckAt: "17:30",
    }];
  }
  const base = currentStoreReports(state).find((report) => report.id === "actionEffect")!;
  return [{
    ...base,
    scope,
    title: "总部行动效果复盘",
    question: "哪些方法值得沉淀为集团策略？",
    conclusion: "会员召回已在6家店重复出现，3家店有实际到店证据；等待总部确认沉淀。",
    hero: { label: "可沉淀方法", value: "3项", note: "2项案例待审核", tone: "ai" },
    evidence: [
      { label: "覆盖门店", value: "6家", note: "2个区域", tone: "neutral" },
      { label: "真实结果", value: "3家", note: "有POS回链", tone: "result" },
      { label: "待发布", value: "2个案例", note: "需总部人工确认", tone: "opportunity" },
    ],
    series: [
      { label: "会员召回", value: 6, benchmark: 3, unit: "桌" },
      { label: "等菜责任链", value: 4, benchmark: 3, unit: "桌" },
      { label: "菜品话术", value: 3, benchmark: 3, unit: "桌" },
    ],
    reasonChain: ["会员召回在6家店使用", "3家店已完成触达—预约—实际到店回链", "菜品话术仍缺供应链口径确认，不能正式发布"],
    source: "区域经营复盘、行动证据与总部审批记录 · 演示数据",
    updatedAt: "8月11日 17:10",
    confidence: 94,
    recheckAt: "8月12日 10:00",
  }];
}

const reportAnswers: Record<ReportQuestionId, Omit<ReportAnswer, "questionId">> = {
  canReachTarget: {
    question: "今天能不能达标？",
    answer: "按当前节奏预计¥92,000，还差约25桌、65位顾客；完成召回与预约跟进后预计可升至¥98,000。",
    evidence: ["今日目标¥100,000", "客单价没有下降", "晚市预约少11桌"],
    reportId: "today",
    nextAction: "先执行会员召回，17:00复查预约",
    recommendedActionId: "member-recall",
  },
  whyGuestsLow: {
    question: "为什么今天顾客少？",
    answer: "曝光正常，但预约确认和自然到店都偏少；每100位看过门店的顾客，比平时少成交3桌。",
    evidence: ["美团曝光接近7日平均", "晚市预约少11桌", "预约确认率低9个百分点"],
    reportId: "traffic",
    nextAction: "召回近期会员，并跟进10桌未确认预约",
    recommendedActionId: "member-recall",
  },
  whichDish: {
    question: "今天重点推荐哪道菜？",
    answer: "爆炒鲜椒鸡顾客好评稳定，但员工主动推荐少18次；先训练一句保守话术，不需要改菜。",
    evidence: ["菜品好评92%", "主动推荐少18次", "预计有9份销售机会"],
    reportId: "product",
    nextAction: "让李主管在晚市前带员工复述一句推荐话术",
    recommendedActionId: "product-recommendation",
  },
  whichActionWorked: {
    question: "最近哪项行动最有效？",
    answer: "8月8日会员召回已确认9桌、23位顾客实际到店，新增实际营业¥2,980，是当前证据最完整的方法。",
    evidence: ["会员触达回执", "预约确认记录", "POS确认9桌到店"],
    reportId: "actionEffect",
    nextAction: "今日继续复用，但仍需在21:30核对真实到店",
    recommendedActionId: "member-recall",
  },
};

class MockReporting implements ReportingAdapter {
  async listReports(scope: ReportScope, state: TerminalState) {
    await pause(260);
    return scopeReports(scope, state);
  }

  async getReport(reportId: ReportId, scope: ReportScope, state: TerminalState) {
    await pause(320);
    const reports = scopeReports(scope, state);
    return reports.find((report) => report.id === reportId) ?? reports[0];
  }

  async getVisualReport(reportId: ReportId, scope: ReportScope, state: TerminalState): Promise<VisualReport> {
    await pause(360);
    const reports = scopeReports(scope, state);
    const report = reports.find((item) => item.id === reportId) ?? reports[0];
    const maximum = Math.max(...report.series.map((item) => Math.max(item.value, item.benchmark ?? 0)), 1);
    const media = report.id === "product"
      ? state.storyMedia.find((item) => item.usage === "product")
      : report.id === "reputation"
        ? state.storyMedia.find((item) => item.usage === "inspection")
        : undefined;
    return {
      ...report,
      visualMode: report.id === "member" ? "funnel" : report.id === "actionEffect" ? "beforeAfter" : report.id === "today" || report.id === "month" ? "progress" : "bars",
      media,
      changeNote: state.gapProgress.recoveredGuests > 0 ? `行动后预计收官提升至¥${state.brief.forecastRevenue.toLocaleString("zh-CN")}，当前营业额未虚增` : `数据于${report.updatedAt}更新，下一次${report.recheckAt}复查`,
      segments: report.series.map((point, index) => ({
        label: point.label,
        value: `${point.value.toLocaleString("zh-CN")}${point.unit}`,
        ratio: Math.max(0.08, point.value / maximum),
        tone: index === report.series.length - 1 ? report.hero.tone : "neutral",
      })),
    };
  }

  async answerQuestion(questionId: ReportQuestionId, state: TerminalState) {
    await pause(720);
    const source = reportAnswers[questionId];
    if (questionId !== "canReachTarget") return { questionId, ...source };
    return {
      questionId,
      ...source,
      answer: state.gapProgress.recoveredGuests > 0
        ? `当前收入没有虚增；经营行动已补回${state.gapProgress.recoveredTables}桌预约，预计收官升至¥${state.brief.forecastRevenue.toLocaleString("zh-CN")}。`
        : source.answer,
    };
  }

  async generateExport(reportId: ReportId, kind: ReportExport["kind"], state: TerminalState) {
    await pause(680);
    const report = currentStoreReports(state).find((item) => item.id === reportId) ?? currentStoreReports(state)[0];
    const labels: Record<ReportExport["kind"], string> = {
      longImage: "经营战报长图",
      dailyBrief: "店长经营日报",
      weeklyReview: "7日经营复盘",
      voiceBrief: "90秒语音简报",
    };
    return {
      reportId,
      kind,
      title: `${report.period} · ${labels[kind]}`,
      summary: `${report.conclusion} 下一步：${report.recommendedActionTitle ?? "收官后复查实际结果"}`,
      status: "ready" as const,
      createdAt: "8月11日 08:32",
    };
  }
}

const voiceByContext: Record<"today" | "data" | "tasks" | "academy", VoiceResolution> = {
  today: { transcript: "帮我开晨会", intent: "startMeeting", confidence: 97, summary: "准备开始08:45晨会，AI将实时转写并预生成行动。", confirmationLabel: "确认进入晨会", targetId: "morning-meeting" },
  data: { transcript: "今天为什么少顾客", intent: "askBusiness", confidence: 95, summary: "晚市预约少11桌是当前最大原因，不是客单价下降。", confirmationLabel: "查看经营答案", targetId: "traffic" },
  tasks: { transcript: "把会员召回交给王小丽", intent: "createAction", confidence: 94, summary: "已预填16:20会员召回，负责人王小丽；确认后才进入执行。", confirmationLabel: "确认查看行动", targetId: "member-recall" },
  academy: { transcript: "最近评分下降怎么办", intent: "askBusiness", confidence: 93, summary: "当前评分风险来自高峰等菜，已匹配周麻婆责任链案例。", confirmationLabel: "查看匹配方法", targetId: "rating" },
};

class MockVoiceInteraction implements VoiceInteractionAdapter {
  async resolveIntent(session: VoiceSession, context: "today" | "data" | "tasks" | "academy") {
    await pause(620);
    return { ...voiceByContext[context], transcript: session.transcript || voiceByContext[context].transcript };
  }
}

export const demoAdapters: OperatingAdapters = {
  business: new MockBusinessData(),
  workflow: new MockWorkflow(),
  decision: new MockDecisionEngine(),
  knowledge: new MockKnowledge(),
  reporting: new MockReporting(),
  voice: new MockVoiceInteraction(),
};

export function freshDemoState() {
  return demoAdapters.business.getInitialState();
}
