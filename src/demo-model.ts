export type RoleId = "manager" | "regional";

export type OperatingMomentId =
  | "preOpen"
  | "lunch"
  | "afternoon"
  | "dinner"
  | "closing";

export type ActionSourceId = "AI建议" | "总部任务" | "区域任务";

export type ActionMethodId = "语音" | "确认" | "拍照" | "系统回传";

export type ActionStatusId =
  | "AI建议"
  | "待确认"
  | "执行中"
  | "待回传"
  | "AI复查"
  | "已改善"
  | "需补充"
  | "请求帮助";

export type PlaybookActionId =
  | "meeting"
  | "memberRecall"
  | "reservationFollowup"
  | "dinnerExperience"
  | "feedbackReview";

export type InsightId =
  | "customerGap"
  | "bookingGap"
  | "onlineOrder"
  | "foodWaste"
  | "waitingTime";

export type RegionalTaskStatus =
  | "not-issued"
  | "sent"
  | "accepted"
  | "executing"
  | "regional-review"
  | "needs-fix"
  | "done";

export type HelpStatus = "none" | "sent" | "replied";

export type BusinessGap = {
  money: number;
  guests: number;
  tables: number;
  orders?: number;
  basis: string;
};

export type OperatingSnapshot = {
  id: OperatingMomentId;
  label: string;
  time: string;
  targetRevenue: number;
  currentRevenue: number | null;
  expectedRevenueNow: number | null;
  forecastRevenue: number;
  gap: BusinessGap;
  headline: string;
  primaryTitle: string;
  primaryBody: string;
};

export type BusinessInsight = {
  id: InsightId;
  title: string;
  plainLanguage: string;
  detail: string;
  source: string;
  updatedAt: string;
  confidence: number;
  impact: string;
  actionLabel: string;
};

export type OperatingAction = {
  id: PlaybookActionId;
  time: string;
  title: string;
  owner: string;
  source: ActionSourceId;
  method: ActionMethodId;
  expectedImpact: string;
  evidence: string;
};

export type ManagerCapabilityId =
  | "operations"
  | "customer"
  | "people"
  | "execution";

export type ManagerCapability = {
  id: ManagerCapabilityId;
  label: string;
  baseScore: number;
  description: string;
};

export type RegionStore = {
  id: string;
  name: string;
  manager: string;
  forecastGap: number;
  guestGap: number;
  tableGap: number;
  openActions: number;
  helpRequests: number;
  status: "正常推进" | "需要关注" | "急需处理";
};

export const momentOrder: OperatingMomentId[] = [
  "preOpen",
  "lunch",
  "afternoon",
  "dinner",
  "closing",
];

export const yesterdayReview = {
  targetRevenue: 100000,
  actualRevenue: 98600,
  wins: ["每桌平均比上周多消费 ¥18", "招牌菜多卖 24 份"],
  concerns: ["18点后比正常少来 32 位顾客", "3桌顾客提到等菜时间过长"],
  conclusion: "昨天整体经营稳定，真正需要解决的是晚市顾客变少。",
};

