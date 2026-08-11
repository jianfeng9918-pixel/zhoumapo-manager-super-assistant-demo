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
  buildClosingReview(): Promise<DailyReview>;
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
}

export interface KnowledgeAdapter {
  matchProblem(topic: "traffic" | "rating" | "people"): Promise<KnowledgeMatch>;
}

export type OperatingAdapters = {
  business: BusinessDataAdapter;
  workflow: WorkflowAdapter;
  decision: DecisionEngineAdapter;
  knowledge: KnowledgeAdapter;
};
