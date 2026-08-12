import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BellIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClipboardIcon,
  FileTextIcon,
  DashboardIcon,
  GlobeIcon,
  HomeIcon,
  LockClosedIcon,
  MagicWandIcon,
  MixerHorizontalIcon,
  PaperPlaneIcon,
  PersonIcon,
  ReloadIcon,
  SewingPinIcon,
} from "@radix-ui/react-icons";
import { FlowStack, MobileScroll, type FlowControls, type FlowScreen } from "../../mobile";
import { getPendingHQRequests } from "../../domain/selectors";
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
  PrimaryButton,
  ResetSheet,
  ResultCard,
  RoleSwitchSheet,
  RowButton,
  SecondaryButton,
  SectionHeading,
  type TabDefinition,
} from "../shared/ui";

type HQTab = "today" | "regions" | "strategy" | "requests" | "mine";

const tabs: TabDefinition<HQTab>[] = [
  { id: "today", label: "今日", icon: HomeIcon },
  { id: "regions", label: "区域", icon: GlobeIcon },
  { id: "strategy", label: "策略", icon: MixerHorizontalIcon },
  { id: "requests", label: "需求", icon: PaperPlaneIcon },
  { id: "mine", label: "我的", icon: PersonIcon },
];

function detailScreen(id: string, title: string, render: (flow: FlowControls) => ReactNode): FlowScreen {
  return { id, headerHeight: 52, header: (flow) => <DetailHeader title={title} onBack={flow.pop} />, render };
}

const strategyDetailScreen = detailScreen("hq-strategy-detail", "校准行动模板", (flow) => <StrategyDetail flow={flow} />);
const hqRequestScreen = detailScreen("hq-request-detail", "总部资源需求", (flow) => <HQRequestDetail flow={flow} />);
const hqEffectReportScreen = detailScreen("hq-effect-report", "总部效果复盘", (flow) => <HQEffectReport flow={flow} />);

export default function HeadquartersApp() {
  const { busy, toast } = useOperatingOS();
  const [roleSheet, setRoleSheet] = useState(false);
  const [resetSheet, setResetSheet] = useState(false);
  const root = useMemo<FlowScreen>(() => ({
    id: "headquarters-root",
    footerHeight: 76,
    footer: () => <HQBottomNav />,
    render: (flow) => (
      <HQRoot flow={flow} openRole={() => setRoleSheet(true)} openReset={() => setResetSheet(true)} />
    ),
  }), []);

  return (
    <>
      <FlowStack key="headquarters-flow" initial={root} />
      <RoleSwitchSheet open={roleSheet} onOpenChange={setRoleSheet} />
      <ResetSheet open={resetSheet} onOpenChange={setResetSheet} />
      {busy ? <AIWorking label={busy} /> : null}
      <AppToast message={toast} />
    </>
  );
}

function HQBottomNav() {
  const { state, dispatch } = useOperatingOS();
  const active = state.activeTabs.headquarters as HQTab;
  return (
    <BottomTabs
      tabs={tabs}
      active={active}
      onChange={(tab) => dispatch({ type: "setTab", role: "headquarters", tab })}
      badges={{ requests: getPendingHQRequests(state).length }}
    />
  );
}

function HQRoot({ flow, openRole, openReset }: { flow: FlowControls; openRole: () => void; openReset: () => void }) {
  const { state } = useOperatingOS();
  const active = state.activeTabs.headquarters as HQTab;
  return (
    <MobileScroll className="final-scroll">
      <main className="final-page headquarters-page">
        {active === "today" ? <HQToday flow={flow} /> : null}
        {active === "regions" ? <HQRegions /> : null}
        {active === "strategy" ? <HQStrategy flow={flow} /> : null}
        {active === "requests" ? <HQRequests flow={flow} /> : null}
        {active === "mine" ? <HQMine openRole={openRole} openReset={openReset} /> : null}
      </main>
    </MobileScroll>
  );
}