export const operatingSnapshots: Record<OperatingMomentId, OperatingSnapshot> = {
  preOpen: {
    id: "preOpen",
    label: "营业前",
    time: "08:30",
    targetRevenue: 100000,
    currentRevenue: null,
    expectedRevenueNow: null,
    forecastRevenue: 92000,
    gap: {
      money: 8000,
      guests: 65,
      tables: 25,
      basis: "按今日预计每桌约 ¥320、每桌约 2.6 位顾客换算",
    },
    headline: "今天最需要补回晚市顾客",
    primaryTitle: "查看今日经营剧本",
    primaryBody: "今天不是继续提高每桌消费，而是先补回晚市顾客。AI已排好5个动作。",
  },
  lunch: {
    id: "lunch",
    label: "午市现场",
    time: "12:00",
    targetRevenue: 100000,
    currentRevenue: 26800,
    expectedRevenueNow: 30000,
    forecastRevenue: 90000,
    gap: {
      money: 3200,
      guests: 26,
      tables: 10,
      basis: "按午市已完成桌均消费与实时到店人数换算",
    },
    headline: "午市比正常进度少约10桌",
    primaryTitle: "拍一张午市现场",
    primaryBody: "AI先判断是现场状态、人员还是顾客到店不足。",
  },
  afternoon: {
    id: "afternoon",
    label: "午后判断",
    time: "14:30",
    targetRevenue: 100000,
    currentRevenue: 48600,
    expectedRevenueNow: 52000,
    forecastRevenue: 91000,
    gap: {
      money: 3400,
      guests: 29,
      tables: 11,
      basis: "按当前桌均消费和晚市已确认预约换算",
    },
    headline: "晚市预约仍比正常少11桌",
    primaryTitle: "确认晚市经营剧本",
    primaryBody: "重点补顾客，不让店长再自己分析一堆指标。",
  },
  dinner: {
    id: "dinner",
    label: "晚市追赶",
    time: "17:30",
    targetRevenue: 100000,
    currentRevenue: 62000,
    expectedRevenueNow: 70000,
    forecastRevenue: 92000,
    gap: {
      money: 8000,
      guests: 65,
      tables: 25,
      basis: "按当前桌均消费、已到店人数和剩余预约换算",
    },
    headline: "现在比正常进度少约25桌",
    primaryTitle: "立即执行会员召回",
    primaryBody: "触达180位会员，是当前最快补回顾客的动作。",
  },
  closing: {
    id: "closing",
    label: "收官复盘",
    time: "21:30",
    targetRevenue: 100000,
    currentRevenue: 100600,
    expectedRevenueNow: 100000,
    forecastRevenue: 100600,
    gap: {
      money: 0,
      guests: 0,
      tables: 0,
      basis: "收银、任务回执和现场证据汇总",
    },
    headline: "今天多完成 ¥600",
    primaryTitle: "完成今日经营复盘",
    primaryBody: "AI已整理哪些动作有效，以及明天继续做什么。",
  },
};

export const playbookActions: OperatingAction[] = [
  {
    id: "meeting",
    time: "08:45",
    title: "召开3分钟晨会",
    owner: "黄店长",
    source: "AI建议",
    method: "语音",
    expectedImpact: "让3位负责人知道今天要补65位顾客",
    evidence: "晨会语音 + 员工接收回执",
  },
  {
    id: "memberRecall",
    time: "16:20",
    title: "向180位会员发送召回内容",
    owner: "王小丽",
    source: "AI建议",
    method: "确认",
    expectedImpact: "预计新增12桌、31位顾客",
    evidence: "发送回执 + 新增预约",
  },
  {
    id: "reservationFollowup",
    time: "16:40",
    title: "跟进10桌未确认预约",
    owner: "李主管",
    source: "AI建议",
    method: "系统回传",
    expectedImpact: "预计确认7桌、18位顾客",
    evidence: "跟进记录 + 预约确认",
  },
  {
    id: "dinnerExperience",
    time: "18:00",
    title: "店长关注10桌顾客体验",
    owner: "黄店长",
    source: "总部任务",
    method: "拍照",
    expectedImpact: "守住10桌体验，减少等待问题",
    evidence: "现场照片 + 一句话反馈",
  },
  {
    id: "feedbackReview",
    time: "20:30",
    title: "收集反馈并复查经营结果",
    owner: "黄店长",
    source: "AI建议",
    method: "语音",
    expectedImpact: "确认动作是否真的带回顾客",
    evidence: "顾客反馈 + 收银数据",
  },
];

export const businessInsights: Record<InsightId, BusinessInsight> = {
  customerGap: {
    id: "customerGap",
    title: "今天能不能完成目标？",
    plainLanguage: "按现在情况，预计少约25桌、65位顾客。",
    detail: "不是顾客消费变少，而是晚市到店人数不足。",
    source: "收银POS + 预约 + 历史同星期",
    updatedAt: "17:30",
    confidence: 92,
    impact: "若不行动，预计少完成约 ¥8,000",
    actionLabel: "执行会员召回",
  },
  bookingGap: {
    id: "bookingGap",
    title: "差距主要从哪里来？",
    plainLanguage: "晚市预约比正常少11桌，预计少来29位顾客。",
    detail: "近7天18点后的自然到店也比平时少约12%。",
    source: "预约系统 + 到店客流",
    updatedAt: "17:26",
    confidence: 89,
    impact: "预计影响晚市营业额约 ¥3,500",
    actionLabel: "跟进未确认预约",
  },
  onlineOrder: {
    id: "onlineOrder",
    title: "线上为什么没有带来更多顾客？",
    plainLanguage: "每100位看过门店的顾客，比平时少成交3桌。",
    detail: "曝光人数没有明显下降，问题发生在看店后没有下单。",
    source: "美团 + 抖音模拟回传",
    updatedAt: "17:25",
    confidence: 86,
    impact: "预计少8笔订单、约 ¥1,900",
    actionLabel: "查看优秀门店做法",
  },
  foodWaste: {
    id: "foodWaste",
    title: "今天食材有没有买多？",
    plainLanguage: "叶菜和半成品预计多浪费约 ¥320。",
    detail: "晚市顾客减少后，原备货量没有同步调整。",
    source: "库存 + 今日备货 + 销量预测",
    updatedAt: "17:18",
    confidence: 84,
    impact: "今晚及时调整可减少约 ¥220 浪费",
    actionLabel: "提交备货调整",
  },
  waitingTime: {
    id: "waitingTime",
    title: "顾客今天最不满意什么？",
    plainLanguage: "3桌顾客提到等菜时间过长。",
    detail: "集中发生在午市12:10至12:35，首轮出菜平均慢6分钟。",
    source: "顾客反馈 + 出菜记录",
    updatedAt: "14:20",
    confidence: 94,
    impact: "若晚市重复，可能新增1至2条差评",
    actionLabel: "加入晚市现场检查",
  },
};

