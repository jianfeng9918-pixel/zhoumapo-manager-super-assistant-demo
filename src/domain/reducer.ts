import type {
  ActionStatus,
  ApprovalRecord,
  Evidence,
  ReportExport,
  ReportId,
  RoleId,
  TerminalState,
  VoiceSession,
} from "./types";

export type TerminalAction =
  | { type: "switchRole"; role: RoleId }
  | { type: "setTab"; role: RoleId; tab: string }
  | { type: "setMoment"; moment: TerminalState["operatingMoment"] }
  | { type: "setStage"; stage: TerminalState["operatingStage"]; manual?: boolean }
  | { type: "setMeetingStage"; stage: TerminalState["meetingStage"]; transcript?: string[]; missingItem?: string }
  | { type: "completeLunchInspection"; evidence: Evidence }
  | { type: "confirmDinnerPlaybook"; approval: ApprovalRecord }
  | { type: "confirmMeeting"; approval: ApprovalRecord }
  | { type: "setActionStatus"; actionId: string; status: ActionStatus; result?: string; approval?: ApprovalRecord }
  | { type: "submitEvidence"; evidence: Evidence }
  | { type: "updateEvidenceAI"; evidenceId: string; result: Evidence["aiResult"]; note: string }
  | { type: "approveEvidence"; actionId: string; evidenceId: string; approval: ApprovalRecord }
  | { type: "returnEvidence"; actionId: string; evidenceId: string; approval: ApprovalRecord }
  | { type: "createWorkRequest"; requestId: string; approval: ApprovalRecord }
  | { type: "replyWorkRequest"; requestId: string; reply: string; approval: ApprovalRecord; escalate?: boolean; fromHQ?: boolean }
  | { type: "publishTemplate"; templateId: string; steps: string[]; approval: ApprovalRecord }
  | { type: "markNotification"; notificationId: string }
  | { type: "addNotification"; notification: TerminalState["notifications"][number] }
  | { type: "addReportAction"; reportId: ReportId; actionId: string; approval: ApprovalRecord }
  | { type: "createReportExport"; report: ReportExport; approval: ApprovalRecord }
  | { type: "setVoiceSession"; session: VoiceSession }
  | { type: "completeReview"; approval: ApprovalRecord }
  | { type: "reset"; state: TerminalState };

function appendActivity(
  state: TerminalState,
  actor: string,
  event: string,
  entityId: string,
): TerminalState["activity"] {
  return [
    {
      id: `audit-${state.activity.length + 1}`,
      time: "8月11日",
      actor,
      event,
      entityId,
    },
    ...state.activity,
  ];
}

function withApproval(state: TerminalState, approval?: ApprovalRecord) {
  return approval ? [...state.approvals, approval] : state.approvals;
}

