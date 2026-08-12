import { useEffect, useMemo, useState } from "react";
import {
  ActivityLogIcon,
  ArchiveIcon,
  BackpackIcon,
  BarChartIcon,
  BellIcon,
  CalendarIcon,
  CameraIcon,
  ChatBubbleIcon,
  CubeIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClipboardIcon,
  ClockIcon,
  FileTextIcon,
  DownloadIcon,
  DashboardIcon,
  HomeIcon,
  IdCardIcon,
  InfoCircledIcon,
  LightningBoltIcon,
  LockClosedIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  PaperPlaneIcon,
  PersonIcon,
  ReaderIcon,
  ReloadIcon,
  RocketIcon,
  StarIcon,
  SpeakerLoudIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import { FlowStack, KeyboardInput, MobileScroll, type FlowControls, type FlowScreen } from "../../mobile";
import { actionStatusLabel } from "../../domain/reducer";
import {
  getAction,
  getCurrentSnapshot,
  getEvidenceForAction,
  hasCompleteBusinessOutcome,
  getUnreadCount,
  money,
} from "../../domain/selectors";
import type {
  ActionEffectRecord,
  ActionInstance,
  BusinessSignal,
  HomeWorkbench,
  LearningAsset,
  LearningCategory,
  LearningPath,
  OperatingMomentId,
  OperatingReport,
  ReportAnswer,
  ReportExport,
  ReportId,
  ReportQuestionId,
  StoreOperationFlow,
  VisualReport,
  VoiceResolution,
} from "../../domain/types";
import { useOperatingOS } from "../shared/OperatingOSProvider";
import { HoldToTalk } from "../shared/HoldToTalk";
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

type StoreTab = "today" | "data" | "tasks" | "academy" | "mine";
type TaskFilter = "all" | "manager" | "front" | "kitchen" | "support";

const tabs: TabDefinition<StoreTab>[] = [
  { id: "today", label: "今日", icon: HomeIcon },
  { id: "data", label: "数据", icon: BarChartIcon },
  { id: "tasks", label: "任务", icon: ClipboardIcon },
  { id: "academy", label: "学院", icon: BackpackIcon },
  { id: "mine", label: "我的", icon: PersonIcon },
];

function detailScreen(id: string, title: string, render: (flow: FlowControls) => React.ReactNode): FlowScreen {
  return {
    id,
    headerHeight: 52,
    header: (flow) => <DetailHeader title={title} onBack={flow.pop} />,
    render,
  };
}

const meetingScreen = detailScreen("final-meeting", "AI晨会", (flow) => <MorningMeetingFlow flow={flow} />);
const playbookScreen = detailScreen("final-playbook", "今日经营行动", (flow) => <PlaybookScreen flow={flow} />);
const notificationsScreen = detailScreen("final-notifications", "经营提醒", (flow) => <NotificationScreen flow={flow} />);
const dataAnswerScreen = detailScreen("final-data-answer", "为什么这样判断", (flow) => <BusinessAnswerScreen flow={flow} />);
const memberRecallScreen = detailScreen("final-member-recall", "会员召回", (flow) => <ActionExecution flow={flow} actionId="member-recall" />);
const reservationScreen = detailScreen("final-reservation", "预约跟进", (flow) => <ActionExecution flow={flow} actionId="reservation-followup" />);
const experienceScreen = detailScreen("final-experience", "晚市顾客体验", (flow) => <ActionExecution flow={flow} actionId="dinner-experience" />);
const supportRequestScreen = detailScreen("final-support-request", "向区域申请支持", (flow) => <SupportRequestFlow flow={flow} />);
const closingReviewScreen = detailScreen("final-closing-review", "今日经营复盘", (flow) => <ClosingReviewFlow flow={flow} />);
const lunchInspectionScreen = detailScreen("final-lunch-inspection", "午市现场复查", (flow) => <LunchInspectionFlow flow={flow} />);
const allOperationsScreen = detailScreen("v9-all-operations", "全部店务", (flow) => <AllOperationsScreen flow={flow} />);
const procurementScreen = detailScreen("v9-procurement", "采购申请", (flow) => <StoreOperationScreen flow={flow} flowId="operation-procurement" />);
const soldOutScreen = detailScreen("v9-sold-out", "库存与沽清", (flow) => <StoreOperationScreen flow={flow} flowId="operation-soldout" />);
const managerPromotionScreen = detailScreen("v9-promotion", "二星升三星", (flow) => <PromotionScreen flow={flow} />);
const managerRecordsScreen = detailScreen("v9-manager-records", "我的经营记录", (flow) => <ManagerRecordsScreen flow={flow} />);

function learningDetailScreen(assetId: string) {
  return detailScreen(`learning-${assetId}`, "课程详情", (flow) => <LearningDetailScreen flow={flow} assetId={assetId} />);
}

function learningPathScreen(pathId: string) {
  return detailScreen(`learning-path-${pathId}`, "学习路径", (flow) => <LearningPathScreen flow={flow} pathId={pathId} />);
}

function reportDetailScreen(reportId: ReportId) {
  return detailScreen(`report-${reportId}`, "经营报告", (flow) => <ReportDetailScreen flow={flow} reportId={reportId} />);
}

function reportExportScreen(reportId: ReportId) {
  return detailScreen(`report-export-${reportId}`, "生成经营简报", (flow) => <ReportExportScreen flow={flow} reportId={reportId} />);
}

const reportQuestionScreen = detailScreen("report-question", "问经营数据", (flow) => <ReportQuestionScreen flow={flow} />);
const actionEffectScreen = detailScreen("report-action-effect", "行动效果账本", (flow) => <ActionEffectLedger flow={flow} />);

function actionScreen(id: string) {
  if (id === "member-recall") return memberRecallScreen;
  if (id === "reservation-followup") return reservationScreen;
  if (id === "dinner-experience") return experienceScreen;
  if (id === "closing-review") return closingReviewScreen;
  return playbookScreen;
}

export default function StoreManagerApp() {
  const { busy, toast } = useOperatingOS();
  const [roleSheet, setRoleSheet] = useState(false);
  const [resetSheet, setResetSheet] = useState(false);
  const root = useMemo<FlowScreen>(() => ({
    id: "store-manager-root",
    footerHeight: 76,
    footer: () => <StoreBottomNav />,
    render: (flow) => (
      <StoreRoot
        flow={flow}
        openRole={() => setRoleSheet(true)}
        openReset={() => setResetSheet(true)}
      />
    ),
  }), []);

  return (
    <>
      <FlowStack key="store-manager-flow" initial={root} />
      <RoleSwitchSheet open={roleSheet} onOpenChange={setRoleSheet} />
      <ResetSheet open={resetSheet} onOpenChange={setResetSheet} />
      {busy ? <AIWorking label={busy} /> : null}
      <AppToast message={toast} />
    </>
  );
}

function StoreBottomNav() {
  const { state, dispatch } = useOperatingOS();
  const active = state.activeTabs.storeManager as StoreTab;
  return (
    <BottomTabs
      tabs={tabs}
      active={active}
      onChange={(tab) => dispatch({ type: "setTab", role: "storeManager", tab })}
      badges={{ tasks: state.actions.filter((item) => item.released && item.status !== "closed").length }}
    />
  );
}

function StoreRoot({
  flow,
  openRole,
  openReset,
}: {
  flow: FlowControls;
  openRole: () => void;
  openReset: () => void;
}) {
  const { state } = useOperatingOS();
  const active = state.activeTabs.storeManager as StoreTab;
  return (
    <MobileScroll className="final-scroll">
      <main className="final-page store-page">
        {active === "today" ? <TodayScreen flow={flow} /> : null}
        {active === "data" ? <DataScreen flow={flow} /> : null}
        {active === "tasks" ? <TasksScreen flow={flow} /> : null}
        {active === "academy" ? <AcademyScreen flow={flow} /> : null}
        {active === "mine" ? <MineScreen flow={flow} openRole={openRole} openReset={openReset} /> : null}
      </main>
    </MobileScroll>
  );
}

function TodayScreen({ flow }: { flow: FlowControls }) {
  const { state, adapters, dispatch } = useOperatingOS();
  const [voiceResult, setVoiceResult] = useState<VoiceResolution | null>(null);
  const [workbench, setWorkbench] = useState<HomeWorkbench | null>(null);
  const snapshot = getCurrentSnapshot(state);
  const live = state.liveFrame.stage === state.operatingStage ? state.liveFrame : {
    ...state.liveFrame,
    stage: state.operatingStage,
    time: snapshot.time,
    actualRevenue: state.brief.currentRevenue,
    expectedRevenueNow: state.brief.expectedRevenueNow,
    forecastRevenue: state.brief.forecastRevenue,
    guestGap: state.brief.forecastGuestGap,
    tableGap: state.brief.forecastTableGap,
    judgment: state.brief.judgment,
    nextRecheckAt: state.brief.nextRecheckAt,
  };
  const meeting = getAction(state, "morning-meeting")!;
  const recall = getAction(state, "member-recall")!;
  const reservation = getAction(state, "reservation-followup")!;
  const closing = getAction(state, "closing-review")!;
  const meetingDone = meeting.status === "closed";
  const recallDone = recall.status === "closed";
  const reservationDone = reservation.status === "closed";
  const isClosing = state.operatingStage === "closingReview" || state.operatingStage === "completed";
  const completedOutcome = hasCompleteBusinessOutcome(state);

  useEffect(() => {
    let active = true;
    adapters.business.getHomeWorkbench(state).then((result) => active && setWorkbench(result));
    return () => { active = false; };
  }, [adapters, state.actions, state.evidence, state.meetingStage, state.storeOperations, state.operatingStage]);

  const primary = isClosing
    ? { time: "21:30", title: "完成今日经营复盘", body: completedOutcome ? "先看经营结果，再看明日动作与成长证据。" : "还有行动未闭环，按真实收官结果复盘。", label: "查看复盘", screen: closingReviewScreen }
    : state.operatingStage === "lunchReview"
      ? { time: "12:00", title: "拍一张午市现场", body: "AI只看现场问题，不让你填写巡检表。", label: "拍照复查", screen: lunchInspectionScreen }
      : state.operatingStage === "afternoonDecision"
        ? { time: "14:30", title: "确认晚市经营剧本", body: "预约还少11桌，确认后进入晚市追回。", label: "确认剧本", screen: playbookScreen }
        : state.operatingStage === "dinnerRecovery"
          ? recallDone
            ? { time: "16:40", title: "跟进10桌未确认预约", body: "召回先补回31位顾客，再确认7桌预约才算完成追回。", label: "继续预约跟进", screen: reservationScreen }
            : { time: "16:20", title: "执行会员召回", body: meetingDone ? "晨会行动已下发，先触达180位近期会员。" : "演示已切到晚市；正式执行前仍需先确认晨会。", label: meetingDone ? "立即执行" : "查看晚市行动", screen: memberRecallScreen }
          : state.operatingStage === "dinnerExperience"
            ? { time: "18:00", title: "守住晚市10桌体验", body: "已补回19桌，当前营业额未变化，预计收官升至 ¥98,000。", label: "查看下一步", screen: experienceScreen }
            : { time: "08:45", title: "开晨会", body: "你说一句，AI整理行动；确认后再下发。", label: "开始晨会", screen: meetingScreen };

  return (
    <>
      <AppBrandHeader
        subtitle={`${state.brief.storeName} · ${state.brief.date} · ${live.time}`}
        onNotifications={() => flow.push(notificationsScreen)}
      />
      <div className="store-greeting">
        <h1>
          {isClosing ? "黄店长，今天辛苦了" : snapshot.time === "08:30" ? "黄店长，早上好" : `黄店长，${snapshot.time}看这里`}
        </h1>
        <span className={`stage-pill stage-${state.operatingStage}`}>{isClosing ? "收官" : state.operatingStage === "lunchReview" ? "午市复查" : state.operatingStage === "dinnerRecovery" ? "晚市追回" : "今日经营已准备"}</span>
      </div>

      <section className="ai-command-card" data-testid="primary-action-card">
        <div className="ai-card-identity">
          <img src="/assets/ai-regional-manager.png" alt="AI区域经理" draggable={false} />
          <span><b>AI区域经理</b><small><i className="live-status-dot" />{live.freshnessLabel} · 需人工确认</small></span>
          <MagicWandIcon />
        </div>
        <h2>{live.judgment}</h2>
        {!isClosing ? (
          <button type="button" className="evidence-summary v6-evidence-strip live-number-strip" onClick={() => flow.push(dataAnswerScreen)}>
            <span className="actual"><small>{live.actualRevenue === null ? "昨日实际" : "当前实际"}</small><b>{live.actualRevenue === null ? "¥98,600" : money(live.actualRevenue)}</b></span>
            <span className="forecast"><small>{live.expectedRevenueNow ? "正常应到" : "预计收官"}</small><b>{live.expectedRevenueNow ? money(live.expectedRevenueNow) : money(live.forecastRevenue)}</b></span>
            <span className="gap"><small>还差</small><b>{live.tableGap}桌 · {live.guestGap}位</b></span>
          </button>
        ) : (
          <div className="closing-summary-inline">
            <span><small>今日实际</small><b>{money(state.dailyReview.actualRevenue)}</b></span>
            <span><small>结果</small><b>{completedOutcome ? "已改善" : "未完全闭环"}</b></span>
          </div>
        )}
        <div className="command-action-block">
          <span>建议主行动</span>
          <div><h3>{primary.time} {primary.title}</h3><ActivityLogIcon /></div>
          <p>{primary.body}</p>
          <PrimaryButton onClick={() => flow.push(primary.screen)}>{primary.label}</PrimaryButton>
          {state.operatingStage === "morningBrief" ? <HoldToTalk context="today" compact onResolved={setVoiceResult} /> : null}
          {voiceResult ? (
            <div className="voice-intent-preview">
              <small>AI理解 · 置信度{voiceResult.confidence}%</small><b>{voiceResult.summary}</b>
              <button type="button" onClick={() => flow.push(meetingScreen)}>{voiceResult.confirmationLabel}<ChevronRightIcon /></button>
            </div>
          ) : null}
          {state.operatingStage !== "morningBrief" ? <HumanConfirmNote text={isClosing ? "确认后生成日报与明日第一件事" : state.operatingStage === "lunchReview" ? "照片仅用于演示识别，不上传真实平台" : state.operatingStage === "afternoonDecision" ? "确认后才启动晚市经营剧本" : state.operatingStage === "dinnerRecovery" ? "行动需人工确认，结果需证据验收" : "确认后才会下发到负责人"} /> : null}
        </div>
      </section>

      <section className="v9-task-summary" aria-label="今日任务概况">
        <div><small>今日任务</small><b>{workbench?.taskSummary.completed ?? 0}<em>/{workbench?.taskSummary.total ?? 6}</em></b></div>
        <div><small>待回传</small><b>{workbench?.taskSummary.pendingEvidence ?? 0}<em>项</em></b></div>
        <button type="button" onClick={() => dispatch({ type: "setTab", role: "storeManager", tab: "tasks" })}><span>查看全部</span><ChevronRightIcon /></button>
      </section>

      <div className="v9-section-title"><b>常用工作</b><button type="button" onClick={() => flow.push(allOperationsScreen)}>全部店务 <ChevronRightIcon /></button></div>
      <section className="v9-shortcuts" data-testid="home-shortcuts">
        {(workbench?.shortcuts ?? []).map((item) => {
          const target = item.id === "meeting" ? meetingScreen : item.id === "inspection" ? lunchInspectionScreen : item.id === "procurement" ? procurementScreen : soldOutScreen;
          const icon = item.id === "meeting" ? <SpeakerLoudIcon /> : item.id === "inspection" ? <CameraIcon /> : item.id === "procurement" ? <ArchiveIcon /> : <CubeIcon />;
          return <button type="button" key={item.id} className={`tone-${item.status}`} onClick={() => flow.push(target)}>{item.badge ? <i>{item.badge}</i> : null}<span>{icon}</span><b>{item.title}</b><small>{item.note}</small></button>;
        })}
      </section>

      {state.metricTransitions.some((item) => item.kind !== "actual") ? (
        <div className="metric-change-ribbon"><LightningBoltIcon /><span><b>数字为什么变了</b><small>{state.metricTransitions[0].trigger}</small></span><em>实际营业未虚增</em></div>
      ) : null}

      <div className="v9-home-more">
        <div className="v9-section-title"><b>最新经营动态</b><small>刚刚更新</small></div>
        <section className="v9-dynamics">
          {(workbench?.dynamics ?? []).map((item) => <button type="button" key={item.id} onClick={() => flow.push(item.type === "inventory" ? procurementScreen : dataAnswerScreen)}><span className={`tone-${item.tone}`}>{item.type === "inventory" ? <CubeIcon /> : <BellIcon />}</span><div><b>{item.title}</b><small>{item.note}</small></div><time>{item.time}</time><ChevronRightIcon /></button>)}
        </section>

        <button type="button" className="v9-learning-recommendation" onClick={() => flow.push(learningDetailScreen(workbench?.recommendedLearningId ?? "traffic-recall"))}>
          <img src={state.operatingStage === "lunchReview" ? "/assets/lunch-inspection-demo.png" : "/assets/task-evidence.jpg"} alt="今日推荐课程演示图" />
          <span><small>今日学习推荐 · 5分钟</small><b>{state.operatingStage === "lunchReview" ? "等菜问题责任链" : "会员召回实操"}</b><em>学完马上实操</em></span><ChevronRightIcon />
        </button>

        <div className="v9-section-title"><b>今天经营路线</b><small>AI会重新安排</small></div>
        <section className="semantic-day-route" aria-label="今天经营路线">
          <button type="button" className={state.operatingStage === "lunchReview" ? "current opportunity" : "opportunity"} onClick={() => flow.push(lunchInspectionScreen)}><span><ClockIcon /></span><small>12:00</small><b>午市复查</b></button>
          <button type="button" className={state.operatingStage === "dinnerRecovery" ? "current result" : "result"} onClick={() => flow.push(memberRecallScreen)}><span><PersonIcon /></span><small>16:20</small><b>会员召回</b></button>
          <button type="button" className={isClosing ? "current ai" : "ai"} onClick={() => flow.push(closingReviewScreen)}><span><ReaderIcon /></span><small>21:30</small><b>收官复盘</b></button>
        </section>
      </div>

      {recallDone && !reservationDone ? (
        <ResultCard
          title="会员召回已通过区域验收"
          body="触达180位会员，先新增12桌、31位顾客。"
          impact="预计收官由 ¥92,000 提升至 ¥95,800；当前收入未变化"
          next="17:10跟进未确认预约"
        />
      ) : null}
      {recallDone && reservationDone ? (
        <ResultCard
          title="召回与预约跟进已闭环"
          body="两项行动共补回19桌、49位顾客。"
          impact="预计收官由 ¥92,000 提升至 ¥98,000；当前收入未变化"
          next="18:30复查实际到店"
        />
      ) : null}
    </>
  );
}

function DataScreen({ flow }: { flow: FlowControls }) {
  const { state, adapters } = useOperatingOS();
  const [reports, setReports] = useState<OperatingReport[]>([]);
  const [period, setPeriod] = useState<"today" | "sevenDay" | "month">("today");
  const [voiceResult, setVoiceResult] = useState<VoiceResolution | null>(null);

  useEffect(() => {
    let active = true;
    adapters.reporting.listReports("store", state).then((items) => active && setReports(items));
    return () => { active = false; };
  }, [adapters, state.operatingStage, state.brief.forecastRevenue, state.actionEffects]);

  const today = reports.find((item) => item.id === "today");
  const quickReports = reports.filter((item) => ["sevenDay", "month"].includes(item.id));
  const topics = reports.filter((item) => ["traffic", "product", "reputation", "member", "inventory", "people"].includes(item.id));
  const effect = reports.find((item) => item.id === "actionEffect");
  const selected = reports.find((item) => item.id === period) ?? today;
  return (
    <>
      <AppBrandHeader subtitle="经营报告中心 · 经营结果可追溯" onNotifications={() => flow.push(notificationsScreen)} />
      <div className="report-center-title">
        <span><i className="live-status-dot" />经营数据已更新</span>
        <h1>会回答问题的经营数据</h1>
        <button type="button" aria-label="直接问经营数据" onClick={() => flow.push(reportQuestionScreen)}><MagicWandIcon />继续追问</button>
      </div>

      <div className="report-period-tabs" role="tablist" aria-label="经营周期">
        {([['today', '今日'], ['sevenDay', '7日'], ['month', '本月']] as const).map(([id, label]) => <button type="button" role="tab" aria-selected={period === id} className={period === id ? "active" : ""} key={id} onClick={() => setPeriod(id)}>{label}</button>)}
      </div>

      {selected ? (
        <button type="button" className="report-answer-hero living-report-hero" onClick={() => flow.push(reportDetailScreen(selected.id))}>
          <span><TargetIcon />{selected.question}</span>
          <h2>{selected.conclusion}</h2>
          <div>
            {selected.evidence.map((item) => <span key={item.label} className={`tone-${item.tone}`}><small>{item.label}</small><b>{item.value}</b></span>)}
          </div>
          <p><i className="data-pulse" />查看变化、原因与下一步 <ChevronRightIcon /></p>
        </button>
      ) : <AIWorking label="正在生成经营报告" />}

      <HoldToTalk context="data" compact onResolved={setVoiceResult} />
      {voiceResult ? <button type="button" className="inline-voice-answer" onClick={() => flow.push(reportDetailScreen("traffic"))}><MagicWandIcon /><span><small>“{voiceResult.transcript}”</small><b>{voiceResult.summary}</b></span><ChevronRightIcon /></button> : null}

      <SectionHeading title="经营周期报告" meta="按需下钻" />
      <section className="period-report-list">
        {quickReports.map((report) => (
          <button type="button" key={report.id} onClick={() => flow.push(reportDetailScreen(report.id))}>
            <CalendarIcon /><span><small>{report.period}</small><b>{report.title}</b><p>{report.conclusion}</p></span><ChevronRightIcon />
          </button>
        ))}
      </section>

      <SectionHeading title="常看与最近查看" meta="一键继续" />
      <section className="v9-recent-reports">
        <button type="button" onClick={() => flow.push(reportDetailScreen("traffic"))}><PersonIcon /><span><small>常看</small><b>流量与会员</b></span><ChevronRightIcon /></button>
        <button type="button" onClick={() => flow.push(reportDetailScreen("inventory"))}><CubeIcon /><span><small>刚刚看过</small><b>库存与损耗</b></span><ChevronRightIcon /></button>
      </section>

      <SectionHeading title="经营专题" meta="需要时再下钻" />
      <section className="topic-report-list">
        {topics.map((report) => (
          <button type="button" key={report.id} onClick={() => flow.push(reportDetailScreen(report.id))}>
            <span className={`tone-${report.hero.tone}`}>{report.id === "traffic" ? <PersonIcon /> : report.id === "product" ? <LightningBoltIcon /> : report.id === "reputation" ? <SpeakerLoudIcon /> : report.id === "inventory" ? <CubeIcon /> : report.id === "people" ? <IdCardIcon /> : <TargetIcon />}</span>
            <span><b>{report.title}</b><small>{report.conclusion}</small></span>
            <strong>{report.hero.value}</strong><ChevronRightIcon />
          </button>
        ))}
      </section>

      {effect ? (
        <button type="button" className="effect-ledger-entry" onClick={() => flow.push(actionEffectScreen)}>
          <CheckCircledIcon /><span><small>经营行动有没有效果？</small><b>{effect.conclusion}</b></span><ChevronRightIcon />
        </button>
      ) : null}
    </>
  );
}

function TasksScreen({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const [voiceResult, setVoiceResult] = useState<VoiceResolution | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const visibleActions = state.actions.filter((item) =>
    (item.id !== "regional-support" || item.released)
    && (!item.id.startsWith("product-") || item.released),
  );
  const isWorking = (item: ActionInstance) => ["inProgress", "pendingEvidence", "aiReview", "pendingHumanReview", "returned", "helpRequested"].includes(item.status);
  const isWaiting = (item: ActionInstance) => ["aiSuggested", "pendingConfirmation"].includes(item.status);
  const needsEvidence = (item: ActionInstance) => ["pendingEvidence", "returned"].includes(item.status);
  const needsReview = (item: ActionInstance) => ["aiReview", "pendingHumanReview"].includes(item.status);
  const workGroup = (item: ActionInstance): Exclude<TaskFilter, "all"> => {
    if (item.owner === "黄店长") return "manager";
    if (item.owner.includes("李主管")) return "front";
    if (item.title.includes("鲜椒鸡")) return "kitchen";
    return "support";
  };
  const filterActions = visibleActions.filter((item) => {
    if (filter !== "all") return workGroup(item) === filter;
    return true;
  });
  const owners = [
    { id: "manager" as const, label: "我负责", owner: "黄店长", note: "晨会 · 现场 · 收官", icon: <PersonIcon /> },
    { id: "front" as const, label: "前厅", owner: "李主管", note: "预约 · 顾客体验", icon: <ChatBubbleIcon /> },
    { id: "support" as const, label: "会员运营", owner: "王小丽", note: "召回 · 回执", icon: <TargetIcon /> },
    { id: "kitchen" as const, label: "后厨", owner: "当班厨师长", note: "菜品 · 出餐", icon: <CubeIcon /> },
  ];
  const countFor = (group: Exclude<TaskFilter, "all">) => visibleActions.filter((item) => workGroup(item) === group && item.status !== "closed").length;
  const stageNodes = [
    { time: "08:45", label: "开店准备", ids: ["morning-meeting"] },
    { time: "12:00", label: "午市复查", ids: [] },
    { time: "16:20", label: "晚市准备", ids: ["member-recall", "reservation-followup", "product-recommendation"] },
    { time: "18:00", label: "高峰现场", ids: ["dinner-experience"] },
    { time: "21:30", label: "收官复盘", ids: ["closing-review"] },
  ];
  return (
    <>
      <AppBrandHeader subtitle="今日工作台 · 分工、节点与回传" onNotifications={() => flow.push(notificationsScreen)} />
      <div className="page-title-block compact-title-block v91-task-heading"><span>今天谁做什么</span><h1>工作分工一眼看清</h1><p>首页负责告诉你先做什么；这里负责分工、跟进和收结果。</p></div>
      <section className="v9-task-overview">
        <span><small>已完成</small><b>{visibleActions.filter((item) => item.status === "closed").length}</b></span>
        <span><small>执行中</small><b>{visibleActions.filter(isWorking).length}</b></span>
        <span><small>待确认</small><b>{visibleActions.filter(isWaiting).length}</b></span>
      </section>

      <SectionHeading title="工作分工" meta="按负责人查看" />
      <section className="v91-owner-board" aria-label="今日工作分工">
        {owners.map((item) => <button type="button" key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(filter === item.id ? "all" : item.id)}><i>{item.icon}</i><span><b>{item.label}</b><small>{item.owner}</small><em>{item.note}</em></span><strong>{countFor(item.id)}项</strong></button>)}
      </section>

      <SectionHeading title="营业关键节点" meta="按时间推进" />
      <section className="v91-stage-map" aria-label="营业关键节点">
        {stageNodes.map((node) => {
          const nodeActions = visibleActions.filter((item) => node.ids.includes(item.id));
          const done = nodeActions.length > 0 && nodeActions.every((item) => item.status === "closed");
          const active = nodeActions.some((item) => item.status !== "closed") || (node.ids.length === 0 && state.operatingStage === "lunchReview");
          const target = nodeActions.find((item) => item.status !== "closed") ?? nodeActions[0];
          return <button type="button" key={node.time} className={done ? "done" : active ? "active" : ""} onClick={() => target ? flow.push(actionScreen(target.id)) : flow.push(lunchInspectionScreen)}><time>{node.time}</time><i>{done ? <CheckCircledIcon /> : <ClockIcon />}</i><span><b>{node.label}</b><small>{nodeActions.length ? `${nodeActions.length}项工作` : "现场复查"}</small></span></button>;
        })}
      </section>

      <section className="v91-attention-board">
        <button type="button" onClick={() => setFilter("all")}><DashboardIcon /><span><small>待回传</small><b>{visibleActions.filter(needsEvidence).length}项</b></span><ChevronRightIcon /></button>
        <button type="button" onClick={() => setFilter("all")}><CheckCircledIcon /><span><small>待验收</small><b>{visibleActions.filter(needsReview).length}项</b></span><ChevronRightIcon /></button>
      </section>

      <div className="v91-task-voice"><HoldToTalk context="tasks" compact onResolved={setVoiceResult} /></div>
      {voiceResult ? <button type="button" className="inline-voice-answer" onClick={() => flow.push(memberRecallScreen)}><MagicWandIcon /><span><small>AI已预填，尚未下发</small><b>{voiceResult.summary}</b></span><ChevronRightIcon /></button> : null}

      <SectionHeading title="全部工作" meta={`${visibleActions.filter((item) => item.status === "closed").length}/${visibleActions.length}已闭环`} />
      <div className="v9-task-filters" role="tablist" aria-label="任务筛选">
        {([['all', '全部'], ['manager', '我负责'], ['front', '前厅'], ['support', '会员运营'], ['kitchen', '后厨']] as const).map(([id, label]) => <button type="button" key={id} role="tab" aria-selected={filter === id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}
      </div>
      <section className="playbook-progress collapsed-history">
        {filterActions.map((item, index) => <button type="button" key={item.id} onClick={() => flow.push(actionScreen(item.id))} className={item.status === "closed" ? "done" : isWorking(item) ? "current" : ""}><time>{item.time}</time><i>{item.status === "closed" ? <CheckCircledIcon /> : index + 1}</i><span><b>{item.title}</b><small>{item.owner} · {item.method} · {item.evidenceRequired[0]}</small></span><StatusPill status={item.status} /><ChevronRightIcon /></button>)}
      </section>
      <button type="button" className="plain-wide-button" onClick={() => flow.push(playbookScreen)}>查看经营时间线与回执 <ChevronRightIcon /></button>
    </>
  );
}

function AcademyScreen({ flow }: { flow: FlowControls }) {
  const { state, adapters } = useOperatingOS();
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [assets, setAssets] = useState<LearningAsset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<LearningCategory["id"]>("growth");
  const [query, setQuery] = useState("");
  const [voiceResult, setVoiceResult] = useState<VoiceResolution | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([adapters.knowledge.listCategories(), adapters.knowledge.listLearningPaths(), adapters.knowledge.listLearningAssets(selectedCategory)]).then(([categoryItems, pathItems, assetItems]) => {
      if (active) { setCategories(categoryItems); setPaths(pathItems); setAssets(assetItems); }
    });
    return () => { active = false; };
  }, [adapters, selectedCategory]);

  const progress = state.learningProgress.find((item) => item.assetId === "team-meeting");
  const filtered = query.trim() ? assets.filter((item) => `${item.title}${item.solves}`.includes(query.trim())) : assets;
  const categoryIcon = (id: LearningCategory["id"]) => id === "growth" ? <RocketIcon /> : id === "traffic" ? <PersonIcon /> : id === "product" ? <LightningBoltIcon /> : id === "inventory" ? <CubeIcon /> : id === "experience" ? <StarIcon /> : <IdCardIcon />;

  return (
    <>
      <AppBrandHeader subtitle="麻婆经营大学 · 学完马上实操" onNotifications={() => flow.push(notificationsScreen)} />
      <div className="v9-university-heading"><span>周麻婆经营方法都在这里</span><h1>麻婆经营大学</h1><p>遇到问题能查询，也能按路径系统学习。</p></div>
      <label className="v9-academy-search"><MagnifyingGlassIcon /><KeyboardInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索流量、菜品、库存或带教" aria-label="搜索经营课程" /></label>
      <HoldToTalk context="academy" compact onResolved={(result) => setVoiceResult(result)} />
      {voiceResult ? <button type="button" className="academy-voice-result" onClick={() => flow.push(learningDetailScreen("experience-wait"))}><MagicWandIcon /><span><small>AI已匹配课程</small><b>{voiceResult.summary}</b></span><ChevronRightIcon /></button> : null}

      <SectionHeading title="继续学习" meta={`${progress?.percent ?? 60}%`} />
      <button type="button" className="v9-continue-course" onClick={() => flow.push(learningDetailScreen("team-meeting"))}><img src="/assets/morning-briefing-demo.png" alt="3分钟晨会课程演示" /><span><small>新店长7天入门 · 第2课</small><b>3分钟晨会</b><i><em style={{ width: `${progress?.percent ?? 60}%` }} /></i></span><ChevronRightIcon /></button>

      <SectionHeading title="六大经营分类" meta="每类3课" />
      <section className="v9-learning-categories">
        {categories.map((item) => <button type="button" key={item.id} className={selectedCategory === item.id ? "active" : ""} onClick={() => setSelectedCategory(item.id)}><span>{categoryIcon(item.id)}</span><b>{item.title}</b><small>{item.subtitle}</small></button>)}
      </section>

      <SectionHeading title={categories.find((item) => item.id === selectedCategory)?.title ?? "今日推荐"} meta={`${filtered.length}个内容`} />
      <section className="v9-course-list" data-testid="learning-assets">
        {filtered.map((item) => <button type="button" key={item.id} onClick={() => flow.push(learningDetailScreen(item.id))}><img src={item.media.src} alt={item.media.alt} /><span><small>{item.format} · {item.duration}</small><b>{item.title}</b><p>{item.solves}</p></span><ChevronRightIcon /></button>)}
      </section>

      <SectionHeading title="三条学习路径" meta="按岗位问题学习" />
      <section className="v9-learning-paths">
        {paths.map((item) => <button type="button" key={item.id} className={`tone-${item.accent}`} onClick={() => flow.push(learningPathScreen(item.id))}><span><RocketIcon /></span><div><b>{item.title}</b><small>{item.subtitle} · {item.assetIds.length}课</small></div><ChevronRightIcon /></button>)}
      </section>

      <SectionHeading title="优秀门店案例与总部SOP" meta="已脱敏" />
      <button type="button" className="knowledge-match-row" onClick={() => flow.push(learningDetailScreen("traffic-recall"))}><ReaderIcon /><span><small>优秀门店案例</small><b>30分钟会员召回17桌的做法</b></span><ChevronRightIcon /></button>
    </>
  );
}

function MineScreen({ flow, openRole, openReset }: { flow: FlowControls; openRole: () => void; openReset: () => void }) {
  const { state, dispatch } = useOperatingOS();
  const workspace = state.managerWorkspace;
  const completed = state.actions.filter((item) => item.status === "closed").length;
  const learned = state.learningProgress.filter((item) => item.completed).length;
  const favorites = state.learningProgress.filter((item) => item.bookmarked).length;
  const moments: Array<{ id: OperatingMomentId; label: string }> = [
    { id: "preOpen", label: "08:30" },
    { id: "lunch", label: "12:00" },
    { id: "afternoon", label: "14:30" },
    { id: "dinner", label: "17:30" },
    { id: "closing", label: "21:30" },
  ];
  return (
    <>
      <AppBrandHeader subtitle="店长个人工作中心 · V9" />
      <section className="manager-profile-card v9-profile-card">
        <span className="manager-avatar">黄</span>
        <div><small>{workspace.storeName}</small><h1>{workspace.managerName}</h1><p><StarIcon /> {workspace.starLevel}星店长 · 距3星还差3项条件</p></div>
        <button type="button" onClick={() => flow.push(managerPromotionScreen)}>晋升路径 <ChevronRightIcon /></button>
      </section>
      <section className="v9-mine-today">
        <span><small>今日目标</small><b>¥100,000</b></span><span><small>任务闭环</small><b>{completed}/{state.actions.filter((item) => item.released).length}</b></span><span><small>学习进度</small><b>{learned}/18</b></span>
      </section>
      <section className="v9-mine-links">
        <button type="button" onClick={() => dispatch({ type: "setTab", role: "storeManager", tab: "tasks" })}><ClipboardIcon /><b>我的任务</b><small>{state.actions.filter((item) => item.released && item.status !== "closed").length}项进行中</small></button>
        <button type="button" onClick={() => dispatch({ type: "setTab", role: "storeManager", tab: "data" })}><BarChartIcon /><b>我的报表</b><small>{state.reportExports.length}份草稿</small></button>
        <button type="button" onClick={() => dispatch({ type: "setTab", role: "storeManager", tab: "academy" })}><BackpackIcon /><b>我的学习</b><small>{learned}课已完成</small></button>
        <button type="button" onClick={() => flow.push(managerRecordsScreen)}><BookmarkIcon /><b>我的收藏</b><small>{favorites}个内容</small></button>
      </section>

      <SectionHeading title="本月经营成长" meta="来自真实行动证据" />
      <section className="v9-growth-summary">
        <div><b>连续完成</b><strong>2/7天</strong><small>每天完成收官复盘</small></div>
        <div><b>有效方法</b><strong>3项</strong><small>会员召回最值得复用</small></div>
        <div><b>证据完整</b><strong>90%</strong><small>比上周提高5%</small></div>
      </section>
      <button type="button" className="v9-promotion-entry" onClick={() => flow.push(managerPromotionScreen)}><span><StarIcon /></span><div><small>二星升三星</small><b>已达成1/4项条件</b><em><i style={{ width: "25%" }} /></em></div><ChevronRightIcon /></button>

      <SectionHeading title="最近经营记录" meta="可追溯" />
      <section className="v9-recent-activity">
        {state.activity.slice(0, 3).map((item) => <button type="button" key={item.id} onClick={() => flow.push(managerRecordsScreen)}><CheckCircledIcon /><span><b>{item.event}</b><small>{item.actor} · {item.time}</small></span><ChevronRightIcon /></button>)}
      </section>

      <SectionHeading title="设置与说明" />
      <section className="settings-list v9-settings-list">
        <RowButton icon={<BellIcon />} title="消息设置" body="经营提醒、任务回执与验收结果" onClick={() => flow.push(notificationsScreen)} />
        <RowButton icon={<InfoCircledIcon />} title="数据与权限说明" body="演示数据 · 所有正式动作需人工确认" onClick={() => flow.push(dataAnswerScreen)} />
      </section>
      <details className="v9-demo-tools"><summary>演示与帮助 <ChevronRightIcon /></summary><div><RowButton icon={<PersonIcon />} title="角色联动演示" body="区域经理与总部经营中心" onClick={openRole} /><div className="moment-switcher"><span><ClockIcon /><b>切换经营时段</b></span><div>{moments.map((item) => <button type="button" key={item.id} className={state.operatingMoment === item.id ? "active" : ""} onClick={() => dispatch({ type: "setMoment", moment: item.id })}>{item.label}</button>)}</div></div><RowButton icon={<ReloadIcon />} title="重置V9演示" body="不会清除V2至V8进度" onClick={openReset} /></div></details>
      <DecisionSafety />
    </>
  );
}

function AllOperationsScreen({ flow }: { flow: FlowControls }) {
  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <div className="page-title-block compact-title-block"><span>少填表，直接完成</span><h1>店长常用工作</h1><p>按住说话、拍一张或确认一次即可继续。</p></div>
        <HoldToTalk context="operations" onResolved={(result) => result.targetId === "operation-procurement" && flow.push(procurementScreen)} />
        <section className="v9-operation-grid">
          <button type="button" onClick={() => flow.push(meetingScreen)}><SpeakerLoudIcon /><span><b>开晨会</b><small>语音生成行动</small></span><ChevronRightIcon /></button>
          <button type="button" onClick={() => flow.push(lunchInspectionScreen)}><CameraIcon /><span><b>拍照巡检</b><small>AI识别异常</small></span><ChevronRightIcon /></button>
          <button type="button" onClick={() => flow.push(procurementScreen)}><ArchiveIcon /><span><b>采购申请</b><small>库存预警到验收</small></span><ChevronRightIcon /></button>
          <button type="button" onClick={() => flow.push(soldOutScreen)}><CubeIcon /><span><b>库存与沽清</b><small>同步渠道再恢复</small></span><ChevronRightIcon /></button>
          <button type="button" onClick={() => flow.push(reportDetailScreen("product"))}><LightningBoltIcon /><span><b>菜品管理</b><small>动销与推荐话术</small></span><ChevronRightIcon /></button>
          <button type="button" onClick={() => flow.push(learningDetailScreen("team-new"))}><IdCardIcon /><span><b>人员带教</b><small>新人7天训练</small></span><ChevronRightIcon /></button>
          <button type="button" onClick={() => flow.push(reportDetailScreen("today"))}><BarChartIcon /><span><b>经营报表</b><small>日报、周报与问数</small></span><ChevronRightIcon /></button>
          <button type="button" onClick={() => flow.push(closingReviewScreen)}><ReaderIcon /><span><b>收官复盘</b><small>结果与明日动作</small></span><ChevronRightIcon /></button>
        </section>
        <DecisionSafety />
      </main>
    </MobileScroll>
  );
}

