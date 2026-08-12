import type { ActionInstance, OperatingSnapshot, RoleId, TerminalState } from "./types";

export function getAction(state: TerminalState, id: string) {
  return state.actions.find((item) => item.id === id);
}

export function getEvidenceForAction(state: TerminalState, actionId: string) {
  return state.evidence.filter((item) => item.actionId === actionId);
}

export function getUnreadCount(state: TerminalState, role: RoleId) {
  return state.notifications.filter((item) => item.role === role && !item.read).length;
}

export function getCurrentStoreAction(state: TerminalState): ActionInstance {
  const orderedIds = [
    "morning-meeting",
    "member-recall",
    "reservation-followup",
    "dinner-experience",
    "closing-review",
  ];
  return orderedIds
    .map((id) => getAction(state, id))
    .find((item) => item && item.status !== "closed") ?? state.actions[0];
}

export function getCurrentSnapshot(state: TerminalState): OperatingSnapshot {
  return state.snapshots.find((item) => item.stage === state.operatingStage)
    ?? state.snapshots[0];
}

export function hasCompleteBusinessOutcome(state: TerminalState) {
  const criticalClosed = state.actions.filter((item) =>
    ["member-recall", "reservation-followup", "dinner-experience"].includes(item.id) && item.status === "closed",
  ).length;
  const supportBlocked = state.workRequests.some((item) => item.status === "pendingRegional" || item.status === "escalatedToHQ");
  return criticalClosed >= 3 && state.gapProgress.remainingGuests <= 16 && !supportBlocked;
}

export function getPendingRegionalReviews(state: TerminalState) {
  return state.actions.filter((item) => item.status === "pendingHumanReview");
}

export function getPendingRegionalRequests(state: TerminalState) {
  return state.workRequests.filter((item) => item.status === "pendingRegional");
}

export function getPendingHQRequests(state: TerminalState) {
  return state.workRequests.filter((item) => item.status === "escalatedToHQ");
}

export function money(value: number | null) {
  return value === null ? "—" : `¥${value.toLocaleString("zh-CN")}`;
}
