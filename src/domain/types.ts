export type RoleId = "storeManager" | "regionalManager" | "headquarters";

export type OperatingMomentId = "preOpen" | "lunch" | "afternoon" | "dinner" | "closing";

export type MetricDefinition = {
  code: string;
  name: string;
  formula: string;
  unit: string;
  grain: string;
  source: string[];
  owner: string;
  freshness: string;
  managerLanguage: string;
};

export type BusinessSignal = {
  id: string;
  title: string;
  managerLanguage: string;
  gap: {
    money?: number;
    guests?: number;
    tables?: number;
    orders?: number;
    portions?: number;
  };
  impactObject: string;
  evidence: string[];
  confidence: number;
  triggerRule: string;
  sourceUpdatedAt: string;
};

export type DecisionCase = {
  id: string;
  signalId: string;
  judgment: string;
  rationale: string[];
  suggestedActionIds: string[];
  humanConfirmer: string;
  status: "aiGenerated" | "pendingConfirmation" | "confirmed" | "superseded";
  version: string;
  recheckAt: string;
};

export type ActionTemplate = {
  id: string;
  title: string;
  ownerDepartment: string;
  version: number;
  status: "published" | "draft";
  applicableWhen: string[];
  disabledWhen: string[];
  evidenceRequired: string[];
  expectedImpact: string;
  steps: string[];
  publishedAt: string;
};

export type ActionStatus =
  | "detected"
  | "aiSuggested"
  | "pendingConfirmation"
  | "inProgress"
  | "pendingEvidence"
  | "aiReview"
  | "pendingHumanReview"
  | "closed"
  | "returned"
  | "helpRequested"
  | "cancelled";

export type ActionSource = "AI建议" | "区域行动" | "总部策略";
export type ActionMethod = "语音" | "确认" | "照片" | "系统回执";

export type ActionInstance = {
  id: string;
  templateId: string;
  templateVersion: number;
  title: string;
  time: string;
  owner: string;
  source: ActionSource;
  method: ActionMethod;
  status: ActionStatus;
  released: boolean;
  dueAt: string;
  businessProblemId: string;
  expectedImpact: string;
  evidenceRequired: string[];
  evidenceIds: string[];
  approvalRecordIds: string[];
  recheckAt: string;
  result?: string;
};

export type WorkRequest = {
  id: string;
  title: string;
  fromRole: RoleId;
  fromName: string;
  targetRole: "regionalManager" | "headquarters";
  context: string;
  requestedResource: string;
  status: "draft" | "pendingRegional" | "regionalReplied" | "escalatedToHQ" | "hqReplied" | "closed";
  createdAt?: string;
  reply?: string;
  approvalRecordIds: string[];
};

export type Evidence = {
  id: string;
  actionId: string;
  type: "photo" | "voice" | "text" | "systemReceipt";
  submittedBy: string;
  submittedAt: string;
  summary: string;
  assetUrl?: string;
  aiResult: "pending" | "passed" | "needsMore" | "anomaly";
  aiNote: string;
};

export type ApprovalRecord = {
  id: string;
  entityType: "decision" | "action" | "workRequest" | "evidence" | "template";
  entityId: string;
  decision: "confirmed" | "approved" | "returned" | "published" | "cancelled";
  confirmedBy: string;
  role: RoleId;
  confirmedAt: string;
  note: string;
  version: string;
};

export type BenchmarkSnapshot = {
  id: string;
  label: string;
  anonymousStore: string;
  regionAverage: string;
  theoreticalStandard: string;
  translatedGap: string;
  sourceAt: string;
};

export type DailyBrief = {
  date: string;
  storeName: string;
  managerName: string;
  yesterdayTarget: number;
  yesterdayActual: number;
  todayTarget: number;
  forecastRevenue: number;
  forecastGuestGap: number;
  forecastTableGap: number;
  currentRevenue: number | null;
  expectedRevenueNow: number | null;
  judgment: string;
  evidence: string[];
  nextRecheckAt: string;
  conversionBasis: string;
};

export type DailyReview = {
  targetRevenue: number;
  actualRevenue: number;
  closedActions: number;
  effectiveActions: string[];
  remainingItems: string[];
  conclusions: string[];
  tomorrowFirstAction: string;
  generated: boolean;
};

export type ManagerCapability = {
  id: "operations" | "customer" | "people" | "execution";
  label: string;
  value: number;
  evidence: string;
};

export type Notification = {
  id: string;
  role: RoleId;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  target: "today" | "action" | "request" | "strategy" | "review";
  entityId?: string;
};

export type RegionStore = {
  id: string;
  name: string;
  manager: string;
  guestGap: number;
  tableGap: number;
  forecastGap: number;
  unresolvedActions: number;
  pendingEvidence: number;
  helpUrgency: "none" | "normal" | "urgent";
};

export type RepeatedIssue = {
  id: string;
  title: string;
  affectedStores: number;
  affectedRegions: number;
  translatedImpact: string;
  templateId: string;
};

export type AuditEvent = {
  id: string;
  time: string;
  actor: string;
  event: string;
  entityId: string;
};

export type TerminalState = {
  schemaVersion: 1;
  role: RoleId;
  operatingMoment: OperatingMomentId;
  activeTabs: Record<RoleId, string>;
  brief: DailyBrief;
  signals: BusinessSignal[];
  decisions: DecisionCase[];
  templates: ActionTemplate[];
  actions: ActionInstance[];
  workRequests: WorkRequest[];
  evidence: Evidence[];
  approvals: ApprovalRecord[];
  benchmarks: BenchmarkSnapshot[];
  capabilities: ManagerCapability[];
  notifications: Notification[];
  regionStores: RegionStore[];
  repeatedIssues: RepeatedIssue[];
  dailyReview: DailyReview;
  meetingStage: 0 | 1 | 2 | 3 | 4;
  meetingTranscript: string[];
  meetingMissingItem: string;
  activity: AuditEvent[];
};
