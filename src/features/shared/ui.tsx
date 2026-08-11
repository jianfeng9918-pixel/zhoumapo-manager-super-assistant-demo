import type { ComponentType, ReactNode } from "react";
import {
  ArrowLeftIcon,
  BellIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClockIcon,
  CrossCircledIcon,
  LockClosedIcon,
  MagicWandIcon,
  PersonIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { BottomSheet } from "../../mobile";
import { actionStatusLabel } from "../../domain/reducer";
import type { ActionStatus, RoleId } from "../../domain/types";
import { useOperatingOS } from "./OperatingOSProvider";

export type IconType = ComponentType<{ className?: string }>;

export type TabDefinition<T extends string> = {
  id: T;
  label: string;
  icon: IconType;
};

export function AppBrandHeader({ subtitle, onNotifications }: { subtitle: string; onNotifications?: () => void }) {
  const { state } = useOperatingOS();
  const unread = state.notifications.filter((item) => item.role === state.role && !item.read).length;
  return (
    <header className="final-brand-header">
      <div>
        <img src="/assets/zhoumapo-logo.png" alt="周麻婆川式小炒" draggable={false} />
        <p>{subtitle}</p>
      </div>
      <div className="brand-actions">
        <span className="demo-data-badge">演示数据</span>
        <button type="button" className="icon-button" aria-label="查看提醒" onClick={onNotifications}>
          <BellIcon />
          {unread > 0 ? <b>{unread}</b> : null}
        </button>
      </div>
    </header>
  );
}

export function DetailHeader({ title, onBack, trailing }: { title: string; onBack: () => void; trailing?: ReactNode }) {
  return (
    <div className="final-detail-header">
      <button type="button" aria-label="返回" onClick={onBack}><ArrowLeftIcon /></button>
      <b>{title}</b>
      <div>{trailing}</div>
    </div>
  );
}

export function BottomTabs<T extends string>({
  tabs,
  active,
  onChange,
  badges,
}: {
  tabs: TabDefinition<T>[];
  active: T;
  onChange: (tab: T) => void;
  badges?: Partial<Record<T, number>>;
}) {
  return (
    <nav className="final-bottom-tabs" aria-label="底部导航">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const badge = badges?.[tab.id];
        return (
          <button
            type="button"
            key={tab.id}
            className={tab.id === active ? "active" : ""}
            aria-current={tab.id === active ? "page" : undefined}
            onClick={() => onChange(tab.id)}
          >
            <span><Icon />{badge ? <em>{badge}</em> : null}</span>
            <b>{tab.label}</b>
          </button>
        );
      })}
    </nav>
  );
}

export function SectionHeading({ title, meta, action }: { title: string; meta?: string; action?: ReactNode }) {
  return (
    <div className="final-section-heading">
      <div><h2>{title}</h2>{meta ? <span>{meta}</span> : null}</div>
      {action}
    </div>
  );
}

export function StatusPill({ status }: { status: ActionStatus }) {
  return <span className={`status-pill status-${status}`}>{actionStatusLabel[status]}</span>;
}

export function PrimaryButton({ children, onClick, disabled, icon }: { children: ReactNode; onClick: () => void; disabled?: boolean; icon?: ReactNode }) {
  return <button type="button" className="final-primary-button" onClick={onClick} disabled={disabled}>{icon}{children}</button>;
}

export function SecondaryButton({ children, onClick, tone = "plain" }: { children: ReactNode; onClick: () => void; tone?: "plain" | "danger" }) {
  return <button type="button" className={`final-secondary-button ${tone}`} onClick={onClick}>{children}</button>;
}

export function HumanConfirmNote({ text = "AI已预填，只有你确认后才会正式执行" }: { text?: string }) {
  return <p className="human-confirm-note"><LockClosedIcon />{text}</p>;
}

export function AIWorking({ label }: { label: string }) {
  return (
    <div className="final-busy-overlay" role="status">
      <div><MagicWandIcon /></div>
      <b>{label}</b>
      <span>演示分析约需1秒</span>
    </div>
  );
}

export function AppToast({ message }: { message: string }) {
  if (!message) return null;
  return <div className="final-toast" role="status"><CheckCircledIcon />{message}</div>;
}

export function ResultCard({
  title,
  body,
  impact,
  next,
  children,
}: {
  title: string;
  body: string;
  impact: string;
  next: string;
  children?: ReactNode;
}) {
  return (
    <section className="final-result-card">
      <CheckCircledIcon />
      <div>
        <span>结果已回收</span>
        <h2>{title}</h2>
        <p>{body}</p>
        <dl>
          <div><dt>经营影响</dt><dd>{impact}</dd></div>
          <div><dt>下次复查</dt><dd>{next}</dd></div>
        </dl>
        {children}
      </div>
    </section>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="final-empty"><CheckCircledIcon /><b>{title}</b><p>{body}</p></div>;
}

export function RowButton({ icon, title, body, onClick, trailing }: { icon?: ReactNode; title: string; body: string; onClick: () => void; trailing?: ReactNode }) {
  return (
    <button type="button" className="final-row-button" onClick={onClick}>
      <span className="row-icon">{icon ?? <ClockIcon />}</span>
      <span><b>{title}</b><small>{body}</small></span>
      {trailing ?? <ChevronRightIcon />}
    </button>
  );
}

export function RoleSwitchSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, switchRole } = useOperatingOS();
  const roles: Array<{ id: RoleId; title: string; body: string }> = [
    { id: "storeManager", title: "黄店长", body: "三盛广场演示店 · 日常经营主线" },
    { id: "regionalManager", title: "林阳区域经理", body: "介入门店、处理求助与人工验收" },
    { id: "headquarters", title: "总部经营中心", body: "校准策略、处理跨区域共性问题" },
  ];
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="切换演示角色" description="三个角色共享同一套经营问题、行动和证据。" snap={0.56}>
      <div className="role-switch-list">
        {roles.map((role) => (
          <button
            type="button"
            key={role.id}
            className={state.role === role.id ? "selected" : ""}
            onClick={() => {
              switchRole(role.id);
              onOpenChange(false);
            }}
          >
            <PersonIcon />
            <span><b>{role.title}</b><small>{role.body}</small></span>
            {state.role === role.id ? <CheckCircledIcon /> : <ChevronRightIcon />}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

export function ResetSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { resetDemo } = useOperatingOS();
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="重置终局演示" description="只清除终局版进度，不影响V2、V3、V4。" snap={0.4}>
      <div className="reset-final-sheet">
        <ReloadIcon />
        <p>将恢复到8月11日08:30，晨会、求助、验收和策略发布全部回到初始状态。</p>
        <PrimaryButton onClick={() => { resetDemo(); onOpenChange(false); }}>确认重置</PrimaryButton>
      </div>
    </BottomSheet>
  );
}

export function DecisionSafety({ title = "人工确认边界" }: { title?: string }) {
  return (
    <div className="decision-safety">
      <LockClosedIcon />
      <span><b>{title}</b><small>AI只分析、预填和初验，不自动下发、审批、付款或发布。</small></span>
    </div>
  );
}

export function ApprovalAudit({ title, approver, note }: { title: string; approver: string; note: string }) {
  return (
    <div className="approval-audit">
      <CheckCircledIcon />
      <span><b>{title}</b><small>{approver} · {note}</small></span>
    </div>
  );
}

export function NeedsAttention({ title, body }: { title: string; body: string }) {
  return <div className="needs-attention"><CrossCircledIcon /><span><b>{title}</b><small>{body}</small></span></div>;
}
