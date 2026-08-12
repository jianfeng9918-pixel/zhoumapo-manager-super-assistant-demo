export type RoleId = "storeManager" | "regionalManager" | "headquarters";

export type OperatingMomentId = "preOpen" | "lunch" | "afternoon" | "dinner" | "closing";

export type OperatingStageId =
  | "morningBrief"
  | "morningMeeting"
  | "lunchReview"
  | "afternoonDecision"
  | "dinnerRecovery"
  | "dinnerExperience"
  | "closingReview"
  | "completed";

export type OperatingSnapshot = {
  stage: OperatingStageId;
  time: string;
  currentRevenue: number | null;
  expectedRevenueNow: number | null;
  forecastRevenue: number;
  actualRevenue: number | null;
  guestGap: number;
  tableGap: number;
  judgment: string;
  evidence: string[];
  nextRecheckAt: string;
};

export type MetricTransition = {
  id: string;
  label: string;
  before: number | null;
  after: number | null;
  unit: "元" | "桌" | "位" | "份" | "%";
  kind: "actual" | "forecast" | "measured";
  trigger: string;
};

export type LiveOperatingFrame = {
  stage: OperatingStageId;
  time: string;
  updatedAt: string;
  freshnessLabel: string;
  actualRevenue: number | null;
  expectedRevenueNow: number | null;
  forecastRevenue: number;
  guestGap: number;
  tableGap: number;
  judgment: string;
  nextRecheckAt: string;
  transitions: MetricTransition[];
};

export type VoiceIntent =
  | "askBusiness"
  | "startMeeting"
  | "createAction"
  | "submitEvidence"
  | "requestHelp"
  | "generateReport";

export type VoiceSession = {
  id: string;
  status: "idle" | "holding" | "processing" | "ready" | "cancelled";
  startedAt: number | null;
  durationMs: number;
  transcript: string;
  intent: VoiceIntent | null;
  confidence: number;
  cancelled: boolean;
};

export type VoiceResolution = {
  transcript: string;
  intent: VoiceIntent;
  confidence: number;
  summary: string;
  confirmationLabel: string;
  targetId: string;
  requiresConfirmation: true;
  draft: VoiceActionDraft;
};

export type VoiceActionDraft = {
  id: string;
  title: string;
  context: "today" | "data" | "tasks" | "academy" | "operations" | "mine";
  targetId: string;
  prefilledFields: Array<{ label: string; value: string }>;
  confirmed: boolean;
};

export type StoryMedia = {
  id: string;
  src: string;
  alt: string;
  usage: "meeting" | "inspection" | "product" | "knowledge" | "evidence";
  source: string;
  demo: boolean;
};

export type GapProgress = {
  initialGuests: number;
  initialTables: number;
  recoveredGuests: number;
  recoveredTables: number;
  remainingGuests: number;
  remainingTables: number;
  forecastBefore: number;
  forecastAfter: number;
};

export type ActionImpact = {
  actionId: string;
  recoveredGuests: number;
  recoveredTables: number;
  forecastLift: number;
  actualRevenueLift: 0;
  measuredAt: string;
  status: "expected" | "measured" | "verified";
};

export type KnowledgeCase = {
  id: string;
  topic: "traffic" | "rating" | "people" | "product" | "support";
  title: string;
  judgment: string;
  result: string;
  sourceType: "总部SOP" | "优秀门店案例" | "历史复盘" | "待确认口径";
  sourceNote: string;
  applicableStages: OperatingStageId[];
  applicableWhen: string[];
  disabledWhen: string[];
  evidenceRequired: string[];
  actions: string[];
  reviewStatus: "published" | "draft" | "pendingVerification";
  version: number;
  imageUrl?: string;
  imageAlt?: string;
};

export type GrowthEvidence = {
  id: string;
  label: string;
  trend: string;
  reason: string;
  actionId: string;
  evidenceId?: string;
  earned: boolean;
};

export type WorkbenchShortcutId = "meeting" | "inspection" | "procurement" | "soldOut";

export type WorkbenchShortcut = {
  id: WorkbenchShortcutId;
  title: string;
  note: string;
  status: "ready" | "attention" | "done";
  badge?: string;
};

export type HomeWorkbench = {
  updatedAt: string;
  judgment: string;
  taskSummary: { completed: number; total: number; pendingEvidence: number };
  shortcuts: WorkbenchShortcut[];
  dynamics: Array<{
    id: string;
    type: "reputation" | "inventory" | "receipt";
    title: string;
    note: string;
    time: string;
    tone: "risk" | "opportunity" | "result";
  }>;
  recommendedLearningId: string;
};

export type LearningCategoryId =
  | "growth"
  | "traffic"
  | "product"
  | "inventory"
  | "experience"
  | "team";

export type LearningCategory = {
  id: LearningCategoryId;
  title: string;
  subtitle: string;
  assetIds: string[];
};

export type LearningPath = {
  id: string;
  title: string;
  subtitle: string;
  assetIds: string[];
  accent: "red" | "ai" | "amber";
};