function StoreOperationScreen({ flow, flowId }: { flow: FlowControls; flowId: string }) {
  const { state, dispatch, adapters, run, showToast } = useOperatingOS();
  const operation = state.storeOperations.find((item) => item.id === flowId)!;
  const isProcurement = operation.kind === "procurement";
  const procurementSteps = ["库存预警", "AI采购草稿", "店长确认", "提交申请", "到货回执", "拍照验收"];
  const soldOutSteps = ["库存不足", "选择沽清", "确认替代菜", "渠道同步", "库存恢复", "重新上架"];
  const steps = isProcurement ? procurementSteps : soldOutSteps;

  const advance = async () => {
    const next = await run(isProcurement ? "正在更新采购流程" : "正在同步库存与渠道", () => adapters.storeOperations.advance(flowId, state));
    if (!next) return;
    dispatch({ type: "setStoreOperation", flow: next });
    showToast(next.status === "closed" ? `${next.title}已闭环` : `${steps[next.step]}已完成`);
  };

  const buttonLabel = isProcurement
    ? ["让AI生成采购草稿", "确认数量与预算", "人工确认提交", "模拟供应商接单", "拍照验收到货", "已完成"]
    : ["选择一键沽清", "确认替代菜", "人工确认同步渠道", "模拟库存恢复", "重新上架", "已完成"];

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page v9-operation-flow">
        <section className="v9-operation-hero"><span>{isProcurement ? <ArchiveIcon /> : <CubeIcon />}{isProcurement ? "采购轻闭环" : "库存沽清轻闭环"}</span><h1>{operation.title}</h1><p>{operation.alert}</p><div><small>{operation.item}</small><b>{operation.quantity}</b><em>{operation.costImpact}</em></div></section>
        <section className="v9-operation-steps">{steps.map((item, index) => <div key={item} className={index < operation.step ? "done" : index === operation.step ? "current" : ""}><i>{index < operation.step ? <CheckCircledIcon /> : index + 1}</i><span><b>{item}</b><small>{index === operation.step ? "当前步骤" : index < operation.step ? "已完成" : "待处理"}</small></span></div>)}</section>
        {operation.step >= 1 && isProcurement ? <section className="v9-operation-draft"><small>AI已预填 · 尚未提交</small><div><span>采购品</span><b>鲜鸡腿肉</b></div><div><span>建议数量</span><b>80kg</b></div><div><span>预算</span><b>¥2,960</b></div><p>依据：近7日日均用量32kg + 周末晚市预测。</p></section> : null}
        {operation.step >= 2 && !isProcurement ? <section className="v9-substitute-dish"><img src="/assets/explosive-chili-chicken.png" alt="替代菜品演示图" /><span><small>AI推荐替代菜</small><b>酸菜鱼小份</b><p>前厅先告知顾客，避免下单后退款。</p></span></section> : null}
        {!isProcurement && operation.step >= 3 ? <section className="v9-channel-receipts">{operation.channelReceipts.map((item) => <span key={item.name}><b>{item.name}</b><small>{item.status === "pending" ? "待同步" : item.status === "synced" ? "已沽清" : "已恢复"}</small></span>)}</section> : null}
        {operation.evidenceUrl ? <figure className="report-story-media"><img src={operation.evidenceUrl} alt="到货验收演示照片" /><figcaption>店长拍照回传 <span>AI验收通过</span></figcaption></figure> : null}
        {operation.status !== "closed" ? <PrimaryButton onClick={advance}>{buttonLabel[operation.step]}</PrimaryButton> : <ResultCard title={isProcurement ? "到货验收完成" : "菜品已恢复上架"} body={isProcurement ? "80kg鲜鸡腿肉已到货，照片与数量已核对。" : "收银、美团、抖音均已恢复，前厅已收到通知。"} impact={isProcurement ? "库存预警解除 · 未自动付款" : "预计避免2单退款 · 为模拟渠道回执"} next="明日10:00复查库存" />}
        <HumanConfirmNote text={isProcurement ? "AI不会自动付款或完成正式审批" : "渠道同步为确定性演示，正式系统需平台回执"} />
      </main>
    </MobileScroll>
  );
}

