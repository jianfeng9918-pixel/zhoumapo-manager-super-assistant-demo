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

export type MeetingAnalysis = {
  transcript: string[];
  extracted: Array<{ label: string; value: string }>;
  missingItem: string;
  generatedActions: string[];
};

export type KnowledgeMatch = {
  judgment: string;
  caseTitle: string;
  caseResult: string;
  source: string;
  actions: string[];
};

export interface BusinessDataAdapter {
  getInitialState(): TerminalState;
  getMetricDictionary(): Promise<MetricDefinition[]>;
  refreshSignals(): Promise<BusinessSignal[]>;
  getSnapshot(stage: OperatingStageId, state: TerminalState): Promise<OperatingSnapshot>;
  getLiveFrame(stage: OperatingStageId, state: TerminalState): Promise<LiveOperatingFrame>;
  subscribeLiveFrames(listener: (frame: LiveOperatingFrame) => void): () => void;
  buildClosingReview(state: TerminalState): Promise<DailyReview>;
}

export interface WorkflowAdapter {
  issueActions(actions: ActionInstance[]): Promise<Array<{ owner: string; status: "received" }>>;
  submitEvidence(evidence: Evidence): Promise<{ receiptId: string; receivedAt: string }>;
  submitWorkRequest(request: WorkRequest): Promise<{ receiptId: string; receivedAt: string }>;
  publishTemplate(template: ActionTemplate): Promise<{ receiptId: string; publishedAt: string }>;
}

export interface DecisionEngineAdapter {
  analyzeMeeting(): Promise<MeetingAnalysis>;
  inspectEvidence(evidence: Evidence): Promise<{ result: Evidence["aiResult"]; note: string }>;
  explainSignal(signal: BusinessSignal): Promise<{ summary: string; nextAction: string }>;
  judgeStage(snapshot: OperatingSnapshot): Promise<{ judgment: string; nextAction: string }>;
  recalculateGap(state: TerminalState): Promise<TerminalState["gapProgress"]>;
}

export interface KnowledgeAdapter {
  matchProblem(topic: "traffic" | "rating" | "people"): Promise<KnowledgeMatch>;
  matchCurrentCase(state: TerminalState): Promise<KnowledgeCase>;
  listCases(): Promise<KnowledgeCase[]>;
}

export interface ReportingAdapter {
  listReports(scope: ReportScope, state: TerminalState): Promise<OperatingReport[]>;
  getReport(reportId: ReportId, scope: ReportScope, state: TerminalState): Promise<OperatingReport>;
  getVisualReport(reportId: ReportId, scope: ReportScope, state: TerminalState): Promise<VisualReport>;
  answerQuestion(questionId: ReportQuestionId, state: TerminalState): Promise<ReportAnswer>;
  generateExport(
    reportId: ReportId,
    kind: ReportExport["kind"],
    state: TerminalState,
  ): Promise<Omit<ReportExport, "id" | "createdBy" | "approvalRecordId">>;
}

export interface VoiceInteractionAdapter {
  resolveIntent(session: VoiceSession, context: "today" | "data" | "tasks" | "academy"): Promise<VoiceResolution>;
}

export type OperatingAdapters = {
  business: BusinessDataAdapter;
  workflow: WorkflowAdapter;
  decision: DecisionEngineAdapter;
  knowledge: KnowledgeAdapter;
  reporting: ReportingAdapter;
  voice: VoiceInteractionAdapter;
};