function HQIntro({ label, title, body }: { label: string; title: string; body: string }) {
  return <div className="page-title-block"><span>{label}</span><h1>{title}</h1><p>{body}</p></div>;
}

function HQToday({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const issue = state.repeatedIssues[0];
  const template = state.templates.find((item) => item.id === issue.templateId)!;
  return (
    <>
      <AppBrandHeader subtitle="总部经营中心 · 8月11日" />
      <HQIntro label="跨区域重复问题" title="会员召回动作已在6家店验证" body="先看哪些动作有效、哪些案例待沉淀，再决定是否发布新策略。" />
      <section className="hq-pattern-card">
        <span><MagicWandIcon />AI归纳 · 总部待确认沉淀</span>
        <h2>{issue.title}</h2>
        <p>{issue.affectedRegions}个区域、{issue.affectedStores}家门店；{issue.translatedImpact}。</p>
        <div><small>当前覆盖</small><b>{template.title} v{template.version}.0 · 6家演示门店</b></div>
        <PrimaryButton onClick={() => flow.push(strategyDetailScreen)}>校准行动模板</PrimaryButton>
        <HumanConfirmNote text="AI只提出修改建议，总部业务部门确认后才发布" />
      </section>
      <SectionHeading title="另一项重复问题" meta="暂不升级" />
      <section className="hq-secondary-pattern">
        <span>4家店</span><div><b>{state.repeatedIssues[1].title}</b><p>{state.repeatedIssues[1].translatedImpact}</p></div><ChevronRightIcon />
      </section>
      <button type="button" className="role-report-entry hq-report-entry" onClick={() => flow.push(hqEffectReportScreen)}><DashboardIcon /><span><small>总部行动效果复盘</small><b>哪些动作有效，哪些案例值得沉淀？</b></span><ChevronRightIcon /></button>
      <DecisionSafety />
    </>
  );
}

function HQRegions() {
  const { state } = useOperatingOS();
  const fuzhou = state.regionStores.slice(0, 3);
  const other = state.regionStores.slice(3);
  return (
    <>
      <AppBrandHeader subtitle="区域问题分布 · 不展示健康分" />
      <HQIntro label="用具体缺口说话" title="两个区域需要不同支持" body="只看重复问题、顾客缺口和没有闭环的行动。" />
      <section className="region-cluster-list">
        <div><span>福州一区</span><b>预计少98位顾客</b><small>{fuzhou.filter((item) => item.unresolvedActions > 2).length}家店行动未闭环</small></div>
        <div><span>福州二区</span><b>预计少149位顾客</b><small>{other.filter((item) => item.unresolvedActions > 2).length}家店需要资源支持</small></div>
      </section>
      <section className="benchmark-card"><span>集团标准模型</span><h2>会员召回应在30分钟后复查到店</h2><p>当前4家店只看发送量，没有回收实际到店结果。</p></section>
    </>
  );
}

function HQStrategy({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  return (
    <>
      <AppBrandHeader subtitle="策略模板与业务规则" />
      <HQIntro label="总部业务部门维护" title="让AI只推荐能落地的动作" body="每个模板都有适用条件、禁用条件、证据和版本。" />
      <section className="template-list-final">
        {state.templates.map((template) => (
          <button type="button" key={template.id} onClick={() => flow.push(strategyDetailScreen)}>
            <ClipboardIcon /><span><small>{template.ownerDepartment}</small><b>{template.title}</b><p>v{template.version}.0 · {template.evidenceRequired.join(" + ")}</p></span><ChevronRightIcon />
          </button>
        ))}
      </section>
      <button type="button" className="plain-wide-button" onClick={() => flow.push(hqEffectReportScreen)}>查看策略效果依据 <ChevronRightIcon /></button>
      <DecisionSafety title="策略发布边界" />
    </>
  );
}

function HQEffectReport({ flow }: { flow: FlowControls }) {
  const { state, adapters } = useOperatingOS();
  const [report, setReport] = useState<OperatingReport | null>(null);
  useEffect(() => {
    let active = true;
    adapters.reporting.listReports("headquarters", state).then((items) => active && setReport(items[0]));
    return () => { active = false; };
  }, [adapters, state.templates, state.actionEffects]);
  if (!report) return <MobileScroll className="final-scroll"><main className="final-detail-page"><AIWorking label="正在核对跨区域行动效果" /></main></MobileScroll>;
  return (
    <MobileScroll className="final-scroll"><main className="final-detail-page">
      <section className="role-report-hero hq"><DashboardIcon /><span><small>{report.updatedAt}更新 · 演示数据</small><h1>{report.conclusion}</h1><p>{report.hero.label} <b>{report.hero.value}</b></p></span></section>
      <section className="role-report-evidence">{report.evidence.map((item) => <div key={item.label}><small>{item.label}</small><b>{item.value}</b><span>{item.note}</span></div>)}</section>
      <SectionHeading title="沉淀依据" meta={`AI置信度${report.confidence}%`} />
      <section className="hq-evidence-chain">{report.reasonChain.map((item, index) => <div key={item}><b>{index + 1}</b><span>{item}</span></div>)}</section>
      <section className="strategy-publish-boundary"><LockClosedIcon /><span><b>只有总部人工发布后才进入正式建议</b><small>AI可以归纳有效动作，不能自行修改总部策略。</small></span></section>
      <PrimaryButton onClick={() => flow.replace(strategyDetailScreen)}>校准并确认行动模板</PrimaryButton>
      <SecondaryButton onClick={() => flow.pop()}>返回总部今日</SecondaryButton>
    </main></MobileScroll>
  );
}

function HQRequests({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const requests = getPendingHQRequests(state);
  return (
    <>
      <AppBrandHeader subtitle="门店与区域向上需求" />
      <HQIntro label="资源申请统一入口" title="需要总部处理什么？" body="预算、市场支持与职能协助都保留完整经营上下文。" />
      {requests.length ? requests.map((request) => (
        <button type="button" className="hq-request-row" key={request.id} onClick={() => flow.push(hqRequestScreen)}>
          <PaperPlaneIcon /><span><small>林阳区域转交</small><b>{request.title}</b><p>{request.context}</p></span><ChevronRightIcon />
        </button>
      )) : <EmptyState title="暂无待处理总部需求" body="区域经理确认转交后会出现在这里。" />}
      {state.workRequests.some((item) => item.status === "hqReplied") ? <ApprovalAudit title="总部资源方案已回复" approver="总部市场中心·陈经理" note="已同步黄店长与林阳" /> : null}
    </>
  );
}

function HQMine({ openRole, openReset }: { openRole: () => void; openReset: () => void }) {
  const { state } = useOperatingOS();
  return (
    <>
      <AppBrandHeader subtitle="总部经营中心演示工具" />
      <section className="manager-profile-card hq-profile-card">
        <span className="manager-avatar">总</span><div><small>经营策略与模型校准</small><h1>总部经营中心</h1><p>已保留 {state.activity.length} 条审计记录</p></div>
      </section>
      <section className="settings-list">
        <RowButton icon={<PersonIcon />} title="切换演示角色" body="回到黄店长或林阳区域经理" onClick={openRole} />
        <RowButton icon={<ReloadIcon />} title="重置终局演示" body="恢复策略v3.0与08:30经营状态" onClick={openReset} />
      </section>
      <DecisionSafety />
    </>
  );
}

function StrategyDetail({ flow }: { flow: FlowControls }) {
  const { state, dispatch, adapters, run, approval, showToast } = useOperatingOS();
  const template = state.templates.find((item) => item.id === "template-member-recall")!;
  const [reviewing, setReviewing] = useState(false);
  const nextSteps = ["筛选近60天到店且7天未触达会员", "店长人工确认门店专属内容", "30分钟后必须回收预约与实际到店"];

  const publish = async () => {
    await run("正在发布经人工确认的新策略", async () => {
      await adapters.workflow.publishTemplate({ ...template, steps: nextSteps });
      dispatch({
        type: "publishTemplate",
        templateId: template.id,
        steps: nextSteps,
        approval: approval("template", template.id, "published", "确认增加实际到店复查，并发布到适用门店", `v${template.version + 1}.0`),
      });
    });
    showToast(`策略v${template.version + 1}.0已发布，店长端已同步`);
    flow.pop();
  };

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="strategy-version-card">
          <span>总部市场中心维护</span><h1>{template.title}</h1><p>当前发布 v{template.version}.0 · {template.publishedAt}</p>
        </section>
        <SectionHeading title="AI发现的模板缺口" meta="来自6家店复盘" />
        <section className="template-gap-card"><MagicWandIcon /><span><b>只统计发送量，没有强制复查实际到店</b><p>4家店完成“发送”，但没有确认顾客是否真正到店。</p></span></section>
        {!reviewing ? <PrimaryButton onClick={() => setReviewing(true)}>查看AI修改草稿</PrimaryButton> : null}
        {reviewing ? (
          <>
            <section className="strategy-diff-card">
              <span>拟发布 v{template.version + 1}.0</span>
              {nextSteps.map((item, index) => <div key={item}><b>{index + 1}</b><p>{item}</p>{index === 2 ? <em>新增</em> : null}</div>)}
            </section>
            <section className="template-rules">
              <div><small>适用条件</small><b>晚市预计少30位以上顾客</b></div>
              <div><small>禁用条件</small><b>门店承载不足或当天已触达</b></div>
              <div><small>必须证据</small><b>触达回执 + 新增预约 + 实际到店</b></div>
            </section>
            <PrimaryButton onClick={publish} icon={<LockClosedIcon />}>人工确认并发布新版本</PrimaryButton>
            <HumanConfirmNote text="未确认前，门店仍继续使用旧版本" />
          </>
        ) : null}
        {state.approvals.some((item) => item.entityId === template.id && item.decision === "published") ? <ApprovalAudit title={`策略v${template.version}.0已发布`} approver="总部经营中心·陈经理" note="旧版本与审批记录已保留" /> : null}
      </main>
    </MobileScroll>
  );
}

function HQRequestDetail({ flow }: { flow: FlowControls }) {
  const { state, dispatch, run, approval, showToast } = useOperatingOS();
  const request = state.workRequests[0];

  const reply = async () => {
    await run("正在准备总部资源方案", async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 560));
      dispatch({
        type: "replyWorkRequest",
        requestId: request.id,
        fromHQ: true,
        reply: "总部市场中心已提供商场会员资源位，区域负责17:30回收实际到店。",
        approval: approval("workRequest", request.id, "confirmed", "确认提供市场资源位并同步门店与区域"),
      });
    });
    showToast("资源方案已同步给黄店长与林阳");
    flow.pop();
  };

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="request-context-card"><span>林阳区域经理转交</span><h1>{request.title}</h1><p>{request.context}</p><div><small>需要资源</small><b>{request.requestedResource}</b></div></section>
        <section className="hq-resource-plan"><FileTextIcon /><span><small>AI预填资源方案</small><b>提供商场会员资源位，由区域17:30回收实际到店</b><p>不涉及自动付款或预算审批。</p></span></section>
        {request.status === "escalatedToHQ" ? <><PrimaryButton onClick={reply}>人工确认并回复方案</PrimaryButton><HumanConfirmNote text="总部业务人员确认后才会正式回复" /></> : <ResultCard title="总部方案已发送" body={request.reply ?? "资源方案已同步"} impact="预计补回4至6桌" next="17:30由区域复查" />}
      </main>
    </MobileScroll>
  );
}