function LearningDetailScreen({ flow, assetId }: { flow: FlowControls; assetId: string }) {
  const { state, dispatch, adapters, showToast } = useOperatingOS();
  const [asset, setAsset] = useState<LearningAsset | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  useEffect(() => { adapters.knowledge.getLearningAsset(assetId).then(setAsset); }, [adapters, assetId]);
  const progress = state.learningProgress.find((item) => item.assetId === assetId);
  if (!asset) return <MobileScroll className="final-scroll"><main className="final-detail-page"><AIWorking label="正在打开课程" /></main></MobileScroll>;
  const passed = selectedAnswer === asset.quiz.correctIndex || progress?.quizPassed;
  const practice = () => {
    dispatch({ type: "updateLearningProgress", assetId, percent: 100, quizPassed: true, completed: true });
    showToast("课程已完成，已保留学习与实操记录");
    const target = asset.practiceTarget === "meeting" ? meetingScreen : asset.practiceTarget === "inspection" ? lunchInspectionScreen : asset.practiceTarget === "procurement" ? procurementScreen : asset.practiceTarget === "soldOut" ? soldOutScreen : asset.practiceTarget === "playbook" ? playbookScreen : null;
    if (target) flow.push(target); else flow.pop();
  };
  return (
    <MobileScroll className="final-scroll"><main className="final-detail-page v9-course-detail">
      <figure><img src={asset.media.src} alt={asset.media.alt} /><figcaption>{asset.media.source} · 演示素材</figcaption></figure>
      <section className="v9-course-heading"><div><span>{asset.format} · {asset.duration}</span><button type="button" aria-label="收藏课程" className={progress?.bookmarked ? "active" : ""} onClick={() => dispatch({ type: "updateLearningProgress", assetId, bookmarked: !progress?.bookmarked })}><BookmarkIcon /></button></div><h1>{asset.title}</h1><p>{asset.solves}</p></section>
      <SectionHeading title="现场三步做法" />
      <ol className="v9-learning-steps">{asset.steps.map((item, index) => <li key={item}><b>{index + 1}</b><span>{item}</span></li>)}</ol>
      <section className="v9-course-quiz"><small>现场小测</small><h2>{asset.quiz.question}</h2>{asset.quiz.options.map((item, index) => <button type="button" key={item} className={selectedAnswer === index ? (index === asset.quiz.correctIndex ? "correct" : "wrong") : ""} onClick={() => { setSelectedAnswer(index); if (index === asset.quiz.correctIndex) dispatch({ type: "updateLearningProgress", assetId, percent: 90, quizPassed: true }); }}>{String.fromCharCode(65 + index)}. {item}{selectedAnswer === index && index === asset.quiz.correctIndex ? <CheckCircledIcon /> : null}</button>)}{selectedAnswer !== null && !passed ? <p>再想想：要看现场结果，不只看动作数量。</p> : null}</section>
      <div className="v9-course-source"><InfoCircledIcon /><span><b>{asset.source} · {asset.version}</b><small>适用：{asset.scope}</small></span></div>
      <PrimaryButton disabled={!passed} onClick={practice}>{asset.practiceTarget === "tasks" ? "加入今日行动" : "马上实操"}</PrimaryButton>
    </main></MobileScroll>
  );
}

