import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useReducer,
} from "react";
import { demoAdapters, freshDemoState, type OperatingAdapters } from "../../adapters";
import { terminalReducer, type TerminalAction } from "../../domain/reducer";
import type {
  ApprovalRecord,
  Evidence,
  RoleId,
  TerminalState,
} from "../../domain/types";

const STORAGE_KEY = "zhoumapo-manager-assistant-final-v2";

type OperatingOSContextValue = {
  state: TerminalState;
  dispatch: Dispatch<TerminalAction>;
  adapters: OperatingAdapters;
  busy: string | null;
  toast: string;
  run: <T>(label: string, task: () => Promise<T>) => Promise<T | undefined>;
  showToast: (message: string) => void;
  switchRole: (role: RoleId) => void;
  resetDemo: () => void;
  approval: (
    entityType: ApprovalRecord["entityType"],
    entityId: string,
    decision: ApprovalRecord["decision"],
    note: string,
    version?: string,
  ) => ApprovalRecord;
  evidence: (
    actionId: string,
    type: Evidence["type"],
    summary: string,
    assetUrl?: string,
  ) => Evidence;
};

const OperatingOSContext = createContext<OperatingOSContextValue | null>(null);

function restoreState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshDemoState();
    const parsed = JSON.parse(raw) as TerminalState;
    return parsed.schemaVersion === 2 ? parsed : freshDemoState();
  } catch {
    return freshDemoState();
  }
}

function actorForRole(role: RoleId) {
  if (role === "regionalManager") return "林阳区域经理";
  if (role === "headquarters") return "总部经营中心·陈经理";
  return "黄店长";
}

export function OperatingOSProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(terminalReducer, undefined, restoreState);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  }, []);

  const run = useCallback(async <T,>(label: string, task: () => Promise<T>) => {
    setBusy(label);
    try {
      return await task();
    } finally {
      setBusy(null);
    }
  }, []);

  const switchRole = useCallback((role: RoleId) => {
    dispatch({ type: "switchRole", role });
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = freshDemoState();
    window.localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: "reset", state: fresh });
    showToast("终局演示已恢复到08:30");
  }, [showToast]);

  const approval = useCallback<OperatingOSContextValue["approval"]>((
    entityType,
    entityId,
    decision,
    note,
    version = "1.0",
  ) => ({
    id: `approval-${state.approvals.length + 1}-${entityId}`,
    entityType,
    entityId,
    decision,
    confirmedBy: actorForRole(state.role),
    role: state.role,
    confirmedAt: state.role === "storeManager" ? "8月11日 08:49" : state.role === "regionalManager" ? "8月11日 17:08" : "8月11日 17:10",
    note,
    version,
  }), [state.approvals.length, state.role]);

  const evidence = useCallback<OperatingOSContextValue["evidence"]>((
    actionId,
    type,
    summary,
    assetUrl,
  ) => ({
    id: `evidence-${state.evidence.length + 1}-${actionId}`,
    actionId,
    type,
    submittedBy: actorForRole(state.role),
    submittedAt: actionId === "member-recall" ? "17:02" : actionId === "reservation-followup" ? "17:04" : "19:08",
    summary,
    assetUrl,
    aiResult: "pending",
    aiNote: "等待AI初验",
  }), [state.evidence.length, state.role]);

  const value = useMemo<OperatingOSContextValue>(() => ({
    state,
    dispatch,
    adapters: demoAdapters,
    busy,
    toast,
    run,
    showToast,
    switchRole,
    resetDemo,
    approval,
    evidence,
  }), [approval, busy, evidence, resetDemo, run, showToast, state, toast]);

  return <OperatingOSContext.Provider value={value}>{children}</OperatingOSContext.Provider>;
}

export function useOperatingOS() {
  const value = useContext(OperatingOSContext);
  if (!value) throw new Error("useOperatingOS must be used inside OperatingOSProvider");
  return value;
}

export const terminalStorageKey = STORAGE_KEY;
