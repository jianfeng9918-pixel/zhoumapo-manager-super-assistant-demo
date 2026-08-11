import type { ActionInstance, RoleId, TerminalState } from "./types";

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
