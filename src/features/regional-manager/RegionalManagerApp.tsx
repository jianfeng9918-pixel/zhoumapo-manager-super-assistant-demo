import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BellIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClipboardIcon,
  DashboardIcon,
  ExclamationTriangleIcon,
  FileTextIcon,
  HomeIcon,
  LockClosedIcon,
  PaperPlaneIcon,
  PersonIcon,
  ReloadIcon,
  SewingPinIcon,
} from "@radix-ui/react-icons";
import { FlowStack, MobileScroll, type FlowControls, type FlowScreen } from "../../mobile";
import { actionStatusLabel } from "../../domain/reducer";
import { getEvidenceForAction, getPendingRegionalRequests, getPendingRegionalReviews, money } from "../../domain/selectors";
import type { OperatingReport } from "../../domain/types";
import { useOperatingOS } from "../shared/OperatingOSProvider";
import {
  AIWorking,
  AppBrandHeader,
  AppToast,
  ApprovalAudit,
  BottomTabs,
  DecisionSafety,
  DetailHeader,
  EmptyState,
  HumanConfirmNote,
  NeedsAttention,
  PrimaryButton,
  ResetSheet,
  ResultCard,
  RoleSwitchSheet,
  RowButton,
  SecondaryButton,
  SectionHeading,
  StatusPill,
  type TabDefinition,
} from "../shared/ui";

type RegionTab = "today" | "stores" | "tasks" | "messages" | "mine";

const tabs: TabDefinition<RegionTab>[] = [
  { id: "today", label: "今日", icon: HomeIcon },
  { id: "stores", label: "门店", icon: SewingPinIcon },
  { id: "tasks", label: "任务", icon: ClipboardIcon },
  { id: "messages", label: "消息", icon: BellIcon },
  { id: "mine", label: "我的", icon: PersonIcon },
];

function detailScreen(id: string, title: string, render: (flow: FlowControls) => ReactNode): FlowScreen {
  return { id, headerHeight: 52, header: (flow) => <DetailHeader title={title} onBack={flow.pop} />, render };
}

const storeDetailScreen = detailScreen("region-store-detail", "门店经营上下文", (flow) => <StoreDetail flow={flow} />);
const reviewEvidenceScreen = (actionId?: string) => detailScreen(
  `region-evidence-review-${actionId ?? "current"}`,
  "人工验收证据",
  (flow) => <EvidenceReview flow={flow} actionId={actionId} />,
);
const replyRequestScreen = detailScreen("region-request-reply", "处理门店求助", (flow) => <RequestReply flow={flow} />);
const regionReportScreen = detailScreen("region-operating-report", "区域经营复盘", (flow) => <RegionOperatingReport flow={flow} />);

export default function RegionalManagerApp() {
  const { busy, toast } = useOperatingOS();
  const [roleSheet, setRoleSheet] = useState(false);
  const [resetSheet, setResetSheet] = useState(false);
  const root = useMemo<FlowScreen>(() => ({
    id: "regional-manager-root",
    footerHeight: 76,
    footer: () => <RegionBottomNav />,
    render: (flow) => (
      <RegionRoot flow={flow} openRole={() => setRoleSheet(true)} openReset={() => setResetSheet(true)} />
    ),
  }), []);

  return (
    <>
      <FlowStack key="regional-flow" initial={root} />
      <RoleSwitchSheet open={roleSheet} onOpenChange={setRoleSheet} />
      <ResetSheet open={resetSheet} onOpenChange={setResetSheet} />
      {busy ? <AIWorking label={busy} /> : null}
      <AppToast message={toast} />
    </>
  );
}

function RegionBottomNav() {
  const { state, dispatch } = useOperatingOS();
  const active = state.activeTabs.regionalManager as RegionTab;
  return (
    <BottomTabs
      tabs={tabs}
      active={active}
      onChange={(tab) => dispatch({ type: "setTab", role: "regionalManager", tab })}
      badges={{ tasks: getPendingRegionalReviews(state).length, messages: getPendingRegionalRequests(state).length }}
    />
  );
}

function RegionRoot({ flow, openRole, openReset }: { flow: FlowControls; openRole: () => void; openReset: () => void }) {
  const { state } = useOperatingOS();
  const active = state.activeTabs.regionalManager as RegionTab;
  return (
    <MobileScroll className="final-scroll">
      <main className="final-page region-page">
        {active === "today" ? <RegionToday flow={flow} /> : null}
        {active === "stores" ? <RegionStores flow={flow} /> : null}
        {active === "tasks" ? <RegionTasks flow={flow} /> : null}
        {active === "messages" ? <RegionMessages flow={flow} /> : null}
        {active === "mine" ? <RegionMine openRole={openRole} openReset={openReset} /> : null}
      </main>
    </MobileScroll>
  );
}