export function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case "switchRole":
      return { ...state, role: action.role };
    case "setTab":
      return { ...state, activeTabs: { ...state.activeTabs, [action.role]: action.tab } };
    case "setMoment":
      return applyStage(state, momentToStage(action.moment));
    case "setStage":
      return applyStage(state, action.stage);
    case "setMeetingStage":
      return {
        ...state,
        meetingStage: action.stage,
        meetingTranscript: action.transcript ?? state.meetingTranscript,
        meetingMissingItem: action.missingItem ?? state.meetingMissingItem,
      };
    case "setVoiceSession":
      return { ...state, voiceSession: action.session };
    case "completeLunchInspection":
      return applyStage({
        ...state,
        evidence: [...state.evidence, action.evidence],
        actionEffects: state.actionEffects.map((item) =>
          item.actionId === "lunch-inspection"
            ? {
                ...item,
                executedAt: "8月11日 12:05",
                evidenceIds: [...item.evidenceIds, action.evidence.id],
                status: "measuring" as const,
                verdict: "待实际复查" as const,
                measured: { ...item.measured, note: "照片确认传菜口等待偏久；晚市20:30复查是否重复" },
              }
            : item,
        ),
        growthEvidence: state.growthEvidence.map((item) =>
          item.id === "growth-evidence" ? { ...item, earned: true, evidenceId: action.evidence.id } : item,
        ),
        notifications: [
          {
            id: "notice-lunch-inspection",
            role: "storeManager",
            title: "午市现场已识别1个问题",
            body: "前厅正常；传菜口等待偏久，已带入晚市剧本。",
            createdAt: "12:05",
            read: false,
            target: "action",
          },
          ...state.notifications,
        ],
        activity: appendActivity(state, action.evidence.submittedBy, "完成午市拍照巡检", "lunch-inspection"),
      }, "afternoonDecision");
    case "confirmDinnerPlaybook":
      return applyStage({
        ...state,
        approvals: [...state.approvals, action.approval],
        activity: appendActivity(state, action.approval.confirmedBy, "确认晚市顾客追回剧本", "decision-dinner-gap"),
      }, "dinnerRecovery");
    case "confirmMeeting": {
      const releasedIds = new Set(["member-recall", "reservation-followup", "dinner-experience"]);
      return applyStage({
        ...state,
        meetingStage: 4,
        approvals: [...state.approvals, action.approval],
        decisions: state.decisions.map((decision) =>
          decision.id === "decision-dinner-gap"
            ? { ...decision, status: "confirmed" as const }
            : decision,
        ),
        actions: state.actions.map((item) => {
          if (item.id === "morning-meeting") {
            return {
              ...item,
              status: "closed" as const,
              released: true,
              result: "晨会已确认，3项行动已正式下发",
              approvalRecordIds: [...item.approvalRecordIds, action.approval.id],
            };
          }
          if (releasedIds.has(item.id)) {
            return { ...item, status: "pendingConfirmation" as const, released: true };
          }
          return item;
        }),
        notifications: [
          {
            id: "notice-meeting-receipt",
            role: "storeManager",
            title: "3位负责人已接收晨会行动",
            body: "王小丽、李主管、黄店长均已回执。",
            createdAt: "08:49",
            read: false,
            target: "action",
          },
          ...state.notifications,
        ],
        activity: appendActivity(state, action.approval.confirmedBy, "人工确认晨会并下发3项行动", "morning-meeting"),
      }, "lunchReview");
    }
    case "setActionStatus": {
      const approval = action.approval;
      return {
        ...state,
        approvals: withApproval(state, approval),
        actions: state.actions.map((item) =>
          item.id === action.actionId
            ? {
                ...item,
                status: action.status,
                result: action.result ?? item.result,
                approvalRecordIds: approval
                  ? [...item.approvalRecordIds, approval.id]
                  : item.approvalRecordIds,
              }
            : item,
        ),
        activity: appendActivity(
          state,
          approval?.confirmedBy ?? "AI经营助手",
          `行动状态更新为 ${action.status}`,
          action.actionId,
        ),
      };
    }
    case "submitEvidence":
      return {
        ...state,
        evidence: [...state.evidence, action.evidence],
        actions: state.actions.map((item) =>
          item.id === action.evidence.actionId
            ? {
                ...item,
                status: "aiReview" as const,
                evidenceIds: [...item.evidenceIds, action.evidence.id],
              }
            : item,
        ),
        activity: appendActivity(state, action.evidence.submittedBy, "提交行动证据", action.evidence.actionId),
      };
    case "updateEvidenceAI":
      return {
        ...state,
        evidence: state.evidence.map((item) =>
          item.id === action.evidenceId
            ? { ...item, aiResult: action.result, aiNote: action.note }
            : item,
        ),
        actions: state.actions.map((item) =>
          item.evidenceIds.includes(action.evidenceId)
            ? { ...item, status: action.result === "passed" ? "pendingHumanReview" as const : "returned" as const }
            : item,
        ),
      };
    case "approveEvidence": {
      const approvedAction = state.actions.find((item) => item.id === action.actionId);
      const isRecall = action.actionId === "member-recall";
      const isReservation = action.actionId === "reservation-followup";
      const impact = approvedAction?.impact;
      const nextRecoveredGuests = Math.min(
        state.gapProgress.initialGuests,
        state.gapProgress.recoveredGuests + (impact?.recoveredGuests ?? 0),
      );
      const nextRecoveredTables = Math.min(
        state.gapProgress.initialTables,
        state.gapProgress.recoveredTables + (impact?.recoveredTables ?? 0),
      );
      const nextForecast = Math.min(
        98000,
        state.gapProgress.forecastAfter + (impact?.forecastLift ?? 0),
      );
      const nextGuestGap = Math.max(0, state.gapProgress.initialGuests - nextRecoveredGuests);
      const nextTableGap = Math.max(0, state.gapProgress.initialTables - nextRecoveredTables);
      const changesBusinessGap = isRecall || isReservation;
      const nextState: TerminalState = {
        ...state,
        approvals: [...state.approvals, action.approval],
        evidence: state.evidence.map((item) =>
          item.id === action.evidenceId ? { ...item, aiResult: "passed" as const } : item,
        ),
        actions: state.actions.map((item) =>
          item.id === action.actionId
            ? {
                ...item,
                status: "closed" as const,
                result: isRecall
                  ? "触达180位会员，新增预约12桌、31位顾客"
                  : isReservation
                    ? "跟进10桌未确认预约，确认7桌、18位顾客"
                    : "区域经理已确认闭环",
                impact: item.impact ? { ...item.impact, status: "verified" as const } : item.impact,
                approvalRecordIds: [...item.approvalRecordIds, action.approval.id],
              }
            : item,
        ),
        brief: changesBusinessGap
          ? {
              ...state.brief,
              forecastRevenue: nextForecast,
              forecastGuestGap: nextGuestGap,
              forecastTableGap: nextTableGap,
              judgment: isRecall
                ? "会员召回先补回31位顾客，接着追10桌未确认预约。"
                : "两个动作共补回49位顾客，接下来守住晚市体验。",
              evidence: isRecall
                ? ["召回新增12桌 · 31位顾客", `预计收官升至 ¥${nextForecast.toLocaleString("zh-CN")}`, `还差${nextTableGap}桌 · ${nextGuestGap}位顾客`]
                : ["两项行动共补回19桌", "预计收官升至 ¥98,000", "还差6桌 · 16位顾客"],
              nextRecheckAt: isRecall ? "17:10" : "18:30",
            }
          : state.brief,
        gapProgress: changesBusinessGap
          ? {
              ...state.gapProgress,
              recoveredGuests: nextRecoveredGuests,
              recoveredTables: nextRecoveredTables,
              remainingGuests: nextGuestGap,
              remainingTables: nextTableGap,
              forecastAfter: nextForecast,
            }
          : state.gapProgress,
        growthEvidence: state.growthEvidence.map((item) =>
          changesBusinessGap && item.actionId === action.actionId
            ? { ...item, earned: true, evidenceId: action.evidenceId, trend: "+1次有效方法" }
            : item,
        ),
        actionEffects: state.actionEffects.map((item) => {
          if (!changesBusinessGap || item.actionId !== action.actionId) return item;
          return {
            ...item,
            executedAt: action.actionId === "member-recall" ? "8月11日 17:02" : "8月11日 17:04",
            evidenceIds: [...item.evidenceIds, action.evidenceId],
            status: "measuring" as const,
            verdict: "待实际复查" as const,
            measured: {
              ...item.measured,
              guests: impact?.recoveredGuests ?? 0,
              tables: impact?.recoveredTables ?? 0,
              actualRevenue: 0,
              note: "已确认新增预约；实际营业额仍为0，21:30核对真实到店",
            },
          };
        }),
        regionStores: state.regionStores.map((store) =>
          changesBusinessGap && store.id === "sansheng"
            ? {
                ...store,
                guestGap: nextGuestGap,
                tableGap: nextTableGap,
                forecastGap: Math.max(2000, 100000 - nextForecast),
                unresolvedActions: Math.max(1, store.unresolvedActions - 1),
                pendingEvidence: Math.max(0, store.pendingEvidence - 1),
              }
            : store,
        ),
        notifications: [
          {
            id: `notice-approved-${action.actionId}`,
            role: "storeManager",
            title: "区域经理已确认行动闭环",
            body: approvedAction?.title ?? "行动证据已通过人工验收",
            createdAt: "17:08",
            read: false,
            target: "action",
            entityId: action.actionId,
          },
          ...state.notifications,
        ],
        activity: appendActivity(state, action.approval.confirmedBy, "人工验收通过", action.actionId),
      };
      if (isRecall) return applyStage(nextState, "dinnerRecovery");
      if (isReservation) return applyStage(nextState, "dinnerExperience");
      if (action.actionId === "dinner-experience") return applyStage(nextState, "closingReview");
      return nextState;
    }
    case "returnEvidence":
      return {
        ...state,
        approvals: [...state.approvals, action.approval],
        actions: state.actions.map((item) =>
          item.id === action.actionId
            ? {
                ...item,
                status: "returned" as const,
                result: "需补充一张可看清会员触达人数的回执",
                approvalRecordIds: [...item.approvalRecordIds, action.approval.id],
              }
            : item,
        ),
        notifications: [
          {
            id: `notice-returned-${action.actionId}`,
            role: "storeManager",
            title: "证据被退回，请补充",
            body: "林阳：请补一张可看清触达人数的回执。",
            createdAt: "17:08",
            read: false,
            target: "action",
            entityId: action.actionId,
          },
          ...state.notifications,
        ],
        activity: appendActivity(state, action.approval.confirmedBy, "退回证据并要求补充", action.actionId),
      };
    case "createWorkRequest":
      return {
        ...state,
        approvals: [...state.approvals, action.approval],
        workRequests: state.workRequests.map((request) =>
          request.id === action.requestId
            ? {
                ...request,
                status: "pendingRegional" as const,
                createdAt: "16:22",
                approvalRecordIds: [...request.approvalRecordIds, action.approval.id],
              }
            : request,
        ),
        regionStores: state.regionStores.map((store) => store.id === "sansheng" ? { ...store, helpUrgency: "urgent" as const } : store),
        notifications: [
          {
            id: "notice-new-work-request",
            role: "regionalManager",
            title: "黄店长申请晚市曝光支持",
            body: "已带入顾客缺口、门店行动和预计影响。",
            createdAt: "16:22",
            read: false,
            target: "request",
            entityId: action.requestId,
          },
          ...state.notifications,
        ],
        activity: appendActivity(state, action.approval.confirmedBy, "人工确认并发送资源申请", action.requestId),
      };
    case "replyWorkRequest":
      return {
        ...state,
        approvals: [...state.approvals, action.approval],
        workRequests: state.workRequests.map((request) =>
          request.id === action.requestId
            ? {
                ...request,
                status: action.escalate ? "escalatedToHQ" as const : action.fromHQ ? "hqReplied" as const : "regionalReplied" as const,
                reply: action.reply,
                approvalRecordIds: [...request.approvalRecordIds, action.approval.id],
                targetRole: action.escalate ? "headquarters" as const : request.targetRole,
              }
            : request,
        ),
        regionStores: state.regionStores.map((store) => store.id === "sansheng" ? { ...store, helpUrgency: action.escalate ? "urgent" as const : "normal" as const } : store),
        actions: action.escalate
          ? state.actions
          : state.actions.map((item) =>
              item.id === "regional-support"
                ? { ...item, released: true, status: "pendingConfirmation" as const }
                : item,
            ),
        notifications: [
          {
            id: action.escalate ? "notice-hq-request" : action.fromHQ ? "notice-hq-reply" : "notice-regional-reply",
            role: action.escalate ? "headquarters" : "storeManager",
            title: action.escalate ? "区域已转交总部市场支持" : action.fromHQ ? "总部已回复资源方案" : "林阳已回复支持方案",
            body: action.reply,
            createdAt: "16:28",
            read: false,
            target: "request",
            entityId: action.requestId,
          },
          ...state.notifications,
        ],
        activity: appendActivity(state, action.approval.confirmedBy, action.escalate ? "转交总部职能" : action.fromHQ ? "总部回复资源方案" : "回复门店支持方案", action.requestId),
      };
    case "publishTemplate": {
      const current = state.templates.find((item) => item.id === action.templateId);
      const nextVersion = (current?.version ?? 1) + 1;
      return {
        ...state,
        approvals: [...state.approvals, action.approval],
        templates: state.templates.map((item) =>
          item.id === action.templateId
            ? {
                ...item,
                version: nextVersion,
                steps: action.steps,
                status: "published" as const,
                publishedAt: "8月11日 17:10",
              }
            : item,
        ),
        knowledgeCases: state.knowledgeCases.map((item) =>
          item.id === "case-member-recall"
            ? { ...item, version: nextVersion, reviewStatus: "published" as const, sourceNote: `总部市场中心人工发布 v${nextVersion}.0 · 演示数据` }
            : item,
        ),
        actions: state.actions.map((item) =>
          item.templateId === action.templateId && item.status !== "closed"
            ? { ...item, templateVersion: nextVersion }
            : item,
        ),
        notifications: [
          {
            id: "notice-template-published",
            role: "storeManager",
            title: `总部已发布晚市召回策略 v${nextVersion}.0`,
            body: "已自动带入当前行动，旧版本及审批记录仍保留。",
            createdAt: "17:10",
            read: false,
            target: "strategy",
            entityId: action.templateId,
          },
          ...state.notifications,
        ],
        activity: appendActivity(state, action.approval.confirmedBy, `人工确认发布策略 v${nextVersion}.0`, action.templateId),
      };
    }
    case "markNotification":
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.notificationId ? { ...item, read: true } : item,
        ),
      };
    case "addNotification":
      return { ...state, notifications: [action.notification, ...state.notifications] };
    case "addReportAction": {
      const target = state.actions.find((item) => item.id === action.actionId);
      if (!target) return state;
      return {
        ...state,
        approvals: [...state.approvals, action.approval],
        actions: state.actions.map((item) =>
          item.id === action.actionId
            ? {
                ...item,
                released: true,
                status: item.status === "closed" ? item.status : "pendingConfirmation" as const,
                approvalRecordIds: [...item.approvalRecordIds, action.approval.id],
              }
            : item,
        ),
        notifications: [
          {
            id: `notice-report-action-${action.reportId}`,
            role: "storeManager",
            title: "经营报表已生成一项行动",
            body: `${target.title}已加入今日经营剧本，仍需店长人工确认执行。`,
            createdAt: "08:32",
            read: false,
            target: "action",
            entityId: action.actionId,
          },
          ...state.notifications,
        ],
        activity: appendActivity(state, action.approval.confirmedBy, `从报表${action.reportId}加入经营行动`, action.actionId),
      };
    }
    case "createReportExport":
      return {
        ...state,
        approvals: [...state.approvals, action.approval],
        reportExports: [action.report, ...state.reportExports],
        activity: appendActivity(state, action.report.createdBy, `人工确认生成${action.report.title}`, action.report.id),
      };
    case "completeReview":
      return applyStage({
        ...state,
        approvals: [...state.approvals, action.approval],
        dailyReview: { ...state.dailyReview, generated: true },
        actionEffects: state.actionEffects.map((item) =>
          item.actionId === "member-recall" && item.status === "measuring"
            ? {
                ...item,
                status: "verified" as const,
                verdict: "已验证有效" as const,
                reusable: true,
                recheckAt: "已完成",
                measured: {
                  guests: 23,
                  tables: 9,
                  actualRevenue: 3560,
                  note: "21:30通过POS模拟回链确认9桌、23位顾客实际到店",
                },
              }
            : item.actionId === "lunch-inspection" && item.status === "measuring"
              ? {
                  ...item,
                  status: "verified" as const,
                  verdict: "已验证有效" as const,
                  reusable: true,
                  recheckAt: "已完成",
                  measured: { ...item.measured, note: "晚市未重复出现等菜投诉；不单独计算营业收入" },
                }
              : item,
        ),
        actions: state.actions.map((item) =>
          item.id === "closing-review"
            ? {
                ...item,
                released: true,
                status: "closed" as const,
                result: "今日复盘已确认，明日第一件事已生成",
                approvalRecordIds: [...item.approvalRecordIds, action.approval.id],
              }
            : item,
        ),
        activity: appendActivity(state, action.approval.confirmedBy, "人工确认今日收官复盘", "closing-review"),
      }, "completed");
    case "reset":
      return action.state;
    default:
      return state;
  }
}