function LearningPathScreen({ flow, pathId }: { flow: FlowControls; pathId: string }) {
  const { state, adapters } = useOperatingOS();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [assets, setAssets] = useState<LearningAsset[]>([]);
  useEffect(() => { Promise.all([adapters.knowledge.listLearningPaths(), adapters.knowledge.listLearningAssets()]).then(([paths, items]) => { setPath(paths.find((item) => item.id === pathId) ?? paths[0]); setAssets(items); }); }, [adapters, pathId]);
  if (!path) return <MobileScroll className="final-scroll"><main className="final-detail-page"><AIWorking label="正在打开学习路径" /></main></MobileScroll>;
  const pathAssets = path.assetIds.map((id) => assets.find((item) => item.id === id)).filter(Boolean) as LearningAsset[];
  return <MobileScroll className="final-scroll"><main className="final-detail-page"><section className={`v9-path-hero tone-${path.accent}`}><RocketIcon /><span><small>{pathAssets.length}课 · 学完可直接实操</small><h1>{path.title}</h1><p>{path.subtitle}</p></span></section><section className="v9-path-list">{pathAssets.map((asset, index) => { const progress = state.learningProgress.find((item) => item.assetId === asset.id); return <button type="button" key={asset.id} onClick={() => flow.push(learningDetailScreen(asset.id))}><i>{progress?.completed ? <CheckCircledIcon /> : index + 1}</i><span><b>{asset.title}</b><small>{asset.duration} · {progress?.completed ? "已完成" : `${progress?.percent ?? 0}%`}</small></span><ChevronRightIcon /></button>; })}</section></main></MobileScroll>;
}