function RegionIntro({ label, title, body }: { label: string; title: string; body: string }) {
  return <div className="page-title-block"><span>{label}</span><h1>{title}</h1><p>{body}</p></div>;
}

function RegionToday({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const reviews = getPendingRegionalReviews(state);
  const requests = getPendingRegionalRequests(state);
  const sansheng = state.regionStores.find((item) => item.id === "sansheng")!;
  return (
    <>
      <AppBrandHeader subtitle="林阳 · 区域经理 · 8月11日" />
      <RegionIntro label="今天只看必须介入" title={requests.length ? `三盛广场店还差${sansheng.guestGap}位顾客` : reviews.length ? "有一份证据等你验收" : "门店行动正在执行"} body={requests.length ? "黄店长已做基础行动，但还卡在区域资源支持。" : "不先看区域大盘，先把求助和证据闭环。"} />
      {requests.length ? (
        <section className="region-intervention-card urgent">
          <span><PaperPlaneIcon />门店求助</span>
          <h2>黄店长申请晚市曝光支持</h2>
          <p>预计少25桌、65位顾客；门店已确认执行会员召回。</p>
          <button type="button" onClick={() => flow.push(replyRequestScreen)}>现在处理 <ChevronRightIcon /></button>
        </section>
      ) : (
        <section className="region-intervention-card">
          <span><CheckCircledIcon />求助已处理</span>
          <h2>门店已收到区域支持方案</h2>
          <p>继续等待行动证据和晚市复查结果。</p>
        </section>
      )}
      {reviews.length ? (
        <section className="region-intervention-card review">
          <span><FileTextIcon />待人工验收</span>
          <h2>{reviews[0].title}已通过AI初验</h2>
          <p>{reviews.length}项证据等待你确认或退回，验收后才计算经营影响。</p>
          <button type="button" onClick={() => flow.push(reviewEvidenceScreen(reviews[0].id))}>查看证据 <ChevronRightIcon /></button>
        </section>
      ) : (
        <section className="region-intervention-card quiet">
          <span><ClipboardIcon />下一件</span>
          <h2>等待三盛广场店回传行动证据</h2>
          <p>系统会在证据到达后自动放到这里。</p>
        </section>
      )}
      <SectionHeading title="需要关注的门店" meta="按缺口与求助排序" />
      <StoreRow store={state.regionStores[1]} onClick={() => flow.push(storeDetailScreen)} />
      <StoreRow store={state.regionStores[0]} onClick={() => flow.push(storeDetailScreen)} />
      <button type="button" className="role-report-entry" onClick={() => flow.push(regionReportScreen)}><DashboardIcon /><span><small>区域7日经营复盘</small><b>看跨店重复问题与行动效果</b></span><ChevronRightIcon /></button>
    </>
  );
}

function StoreRow({ store, onClick }: { store: ReturnType<typeof useOperatingOS>["state"]["regionStores"][number]; onClick: () => void }) {
  return (
    <button type="button" className="region-store-final-row" onClick={onClick}>
      <span className={store.helpUrgency === "urgent" ? "urgent" : store.helpUrgency === "normal" ? "attention" : "ok"}>{store.tableGap}桌</span>
      <span><b>{store.name}</b><small>{store.manager} · 少{store.guestGap}位顾客 · {store.unresolvedActions}项未闭环</small></span>
      <ChevronRightIcon />
    </button>
  );
}

function RegionStores({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const sorted = [...state.regionStores].sort((a, b) => b.forecastGap - a.forecastGap);
  return (
    <>
      <AppBrandHeader subtitle="6家演示门店 · 匿名经营对标" />
      <RegionIntro label="具体差口优先" title="哪家店最需要介入？" body="按少多少桌、未闭环行动和求助紧急度排序。" />
      <section className="region-store-list-final">
        {sorted.map((store) => <StoreRow key={store.id} store={store} onClick={() => flow.push(storeDetailScreen)} />)}
      </section>
      <button type="button" className="plain-wide-button" onClick={() => flow.push(regionReportScreen)}>查看区域经营报告 <ChevronRightIcon /></button>
      <DecisionSafety title="对标隐私" />
    </>
  );
}

function RegionOperatingReport({ flow }: { flow: FlowControls }) {
  const { state, adapters } = useOperatingOS();
  const [report, setReport] = useState<OperatingReport | null>(null);
  useEffect(() => {
    let active = true;
    adapters.reporting.listReports("region", state).then((items) => active && setReport(items[0]));
    return () => { active = false; };
  }, [adapters, state.regionStores, state.actions]);
  if (!report) return <MobileScroll className="final-scroll"><main className="final-detail-page"><AIWorking label="正在汇总6家门店经营结果" /></main></MobileScroll>;
  const max = Math.max(...report.series.map((item) => item.value), 1);
  return (
    <MobileScroll className="final-scroll"><main className="final-detail-page">
      <section className="role-report-hero"><DashboardIcon /><span><small>{report.period} · 匿名展示</small><h1>{report.conclusion}</h1><p>{report.hero.label} <b>{report.hero.value}</b></p></span></section>
      <section className="role-report-evidence">{report.evidence.map((item) => <div key={item.label}><small>{item.label}</small><b>{item.value}</b><span>{item.note}</span></div>)}</section>
      <SectionHeading title="门店缺口排序" meta="单位：桌" />
      <section className="report-series-list compact-role-series">{report.series.map((point) => <div key={point.label}><span><b>{point.label}</b><small>{point.value}桌</small></span><progress max={max} value={point.value} /><em>{point.value > 20 ? "优先介入" : "持续观察"}</em></div>)}</section>
      <section className="regional-effect-summary"><CheckCircledIcon /><span><small>本周有效动作</small><h2>会员召回已有1项真实到店结果</h2><p>8月8日确认9桌、23位顾客实际到店；其余门店不把预约预测算成实际。</p></span></section>
      <PrimaryButton onClick={() => flow.replace(storeDetailScreen)}>查看最需介入门店</PrimaryButton>
      <SecondaryButton onClick={() => flow.pop()}>回到门店排序</SecondaryButton>
    </main></MobileScroll>
  );
}

function RegionTasks({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const reviews = getPendingRegionalReviews(state);
  return (
    <>
      <AppBrandHeader subtitle="区域行动与人工验收" />
      <RegionIntro label="证据先于结论" title="待你确认的闭环" body="AI只检查完整性，正式验收必须由区域经理完成。" />
      {reviews.length ? reviews.map((item) => (
        <button type="button" className="regional-review-row" key={item.id} onClick={() => flow.push(reviewEvidenceScreen(item.id))}>
          <FileTextIcon /><span><b>{item.title}</b><small>黄店长 · AI初验通过 · 待人工确认</small></span><StatusPill status={item.status} /><ChevronRightIcon />
        </button>
      )) : <EmptyState title="暂无待验收证据" body="店长回传后会自动出现在这里。" />}
      <SectionHeading title="区域已介入" meta="同步到店长经营行动" />
      {state.actions.filter((item) => item.source === "区域行动" && item.released).map((item) => (
        <div className="issued-action-card" key={item.id}><CheckCircledIcon /><span><b>{item.title}</b><small>{item.owner} · {actionStatusLabel[item.status]}</small></span></div>
      ))}
    </>
  );
}

function RegionMessages({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const requests = state.workRequests.filter((item) => item.status !== "draft");
  return (
    <>
      <AppBrandHeader subtitle="店长求助与异常升级" />
      <RegionIntro label="上下文自动带入" title="不再来回问门店发生了什么" body="每个求助都带着经营缺口、已执行动作和需要的资源。" />
      {requests.length ? requests.map((request) => (
        <button type="button" className="regional-message-card" key={request.id} onClick={() => flow.push(replyRequestScreen)}>
          <PaperPlaneIcon /><span><small>{request.createdAt ?? "16:22"} · 黄店长</small><b>{request.title}</b><p>{request.context}</p></span><ChevronRightIcon />
        </button>
      )) : <EmptyState title="暂无门店求助" body="店长确认发送后，这里会同步出现。" />}
    </>
  );
}

function RegionMine({ openRole, openReset }: { openRole: () => void; openReset: () => void }) {
  return (
    <>
      <AppBrandHeader subtitle="区域经理演示工具" />
      <section className="manager-profile-card regional-profile-card">
        <span className="manager-avatar">林</span>
        <div><small>周麻婆区域经营</small><h1>林阳 · 区域经理</h1><p>负责门店支持、证据验收与向上升级</p></div>
      </section>
      <section className="settings-list">
        <RowButton icon={<PersonIcon />} title="切换演示角色" body="回到黄店长或进入总部经营中心" onClick={openRole} />
        <RowButton icon={<ReloadIcon />} title="重置终局演示" body="恢复08:30初始场景" onClick={openReset} />
      </section>
      <DecisionSafety />
    </>
  );
}

function StoreDetail({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const request = state.workRequests[0];
  const review = getPendingRegionalReviews(state)[0];
  const sansheng = state.regionStores.find((item) => item.id === "sansheng")!;
  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="region-store-context-hero">
          <span>三盛广场演示店 · 黄店长</span>
          <h1>晚市预计还少{sansheng.guestGap}位顾客</h1>
          <p>约{sansheng.tableGap}桌，预计收官{money(state.brief.forecastRevenue)}；当前营业额不因行动预测而改变。</p>
        </section>
        <SectionHeading title="AI判断依据" meta="08:30更新" />
        <section className="context-timeline">
          <div><b>昨天</b><span>晚市比正常少32位顾客</span></div>
          <div><b>今天</b><span>预约少11桌，客单价没有下降</span></div>
          <div><b>门店动作</b><span>会员召回已进入执行</span></div>
        </section>
        {request.status === "pendingRegional" ? <PrimaryButton onClick={() => flow.push(replyRequestScreen)}>处理黄店长求助</PrimaryButton> : null}
        {review ? <PrimaryButton onClick={() => flow.push(reviewEvidenceScreen(review.id))}>验收{review.title}</PrimaryButton> : null}
        <section className="benchmark-detail"><b>{state.benchmarks[0].translatedGap}</b><p>仅匿名展示，不显示优秀门店真实名称。</p></section>
      </main>
    </MobileScroll>
  );
}

function RequestReply({ flow }: { flow: FlowControls }) {
  const { state, dispatch, run, approval, showToast } = useOperatingOS();
  const request = state.workRequests[0];

  const reply = async (escalate: boolean) => {
    const text = escalate
      ? "区域资源不足，已带完整上下文转总部市场中心处理。"
      : "区域已安排商场会员群补充曝光，并下发17:30复查行动。";
    await run(escalate ? "正在转交总部职能" : "正在生成区域补充行动", async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 520));
      dispatch({
        type: "replyWorkRequest",
        requestId: request.id,
        reply: text,
        escalate,
        approval: approval("workRequest", request.id, "confirmed", escalate ? "确认转总部市场中心" : "确认回复并下发补充行动"),
      });
    });
    showToast(escalate ? "总部经营中心已收到需求" : "黄店长已收到区域支持方案");
    flow.pop();
  };

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="request-context-card">
          <span>黄店长 · 16:22</span><h1>{request.title}</h1><p>{request.context}</p><div><small>需要什么</small><b>{request.requestedResource}</b></div>
        </section>
        <section className="regional-reply-options">
          <h2>AI预填两种处理方式</h2>
          <button type="button" onClick={() => reply(false)}><CheckCircledIcon /><span><b>区域直接支持</b><small>商场会员群补充曝光 + 17:30复查</small></span><ChevronRightIcon /></button>
          <button type="button" onClick={() => reply(true)}><PaperPlaneIcon /><span><b>转总部市场中心</b><small>区域资源不足时，完整上下文向上流转</small></span><ChevronRightIcon /></button>
        </section>
        <HumanConfirmNote text="AI只预填，林阳确认后才回复或转交" />
      </main>
    </MobileScroll>
  );
}