function momentToStage(moment: TerminalState["operatingMoment"]): TerminalState["operatingStage"] {
  if (moment === "preOpen") return "morningBrief";
  if (moment === "lunch") return "lunchReview";
  if (moment === "afternoon") return "afternoonDecision";
  if (moment === "dinner") return "dinnerRecovery";
  return "closingReview";
}

function stageToMoment(stage: TerminalState["operatingStage"]): TerminalState["operatingMoment"] {
  if (stage === "morningBrief" || stage === "morningMeeting") return "preOpen";
  if (stage === "lunchReview") return "lunch";
  if (stage === "afternoonDecision") return "afternoon";
  if (stage === "dinnerRecovery" || stage === "dinnerExperience") return "dinner";
  return "closing";
}

function applyStage(state: TerminalState, stage: TerminalState["operatingStage"]): TerminalState {
  const snapshot = state.snapshots.find((item) => item.stage === stage)
    ?? state.snapshots.find((item) => item.stage === "closingReview")
    ?? state.snapshots[0];
  const completedCritical = state.actions.filter((item) =>
    ["member-recall", "reservation-followup", "dinner-experience"].includes(item.id) && item.status === "closed",
  ).length;
  const supportBlocked = state.workRequests.some((item) => item.status === "pendingRegional" || item.status === "escalatedToHQ");
  const fullOutcome = completedCritical >= 3 && state.gapProgress.remainingGuests <= 16 && !supportBlocked;
  const closingStage = stage === "closingReview" || stage === "completed";
  const closingActual = fullOutcome ? 100600 : 94100;
  const actualRevenue = closingStage ? closingActual : snapshot.currentRevenue;
  const forecastRevenue = state.gapProgress.recoveredGuests > 0
    ? Math.max(snapshot.forecastRevenue, state.gapProgress.forecastAfter)
    : snapshot.forecastRevenue;
  const guestGap = state.gapProgress.recoveredGuests > 0 ? state.gapProgress.remainingGuests : snapshot.guestGap;
  const tableGap = state.gapProgress.recoveredTables > 0 ? state.gapProgress.remainingTables : snapshot.tableGap;
  const recallOnly = stage === "dinnerRecovery" && state.gapProgress.recoveredGuests === 31;
  const stageJudgment = recallOnly
    ? "会员召回先补回31位顾客，接着追10桌未确认预约。"
    : snapshot.judgment;
  const stageEvidence = recallOnly
    ? ["召回新增12桌 · 31位顾客", "预计收官升至 ¥95,800", "还差13桌 · 34位顾客"]
    : snapshot.evidence;
  const transitions = state.gapProgress.recoveredGuests > 0
    ? [
        { id: "forecast-lift", label: "预计收官", before: 92000, after: forecastRevenue, unit: "元" as const, kind: "forecast" as const, trigger: "会员召回与预约跟进新增预约" },
        { id: "guest-gap", label: "顾客缺口", before: 65, after: guestGap, unit: "位" as const, kind: "measured" as const, trigger: "预约结果已确认，实际到店仍待收官复查" },
      ]
    : [{ id: `live-${stage}`, label: "当前经营", before: snapshot.expectedRevenueNow, after: actualRevenue, unit: "元" as const, kind: "actual" as const, trigger: actualRevenue === null ? "营业前不展示实时收入" : "POS模拟数据刚刚更新" }];
  return {
    ...state,
    operatingStage: stage,
    operatingMoment: stageToMoment(stage),
    liveFrame: {
      stage,
      time: snapshot.time,
      updatedAt: `${snapshot.time}:00`,
      freshnessLabel: snapshot.time === "08:30" ? "08:30已核对" : "刚刚更新",
      actualRevenue,
      expectedRevenueNow: snapshot.expectedRevenueNow,
      forecastRevenue,
      guestGap,
      tableGap,
      judgment: closingStage ? (fullOutcome ? "今天补回了晚市顾客，实际经营结果已经确认。" : "今天还有行动没有闭环，先按真实结果复盘。") : stageJudgment,
      nextRecheckAt: stage === "completed" ? "明日08:40" : recallOnly ? "17:10" : snapshot.nextRecheckAt,
      transitions,
    },
    metricTransitions: transitions,
    brief: {
      ...state.brief,
      currentRevenue: actualRevenue,
      expectedRevenueNow: snapshot.expectedRevenueNow,
      forecastRevenue,
      forecastGuestGap: guestGap,
      forecastTableGap: tableGap,
      judgment: closingStage
        ? fullOutcome
          ? "今天补回了晚市顾客，实际经营结果已经确认。"
          : "今天还有行动没有闭环，先按真实结果复盘。"
        : stageJudgment,
      evidence: stageEvidence,
      nextRecheckAt: stage === "completed" ? "明日08:40" : recallOnly ? "17:10" : snapshot.nextRecheckAt,
    },
    dailyReview: closingStage
      ? {
          ...state.dailyReview,
          actualRevenue: closingActual,
          outcome: fullOutcome ? "improved" : "partial",
          conclusions: fullOutcome
            ? state.dailyReview.conclusions
            : [
                "会员召回尚未完成区域验收，不能算作已追回顾客。",
                "今日实际收官低于目标，预测改善没有当作真实收入。",
                "明早先完成未闭环证据，再复盘晚市到店。",
              ],
          remainingItems: fullOutcome ? state.dailyReview.remainingItems : ["会员召回证据待验收", "晚市现场体验待回传"],
          tomorrowFirstAction: fullOutcome ? "08:40复盘会员召回到店率" : "08:35补齐昨日未闭环证据",
        }
      : state.dailyReview,
  };
}

export const actionStatusLabel: Record<ActionStatus, string> = {
  detected: "发现问题",
  aiSuggested: "AI建议",
  pendingConfirmation: "待人工确认",
  inProgress: "执行中",
  pendingEvidence: "待回传",
  aiReview: "AI初验",
  pendingHumanReview: "待人工验收",
  closed: "已闭环",
  returned: "退回补充",
  helpRequested: "请求帮助",
  cancelled: "已取消",
};