export const managerCapabilities: ManagerCapability[] = [
  {
    id: "operations",
    label: "营业管理",
    baseScore: 78,
    description: "能按时间节点看经营结果并及时纠偏",
  },
  {
    id: "customer",
    label: "顾客经营",
    baseScore: 72,
    description: "能把顾客缺口转成召回、预约和现场动作",
  },
  {
    id: "people",
    label: "员工培养",
    baseScore: 64,
    description: "能把晨会决定落实到具体负责人",
  },
  {
    id: "execution",
    label: "执行能力",
    baseScore: 86,
    description: "能按时回传证据并完成复查",
  },
];

export const regionStores: RegionStore[] = [
  { id: "sansheng", name: "三盛广场演示店", manager: "黄店长", forecastGap: 8000, guestGap: 65, tableGap: 25, openActions: 4, helpRequests: 0, status: "急需处理" },
  { id: "fuxin", name: "福新中路演示店", manager: "陈店长", forecastGap: 1200, guestGap: 10, tableGap: 4, openActions: 1, helpRequests: 0, status: "正常推进" },
  { id: "cangshan", name: "仓山万达演示店", manager: "林店长", forecastGap: 2600, guestGap: 21, tableGap: 8, openActions: 2, helpRequests: 0, status: "需要关注" },
  { id: "donghuan", name: "东二环演示店", manager: "张店长", forecastGap: 12600, guestGap: 102, tableGap: 39, openActions: 5, helpRequests: 1, status: "急需处理" },
  { id: "daxuecheng", name: "大学城演示店", manager: "王店长", forecastGap: 4800, guestGap: 39, tableGap: 15, openActions: 3, helpRequests: 0, status: "需要关注" },
  { id: "wanxiang", name: "万象城演示店", manager: "周店长", forecastGap: 900, guestGap: 8, tableGap: 3, openActions: 1, helpRequests: 0, status: "正常推进" },
];

export function getSnapshot(moment: OperatingMomentId) {
  return operatingSnapshots[moment];
}

export function getDisplaySnapshot(
  moment: OperatingMomentId,
  memberRecallDone: boolean,
  reservationDone: boolean,
): OperatingSnapshot {
  const snapshot = operatingSnapshots[moment];
  if (moment !== "dinner") return snapshot;

  if (reservationDone) {
    return {
      ...snapshot,
      forecastRevenue: 98000,
      gap: {
        money: 2000,
        guests: 16,
        tables: 6,
        basis: "会员召回新增12桌、预约跟进确认7桌后重新预测",
      },
      headline: "已补回19桌，还需要再补6桌",
      primaryTitle: "守住晚市10桌顾客体验",
      primaryBody: "当前金额仍是 ¥62,000，变化的是预计收官结果。",
    };
  }

  if (memberRecallDone) {
    return {
      ...snapshot,
      forecastRevenue: 95000,
      gap: {
        money: 5000,
        guests: 41,
        tables: 16,
        basis: "会员召回新增12桌、31位顾客后重新预测",
      },
      headline: "已补回12桌，还需要再补16桌",
      primaryTitle: "跟进10桌未确认预约",
      primaryBody: "再确认7桌，预计收官可以提升到 ¥98,000。",
    };
  }

  return snapshot;
}

export function formatMoney(value: number) {
  return `¥${value.toLocaleString("zh-CN")}`;
}