function PromotionScreen({ flow: _flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const workspace = state.managerWorkspace;
  return <MobileScroll className="final-scroll"><main className="final-detail-page"><section className="v9-promotion-hero"><StarIcon /><span><small>{workspace.starLevel}星店长</small><h1>下一站：{workspace.nextStarLevel}星店长</h1><p>条件来自经营结果与证据，不是抽象打分。</p></span></section><section className="v9-promotion-conditions">{workspace.promotionConditions.map((item) => <div key={item.label} className={item.met ? "met" : ""}><i>{item.met ? <CheckCircledIcon /> : <ClockIcon />}</i><span><b>{item.label}</b><small>当前 {item.current}</small></span><strong>{item.target}</strong></div>)}</section><section className="v9-next-growth"><small>AI建议下一步</small><b>连续完成本月第3次盈利复盘</b><p>完成收官复盘并保留行动效果证据。</p></section></main></MobileScroll>;
}

function ManagerRecordsScreen({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const favorites = state.learningProgress.filter((item) => item.bookmarked);
  return <MobileScroll className="final-scroll"><main className="final-detail-page"><SectionHeading title="我的收藏" meta={`${favorites.length}个`} /><section className="v9-record-list">{favorites.length ? favorites.map((item) => <button type="button" key={item.assetId} onClick={() => flow.push(learningDetailScreen(item.assetId))}><BookmarkIcon /><span><b>{item.assetId === "team-meeting" ? "3分钟晨会" : "经营课程"}</b><small>学习进度 {item.percent}%</small></span><ChevronRightIcon /></button>) : <EmptyState title="还没有收藏" body="在经营大学课程详情中点击收藏。" />}</section><SectionHeading title="经营记录" meta="最近10条" /><section className="v9-record-list">{state.activity.slice(0, 10).map((item) => <div key={item.id}><ActivityLogIcon /><span><b>{item.event}</b><small>{item.actor} · {item.time}</small></span></div>)}</section></main></MobileScroll>;
}

function NotificationScreen({ flow }: { flow: FlowControls }) {
  const { state, dispatch } = useOperatingOS();
  const notifications = state.notifications.filter((item) => item.role === "storeManager");
  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <p className="detail-lead">提醒不是消息堆积，点开后直接进入对应行动。</p>
        <section className="notification-list">
          {notifications.map((item) => (
            <button type="button" key={item.id} className={item.read ? "read" : ""} onClick={() => {
              dispatch({ type: "markNotification", notificationId: item.id });
              if (item.entityId) flow.push(actionScreen(item.entityId));
              else flow.push(playbookScreen);
            }}>
              <BellIcon /><span><small>{item.createdAt}</small><b>{item.title}</b><p>{item.body}</p></span><ChevronRightIcon />
            </button>
          ))}
        </section>
      </main>
    </MobileScroll>
  );
}

function BusinessAnswerScreen({ flow }: { flow: FlowControls }) {
  const { state, adapters, run } = useOperatingOS();
  const signal = state.signals[0];
  const [explanation, setExplanation] = useState<{ summary: string; nextAction: string } | null>(null);

  const analyze = async () => {
    await run("正在分析近7天经营数据", async () => {
      setExplanation(await adapters.decision.explainSignal(signal));
    });
  };

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="answer-hero">
          <span>AI判断 · 置信度{signal.confidence}%</span>
          <h1>{signal.managerLanguage}</h1>
          <p>不是顾客消费变少，而是晚市到店与预约同时不足。</p>
        </section>
        <SectionHeading title="为什么这样判断" meta={`${signal.sourceUpdatedAt}更新`} />
        <section className="reason-chain">
          {signal.evidence.map((item, index) => <div key={item}><i>{index + 1}</i><span><b>{item}</b><small>{index === 0 ? "POS + 历史同星期" : "预约系统模拟回传"}</small></span></div>)}
        </section>
        <section className="plain-calculation">
          <InfoCircledIcon /><span><b>换算口径</b><p>{state.brief.conversionBasis}</p><small>实际系统将由集团指标字典统一维护。</small></span>
        </section>
        <section className="benchmark-detail">
          <b>{state.benchmarks[0].translatedGap}</b>
          <p>{state.benchmarks[0].sourceAt}</p>
        </section>
        {explanation ? <ResultCard title={explanation.summary} body={explanation.nextAction} impact="预计补回19至25桌" next="17:00复查预约" /> : null}
        <PrimaryButton onClick={explanation ? () => flow.push(memberRecallScreen) : analyze}>{explanation ? "执行会员召回" : "让AI给出下一步"}</PrimaryButton>
      </main>
    </MobileScroll>
  );
}

