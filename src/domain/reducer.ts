import type {
  ActionStatus,
  ApprovalRecord,
  Evidence,
  RoleId,
  TerminalState,
} from "./types";

export type TerminalAction =
  | { type: "switchRole"; role: RoleId }
  | { type: "setTab"; role: RoleId; tab: string }
  | { type: "setMoment"; moment: TerminalState["operatingMoment"] }
  | { type: "setMeetingStage"; stage: TerminalState["meetingStage"]; transcript?: string[]; missingItem?: string }
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
      return { ...state, operatingMoment: action.moment };
    case "setMeetingStage":
      return {
        ...state,
        meetingStage: action.stage,
        meetingTranscript: action.transcript ?? state.meetingTranscript,
        meetingMissingItem: action.missingItem ?? state.meetingMissingItem,
      };
    case "confirmMeeting": {
      const releasedIds = new Set(["member-recall", "reservation-followup", "dinner-experience"]);
      return {
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
      };
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
      return {
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
                result: isRecall ? "触达180位会员，新增预约19桌、49位顾客" : "区域经理已确认闭环",
                approvalRecordIds: [...item.approvalRecordIds, action.approval.id],
              }
            : item,
        ),
        brief: isRecall
          ? {
              ...state.brief,
              forecastRevenue: 98000,
              forecastGuestGap: 16,
              forecastTableGap: 6,
              judgment: "会员召回已补回19桌，接下来守住晚市体验。",
              evidence: ["会员召回新增19桌预约", "预计收官由 ¥92,000 升至 ¥98,000"],
              nextRecheckAt: "18:30",
            }
          : state.brief,
        capabilities: state.capabilities.map((item) =>
          isRecall && item.id === "customer"
            ? { ...item, value: item.value + 1, evidence: "会员召回经区域经理验收闭环" }
            : item,
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
    case "completeReview":
      return {
        ...state,
        approvals: [...state.approvals, action.approval],
        dailyReview: { ...state.dailyReview, generated: true },
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
      };
    case "reset":
      return action.state;
    default:
      return state;
  }
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
