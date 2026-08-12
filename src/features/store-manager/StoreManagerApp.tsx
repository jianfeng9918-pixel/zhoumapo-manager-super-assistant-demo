import { useEffect, useMemo, useState } from "react";
import {
  ActivityLogIcon,
  BackpackIcon,
  BarChartIcon,
  BellIcon,
  CalendarIcon,
  CameraIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClipboardIcon,
  ClockIcon,
  FileTextIcon,
  DownloadIcon,
  HomeIcon,
  InfoCircledIcon,
  LightningBoltIcon,
  LockClosedIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  PersonIcon,
  ReaderIcon,
  ReloadIcon,
  SpeakerLoudIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import { FlowStack, MobileScroll, type FlowControls, type FlowScreen } from "../../mobile";
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
  OperatingMomentId,
  OperatingReport,
  ReportAnswer,
  ReportExport,
  ReportId,
  ReportQuestionId,
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
type KnowledgeTopic = "traffic" | "rating" | "people";

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
        {active === "mine" ? <MineScreen openRole={openRole} openReset={openReset} /> : null}
      </main>
    </MobileScroll>
  );
}

function TodayScreen({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const [voiceResult, setVoiceResult] = useState<VoiceResolution | null>(null);
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
          {state.operatingStage === "morningBrief" ? (
            <HoldToTalk context="today" compact onResolved={setVoiceResult} />
          ) : <PrimaryButton onClick={() => flow.push(primary.screen)}>{primary.label}</PrimaryButton>}
          {voiceResult ? (
            <div className="voice-intent-preview">
              <small>AI理解 · 置信度{voiceResult.confidence}%</small><b>{voiceResult.summary}</b>
              <button type="button" onClick={() => flow.push(meetingScreen)}>{voiceResult.confirmationLabel}<ChevronRightIcon /></button>
            </div>
          ) : null}
          <HumanConfirmNote text={isClosing ? "确认后生成日报与明日第一件事" : state.operatingStage === "lunchReview" ? "照片仅用于演示识别，不上传真实平台" : state.operatingStage === "afternoonDecision" ? "确认后才启动晚市经营剧本" : state.operatingStage === "dinnerRecovery" ? "行动需人工确认，结果需证据验收" : "确认后才会下发到负责人"} />
        </div>
      </section>

      {state.metricTransitions.some((item) => item.kind !== "actual") ? (
        <div className="metric-change-ribbon"><LightningBoltIcon /><span><b>数字为什么变了</b><small>{state.metricTransitions[0].trigger}</small></span><em>实际营业未虚增</em></div>
      ) : null}

      <section className="semantic-day-route" aria-label="今天经营路线">
        <button type="button" className={state.operatingStage === "lunchReview" ? "current opportunity" : "opportunity"} onClick={() => flow.push(lunchInspectionScreen)}><span><ClockIcon /></span><small>12:00</small><b>午市复查</b></button>
        <button type="button" className={state.operatingStage === "dinnerRecovery" ? "current result" : "result"} onClick={() => flow.push(memberRecallScreen)}><span><PersonIcon /></span><small>16:20</small><b>会员召回</b></button>
        <button type="button" className={isClosing ? "current ai" : "ai"} onClick={() => flow.push(closingReviewScreen)}><span><ReaderIcon /></span><small>21:30</small><b>收官复盘</b></button>
      </section>

      <button type="button" className="knowledge-match-row" onClick={() => flow.push({ ...detailScreen("current-case", "当前匹配方法", (innerFlow) => <CurrentKnowledgeCase flow={innerFlow} />) })}>
        <ReaderIcon /><span><small>周麻婆知识匹配</small><b>{state.operatingStage === "lunchReview" ? "等菜问题用一条责任链闭环" : "会员召回：先触达，再追未确认预约"}</b></span><ChevronRightIcon />
      </button>

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
  const topics = reports.filter((item) => ["traffic", "product", "reputation", "member"].includes(item.id));
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

      <SectionHeading title="经营专题" meta="需要时再下钻" />
      <section className="topic-report-list">
        {topics.map((report) => (
          <button type="button" key={report.id} onClick={() => flow.push(reportDetailScreen(report.id))}>
            <span className={`tone-${report.hero.tone}`}>{report.id === "traffic" ? <PersonIcon /> : report.id === "product" ? <LightningBoltIcon /> : report.id === "reputation" ? <SpeakerLoudIcon /> : <TargetIcon />}</span>
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
  const visibleActions = state.actions.filter((item) =>
    (item.id !== "regional-support" || item.released)
    && (!item.id.startsWith("product-") || item.released),
  );
  const currentAction = visibleActions.find((item) => item.status !== "closed") ?? visibleActions.at(-1)!;
  const nextAction = visibleActions.find((item) => item.time > currentAction.time && item.status !== "closed");
  return (
    <>
      <AppBrandHeader subtitle="今日经营剧本 · 动作跟着问题走" onNotifications={() => flow.push(notificationsScreen)} />
      <div className="page-title-block compact-title-block"><span>当前行动</span><h1>先完成这一件</h1><p>其他行动等结果回来后再重新安排。</p></div>
      <section className="current-action-focus">
        <div><span>{currentAction.time}</span><StatusPill status={currentAction.status} /></div>
        <h2>{currentAction.title}</h2>
        <p>{currentAction.owner} · {currentAction.expectedImpact}</p>
        <PrimaryButton onClick={() => flow.push(actionScreen(currentAction.id))}>进入当前行动</PrimaryButton>
      </section>
      <HoldToTalk context="tasks" compact onResolved={setVoiceResult} />
      {voiceResult ? <button type="button" className="inline-voice-answer" onClick={() => flow.push(memberRecallScreen)}><MagicWandIcon /><span><small>AI已预填，尚未下发</small><b>{voiceResult.summary}</b></span><ChevronRightIcon /></button> : null}
      {nextAction ? <button type="button" className="next-action-preview" onClick={() => flow.push(actionScreen(nextAction.id))}><ClockIcon /><span><small>下一行动 · {nextAction.time}</small><b>{nextAction.title}</b></span><ChevronRightIcon /></button> : null}
      <SectionHeading title="今日经营时间线" meta={`${visibleActions.filter((item) => item.status === "closed").length}/${visibleActions.length}已闭环`} />
      <section className="playbook-progress collapsed-history">
        {visibleActions.map((item, index) => <button type="button" key={item.id} onClick={() => flow.push(actionScreen(item.id))} className={item.status === "closed" ? "done" : item.id === currentAction.id ? "current" : ""}><time>{item.time}</time><i>{item.status === "closed" ? <CheckCircledIcon /> : index + 1}</i><span><b>{item.title}</b><small>{item.owner} · {item.source}</small></span><StatusPill status={item.status} /><ChevronRightIcon /></button>)}
      </section>
      <button type="button" className="plain-wide-button" onClick={() => flow.push(playbookScreen)}>查看负责人、证据与审批记录 <ChevronRightIcon /></button>
    </>
  );
}

function AcademyScreen({ flow }: { flow: FlowControls }) {
  const { state, adapters, run, showToast } = useOperatingOS();
  const [topic, setTopic] = useState<KnowledgeTopic>("traffic");
  const [match, setMatch] = useState<Awaited<ReturnType<typeof adapters.knowledge.matchProblem>> | null>(null);
  const [currentCase, setCurrentCase] = useState<Awaited<ReturnType<typeof adapters.knowledge.matchCurrentCase>> | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceResolution | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([adapters.knowledge.matchProblem(topic), adapters.knowledge.matchCurrentCase(state)]).then(([result, caseResult]) => {
      if (active) { setMatch(result); setCurrentCase(caseResult); }
    });
    return () => { active = false; };
  }, [adapters, topic, state.operatingStage]);

  const choose = async (next: KnowledgeTopic) => {
    setTopic(next);
    await run("正在匹配周麻婆优秀门店案例", async () => {
      const result = await adapters.knowledge.matchProblem(next);
      setMatch(result);
    });
  };

  return (
    <>
      <AppBrandHeader subtitle="经营知识大脑 · 按问题调用" onNotifications={() => flow.push(notificationsScreen)} />
      <div className="page-title-block compact-title-block"><span>当前问题已带入</span><h1>{currentCase?.judgment ?? "今天顾客少，怎么办？"}</h1><p>一次只给最相关的一种周麻婆方法。</p></div>
      <div className="topic-chips">
        <button type="button" className={topic === "traffic" ? "active" : ""} onClick={() => choose("traffic")}>顾客少</button>
        <button type="button" className={topic === "rating" ? "active" : ""} onClick={() => choose("rating")}>评分下降</button>
        <button type="button" className={topic === "people" ? "active" : ""} onClick={() => choose("people")}>新人不会推荐</button>
      </div>
      {match ? (
        <section className="knowledge-answer-card">
          {currentCase?.imageUrl ? <img className="knowledge-case-image" src={currentCase.imageUrl} alt={currentCase.imageAlt ?? currentCase.title} draggable={false} /> : null}
          <div><MagicWandIcon /><span><small>AI判断</small><b>{match.judgment}</b></span></div>
          <h2>{currentCase?.title ?? match.caseTitle}</h2>
          <p>{currentCase?.result ?? match.caseResult}</p>
          <ol>{(currentCase?.actions ?? match.actions).map((item) => <li key={item}>{item}</li>)}</ol>
          <small>来源：{currentCase ? `${currentCase.sourceType} · ${currentCase.sourceNote}` : match.source}</small>
          <PrimaryButton onClick={() => { showToast("已加入今日经营行动"); flow.push(playbookScreen); }}>加入今日行动</PrimaryButton>
        </section>
      ) : null}
      <HoldToTalk context="academy" onResolved={(result) => { setVoiceResult(result); if (result.targetId === "rating") choose("rating"); }} />
      {voiceResult ? <div className="academy-voice-result"><MagicWandIcon /><span><small>已理解你的问题</small><b>{voiceResult.summary}</b></span></div> : null}
    </>
  );
}

function MineScreen({ openRole, openReset }: { openRole: () => void; openReset: () => void }) {
  const { state, dispatch } = useOperatingOS();
  const moments: Array<{ id: OperatingMomentId; label: string }> = [
    { id: "preOpen", label: "08:30" },
    { id: "lunch", label: "12:00" },
    { id: "afternoon", label: "14:30" },
    { id: "dinner", label: "17:30" },
    { id: "closing", label: "21:30" },
  ];
  return (
    <>
      <AppBrandHeader subtitle="店长成长与经营记录" />
      <section className="manager-profile-card">
        <span className="manager-avatar">黄</span>
        <div><small>三盛广场演示店</small><h1>黄店长</h1><p>连续完成经营闭环 2/7天</p></div>
      </section>
      <SectionHeading title="今天留下的成长证据" meta="有行动证据才变化" />
      <section className="capability-list growth-evidence-list">
        {state.growthEvidence.map((item) => (
          <div key={item.id}>
            <span><b>{item.label}</b><small>{item.reason}</small></span>
            <strong className={item.earned ? "earned" : "pending"}>{item.trend}</strong>
          </div>
        ))}
      </section>
      <SectionHeading title="演示工具" meta="不进入日常主线" />
      <section className="settings-list">
        <RowButton icon={<PersonIcon />} title="区域与总部联动演示" body="切换林阳区域经理或总部经营中心" onClick={openRole} />
        <div className="moment-switcher">
          <span><ClockIcon /><b>切换经营时段</b></span>
          <div>{moments.map((item) => <button type="button" key={item.id} className={state.operatingMoment === item.id ? "active" : ""} onClick={() => dispatch({ type: "setMoment", moment: item.id })}>{item.label}</button>)}</div>
        </div>
        <RowButton icon={<ReloadIcon />} title="重置终局演示" body="不会清除V2、V3、V4进度" onClick={openReset} />
      </section>
      <DecisionSafety />
    </>
  );
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
    showToast("AI初验通过，已提交林阳人工验收");
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
            <PaperPlaneIcon /><span><b>门店资源不够？向林阳申请支持</b><small>上下文与已执行动作会自动带入</small></span><ChevronRightIcon />
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
            <ApprovalAudit title="人工验收已记录" approver="林阳区域经理" note="证据完整，确认闭环" />
          </ResultCard>
        ) : null}

        {blockedByMeeting ? <NeedsAttention title="这项行动还没正式下发" body="请先完成晨会并人工确认负责人。" /> : null}
        {!blockedByMeeting && (item.status === "pendingConfirmation" || item.status === "aiSuggested") ? <PrimaryButton onClick={confirmExecution}>人工确认执行</PrimaryButton> : null}
        {item.status === "inProgress" ? <PrimaryButton onClick={execute}>{isRecall ? "确认发送给180位会员" : isReservation ? "确认已跟进10桌" : "确认完成并准备回传"}</PrimaryButton> : null}
        {item.status === "pendingEvidence" ? <PrimaryButton onClick={submit}>{latestEvidence ? "补充一份证据" : isSystemReceipt ? "回传系统结果" : "拍照并回传"}</PrimaryButton> : null}
        {item.status === "aiReview" ? <PrimaryButton onClick={aiReview}>开始AI初验</PrimaryButton> : null}
        {item.status === "pendingHumanReview" ? <><PrimaryButton disabled onClick={() => undefined}>等待林阳人工验收</PrimaryButton><HumanConfirmNote text="AI初验通过不等于正式闭环" /></> : null}
        {item.status === "returned" ? <><NeedsAttention title="区域经理退回补充" body={item.result ?? "请补充证据"} /><PrimaryButton onClick={resubmit}>重新处理并补拍</PrimaryButton></> : null}
      </main>
    </MobileScroll>
  );
}

function SupportRequestFlow({ flow }: { flow: FlowControls }) {
  const { state, dispatch, adapters, run, approval, showToast } = useOperatingOS();
  const request = state.workRequests.find((item) => item.id === "request-market-support")!;

  const submit = async () => {
    await run("正在发送给林阳区域经理", async () => {
      await adapters.workflow.submitWorkRequest(request);
      dispatch({
        type: "createWorkRequest",
        requestId: request.id,
        approval: approval("workRequest", request.id, "confirmed", "确认申请区域晚市曝光支持"),
      });
    });
    showToast("林阳已收到完整上下文");
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
        {request.status === "pendingRegional" ? <ResultCard title="林阳已收到申请" body="区域消息中心已出现该请求，等待人工回复。" impact="不改变当前营业预测" next="16:30未回复将提醒" /> : null}
        {request.status === "regionalReplied" ? (
          <ResultCard title="林阳已回复支持方案" body={request.reply ?? "区域已提供支持"} impact="预计再补4至6桌" next="17:30复查">
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