function reportIcon(id: ReportId) {
  if (id === "traffic" || id === "member") return <PersonIcon />;
  if (id === "product") return <LightningBoltIcon />;
  if (id === "reputation") return <SpeakerLoudIcon />;
  if (id === "actionEffect") return <CheckCircledIcon />;
  if (id === "month" || id === "sevenDay") return <CalendarIcon />;
  return <TargetIcon />;
}

function ReportDetailScreen({ flow, reportId }: { flow: FlowControls; reportId: ReportId }) {
  const { state, dispatch, adapters, run, approval, showToast } = useOperatingOS();
  const [report, setReport] = useState<VisualReport | null>(null);

  useEffect(() => {
    let active = true;
    adapters.reporting.getVisualReport(reportId, "store", state).then((item) => active && setReport(item));
    return () => { active = false; };
  }, [adapters, reportId, state.operatingStage, state.brief.forecastRevenue, state.actionEffects]);

  if (!report) return <MobileScroll className="final-scroll"><main className="final-detail-page"><AIWorking label="核对经营数据 → 生成经营结论" /></main></MobileScroll>;
  const actionItem = report.recommendedActionId ? getAction(state, report.recommendedActionId) : undefined;
  const addAction = async () => {
    if (!report.recommendedActionId || !actionItem) return;
    await run("正在把报表结论转成经营行动", async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 420));
      dispatch({
        type: "addReportAction",
        reportId: report.id,
        actionId: report.recommendedActionId!,
        approval: approval("action", report.recommendedActionId!, "confirmed", `确认从${report.title}加入经营剧本`),
      });
    });
    showToast("已加入今日经营剧本，执行前仍需人工确认");
    flow.replace(actionScreen(report.recommendedActionId));
  };

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page report-detail-page">
        <section className={`report-detail-hero tone-${report.hero.tone}`}>
          <div>{reportIcon(report.id)}<span><small>{report.period} · {report.updatedAt}更新</small><b>{report.question}</b></span></div>
          <h1>{report.conclusion}</h1>
          <p><strong>{report.hero.value}</strong><span>{report.hero.label}<small>{report.hero.note}</small></span></p>
        </section>

        {report.media ? (
          <figure className="report-story-media">
            <img src={report.media.src} alt={report.media.alt} draggable={false} />
            <figcaption><span>{report.media.demo ? "演示场景" : "经营证据"}</span>{report.media.source}</figcaption>
          </figure>
        ) : null}

        <section className="report-evidence-grid">
          {report.evidence.map((item) => <div key={item.label} className={`tone-${item.tone}`}><small>{item.label}</small><b>{item.value}</b><span>{item.note}</span></div>)}
        </section>

        <SectionHeading title="趋势与对照" meta={report.series[0]?.unit ? `单位：${report.series[0].unit}` : undefined} />
        <section className={`visual-report-chart mode-${report.visualMode}`} aria-label={`${report.title}趋势`}>
          {report.segments.map((segment, index) => (
            <div key={segment.label} className={`tone-${segment.tone}`}>
              <span><b>{segment.label}</b><small>{segment.value}</small></span>
              <i><em style={{ "--report-ratio": segment.ratio } as React.CSSProperties} /></i>
              {report.series[index]?.benchmark !== undefined ? <strong>常态 {report.series[index].benchmark?.toLocaleString("zh-CN")}{report.series[index].unit}</strong> : null}
            </div>
          ))}
        </section>
        <div className="report-change-note"><i className="data-pulse" /><span><b>变化来源</b><small>{report.changeNote}</small></span></div>

        <details className="report-reason-details">
          <summary>为什么这样判断 <span>置信度{report.confidence}%</span></summary>
          <ol>{report.reasonChain.map((reason) => <li key={reason}>{reason}</li>)}</ol>
          <p><b>数据来源</b>{report.source}</p>
          {report.conversionBasis ? <p><b>换算口径</b>{report.conversionBasis}</p> : null}
          <p><b>下次复查</b>{report.recheckAt}</p>
        </details>

        {report.id === "actionEffect" ? (
          <PrimaryButton onClick={() => flow.push(actionEffectScreen)}>查看每项行动真实效果</PrimaryButton>
        ) : report.recommendedActionId && actionItem ? (
          <PrimaryButton onClick={actionItem.released ? () => flow.push(actionScreen(actionItem.id)) : addAction}>
            {actionItem.released ? "进入对应经营行动" : "人工确认并加入今日行动"}
          </PrimaryButton>
        ) : null}
        <div className="report-secondary-actions">
          <SecondaryButton onClick={() => flow.push(reportExportScreen(report.id))}>生成长图 / 简报</SecondaryButton>
          <SecondaryButton onClick={() => flow.push(reportQuestionScreen)}>继续问AI</SecondaryButton>
        </div>
        <HumanConfirmNote text="报表可以由AI生成；转成行动或对外发送仍需人工确认" />
      </main>
    </MobileScroll>
  );
}

const reportQuestionOptions: Array<{ id: ReportQuestionId; label: string }> = [
  { id: "canReachTarget", label: "今天能不能达标？" },
  { id: "whyGuestsLow", label: "为什么今天顾客少？" },
  { id: "whichDish", label: "今天重点推荐哪道菜？" },
  { id: "whichActionWorked", label: "最近哪项行动最有效？" },
];

function ReportQuestionScreen({ flow }: { flow: FlowControls }) {
  const { state, adapters, run } = useOperatingOS();
  const [answer, setAnswer] = useState<ReportAnswer | null>(null);
  const ask = async (questionId: ReportQuestionId) => {
    await run("核对经营数据 → 匹配周麻婆案例 → 生成答案", async () => {
      setAnswer(await adapters.reporting.answerQuestion(questionId, state));
    });
  };
  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page report-question-page">
        <section className="report-question-hero"><MagicWandIcon /><span><small>AI经营问数</small><h1>直接问经营问题</h1><p>不用记指标名，系统会给结论、证据和下一步。</p></span></section>
        <div className="report-question-options">
          {reportQuestionOptions.map((item) => <button type="button" key={item.id} className={answer?.questionId === item.id ? "active" : ""} onClick={() => ask(item.id)}>{item.label}<ChevronRightIcon /></button>)}
        </div>
        {answer ? (
          <section className="report-answer-card">
            <span>AI回答 · 演示数据</span><h2>{answer.answer}</h2>
            <ul>{answer.evidence.map((item) => <li key={item}><CheckCircledIcon />{item}</li>)}</ul>
            <div><small>建议下一步</small><b>{answer.nextAction}</b></div>
            <PrimaryButton onClick={() => flow.push(reportDetailScreen(answer.reportId))}>查看对应详细报表</PrimaryButton>
            {answer.recommendedActionId ? <SecondaryButton onClick={() => flow.push(actionScreen(answer.recommendedActionId!))}>进入经营行动</SecondaryButton> : null}
          </section>
        ) : <p className="report-question-hint"><SpeakerLoudIcon />正式版可直接说：“为什么今天顾客少？”</p>}
      </main>
    </MobileScroll>
  );
}

function ReportExportScreen({ flow, reportId }: { flow: FlowControls; reportId: ReportId }) {
  const { state, dispatch, adapters, run, approval, showToast } = useOperatingOS();
  const latest = state.reportExports.find((item) => item.reportId === reportId);
  const [generated, setGenerated] = useState<ReportExport | null>(latest ?? null);
  const kinds: Array<{ id: ReportExport["kind"]; title: string; body: string }> = [
    { id: "longImage", title: "经营战报长图", body: "适合发门店工作群" },
    { id: "dailyBrief", title: "店长经营日报", body: "结论、动作与复查结果" },
    { id: "weeklyReview", title: "7日经营复盘", body: "适合区域周复盘" },
    { id: "voiceBrief", title: "90秒语音简报", body: "通勤时快速听经营重点" },
  ];
  const generate = async (kind: ReportExport["kind"]) => {
    const entityId = `report-export-${state.reportExports.length + 1}`;
    const record = approval("decision", entityId, "confirmed", "确认生成经营简报草稿，不自动发送");
    const result = await run("正在整理结论、证据与下一步", () => adapters.reporting.generateExport(reportId, kind, state));
    if (!result) return;
    const exportRecord: ReportExport = { ...result, id: entityId, createdBy: "黄店长", approvalRecordId: record.id };
    dispatch({ type: "createReportExport", report: exportRecord, approval: record });
    setGenerated(exportRecord);
    showToast("简报草稿已生成，未自动发送");
  };
  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="export-intro-card"><DownloadIcon /><span><small>只生成草稿，不自动发送</small><h1>选择交付形式</h1><p>所有数据、结论和下一步会按同一经营口径生成。</p></span></section>
        <section className="export-kind-list">
          {kinds.map((kind) => <button type="button" key={kind.id} onClick={() => generate(kind.id)}><FileTextIcon /><span><b>{kind.title}</b><small>{kind.body}</small></span><ChevronRightIcon /></button>)}
        </section>
        {generated ? <ResultCard title={`${generated.title}已生成`} body={generated.summary} impact="仅生成演示草稿，未发送到任何真实群" next="人工确认后再转发"><SecondaryButton onClick={() => { showToast("已打开演示预览"); flow.pop(); }}>查看报告原页</SecondaryButton></ResultCard> : null}
        <DecisionSafety title="报告发送边界" />
      </main>
    </MobileScroll>
  );
}

function effectStatusClass(item: ActionEffectRecord) {
  if (item.status === "verified") return "verified";
  if (item.status === "measuring") return "measuring";
  return "forecast";
}

function ActionEffectLedger({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="effect-ledger-hero"><CheckCircledIcon /><span><small>不是做完就算有效</small><h1>每项行动都对到真实结果</h1><p>预测、预约和实际营业严格分开。</p></span></section>
        <section className="effect-record-list">
          {state.actionEffects.map((item) => (
            <article key={item.id} className={effectStatusClass(item)}>
              <header><span>{item.verdict}</span><small>{item.executedAt}</small></header>
              <h2>{item.title}</h2><p>{item.problem} · {item.owner}</p>
              <div className="effect-journey" aria-label="行动效果链">
                <span><small>1 行动前</small><b>{item.problem}</b></span>
                <span><small>2 执行</small><b>{item.title}</b></span>
                <span><small>3 中间结果</small><b>{item.measured.tables ? `${item.measured.tables}桌 · ${item.measured.guests}人` : item.status === "forecast" ? "等待回传" : "已完成现场动作"}</b></span>
                <span><small>4 实际验证</small><b>{item.measured.actualRevenue ? `实际+¥${item.measured.actualRevenue.toLocaleString("zh-CN")}` : item.status === "verified" ? "问题未重复" : "实际收入未计入"}</b></span>
                <span><small>5 是否复用</small><b>{item.reusable ? "已证明可复用" : "证据不足，暂不复用"}</b></span>
              </div>
              <div className="effect-note"><FileTextIcon /><span>{item.measured.note}</span></div>
              <footer><small>{item.source}</small><b>{item.reusable ? "可复用" : `${item.recheckAt}复查`}</b></footer>
            </article>
          ))}
        </section>
        <SecondaryButton onClick={() => flow.push(reportExportScreen("actionEffect"))}>生成行动效果复盘</SecondaryButton>
      </main>
    </MobileScroll>
  );
}

