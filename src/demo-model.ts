export type RoleId = "manager" | "regional";

export type DayPhaseId =
  | "opening"
  | "lunch"
  | "afternoon"
  | "preDinner"
  | "dinner"
  | "closing";

export type HealthDimensionId =
  | "traffic"
  | "conversion"
  | "ticket"
  | "rating"
  | "cost"
  | "people";

export type TaskSourceId = "required" | "hq" | "regional" | "ai" | "self" | "manager";

export type TaskStatus =
  | "待处理"
  | "已接收"
  | "执行中"
  | "待回传"
  | "待验收"
  | "已完成"
  | "需整改"
  | "需帮助";

export type ReminderSeverity = "danger" | "warning" | "good" | "info";

export type ReminderTarget =
  | "meeting"
  | "inspection"
  | "revenue"
  | "rating"
  | "soldout"
  | "tasks"
  | "regional-task"
  | "none";

export type RegionalTaskStatus =
  | "not-issued"
  | "sent"
  | "accepted"
  | "executing"
  | "regional-review"
  | "needs-fix"
  | "done";

export type HelpStatus = "none" | "sent" | "replied";

export type HealthScores = Record<HealthDimensionId, number>;

export type BusinessSnapshot = {
  id: DayPhaseId;
  label: string;
  time: string;
  currentRevenue: number;
  targetRevenue: number;
  forecastRevenue: number;
  health: HealthScores;
  primaryTitle: string;
  primaryMeta: string;
};

export type DemoReminder = {
  id: string;
  time: string;
  title: string;
  body: string;
  badge: string;
  severity: ReminderSeverity;
  target: ReminderTarget;
  handled: boolean;
};

export type RegionStore = {
  id: string;
  name: string;
  manager: string;
  health: number;
  currentRevenue: number;
  forecastGap: number;
  closureRate: number;
  status: "健康" | "关注" | "异常";
};

export const healthWeights: Record<HealthDimensionId, number> = {
  traffic: 0.15,
  conversion: 0.15,
  ticket: 0.25,
  rating: 0.15,
  cost: 0.15,
  people: 0.15,
};

export const healthDimensionLabels: Record<HealthDimensionId, string> = {
  traffic: "流量",
  conversion: "转化",
  ticket: "客单",
  rating: "口碑",
  cost: "成本",
  people: "人员",
};

export const phaseOrder: DayPhaseId[] = [
  "opening",
  "lunch",
  "afternoon",
  "preDinner",
  "dinner",
  "closing",
];

export const phaseSnapshots: Record<DayPhaseId, BusinessSnapshot> = {
  opening: {
    id: "opening",
    label: "开店准备",
    time: "08:50",
    currentRevenue: 8600,
    targetRevenue: 100000,
    forecastRevenue: 92000,
    health: { traffic: 76, conversion: 84, ticket: 58, rating: 72, cost: 82, people: 78 },
    primaryTitle: "开晨会，把今天讲清楚",
    primaryMeta: "AI边听边拆任务，晨会结束自动进入午市行动",
  },
  lunch: {
    id: "lunch",
    label: "午市检查",
    time: "11:30",
    currentRevenue: 25600,
    targetRevenue: 100000,
    forecastRevenue: 88000,
    health: { traffic: 60, conversion: 80, ticket: 58, rating: 72, cost: 82, people: 78 },
    primaryTitle: "拍一张午市巡检照片",
    primaryMeta: "午市客流低于预测20%，先确认现场状态",
  },
  afternoon: {
    id: "afternoon",
    label: "午后诊断",
    time: "14:30",
    currentRevenue: 48600,
    targetRevenue: 100000,
    forecastRevenue: 91000,
    health: { traffic: 68, conversion: 82, ticket: 58, rating: 72, cost: 82, people: 78 },
    primaryTitle: "查看AI经营诊断",
    primaryMeta: "流量正在恢复，客单价仍是今日首要问题",
  },
  preDinner: {
    id: "preDinner",
    label: "晚市纠偏",
    time: "16:20",
    currentRevenue: 63800,
    targetRevenue: 100000,
    forecastRevenue: 92000,
    health: { traffic: 76, conversion: 84, ticket: 58, rating: 72, cost: 82, people: 78 },
    primaryTitle: "客单价提升",
    primaryMeta: "主动推荐率降至31%，预计影响营业额约¥7,600",
  },
  dinner: {
    id: "dinner",
    label: "晚市保障",
    time: "17:00",
    currentRevenue: 63800,
    targetRevenue: 100000,
    forecastRevenue: 98000,
    health: { traffic: 76, conversion: 84, ticket: 70, rating: 72, cost: 82, people: 78 },
    primaryTitle: "处理晚市库存与沽清",
    primaryMeta: "预计营业额已追回¥6,000，下一步守住供应与体验",
  },
  closing: {
    id: "closing",
    label: "收官复盘",
    time: "21:30",
    currentRevenue: 100600,
    targetRevenue: 100000,
    forecastRevenue: 100600,
    health: { traffic: 82, conversion: 87, ticket: 72, rating: 76, cost: 86, people: 84 },
    primaryTitle: "完成今日收官复盘",
    primaryMeta: "目标已达成，AI已整理结果、证据和明日事项",
  },
};

export const initialReminders: DemoReminder[] = [
  {
    id: "review-yesterday",
    time: "08:30",
    title: "昨日3条差评待复盘",
    body: "集中在上菜速度和服务主动性，AI已整理原因。",
    badge: "待处理",
    severity: "danger",
    target: "rating",
    handled: false,
  },
  {
    id: "morning-meeting",
    time: "08:50",
    title: "晨会即将开始",
    body: "今日预测缺口¥8,000，先讲清目标和每个人的下一步。",
    badge: "现在",
    severity: "warning",
    target: "meeting",
    handled: false,
  },
];

export const regionStores: RegionStore[] = [
  { id: "sansheng", name: "三盛广场演示店", manager: "黄店长", health: 73, currentRevenue: 63800, forecastGap: 8000, closureRate: 68, status: "异常" },
  { id: "fuxin", name: "福新中路演示店", manager: "陈店长", health: 86, currentRevenue: 78200, forecastGap: 1200, closureRate: 92, status: "健康" },
  { id: "cangshan", name: "仓山万达演示店", manager: "林店长", health: 81, currentRevenue: 69400, forecastGap: 2600, closureRate: 88, status: "健康" },
  { id: "donghuan", name: "东二环演示店", manager: "张店长", health: 68, currentRevenue: 52600, forecastGap: 12600, closureRate: 61, status: "异常" },
  { id: "daxuecheng", name: "大学城演示店", manager: "王店长", health: 78, currentRevenue: 61400, forecastGap: 4800, closureRate: 79, status: "关注" },
  { id: "wanxiang", name: "万象城演示店", manager: "周店长", health: 84, currentRevenue: 73600, forecastGap: 900, closureRate: 90, status: "健康" },
];

export function calculateHealth(scores: HealthScores) {
  return Math.round(
    (Object.keys(healthWeights) as HealthDimensionId[]).reduce(
      (total, id) => total + scores[id] * healthWeights[id],
      0,
    ),
  );
}

export function getSnapshot(phase: DayPhaseId) {
  return phaseSnapshots[phase];
}

export function getForecastGap(snapshot: BusinessSnapshot) {
  return Math.max(0, snapshot.targetRevenue - snapshot.forecastRevenue);
}

export function getTargetGap(snapshot: BusinessSnapshot) {
  return Math.max(0, snapshot.targetRevenue - snapshot.currentRevenue);
}

export function formatMoney(value: number) {
  return `¥${value.toLocaleString("zh-CN")}`;
}