function EvidenceReview({ flow, actionId }: { flow: FlowControls; actionId?: string }) {
  const { state, dispatch, approval, showToast } = useOperatingOS();
  const item = state.actions.find((action) => action.id === actionId)
    ?? getPendingRegionalReviews(state)[0]
    ?? state.actions.find((action) => action.id === "member-recall")!;
  const proof = getEvidenceForAction(state, item.id).at(-1);

  const approve = () => {
    if (!proof) return;
    dispatch({
      type: "approveEvidence",
      actionId: item.id,
      evidenceId: proof.id,
      approval: approval("evidence", proof.id, "approved", "证据完整，确认行动闭环", `v${item.templateVersion}.0`),
    });
    showToast("验收已同步给黄店长，预测结果已更新");
    flow.pop();
  };

  const reject = () => {
    if (!proof) return;
    dispatch({
      type: "returnEvidence",
      actionId: item.id,
      evidenceId: proof.id,
      approval: approval("evidence", proof.id, "returned", "补一张可看清触达人数的回执", `v${item.templateVersion}.0`),
    });
    showToast("补充要求已同步给黄店长");
    flow.pop();
  };

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="evidence-review-hero">
          <span>AI初验通过 · 仍需人工确认</span><h1>{item.title}</h1><p>黄店长 · 17:02回传</p>
        </section>
        {proof ? (
          <section className="evidence-card-final review-proof">
            <FileTextIcon /><div><span>{proof.type === "systemReceipt" ? "系统回执" : "照片证据"}</span><h2>{proof.summary}</h2><p>{proof.aiNote}</p></div>
          </section>
        ) : <EmptyState title="证据尚未到达" body="请先回到店长端执行并回传会员召回。" />}
        <section className="verification-checklist">
          <span><CheckCircledIcon />触达人数清晰</span>
          <span><CheckCircledIcon />新增预约可核对</span>
          <span><CheckCircledIcon />门店与时间一致</span>
        </section>
        {proof ? <div className="two-action-grid"><SecondaryButton tone="danger" onClick={reject}>退回补充</SecondaryButton><PrimaryButton onClick={approve}>确认这项闭环</PrimaryButton></div> : null}
        <HumanConfirmNote text="AI初验通过，不代表区域经理已验收" />
      </main>
    </MobileScroll>
  );
}