function CurrentKnowledgeCase({ flow }: { flow: FlowControls }) {
  const { state, adapters, run, showToast } = useOperatingOS();
  const [item, setItem] = useState<Awaited<ReturnType<typeof adapters.knowledge.matchCurrentCase>> | null>(null);

  useEffect(() => {
    let active = true;
    adapters.knowledge.matchCurrentCase(state).then((result) => active && setItem(result));
    return () => { active = false; };
  }, [adapters, state.operatingStage]);

  if (!item) return <MobileScroll className="final-scroll"><main className="final-detail-page"><AIWorking label="正在匹配周麻婆案例" /></main></MobileScroll>;
  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="knowledge-detail-hero">
          {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt ?? item.title} draggable={false} /> : <ReaderIcon />}
          <span>{item.sourceType} · v{item.version}.0</span>
          <h1>{item.title}</h1>
          <p>{item.judgment}</p>
        </section>
        <section className="knowledge-steps"><SectionHeading title="今天这样做" meta="仅当前节点" />{item.actions.map((step, index) => <div key={step}><b>{index + 1}</b><span>{step}</span></div>)}</section>
        <div className="knowledge-source-note"><InfoCircledIcon /><span><b>来源与边界</b><small>{item.sourceNote}</small></span></div>
        <PrimaryButton onClick={async () => { await run("正在加入今日经营剧本", async () => new Promise((resolve) => window.setTimeout(resolve, 360))); showToast("方法已加入当前行动"); flow.replace(playbookScreen); }}>加入今日经营剧本</PrimaryButton>
      </main>
    </MobileScroll>
  );
}

function LunchInspectionFlow({ flow }: { flow: FlowControls }) {
  const { state, dispatch, adapters, run, evidence, showToast } = useOperatingOS();
  const proof = state.evidence.find((item) => item.actionId === "lunch-inspection");
  const [captured, setCaptured] = useState(Boolean(proof));
  const inspect = async () => {
    await run("核对现场照片 → 识别等菜问题", async () => {
      const item = evidence("lunch-inspection", "photo", "午市现场已识别：前厅正常，传菜口等待偏久", "/assets/lunch-inspection-demo.png");
      item.aiResult = "passed";
      item.aiNote = "整洁度正常；人员到岗；传菜口等待风险需晚市复查。";
      item.inspected = { cleanliness: "整洁", staffing: "到岗", waitingRisk: "传菜口偏慢" };
      await adapters.workflow.submitEvidence(item);
      dispatch({ type: "completeLunchInspection", evidence: item });
      setCaptured(true);
    });
    showToast("现场问题已带入晚市经营剧本");
  };
  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="inspection-camera-card">
          <div className="story-image-shell inspection-image-shell"><img src="/assets/lunch-inspection-demo.png" alt="店长在午市传菜口拍照巡检的演示场景" draggable={false} /><span>演示场景 · AI生成</span><i className="inspection-marker marker-one">传菜口</i><i className="inspection-marker marker-two">人员到岗</i></div>
          <div><span>12:00 · 午市现场</span><h1>{captured ? "AI已看完这张照片" : "拍一张，AI替你完成巡检"}</h1><p>无需填写卫生、人员和等菜检查表。</p></div>
        </section>
        {captured ? <section className="inspection-findings"><div className="good"><CheckCircledIcon /><span><small>桌面与前厅</small><b>整洁</b></span></div><div className="good"><CheckCircledIcon /><span><small>人员到岗</small><b>正常</b></span></div><div className="warning"><ClockIcon /><span><small>需要关注</small><b>传菜口等待偏久</b></span></div></section> : null}
        {!captured ? <PrimaryButton onClick={inspect} icon={<CameraIcon />}>模拟拍照并让AI识别</PrimaryButton> : <><ResultCard title="午市现场已复查" body="发现传菜口等待偏久，已生成晚市现场关注动作。" impact="不虚增营业额；降低晚市等菜风险" next="14:30确认晚市剧本" /><PrimaryButton onClick={() => flow.replace(playbookScreen)}>查看AI重新安排</PrimaryButton></>}
      </main>
    </MobileScroll>
  );
}

function MorningMeetingFlow({ flow }: { flow: FlowControls }) {
  const { state, dispatch, adapters, run, approval, showToast } = useOperatingOS();
  const stage = state.meetingStage;

  const start = () => {
    dispatch({ type: "setMeetingStage", stage: 1, transcript: ["今天晚市还需要多来65位顾客……"] });
  };

  const analyze = async () => {
    await run("AI正在整理晨会并检查漏项", async () => {
      const result = await adapters.decision.analyzeMeeting();
      dispatch({ type: "setMeetingStage", stage: 2, transcript: result.transcript, missingItem: result.missingItem });
    });
  };

  const confirm = async () => {
    const actions = state.actions.filter((item) => ["member-recall", "reservation-followup", "dinner-experience"].includes(item.id));
    await run("正在下发给3位负责人", async () => {
      await adapters.workflow.issueActions(actions);
      dispatch({
        type: "confirmMeeting",
        approval: approval("decision", "decision-dinner-gap", "confirmed", "确认晨会内容与3项行动后正式下发", "3.0"),
      });
    });
    showToast("3位负责人已接收，进入今日经营行动");
    flow.replace(playbookScreen);
  };

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page meeting-flow">
        {stage === 0 ? (
          <>
            <section className="meeting-start-card">
              <div className="story-image-shell meeting-image-shell"><img src="/assets/morning-briefing-demo.png" alt="店长与三位员工召开晨会的演示场景" draggable={false} /><span>演示场景 · AI生成</span></div>
              <div className="meeting-start-copy"><span>08:45 · 晨会启动</span><h1>只讲清顾客缺口和每个人的动作</h1><p>AI转写、找漏项、预填负责人；确认后才下发。</p></div>
            </section>
            <div className="meeting-agenda">
              <span><b>1</b>今天晚市还需多来65位顾客</span>
              <span><b>2</b>谁负责会员召回和预约跟进</span>
              <span><b>3</b>晚市如何守住顾客体验</span>
            </div>
            <PrimaryButton onClick={start} icon={<SpeakerLoudIcon />}>开始语音晨会</PrimaryButton>
            <HumanConfirmNote text="此时只录音，不会自动下发任务" />
          </>
        ) : null}

        {stage === 1 ? (
          <>
            <section className="recording-card">
              <div className="recording-icon"><ActivityLogIcon /></div>
              <span>正在记录 · 01:36</span>
              <h2>“今天晚市还需要多来65位顾客……”</h2>
            </section>
            <section className="live-transcript">
              <small>实时转写</small>
              {state.meetingTranscript.map((item) => <p key={item}>{item}</p>)}
            </section>
            <PrimaryButton onClick={analyze}>结束并让AI整理</PrimaryButton>
          </>
        ) : null}

        {stage === 2 || stage === 3 ? (
          <>
            <section className="meeting-analysis-card">
              <span><MagicWandIcon />AI已整理</span>
              <h1>晨会完整度 86%</h1>
              <div>
                <p><small>今日目标</small><b>晚市补回65位顾客</b></p>
                <p><small>会员召回</small><b>王小丽 · 16:20</b></p>
                <p><small>现场体验</small><b>黄店长 · 18:00</b></p>
              </div>
            </section>
            {stage === 2 ? (
              <NeedsAttention title="发现1个漏项" body={state.meetingMissingItem} />
            ) : (
              <ApprovalAudit title="漏项已补充" approver="黄店长语音补充" note="李主管 · 16:40跟进10桌预约" />
            )}
            <section className="generated-actions-preview">
              <SectionHeading title="AI预生成3项行动" meta="尚未下发" />
              {state.actions.filter((item) => ["member-recall", "reservation-followup", "dinner-experience"].includes(item.id)).map((item) => (
                <div key={item.id}><ClockIcon /><span><b>{item.time} {item.title}</b><small>{item.owner} · {item.evidenceRequired.join(" + ")}</small></span></div>
              ))}
            </section>
            {stage === 2 ? (
              <PrimaryButton onClick={() => dispatch({ type: "setMeetingStage", stage: 3, missingItem: "" })} icon={<SpeakerLoudIcon />}>一句话补充漏项</PrimaryButton>
            ) : (
              <PrimaryButton onClick={confirm} icon={<LockClosedIcon />}>人工确认并下发3项行动</PrimaryButton>
            )}
            <HumanConfirmNote />
          </>
        ) : null}
      </main>
    </MobileScroll>
  );
}

function PlaybookScreen({ flow }: { flow: FlowControls }) {
  const { state, dispatch, approval, showToast } = useOperatingOS();
  const needsAfternoonConfirmation = state.operatingStage === "afternoonDecision";
  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="playbook-hero">
          <span>8月11日晚市顾客追回</span>
          <h1>{needsAfternoonConfirmation ? "晚市预约少11桌，建议现在启动追回" : "每一步都从经营问题出发"}</h1>
          <p>{needsAfternoonConfirmation ? "确认后，系统会进入17:30晚市追回并重新安排主行动。" : "证据先由AI检查，再由区域经理验收。"}</p>
        </section>
        {needsAfternoonConfirmation ? <><PrimaryButton onClick={() => { dispatch({ type: "confirmDinnerPlaybook", approval: approval("decision", "decision-dinner-gap", "confirmed", "确认启动晚市顾客追回剧本", "4.0") }); showToast("晚市剧本已确认，进入17:30追回"); flow.pop(); }}>人工确认晚市经营剧本</PrimaryButton><HumanConfirmNote text="AI只生成剧本，店长确认后才进入执行" /></> : null}
        <section className="action-detail-list">
          {state.actions.filter((item) => item.id !== "regional-support" || item.released).map((item) => (
            <button type="button" key={item.id} onClick={() => flow.push(actionScreen(item.id))}>
              <time>{item.time}</time>
              <span><b>{item.title}</b><small>{item.owner} · {item.source}</small><em>{item.expectedImpact}</em></span>
              <StatusPill status={item.status} />
              <ChevronRightIcon />
            </button>
          ))}
        </section>
        <DecisionSafety />
      </main>
    </MobileScroll>
  );
}

