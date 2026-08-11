import type {
  ActionInstance,
  ActionTemplate,
  BusinessSignal,
  DailyReview,
  Evidence,
  MetricDefinition,
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
};

function action(
  input: Pick<ActionInstance, "id" | "templateId" | "title" | "time" | "owner" | "source" | "method" | "dueAt" | "expectedImpact" | "evidenceRequired" | "recheckAt"> &
    Partial<Pick<ActionInstance, "status" | "released">>,
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
    schemaVersion: 1,
    role: "storeManager",
    operatingMoment: "preOpen",
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
      judgment: "今天不用继续提客单，晚市预计少65位顾客。",
      evidence: ["昨天晚市少32位顾客", "今天预约少11桌"],
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
    capabilities: [
      { id: "operations", label: "营业管理", value: 80, evidence: "连续2天按时完成收官复盘" },
      { id: "customer", label: "顾客经营", value: 75, evidence: "会员召回行动待本日验证" },
      { id: "people", label: "员工培养", value: 66, evidence: "晨会任务能落实到具体负责人" },
      { id: "execution", label: "执行能力", value: 90, evidence: "近7天证据回传及时率90%" },
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

  async buildClosingReview() {
    await pause(620);
    return dailyReview;
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
    return {
      result: "passed" as const,
      note: evidence.type === "systemReceipt"
        ? "已识别触达180位会员、新增预约19桌；建议区域经理人工确认。"
        : "照片清晰，时间与门店信息完整；建议区域经理人工确认。",
    };
  }

  async explainSignal(signal: BusinessSignal) {
    await pause(420);
    return { summary: signal.managerLanguage, nextAction: "先执行会员召回，再于17:00复查预约" };
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