export type LearningAsset = {
  id: string;
  categoryId: LearningCategoryId;
  title: string;
  solves: string;
  duration: string;
  format: "图文" | "短视频" | "操作演示";
  media: StoryMedia;
  steps: [string, string, string];
  quiz: {
    question: string;
    options: [string, string];
    correctIndex: 0 | 1;
  };
  source: "总部SOP" | "优秀门店案例" | "历史复盘" | "系统操作";
  version: string;
  scope: string;
  practiceTarget: "meeting" | "inspection" | "procurement" | "soldOut" | "playbook" | "tasks";
};

export type LearningProgress = {
  assetId: string;
  percent: number;
  quizPassed: boolean;
  completed: boolean;
  bookmarked: boolean;
  updatedAt: string;
};

export type StoreOperationKind = "procurement" | "soldOut";

export type StoreOperationFlow = {
  id: string;
  kind: StoreOperationKind;
  title: string;
  alert: string;
  step: 0 | 1 | 2 | 3 | 4 | 5;
  status: "alert" | "draft" | "confirmed" | "submitted" | "received" | "closed";
  item: string;
  quantity: string;
  costImpact: string;
  channelReceipts: Array<{ name: string; status: "pending" | "synced" | "restored" }>;
  evidenceUrl?: string;
  updatedAt: string;
};

export type ManagerWorkspace = {
  managerName: string;
  storeName: string;
  starLevel: 2;
  nextStarLevel: 3;
  todayTarget: number;
  monthlyMethods: string[];
  promotionConditions: Array<{ label: string; current: string; target: string; met: boolean }>;
};

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
  impact?: ActionImpact;
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
  inspected?: {
    cleanliness?: string;
    staffing?: string;
    waitingRisk?: string;
  };
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
  outcome: "pending" | "improved" | "partial";
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

export type ReportId =
  | "today"
  | "sevenDay"
  | "month"
  | "traffic"
  | "product"
  | "reputation"
  | "member"
  | "inventory"
  | "people"
  | "actionEffect";

export type ReportScope = "store" | "region" | "headquarters";
export type ReportTone = "neutral" | "risk" | "opportunity" | "result" | "ai";

export type ReportDataPoint = {
  label: string;
  value: number;
  benchmark?: number;
  unit: "元" | "桌" | "位" | "份" | "条" | "%";
};

export type OperatingReport = {
  id: ReportId;
  scope: ReportScope;
  title: string;
  period: string;
  question: string;
  conclusion: string;
  hero: {
    label: string;
    value: string;
    note: string;
    tone: ReportTone;
  };
  evidence: Array<{ label: string; value: string; note: string; tone: ReportTone }>;
  series: ReportDataPoint[];
  reasonChain: string[];
  source: string;
  updatedAt: string;
  confidence: number;
  recheckAt: string;
  conversionBasis?: string;
  recommendedActionId?: string;
  recommendedActionTitle?: string;
};

export type VisualReport = OperatingReport & {
  visualMode: "progress" | "bars" | "funnel" | "beforeAfter";
  media?: StoryMedia;
  changeNote: string;
  segments: Array<{
    label: string;
    value: string;
    ratio: number;
    tone: ReportTone;
  }>;
};

export type ReportQuestionId = "canReachTarget" | "whyGuestsLow" | "whichDish" | "whichActionWorked";

export type ReportAnswer = {
  questionId: ReportQuestionId;
  question: string;
  answer: string;
  evidence: string[];
  reportId: ReportId;
  nextAction: string;
  recommendedActionId?: string;
};

export type ActionEffectRecord = {
  id: string;
  actionId: string;
  title: string;
  problem: string;
  owner: string;
  executedAt: string;
  expected: {
    guests: number;
    tables: number;
    forecastLift: number;
  };
  measured: {
    guests: number;
    tables: number;
    actualRevenue: number;
    note: string;
  };
  evidenceIds: string[];
  status: "forecast" | "measuring" | "verified";
  verdict: "待执行" | "待实际复查" | "已验证有效" | "证据不足";
  reusable: boolean;
  recheckAt: string;
  source: string;
};

export type ReportExport = {
  id: string;
  reportId: ReportId;
  kind: "longImage" | "dailyBrief" | "weeklyReview" | "voiceBrief";
  title: string;
  summary: string;
  status: "ready";
  createdAt: string;
  createdBy: string;
  approvalRecordId: string;
};

export type AuditEvent = {
  id: string;
  time: string;
  actor: string;
  event: string;
  entityId: string;
};

export type TerminalState = {
  schemaVersion: 5;
  role: RoleId;
  operatingMoment: OperatingMomentId;
  operatingStage: OperatingStageId;
  snapshots: OperatingSnapshot[];
  gapProgress: GapProgress;
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
  knowledgeCases: KnowledgeCase[];
  growthEvidence: GrowthEvidence[];
  notifications: Notification[];
  regionStores: RegionStore[];
  repeatedIssues: RepeatedIssue[];
  reports: OperatingReport[];
  actionEffects: ActionEffectRecord[];
  reportExports: ReportExport[];
  liveFrame: LiveOperatingFrame;
  metricTransitions: MetricTransition[];
  storyMedia: StoryMedia[];
  voiceSession: VoiceSession;
  learningProgress: LearningProgress[];
  storeOperations: StoreOperationFlow[];
  managerWorkspace: ManagerWorkspace;
  dailyReview: DailyReview;
  meetingStage: 0 | 1 | 2 | 3 | 4;
  meetingTranscript: string[];
  meetingMissingItem: string;
  activity: AuditEvent[];
};