function ActionExecution({ flow, actionId }: { flow: FlowControls; actionId: string }) {
  const { state, dispatch, adapters, run, approval, evidence, showToast } = useOperatingOS();
  const item = getAction(state, actionId)!;
  const proofs = getEvidenceForAction(state, actionId);
  const latestEvidence = proofs[proofs.length - 1];
  const isRecall = actionId === "member-recall";
  const isReservation = actionId === "reservation-followup";
  const isSystemReceipt = isRecall || isReservation;
  const blockedByMeeting = !item.released && state.meetingStage < 4;

  const confirmExecution = () => {
    dispatch({
      type: "setActionStatus",
      actionId,
      status: "inProgress",
      approval: approval("action", actionId, "confirmed", `确认执行：${item.title}`, `v${item.templateVersion}.0`),
    });
    showToast("已人工确认，行动进入执行中");
  };

  const execute = async () => {
    await run(isRecall ? "正在生成门店召回内容" : isReservation ? "正在核对预约跟进记录" : "正在准备行动回传", async () => {
      await adapters.workflow.issueActions([item]);
      dispatch({
        type: "setActionStatus",
        actionId,
        status: "pendingEvidence",
        approval: approval("action", actionId, "confirmed", isRecall ? "确认向180位会员发送召回内容" : isReservation ? "确认跟进10桌未确认预约" : "确认执行现场行动", `v${item.templateVersion}.0`),
      });
    });
    showToast(isRecall ? "已模拟发送，等待回收预约结果" : isReservation ? "10桌已跟进，请回传确认记录" : "行动已执行，请回传证据");
  };

  const submit = async () => {
    const proof = evidence(
      actionId,
      isSystemReceipt ? "systemReceipt" : "photo",
      isRecall
        ? "已触达180位会员，新增预约12桌、31位顾客"
        : isReservation
          ? "已跟进10桌未确认预约，确认7桌、18位顾客"
          : "晚市现场10桌体验检查已完成",
      isSystemReceipt ? undefined : "/assets/task-evidence.jpg",
    );
    await run("正在接收行动证据", async () => {
      await adapters.workflow.submitEvidence(proof);
      dispatch({ type: "submitEvidence", evidence: proof });
    });
    showToast("证据已回传，等待AI初验");
  };

  const aiReview = async () => {
    if (!latestEvidence) return;
    await run("AI正在检查证据完整性", async () => {
      const result = await adapters.decision.inspectEvidence(latestEvidence);
      dispatch({ type: "updateEvidenceAI", evidenceId: latestEvidence.id, result: result.result, note: result.note });
    });
    showToast("AI初验通过，已提交区域人工验收");
  };

  const resubmit = () => {
    dispatch({ type: "setActionStatus", actionId, status: "pendingEvidence", result: "准备补充证据" });
  };

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="action-hero-card">
          <div><span>{item.source}</span><StatusPill status={item.status} /></div>
          <h1>{item.time} {item.title}</h1>
          <p>{item.owner} · 截止{item.dueAt}</p>
          <b>{item.expectedImpact}</b>
        </section>
        <section className="action-requirements">
          <SectionHeading title="怎么完成" meta={item.method} />
          <ol>{item.evidenceRequired.map((proof) => <li key={proof}>{proof}</li>)}</ol>
          <small>使用策略模板 v{item.templateVersion}.0 · {item.recheckAt}复查</small>
        </section>

        {isRecall && item.status !== "closed" ? (
          <button type="button" className="support-path" onClick={() => flow.push(supportRequestScreen)}>
            <PaperPlaneIcon /><span><b>{state.workRequests.some((request) => request.status !== "draft") ? "查看区域支持进度" : "申请区域经营支持"}</b><small>经营上下文与已执行动作会自动带入</small></span><ChevronRightIcon />
          </button>
        ) : null}

        {latestEvidence ? (
          <section className="evidence-card-final">
            {latestEvidence.assetUrl ? <img src={latestEvidence.assetUrl} alt="行动回传证据" draggable={false} /> : <FileTextIcon />}
            <div><span>{latestEvidence.submittedBy} · {latestEvidence.submittedAt}</span><h2>{latestEvidence.summary}</h2><p>{latestEvidence.aiNote}</p></div>
          </section>
        ) : null}

        {item.status === "closed" ? (
          <ResultCard
            title={isRecall ? "行动已闭环" : "现场行动已闭环"}
            body={item.result ?? "区域经理已确认"}
            impact={isRecall ? "预计收官 ¥92,000 → ¥95,800；当前收入未虚增" : isReservation ? "两项行动完成后预计收官升至 ¥98,000" : item.expectedImpact}
            next={item.recheckAt}
          >
            <ApprovalAudit title="人工验收已记录" approver="区域经营支持岗" note="证据完整，确认闭环" />
          </ResultCard>
        ) : null}

        {blockedByMeeting ? <NeedsAttention title="这项行动还没正式下发" body="请先完成晨会并人工确认负责人。" /> : null}
        {!blockedByMeeting && (item.status === "pendingConfirmation" || item.status === "aiSuggested") ? <PrimaryButton onClick={confirmExecution}>人工确认执行</PrimaryButton> : null}
        {item.status === "inProgress" ? <PrimaryButton onClick={execute}>{isRecall ? "确认发送给180位会员" : isReservation ? "确认已跟进10桌" : "确认完成并准备回传"}</PrimaryButton> : null}
        {item.status === "pendingEvidence" ? <PrimaryButton onClick={submit}>{latestEvidence ? "补充一份证据" : isSystemReceipt ? "回传系统结果" : "拍照并回传"}</PrimaryButton> : null}
        {item.status === "aiReview" ? <PrimaryButton onClick={aiReview}>开始AI初验</PrimaryButton> : null}
        {item.status === "pendingHumanReview" ? <><PrimaryButton disabled onClick={() => undefined}>等待区域人工验收</PrimaryButton><HumanConfirmNote text="AI初验通过不等于正式闭环" /></> : null}
        {item.status === "returned" ? <><NeedsAttention title="区域经理退回补充" body={item.result ?? "请补充证据"} /><PrimaryButton onClick={resubmit}>重新处理并补拍</PrimaryButton></> : null}
      </main>
    </MobileScroll>
  );
}

function SupportRequestFlow({ flow }: { flow: FlowControls }) {
  const { state, dispatch, adapters, run, approval, showToast } = useOperatingOS();
  const request = state.workRequests.find((item) => item.id === "request-market-support")!;

  const submit = async () => {
    await run("正在发送区域经营支持申请", async () => {
      await adapters.workflow.submitWorkRequest(request);
      dispatch({
        type: "createWorkRequest",
        requestId: request.id,
        approval: approval("workRequest", request.id, "confirmed", "确认申请区域晚市曝光支持"),
      });
    });
    showToast("区域经营支持岗已收到完整上下文");
  };

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="request-context-card">
          <span>AI已预填</span>
          <h1>{request.title}</h1>
          <p>{request.context}</p>
          <div><small>申请资源</small><b>{request.requestedResource}</b></div>
        </section>
        <section className="context-included">
          <b>将一起发送</b>
          <span><CheckCircledIcon />预计缺口：25桌、65位顾客</span>
          <span><CheckCircledIcon />门店已确认：会员召回行动</span>
          <span><CheckCircledIcon />复查时间：17:00</span>
        </section>
        {request.status === "draft" ? <><PrimaryButton onClick={submit}>人工确认并发送申请</PrimaryButton><HumanConfirmNote text="AI不会代表店长向上申请资源" /></> : null}
        {request.status === "pendingRegional" ? <ResultCard title="区域已收到申请" body="区域消息中心已出现该请求，等待人工回复。" impact="不改变当前营业预测" next="16:30未回复将提醒" /> : null}
        {request.status === "regionalReplied" ? (
          <ResultCard title="区域已回复支持方案" body={request.reply ?? "区域已提供支持"} impact="预计再补4至6桌" next="17:30复查">
            <PrimaryButton onClick={() => flow.push(actionScreen("regional-support"))}>查看区域补充行动</PrimaryButton>
          </ResultCard>
        ) : null}
      </main>
    </MobileScroll>
  );
}

function ClosingReviewFlow({ flow }: { flow: FlowControls }) {
  const { state, dispatch, adapters, run, approval, showToast } = useOperatingOS();
  const [ready, setReady] = useState(state.dailyReview.generated);

  const generate = async () => {
    await run("正在核对目标、预测与实际结果", async () => {
      const review = await adapters.business.buildClosingReview(state);
      if (review.actualRevenue !== state.dailyReview.actualRevenue || review.outcome !== state.dailyReview.outcome) {
        dispatch({ type: "setStage", stage: "closingReview" });
      }
      setReady(true);
    });
  };

  const confirm = () => {
    dispatch({ type: "completeReview", approval: approval("decision", "closing-review", "confirmed", "确认今日复盘并生成明日第一件事") });
    showToast("日报与明日第一件事已生成");
  };

  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="closing-number-card">
          <span>8月11日收官</span>
          <div><p><small>目标</small><b>¥100,000</b></p><p><small>实际</small><b>{money(state.dailyReview.actualRevenue)}</b></p></div>
          <strong>{state.dailyReview.outcome === "improved" ? "达成 100.6%" : "未完全达标 · 按真实结果复盘"}</strong>
        </section>
        {!ready ? <><p className="detail-lead">AI会对比早上预测、执行动作与真实收官，不把预计影响当成实际收入。</p><PrimaryButton onClick={generate}>生成今日经营复盘</PrimaryButton></> : null}
        {ready ? (
          <>
            <section className="review-conclusions">
              <SectionHeading title="AI复盘三句话" meta="待你确认" />
              {state.dailyReview.conclusions.map((item, index) => <p key={item}><b>{index + 1}</b>{item}</p>)}
            </section>
            <ResultCard title={state.dailyReview.outcome === "improved" ? "会员召回真正有效" : "关键行动还没完全闭环"} body={state.dailyReview.effectiveActions.join("；")} impact={`实际收官 ${money(state.dailyReview.actualRevenue)}`} next={state.dailyReview.tomorrowFirstAction} />
            <section className="tomorrow-action"><small>明天第一件事</small><b>{state.dailyReview.tomorrowFirstAction}</b></section>
            <section className="closing-growth-evidence"><SectionHeading title="最后看成长证据" meta="经营结果优先" />{state.growthEvidence.filter((item) => item.earned).map((item) => <span key={item.id}><CheckCircledIcon /><b>{item.label}</b><small>{item.trend}</small></span>)}</section>
            {!state.dailyReview.generated ? <PrimaryButton onClick={confirm}>人工确认并生成日报</PrimaryButton> : <ApprovalAudit title="今日复盘已确认" approver="黄店长" note="日报和明日行动已生成" />}
          </>
        ) : null}
      </main>
    </MobileScroll>
  );
}
