import type {
  ActionInstance,
  ActionTemplate,
  BusinessSignal,
  DailyReview,
  Evidence,
  KnowledgeCase,
  MetricDefinition,
  OperatingSnapshot,
  OperatingStageId,
  TerminalState,
  WorkRequest,
} from "../domain/types";
import type {
  BusinessDataAdapter,
  DecisionEngineAdapter,
  KnowledgeAdapter,
  KnowledgeMatch,
  MeetingAnalysis,
  OperatingAdapters,
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
  return {
    schemaVersion: 2,
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
    dailyReview,
    meetingStage: 0,
    meetingTranscript: [],
    meetingMissingItem: "还没安排谁负责跟进未确认预约",
    activity: [
      { id: "audit-initial-1", time: "08:30", actor: "AI经营助手", event: "生成今日经营判断 v3.0", entityId: "decision-dinner-gap" },
    ],
  };
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

export const demoAdapters: OperatingAdapters = {
  business: new MockBusinessData(),
  workflow: new MockWorkflow(),
  decision: new MockDecisionEngine(),
  knowledge: new MockKnowledge(),
};

export function freshDemoState() {
  return demoAdapters.business.getInitialState();
}
