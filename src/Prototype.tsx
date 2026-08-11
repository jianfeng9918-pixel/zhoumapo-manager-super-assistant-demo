import {
  createContext,
  type ComponentType,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityLogIcon,
  ArrowLeftIcon,
  BackpackIcon,
  BarChartIcon,
  BellIcon,
  CalendarIcon,
  CameraIcon,
  CheckCircledIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardIcon,
  ClockIcon,
  CounterClockwiseClockIcon,
  CrossCircledIcon,
  DashboardIcon,
  ExclamationTriangleIcon,
  FileTextIcon,
  HomeIcon,
  InfoCircledIcon,
  LightningBoltIcon,
  LockClosedIcon,
  MagicWandIcon,
  MixerHorizontalIcon,
  PaperPlaneIcon,
  PersonIcon,
  PlusIcon,
  ReaderIcon,
  ReloadIcon,
  RocketIcon,
  SewingPinIcon,
  SpeakerLoudIcon,
  StarFilledIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import {
  BottomSheet,
  FlowStack,
  MobileScroll,
  type FlowControls,
  type FlowScreen,
} from "./mobile";
import {
  businessInsights,
  formatMoney,
  getDisplaySnapshot,
  getSnapshot,
  managerCapabilities,
  momentOrder,
  playbookActions,
  regionStores,
  yesterdayReview,
  type ActionStatusId,
  type HelpStatus,
  type InsightId,
  type ManagerCapabilityId,
  type OperatingMomentId,
  type PlaybookActionId,
  type RegionalTaskStatus,
  type RoleId,
} from "./demo-model";

type TabId = "today" | "data" | "tasks" | "academy" | "mine";
type RegionTabId = "overview" | "stores" | "tasks" | "messages" | "mine";
type SheetId = "reset" | "calculation" | "role" | "moment" | "help" | "legacy" | null;
type KnowledgeTopic = "traffic" | "rating" | "newcomer";
type IconType = ComponentType<{ className?: string }>;

type DemoReminder = {
  id: string;
  time: string;
  title: string;
  body: string;
  target: "playbook" | "insight" | "regional";
  handled: boolean;
};

type DemoState = {
  role: RoleId;
  moment: OperatingMomentId;
  playbookClaimed: boolean;
  meetingStage: number;
  inspectionStage: number;
  memberRecallStage: number;
  reservationStage: number;
  experienceStage: number;
  feedbackStage: number;
  closingStage: number;
  regionalTaskStatus: RegionalTaskStatus;
  helpStatus: HelpStatus;
  helpReply: string;
  knowledgeTopic: KnowledgeTopic;
  knowledgeAdded: boolean;
  points: number;
  capabilityBonuses: Partial<Record<ManagerCapabilityId, number>>;
  reminders: DemoReminder[];
  activity: string[];
};

type DemoContextValue = {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  regionTab: RegionTabId;
  setRegionTab: (tab: RegionTabId) => void;
  state: DemoState;
  setState: Dispatch<SetStateAction<DemoState>>;
  sheet: SheetId;
  setSheet: (sheet: SheetId) => void;
  activeInsight: InsightId;
  setActiveInsight: (insight: InsightId) => void;
  toast: string;
  showToast: (message: string) => void;
  busy: string | null;
  runMock: (key: string, message: string, update: (current: DemoState) => DemoState) => void;
  completeAction: (action: PlaybookActionId, message: string) => void;
  switchRole: (role: RoleId) => void;
  resetDemo: () => void;
  openHelp: (topic: string) => void;
  helpTopic: string;
};

const STORAGE_KEY = "zhoumapo-manager-assistant-v4";

const initialReminders: DemoReminder[] = [
  {
    id: "yesterday-dinner",
    time: "08:30",
    title: "昨晚少来32位顾客",
    body: "AI已把原因和今天的补救动作整理好。",
    target: "insight",
    handled: false,
  },
  {
    id: "today-forecast",
    time: "08:35",
    title: "今天预计少约25桌",
    body: "不是消费问题，重点是补回晚市顾客。",
    target: "playbook",
    handled: false,
  },
];

const initialState: DemoState = {
  role: "manager",
  moment: "preOpen",
  playbookClaimed: false,
  meetingStage: 0,
  inspectionStage: 0,
  memberRecallStage: 0,
  reservationStage: 0,
  experienceStage: 0,
  feedbackStage: 0,
  closingStage: 0,
  regionalTaskStatus: "not-issued",
  helpStatus: "none",
  helpReply: "",
  knowledgeTopic: "traffic",
  knowledgeAdded: false,
  points: 680,
  capabilityBonuses: {},
  reminders: initialReminders,
  activity: ["昨日收官复盘已生成", "总部晚市体验任务已接收"],
};

const DemoContext = createContext<DemoContextValue | null>(null);

function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoContext");
  return value;
}

function restoreDemoState(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      ...initialState,
      ...parsed,
      capabilityBonuses: parsed.capabilityBonuses ?? {},
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : initialReminders,
      activity: Array.isArray(parsed.activity) ? parsed.activity : initialState.activity,
    };
  } catch {
    return initialState;
  }
}

function actionStatus(state: DemoState, id: PlaybookActionId): ActionStatusId {
  const stage = id === "meeting"
    ? state.meetingStage
    : id === "memberRecall"
      ? state.memberRecallStage
      : id === "reservationFollowup"
        ? state.reservationStage
        : id === "dinnerExperience"
          ? state.experienceStage
          : state.feedbackStage;
  const doneAt = id === "meeting" ? 6 : id === "memberRecall" ? 4 : 3;
  if (stage >= doneAt) return "已改善";
  if (!state.playbookClaimed && stage === 0) return "AI建议";
  if (stage === 0) return "待确认";
  if (id === "memberRecall" && stage === 3) return "AI复查";
  if (stage >= 2) return "待回传";
  return "执行中";
}

function completedActionCount(state: DemoState) {
  return playbookActions.filter((action) => actionStatus(state, action.id) === "已改善").length;
}

function nextActionId(state: DemoState): PlaybookActionId {
  return playbookActions.find((action) => actionStatus(state, action.id) !== "已改善")?.id ?? "feedbackReview";
}

const managerTabs: Array<{ id: TabId; label: string; icon: IconType }> = [
  { id: "today", label: "今日", icon: HomeIcon },
  { id: "data", label: "数据", icon: BarChartIcon },
  { id: "tasks", label: "任务", icon: ClipboardIcon },
  { id: "academy", label: "学院", icon: BackpackIcon },
  { id: "mine", label: "我的", icon: PersonIcon },
];

const regionTabs: Array<{ id: RegionTabId; label: string; icon: IconType }> = [
  { id: "overview", label: "总览", icon: DashboardIcon },
  { id: "stores", label: "门店", icon: SewingPinIcon },
  { id: "tasks", label: "任务", icon: ClipboardIcon },
  { id: "messages", label: "消息", icon: BellIcon },
  { id: "mine", label: "我的", icon: PersonIcon },
];

const rootScreen: FlowScreen = {
  id: "manager-console-v4",
  footerHeight: 82,
  footer: (flow) => <BottomNav flow={flow} />,
  render: (flow) => <MainShell flow={flow} />,
};

function screenWithHeader(id: string, title: string, render: (flow: FlowControls) => ReactNode): FlowScreen {
  return {
    id,
    headerHeight: 52,
    header: (flow) => <DetailHeader title={title} onBack={flow.pop} />,
    render,
  };
}

const playbookScreen = screenWithHeader("playbook", "今日经营剧本", (flow) => <PlaybookFlow flow={flow} />);
const meetingScreen = screenWithHeader("meeting", "AI晨会", (flow) => <MeetingFlow flow={flow} />);
const inspectionScreen = screenWithHeader("inspection", "午市拍照巡检", (flow) => <InspectionFlow flow={flow} />);
const memberRecallScreen = screenWithHeader("member-recall", "会员召回", (flow) => <MemberRecallFlow flow={flow} />);
const reservationScreen = screenWithHeader("reservation", "预约确认", (flow) => <ReservationFlow flow={flow} />);
const experienceScreen = screenWithHeader("dinner-experience", "晚市现场", (flow) => <DinnerExperienceFlow flow={flow} />);
const feedbackScreen = screenWithHeader("feedback-review", "结果复查", (flow) => <FeedbackReviewFlow flow={flow} />);
const closingScreen = screenWithHeader("closing-review", "今日经营复盘", (flow) => <ClosingReviewFlow flow={flow} />);
const insightScreen = screenWithHeader("business-insight", "AI经营判断", (flow) => <InsightDetail flow={flow} />);
const reminderScreen = screenWithHeader("reminders", "主动提醒", (flow) => <ReminderCenter flow={flow} />);
const regionalStoreScreen = screenWithHeader("region-store", "门店经营详情", (flow) => <RegionalStoreDetail flow={flow} />);
const regionalIssueScreen = screenWithHeader("region-issue", "区域下发行动", (flow) => <RegionalIssueFlow flow={flow} />);
const regionalAssignmentScreen = screenWithHeader("region-assignment", "区域行动执行", (flow) => <RegionalAssignmentFlow flow={flow} />);
const regionalReviewScreen = screenWithHeader("region-review", "区域证据验收", (flow) => <RegionalReviewFlow flow={flow} />);

export default function Prototype() {
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [regionTab, setRegionTab] = useState<RegionTabId>("overview");
  const [state, setState] = useState<DemoState>(restoreDemoState);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [activeInsight, setActiveInsight] = useState<InsightId>("customerGap");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [helpTopic, setHelpTopic] = useState("当前行动");
  const toastTimer = useRef<number | null>(null);
  const mockTimer = useRef<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    if (mockTimer.current) window.clearTimeout(mockTimer.current);
  }, []);

  const showToast = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  };

  const runMock = (key: string, message: string, update: (current: DemoState) => DemoState) => {
    if (busy) return;
    setBusy(key);
    mockTimer.current = window.setTimeout(() => {
      setState(update);
      setBusy(null);
      showToast(message);
    }, 680);
  };

  const completeAction = (action: PlaybookActionId, message: string) => {
    const bonus: Partial<Record<ManagerCapabilityId, number>> = action === "meeting"
      ? { people: 1, execution: 1 }
      : action === "memberRecall" || action === "reservationFollowup"
        ? { customer: 1, execution: 1 }
        : action === "dinnerExperience"
          ? { operations: 1, customer: 1 }
          : { operations: 1, execution: 1 };
    setState((current) => ({
      ...current,
      points: current.points + 10,
      capabilityBonuses: Object.entries(bonus).reduce(
        (next, [id, value]) => ({ ...next, [id]: (next[id as ManagerCapabilityId] ?? 0) + (value ?? 0) }),
        { ...current.capabilityBonuses },
      ),
      activity: [message, ...current.activity].slice(0, 8),
    }));
    showToast(`${message}，能力成长 +1`);
  };

  const switchRole = (role: RoleId) => {
    setState((current) => ({ ...current, role }));
    setActiveTab("today");
    setRegionTab("overview");
    setSheet(null);
    showToast(role === "manager" ? "已回到黄店长" : "已进入区域联动演示");
  };

  const resetDemo = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(initialState);
    setActiveTab("today");
    setRegionTab("overview");
    setActiveInsight("customerGap");
    setSheet(null);
    showToast("演示已恢复到08:30营业前");
  };

  const openHelp = (topic: string) => {
    setHelpTopic(topic);
    setSheet("help");
  };

  const value = useMemo<DemoContextValue>(() => ({
    activeTab,
    setActiveTab,
    regionTab,
    setRegionTab,
    state,
    setState,
    sheet,
    setSheet,
    activeInsight,
    setActiveInsight,
    toast,
    showToast,
    busy,
    runMock,
    completeAction,
    switchRole,
    resetDemo,
    openHelp,
    helpTopic,
  }), [activeInsight, activeTab, busy, helpTopic, regionTab, sheet, state, toast]);

  return (
    <DemoContext.Provider value={value}>
      <FlowStack initial={rootScreen} />
      <DemoSheet />
      {toast ? <div className="app-toast" role="status"><CheckCircledIcon /><span>{toast}</span></div> : null}
    </DemoContext.Provider>
  );
}

function MainShell({ flow }: { flow: FlowControls }) {
  const { activeTab, regionTab, state } = useDemo();
  if (state.role === "regional") {
    return <div className="app-shell region-shell">
      {regionTab === "overview" ? <RegionOverview flow={flow} /> : null}
      {regionTab === "stores" ? <RegionStores flow={flow} /> : null}
      {regionTab === "tasks" ? <RegionTasks flow={flow} /> : null}
      {regionTab === "messages" ? <RegionMessages /> : null}
      {regionTab === "mine" ? <RegionMine /> : null}
    </div>;
  }
  return <div className="app-shell">
    {activeTab === "today" ? <TodayScreen flow={flow} /> : null}
    {activeTab === "data" ? <DataScreen flow={flow} /> : null}
    {activeTab === "tasks" ? <TasksScreen flow={flow} /> : null}
    {activeTab === "academy" ? <AcademyScreen /> : null}
    {activeTab === "mine" ? <MineScreen /> : null}
  </div>;
}

function BottomNav({ flow }: { flow: FlowControls }) {
  const { activeTab, setActiveTab, regionTab, setRegionTab, state } = useDemo();
  const items = state.role === "manager" ? managerTabs : regionTabs;
  return <nav className="bottom-nav" aria-label="主要功能">
    {items.map((item) => {
      const Icon = item.icon;
      const selected = state.role === "manager" ? activeTab === item.id : regionTab === item.id;
      const badge = state.role === "manager" && item.id === "tasks"
        ? Math.max(0, 5 - completedActionCount(state))
        : state.role === "regional" && item.id === "messages" && state.helpStatus === "sent" ? 1 : 0;
      return <button
        key={item.id}
        type="button"
        className={`nav-item ${selected ? "is-active" : ""}`}
        aria-current={selected ? "page" : undefined}
        onClick={() => {
          if (flow.canGoBack) flow.pop();
          if (state.role === "manager") setActiveTab(item.id as TabId);
          else setRegionTab(item.id as RegionTabId);
        }}
      >
        <span className="nav-icon-wrap"><Icon />{badge ? <i>{badge}</i> : null}</span>
        <span>{item.label}</span>
      </button>;
    })}
  </nav>;
}

function TodayScreen({ flow }: { flow: FlowControls }) {
  const { state, setSheet } = useDemo();
  const snapshot = getDisplaySnapshot(state.moment, state.memberRecallStage >= 4, state.reservationStage >= 3);
  const unread = state.reminders.filter((item) => !item.handled).length;
  const preOpen = state.moment === "preOpen";
  const closing = state.moment === "closing";
  const completed = completedActionCount(state);

  const primaryAction = () => {
    if (preOpen || state.moment === "afternoon") flow.push(playbookScreen);
    else if (state.moment === "lunch") flow.push(inspectionScreen);
    else if (state.moment === "dinner") {
      if (state.memberRecallStage < 4) flow.push(memberRecallScreen);
      else if (state.reservationStage < 3) flow.push(reservationScreen);
      else flow.push(experienceScreen);
    } else flow.push(closingScreen);
  };

  return <MobileScroll className="root-scroll home-scroll">
    <main className="root-content home-content" data-testid="today-screen">
      <header className="brand-row">
        <img className="brand-logo" src={`${import.meta.env.BASE_URL}assets/zhoumapo-logo.png`} alt="周麻婆 川式小炒" draggable={false} />
        <button className="icon-button notification-button" type="button" aria-label={`查看提醒，${unread}条未处理`} onClick={() => flow.push(reminderScreen)}>
          <BellIcon />{unread ? <span>{unread}</span> : null}
        </button>
      </header>

      <PageIntro
        eyebrow={`三盛广场演示店 · 8月11日 · ${snapshot.time}`}
        title={preOpen ? "黄店长，先看清今天" : closing ? "黄店长，今天辛苦了" : "黄店长，现在看这件事"}
        badge="演示数据"
      />

      {preOpen ? <PreOpenBrief snapshot={snapshot} onCalculation={() => setSheet("calculation")} /> : closing ? <ClosingHome state={state} onOpen={() => flow.push(closingScreen)} /> : <LiveHome snapshot={snapshot} state={state} onCalculation={() => setSheet("calculation")} />}

      {!closing ? <DayRoute current={state.moment} onSwitch={() => setSheet("moment")} /> : null}

      {!closing ? <section className="priority-section">
        <div className="priority-heading"><h2>现在最重要</h2><span>{snapshot.label} · AI已排好</span></div>
        <article className="coach-callout priority-mission-card">
          <div className="mission-kicker"><span><MagicWandIcon /> AI区域经理判断</span><em>现在做</em></div>
          <h2>{snapshot.headline}</h2>
          <p>{snapshot.primaryBody}</p>
          <div className="mission-evidence" aria-label="经营判断依据">
            {preOpen ? <>
              <span><small>昨日晚市</small><b>少32位</b></span>
              <span><small>今晚预约</small><b>少11桌</b></span>
              <span><small>预计缺口</small><b>¥8,000</b></span>
            </> : <>
              <span><small>当前还差</small><b>{snapshot.gap.tables}桌</b></span>
              <span><small>换算顾客</small><b>{snapshot.gap.guests}位</b></span>
              <span><small>AI判断</small><b>92%</b></span>
            </>}
          </div>
          <button className="primary-action" type="button" onClick={primaryAction}>{snapshot.primaryTitle}<ChevronRightIcon /></button>
          <small className="mission-result"><StarFilledIcon /> 做完后，AI会重新预测并安排下一项</small>
        </article>
      </section> : null}

      {!closing ? <section className="home-playbook-preview">
        <div className="priority-heading"><h2>今天经营剧本</h2><button type="button" onClick={() => flow.push(playbookScreen)}>完整剧本 <ChevronRightIcon /></button></div>
        <div className="home-action-timeline">
          {playbookActions.slice(0, 3).map((action) => {
            const status = actionStatus(state, action.id);
            const isCurrent = action.id === nextActionId(state);
            return <button key={action.id} className={`${status === "已改善" ? "done" : ""} ${isCurrent ? "current" : ""}`} type="button" onClick={() => openAction(flow, action.id)}>
              <time>{action.time}</time><i>{status === "已改善" ? <CheckIcon /> : null}</i><span><b>{action.title}</b><small>{action.expectedImpact}</small></span><em>{status}</em><ChevronRightIcon />
            </button>;
          })}
        </div>
        <button className="playbook-more" type="button" onClick={() => flow.push(playbookScreen)}>还有2项晚市动作 · 当前已完成 {completed}/5 <ChevronRightIcon /></button>
      </section> : null}
    </main>
  </MobileScroll>;
}

function PreOpenBrief({ snapshot, onCalculation }: { snapshot: ReturnType<typeof getDisplaySnapshot>; onCalculation: () => void }) {
  return <section className="preopen-brief">
    <div className="brief-heading"><span>昨日复盘 + 今日预测</span><em>AI已总结 · 08:30更新</em></div>
    <div className="brief-topline">
      <div><small>昨日营业</small><strong>{formatMoney(yesterdayReview.actualRevenue)}</strong><em>目标完成98.6%</em></div>
      <span className="brief-arrow"><ChevronRightIcon /></span>
      <div><small>今日预计</small><strong className="danger">{formatMoney(snapshot.forecastRevenue)}</strong><em>目标 {formatMoney(snapshot.targetRevenue)}</em></div>
    </div>
    <div className="brief-signals">
      <p className="good"><CheckCircledIcon /><span><small>做得好</small><b>每桌平均比上周多消费 ¥18</b></span></p>
      <p className="watch"><ExclamationTriangleIcon /><span><small>要关注</small><b>18点后比正常少来 32 位顾客</b></span></p>
    </div>
    <div className="brief-gap">
      <span><small>今天预计还差</small><strong>约 {snapshot.gap.tables} 桌</strong></span>
      <b>{snapshot.gap.guests} 位顾客</b>
      <button type="button" onClick={onCalculation} aria-label="为什么这样计算"><InfoCircledIcon /></button>
    </div>
  </section>;
}

function LiveHome({ snapshot, state, onCalculation }: { snapshot: ReturnType<typeof getDisplaySnapshot>; state: DemoState; onCalculation: () => void }) {
  const improved = state.memberRecallStage >= 4 || state.reservationStage >= 3;
  return <>
    <section className="live-score-card">
      <div className="card-heading"><span>今日战况</span><em>{snapshot.time}实时判断</em></div>
      <div className="live-revenue"><small>当前完成</small><b>{formatMoney(snapshot.currentRevenue ?? 0)}</b><span>今日目标 {formatMoney(snapshot.targetRevenue)}</span></div>
      {snapshot.expectedRevenueNow !== null ? <div className="pace-comparison"><div><span>正常应该完成</span><b>{formatMoney(snapshot.expectedRevenueNow)}</b></div><i /><div className="behind"><span>现在少完成</span><b>{formatMoney(Math.max(0, snapshot.expectedRevenueNow - (snapshot.currentRevenue ?? 0)))}</b></div></div> : null}
      <div className={`human-gap ${improved ? "is-improved" : ""}`}><span>{improved ? "重新预测还差" : "换成店长听得懂的话"}</span><strong>约 {snapshot.gap.tables} 桌</strong><b>{snapshot.gap.guests} 位顾客</b></div>
      <button className="calculation-link" type="button" onClick={onCalculation}><InfoCircledIcon /> 查看换算依据</button>
    </section>
    {improved ? <section className="prediction-change"><CheckCircledIcon /><div><span>行动后重新预测</span><h3>预计收官 {formatMoney(snapshot.forecastRevenue)}</h3><p>当前营业额没有被虚增，变化的是后续预约和预计结果。</p></div></section> : null}
  </>;
}

function ClosingHome({ state, onOpen }: { state: DemoState; onOpen: () => void }) {
  return <section className="closing-home-card">
    <div className="closing-mark"><CheckCircledIcon /></div>
    <span>今日实际收官</span><strong>¥100,600</strong><b>目标达成 100.6%</b>
    <div className="closing-impact-grid"><p><small>补回顾客</small><b>49位</b></p><p><small>确认预约</small><b>19桌</b></p><p><small>剧本完成</small><b>{completedActionCount(state)}/5</b></p></div>
    <button className="primary-action" type="button" onClick={onOpen}>完成今日经营复盘 <ChevronRightIcon /></button>
  </section>;
}

function DayRoute({ current, onSwitch }: { current: OperatingMomentId; onSwitch: () => void }) {
  const currentIndex = momentOrder.indexOf(current);
  return <section className="day-route-card">
    <div className="section-heading"><h2>今天经营路线</h2><button type="button" onClick={onSwitch}>切换时段</button></div>
    <div className="day-route-track">
      {momentOrder.map((moment, index) => {
        const snapshot = getSnapshot(moment);
        const stateName = index < currentIndex ? "done" : index === currentIndex ? "active" : "todo";
        return <button type="button" key={moment} className={stateName} onClick={onSwitch}><i>{stateName === "done" ? <CheckIcon /> : null}</i><b>{snapshot.time}</b><span>{snapshot.label}</span></button>;
      })}
    </div>
  </section>;
}

function DataScreen({ flow }: { flow: FlowControls }) {
  const { state, setActiveInsight, setSheet } = useDemo();
  const snapshot = getDisplaySnapshot(state.moment, state.memberRecallStage >= 4, state.reservationStage >= 3);
  const openInsight = (id: InsightId) => {
    setActiveInsight(id);
    flow.push(insightScreen);
  };
  return <MobileScroll className="root-scroll">
    <main className="root-content data-content" data-testid="data-screen">
      <PageIntro eyebrow={`${snapshot.time}更新 · 全部为模拟数据`} title="今天经营答案" />
      <section className="answer-hero">
        <span>今天能不能达标？</span>
        <h2>{snapshot.forecastRevenue >= snapshot.targetRevenue ? "已经达到目标" : "有风险，但还有动作可做"}</h2>
        <p>预计完成 <b>{formatMoney(snapshot.forecastRevenue)}</b>，还差约 <strong>{snapshot.gap.tables}桌、{snapshot.gap.guests}位顾客</strong>。</p>
        <button type="button" onClick={() => setSheet("calculation")}><InfoCircledIcon /> 为什么这样判断</button>
      </section>

      <div className="section-heading"><h2>店长只需要看4个答案</h2><span>点开就能行动</span></div>
      <div className="answer-list">
        <AnswerRow index="01" insight={businessInsights.customerGap} onClick={() => openInsight("customerGap")} />
        <AnswerRow index="02" insight={businessInsights.bookingGap} onClick={() => openInsight("bookingGap")} />
        <AnswerRow index="03" insight={businessInsights.onlineOrder} onClick={() => openInsight("onlineOrder")} />
        <AnswerRow index="04" insight={businessInsights.waitingTime} onClick={() => openInsight("waitingTime")} />
      </div>

      <section className="plain-signals">
        <div className="section-heading"><h2>其他经营信号</h2><span>已翻译成人话</span></div>
        <button type="button" onClick={() => openInsight("foodWaste")}><MixerHorizontalIcon /><span><b>食材可能买多了</b><small>今天预计多浪费约 ¥320</small></span><ChevronRightIcon /></button>
        <button type="button" onClick={() => openInsight("onlineOrder")}><PersonIcon /><span><b>线上顾客看了但没下单</b><small>每100位顾客比平时少成交3桌</small></span><ChevronRightIcon /></button>
      </section>

      <section className="data-evidence-card">
        <div className="section-heading"><h2>判断依据</h2><span>可追溯</span></div>
        <div><span>当前到店</span><b>286位顾客</b><small>比正常少65位</small></div>
        <div><span>已开桌</span><b>108桌</b><small>比正常少25桌</small></div>
        <div><span>线上订单</span><b>190笔</b><small>比正常少8笔</small></div>
        <div><span>顾客反馈</span><b>12条</b><small>3桌提到等菜久</small></div>
        <p><LockClosedIcon /> 收银、预约、渠道与顾客反馈模拟汇总</p>
      </section>
    </main>
  </MobileScroll>;
}

function AnswerRow({ index, insight, onClick }: { index: string; insight: typeof businessInsights[InsightId]; onClick: () => void }) {
  return <button className="answer-row" type="button" onClick={onClick}><span>{index}</span><div><b>{insight.title}</b><p>{insight.plainLanguage}</p><small>{insight.impact}</small></div><ChevronRightIcon /></button>;
}

function TasksScreen({ flow }: { flow: FlowControls }) {
  const { state } = useDemo();
  const done = completedActionCount(state);
  return <MobileScroll className="root-scroll">
    <main className="root-content tasks-content" data-testid="tasks-screen">
      <PageIntro eyebrow="8月11日 · AI经营剧本" title="今天按这个节奏经营" />
      <section className="playbook-summary-card">
        <span>《晚市顾客追回剧本》</span>
        <h2>目标：补回25桌、65位顾客</h2>
        <p>当前已完成 {done}/5 项，AI会根据结果自动重排。</p>
        <div className="progress-line"><i style={{ width: `${done * 20}%` }} /></div>
        <button type="button" onClick={() => flow.push(playbookScreen)}>查看AI判断与完整剧本 <ChevronRightIcon /></button>
      </section>

      <div className="mission-track" aria-label="今日剧本时间轴">
        {playbookActions.map((action) => {
          const status = actionStatus(state, action.id);
          return <button type="button" key={action.id} className={status === "已改善" ? "done" : action.id === nextActionId(state) ? "active" : "todo"} onClick={() => openAction(flow, action.id)}>
            <i>{status === "已改善" ? <CheckIcon /> : null}</i><span>{action.time}</span><b>{action.id === "meeting" ? "晨会" : action.title}</b>
          </button>;
        })}
      </div>

      <div className="section-heading"><h2>剧本行动</h2><span>不是普通待办</span></div>
      <div className="action-list">
        {playbookActions.map((action) => <PlaybookActionCard key={action.id} action={action} status={actionStatus(state, action.id)} active={action.id === nextActionId(state)} onClick={() => openAction(flow, action.id)} />)}
      </div>

      {state.regionalTaskStatus !== "not-issued" ? <section className="regional-linked-card">
        <span>区域任务</span><h3>晚市会员召回补充行动</h3><p>林阳区域经理 · 17:30前 · 照片与预约回执</p>
        <b>{regionalStatusCopy[state.regionalTaskStatus]}</b>
        <button type="button" onClick={() => flow.push(regionalAssignmentScreen)}>查看区域行动 <ChevronRightIcon /></button>
      </section> : null}
    </main>
  </MobileScroll>;
}

function PlaybookActionCard({ action, status, active, onClick }: { action: typeof playbookActions[number]; status: ActionStatusId; active: boolean; onClick: () => void }) {
  return <button className={`playbook-action-card ${active ? "is-active" : ""}`} type="button" onClick={onClick}>
    <div className="action-card-top"><span>{action.source}</span><em>{status === "AI建议" ? "待确认" : status}</em></div>
    <h3>{action.time} · {action.title}</h3>
    <p>{action.owner} · {action.method} · {action.evidence}</p>
    <small>{action.expectedImpact}</small><ChevronRightIcon />
  </button>;
}

function AcademyScreen() {
  const { state, setState, busy, runMock, showToast, setActiveTab } = useDemo();
  const topics: Array<{ id: KnowledgeTopic; label: string; icon: IconType }> = [
    { id: "traffic", label: "今天顾客少怎么办", icon: PersonIcon },
    { id: "rating", label: "评分下降怎么办", icon: StarFilledIcon },
    { id: "newcomer", label: "新人不会推荐", icon: SpeakerLoudIcon },
  ];
  const content = knowledgeContent[state.knowledgeTopic];
  const ask = (topic: KnowledgeTopic) => runMock(`knowledge-${topic}`, "已匹配到周麻婆优秀做法", (current) => ({ ...current, knowledgeTopic: topic }));
  return <MobileScroll className="root-scroll">
    <main className="root-content academy-content" data-testid="academy-screen">
      <PageIntro eyebrow="周麻婆经营知识大脑" title="有问题，直接给做法" />
      <section className="knowledge-context">
        <MagicWandIcon /><div><span>已带入当前门店问题</span><h2>晚市预计少25桌、65位顾客</h2><p>不需要店长重复描述数据。</p></div>
      </section>
      <div className="question-grid">
        {topics.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={state.knowledgeTopic === id ? "active" : ""} onClick={() => ask(id)}><Icon /><span>{label}</span></button>)}
      </div>
      <button className="voice-question" type="button" onClick={() => ask(state.knowledgeTopic)}><SpeakerLoudIcon /><span><b>按住说经营问题</b><small>例如：今天人少，我先做什么？</small></span><em>语音演示</em></button>

      {busy?.startsWith("knowledge-") ? <AiThinking /> : <section className="knowledge-answer">
        <div className="knowledge-source"><ReaderIcon /><span>{content.source}</span><b>模拟案例</b></div>
        <span>AI判断</span><h2>{content.judgment}</h2><p>{content.case}</p>
        <div className="knowledge-steps">{content.steps.map((step, index) => <div key={step}><i>{index + 1}</i><span>{step}</span></div>)}</div>
        <button className="primary-action" type="button" onClick={() => {
          setState((current) => ({ ...current, knowledgeAdded: true, playbookClaimed: true }));
          showToast("3个做法已加入今日经营剧本");
        }}>{state.knowledgeAdded ? <><CheckIcon /> 已加入今日剧本</> : <><PlusIcon /> 加入今日经营剧本</>}</button>
        {state.knowledgeAdded ? <button className="secondary-action" type="button" onClick={() => setActiveTab("tasks")}>去看今天怎么做 <ChevronRightIcon /></button> : null}
      </section>}
    </main>
  </MobileScroll>;
}

const knowledgeContent: Record<KnowledgeTopic, { source: string; judgment: string; case: string; steps: string[] }> = {
  traffic: {
    source: "三盛周边优秀门店复盘",
    judgment: "先召回熟客，再追未确认预约，不要先打折。",
    case: "福新中路演示店遇到同类晚市缺口时，用会员召回和预约确认补回18桌。",
    steps: ["向近30天到店会员发一条有理由的邀请", "跟进未确认预约，不群发催促", "晚市现场关注10桌，避免顾客来了却体验不好"],
  },
  rating: {
    source: "总部顾客体验SOP",
    judgment: "先解决3桌等菜问题，再回复评价。",
    case: "优秀门店会把差评拆成现场整改、顾客复联和第二天复查三步。",
    steps: ["确认等待最长发生在哪个出菜环节", "安排晚市首轮出菜检查", "当天完成顾客复联并记录结果"],
  },
  newcomer: {
    source: "优秀店长带教案例",
    judgment: "新人只练一句推荐话术，不要一次讲完整菜单。",
    case: "王小丽带教新人时，用一次示范、两桌观察和即时反馈完成训练。",
    steps: ["店长先示范一句自然推荐", "让新人连续服务两桌", "拍一张现场照片并说一句复盘"],
  },
};

function MineScreen() {
  const { state, setSheet } = useDemo();
  return <MobileScroll className="root-scroll">
    <main className="root-content mine-content" data-testid="mine-screen">
      <PageIntro eyebrow="三盛广场演示店 · 黄店长" title="我正在变成更好的店长" />
      <section className="growth-profile">
        <div className="avatar"><PersonIcon /></div><div><span>本周经营成长</span><h2>连续完成 2 / 7 天</h2><p>成长值 {state.points} · 所有变化都有任务证据</p></div><StarFilledIcon />
      </section>
      <div className="section-heading"><h2>我的经营能力</h2><span>轻量记录</span></div>
      <section className="capability-list">
        {managerCapabilities.map((item) => {
          const score = item.baseScore + (state.capabilityBonuses[item.id] ?? 0);
          return <div key={item.id}><span><b>{item.label}</b><small>{item.description}</small></span><strong>{score}</strong><div className="progress-line"><i style={{ width: `${score}%` }} /></div></div>;
        })}
      </section>
      <section className="growth-evidence">
        <div className="section-heading"><h2>能力变化依据</h2><span>最近</span></div>
        {state.activity.slice(0, 3).map((item) => <p key={item}><CheckCircledIcon /><span>{item}</span></p>)}
      </section>
      <div className="section-heading"><h2>演示工具</h2><span>不进入日常主线</span></div>
      <section className="settings-list">
        <button type="button" onClick={() => setSheet("role")}><DashboardIcon /><span><b>区域联动演示</b><small>林阳下发、验收和回复求助</small></span><ChevronRightIcon /></button>
        <button type="button" onClick={() => setSheet("moment")}><ClockIcon /><span><b>切换经营时段</b><small>{getSnapshot(state.moment).time} · {getSnapshot(state.moment).label}</small></span><ChevronRightIcon /></button>
        <button type="button" onClick={() => setSheet("legacy")}><MixerHorizontalIcon /><span><b>其他店务动作</b><small>采购、人事、沽清的轻量入口</small></span><ChevronRightIcon /></button>
        <button type="button" onClick={() => setSheet("calculation")}><InfoCircledIcon /><span><b>演示数据说明</b><small>查看人数与桌数换算口径</small></span><ChevronRightIcon /></button>
        <button type="button" onClick={() => setSheet("reset")}><CounterClockwiseClockIcon /><span><b>重置全部演示</b><small>恢复到08:30营业前</small></span><ChevronRightIcon /></button>
      </section>
    </main>
  </MobileScroll>;
}

function PlaybookFlow({ flow }: { flow: FlowControls }) {
  const { state, setState } = useDemo();
  return <MobileScroll className="detail-scroll">
    <main className="detail-content" data-testid="playbook-screen">
      <section className="playbook-hero">
        <div className="ai-live"><MagicWandIcon /><span>AI正在分析近7天经营数据</span><i /></div>
        <span>8月11日 · 晚市经营剧本</span>
        <h1>今天补回25桌、65位顾客</h1>
        <p>最大风险来自晚市顾客不足，不需要继续要求员工硬推高客单。</p>
        <div><b>预计追回 ¥6,000–8,000</b><small>可信度92% · 21:30复查</small></div>
      </section>
      <section className="reason-chain">
        <div className="section-heading"><h2>AI为什么这样安排</h2><span>3条证据</span></div>
        <p><i>1</i><span><b>昨天18点后少32位顾客</b><small>不是消费减少，是来店人数减少</small></span></p>
        <p><i>2</i><span><b>今天晚市预约仍少11桌</b><small>预计少来29位顾客</small></span></p>
        <p><i>3</i><span><b>会员中有180位近30天到过店</b><small>优先召回比临时打折更合适</small></span></p>
      </section>
      <div className="section-heading"><h2>今天按5步执行</h2><span>少填表</span></div>
      <div className="playbook-detail-list">{playbookActions.map((action) => <div key={action.id}><time>{action.time}</time><i /><span><b>{action.title}</b><small>{action.owner} · {action.method}</small><p>{action.expectedImpact}</p></span></div>)}</div>
      {state.meetingStage < 6 ? <button className="primary-action sticky-action" type="button" onClick={() => {
        setState((current) => ({ ...current, playbookClaimed: true }));
        flow.replace(meetingScreen);
      }}>{state.playbookClaimed ? "继续执行，先开晨会" : "采用这份剧本，先开晨会"}<ChevronRightIcon /></button> : <button className="primary-action sticky-action" type="button" onClick={() => openAction(flow, nextActionId(state))}>执行下一项 <ChevronRightIcon /></button>}
    </main>
  </MobileScroll>;
}

function MeetingFlow({ flow }: { flow: FlowControls }) {
  const { state, runMock, busy, setState, completeAction, setActiveTab } = useDemo();
  const stage = state.meetingStage;
  return <MobileScroll className="detail-scroll">
    <main className="detail-content workflow-content" data-testid="meeting-flow">
      <StageHeader eyebrow="08:45 · 今日经营启动" title="开晨会，把65位顾客缺口讲清楚" stage={Math.min(stage, 6)} total={6} icon={SpeakerLoudIcon} />
      {stage === 0 ? <section className="workflow-card">
        <p className="large-prompt">不用做会议记录，店长正常讲话，AI负责整理和拆行动。</p>
        <div className="meeting-goal"><TargetIcon /><span><small>今天只讲一个目标</small><b>晚市补回25桌、65位顾客</b></span></div>
        <MockButton busyKey="meeting-start" onClick={() => runMock("meeting-start", "AI已开始记录晨会", (current) => ({ ...current, meetingStage: 1 }))}><SpeakerLoudIcon /> 开始语音晨会</MockButton>
      </section> : null}
      {stage === 1 ? <section className="workflow-card">
        <div className="voice-capture"><div className="voice-wave">{[1,2,3,4,5,6,7,8,9,10].map((item) => <i key={item} />)}</div><b>正在记录 · 00:38</b><span>AI边听边整理</span></div>
        <div className="transcript-card"><p>“今天晚市预计还少65位顾客，王小丽负责会员召回……”</p><p>“李主管把没有确认的10桌预约再跟一下……”</p><p>“晚市我会现场关注10桌顾客的体验。”</p></div>
        <MockButton busyKey="meeting-check" onClick={() => runMock("meeting-check", "AI已完成晨会检查", (current) => ({ ...current, meetingStage: 2 }))}><MagicWandIcon /> 结束并让AI检查</MockButton>
      </section> : null}
      {stage === 2 ? <section className="workflow-card">
        <div className="meeting-complete"><span>晨会内容完整度</span><strong>86%</strong><div className="progress-line"><i style={{ width: "86%" }} /></div></div>
        <div className="extracted-list"><p><CheckIcon /><span><b>今日目标</b><small>补回25桌、65位顾客</small></span></p><p><CheckIcon /><span><b>会员召回</b><small>王小丽 · 16:20前</small></span></p><p><CheckIcon /><span><b>预约跟进</b><small>李主管 · 16:40前</small></span></p></div>
        <div className="missing-topic"><ExclamationTriangleIcon /><span><b>还漏讲1件事</b><small>没有明确谁在20:30收集顾客反馈。</small></span></div>
        <MockButton busyKey="meeting-add" onClick={() => runMock("meeting-add", "已采用AI补充建议", (current) => ({ ...current, meetingStage: 3 }))}><PlusIcon /> 一句话采用AI补充</MockButton>
      </section> : null}
      {stage === 3 ? <section className="workflow-card">
        <div className="section-heading"><h2>AI已生成5项行动</h2><span>无时间冲突</span></div>
        <div className="generated-action-list">{playbookActions.map((action) => <p key={action.id}><span><b>{action.title}</b><small>{action.owner} · {action.time} · {action.method}</small></span><em>无冲突</em></p>)}</div>
        <MockButton busyKey="meeting-send" onClick={() => runMock("meeting-send", "行动已下发给3位负责人", (current) => ({ ...current, meetingStage: 4 }))}><PaperPlaneIcon /> 确认并下发5项行动</MockButton>
      </section> : null}
      {stage === 4 ? <section className="workflow-card">
        <ReceiptSummary title="3位负责人中2位已接收" value="2/3" />
        <ReceiptRow name="王小丽" role="会员召回" status="已接收" tone="good" />
        <ReceiptRow name="李主管" role="预约确认" status="已接收" tone="good" />
        <ReceiptRow name="陈佳" role="20:30反馈" status="未确认·已提醒" tone="warning" />
        <MockButton busyKey="meeting-receipt" onClick={() => runMock("meeting-receipt", "陈佳已确认行动", (current) => ({ ...current, meetingStage: 5 }))}><ReloadIcon /> 模拟员工接收回执</MockButton>
      </section> : null}
      {stage === 5 ? <section className="workflow-card">
        <ReceiptSummary title="3位负责人全部确认" value="3/3" />
        <p className="feedback-quote">“收到，16:20前完成会员召回并回传新增预约。”</p>
        <MockButton busyKey="meeting-complete" onClick={() => runMock("meeting-complete", "晨会闭环完成", (current) => ({ ...current, meetingStage: 6, moment: "lunch" }))}><CheckCircledIcon /> 完成晨会闭环</MockButton>
      </section> : null}
      {stage >= 6 ? <ResultPanel
        title="晨会已经变成可执行的经营剧本"
        evidence="38秒晨会语音 + 5项行动 + 3份员工回执"
        impact="所有人都知道今天要补65位顾客，以及自己在几点前做什么。"
        growth="员工培养 +1 · 执行能力 +1"
        onContinue={() => { completeAction("meeting", "晨会行动已闭环"); setActiveTab("tasks"); flow.pop(); }}
        onRestart={() => setState((current) => ({ ...current, meetingStage: 0 }))}
      /> : null}
      {busy?.startsWith("meeting-") ? <BusyOverlay label="AI正在整理晨会内容" /> : null}
    </main>
  </MobileScroll>;
}

function InspectionFlow({ flow }: { flow: FlowControls }) {
  const { state, runMock, busy, setState, completeAction } = useDemo();
  const stage = state.inspectionStage;
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="inspection-flow">
    <StageHeader eyebrow="12:00 · 午市现场" title="拍一张，AI帮店长判断现场" stage={Math.min(stage, 3)} total={3} icon={CameraIcon} />
    {stage === 0 ? <section className="workflow-card"><div className="capture-prompt"><CameraIcon /><b>拍一张前厅全景照片</b><p>AI会看桌面、人员到岗和顾客等待区域，不用填写巡检表。</p></div><MockButton busyKey="inspection-photo" onClick={() => runMock("inspection-photo", "照片已识别", (current) => ({ ...current, inspectionStage: 1 }))}><CameraIcon /> 模拟拍照并识别</MockButton></section> : null}
    {stage === 1 ? <section className="workflow-card"><div className="photo-result"><CheckCircledIcon /><div><span>AI识别结果</span><h2>现场基本正常，发现1处需处理</h2></div></div><div className="recognition-grid"><p><small>桌面整洁</small><b>正常</b></p><p><small>人员到岗</small><b>6/6</b></p><p className="warning"><small>入口物料</small><b>挡住动线</b></p><p><small>等待顾客</small><b>2桌</b></p></div><MockButton busyKey="inspection-fix" onClick={() => runMock("inspection-fix", "入口物料已移开并补拍", (current) => ({ ...current, inspectionStage: 2 }))}><PaperPlaneIcon /> 下发整改并模拟补拍</MockButton></section> : null}
    {stage === 2 ? <section className="workflow-card"><div className="before-after"><div><span>整改前</span><b>入口动线被遮挡</b></div><ArrowLeftIcon /><div className="after"><span>补拍后</span><b>动线已恢复</b></div></div><MockButton busyKey="inspection-done" onClick={() => runMock("inspection-done", "午市现场已闭环", (current) => ({ ...current, inspectionStage: 3, moment: "afternoon" }))}><CheckCircledIcon /> 完成巡检闭环</MockButton></section> : null}
    {stage >= 3 ? <ResultPanel title="午市现场已处理" evidence="现场照片 + 整改前后对比" impact="人员到岗正常，入口动线已恢复；AI继续把注意力放回晚市顾客缺口。" growth="营业管理 +1" onContinue={() => { completeAction("dinnerExperience", "午市现场问题已处理"); flow.pop(); }} onRestart={() => setState((current) => ({ ...current, inspectionStage: 0 }))} /> : null}
    {busy?.startsWith("inspection-") ? <BusyOverlay label="AI正在识别现场照片" /> : null}
  </main></MobileScroll>;
}

function MemberRecallFlow({ flow }: { flow: FlowControls }) {
  const { state, runMock, busy, setState, completeAction, openHelp } = useDemo();
  const stage = state.memberRecallStage;
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="member-recall-flow">
    <StageHeader eyebrow="16:20 · 当前最快补救" title="召回180位近30天到店会员" stage={Math.min(stage, 4)} total={4} icon={PersonIcon} />
    {stage === 0 ? <section className="workflow-card"><div className="action-why"><MagicWandIcon /><span><b>为什么现在做</b><p>晚市还差约25桌。180位熟客中，预计有31位可能今天到店。</p></span></div><div className="audience-card"><span>AI已选好人群</span><b>180位会员</b><small>近30天到店 · 近7天未消费 · 距门店5公里内</small></div><MockButton busyKey="recall-copy" onClick={() => runMock("recall-copy", "AI已生成召回内容", (current) => ({ ...current, memberRecallStage: 1, playbookClaimed: true, moment: "dinner" }))}><MagicWandIcon /> 生成召回内容</MockButton></section> : null}
    {stage === 1 ? <section className="workflow-card"><div className="message-preview"><span>发送内容预览 · 模拟</span><p>“今晚来三盛广场店，爆炒鲜椒鸡刚出锅。老朋友到店说‘周麻婆’，送一份冰粉，座位可先帮您留好。”</p><small>不自动真实发送，由店长确认。</small></div><div className="send-summary"><span>接收人 180位</span><span>预计到店 31位</span><span>预计新增 12桌</span></div><MockButton busyKey="recall-send" onClick={() => runMock("recall-send", "模拟内容已发送", (current) => ({ ...current, memberRecallStage: 2 }))}><PaperPlaneIcon /> 确认并模拟发送</MockButton></section> : null}
    {stage === 2 ? <section className="workflow-card"><ReceiptSummary title="180位会员已收到" value="180" /><div className="result-metrics"><p><small>已查看</small><b>74位</b></p><p><small>咨询座位</small><b>21位</b></p><p><small>新增预约</small><b>12桌</b></p></div><MockButton busyKey="recall-review" onClick={() => runMock("recall-review", "AI已核对新增预约", (current) => ({ ...current, memberRecallStage: 3 }))}><MagicWandIcon /> AI复查是否有效</MockButton></section> : null}
    {stage === 3 ? <section className="workflow-card"><AiReviewCard title="召回行动有效" body="系统识别到12桌新增预约，共31位顾客；没有把当前营业额提前增加。" /><MockButton busyKey="recall-complete" onClick={() => runMock("recall-complete", "会员召回通过AI复查", (current) => ({ ...current, memberRecallStage: 4 }))}><CheckCircledIcon /> 确认结果并看下一步</MockButton></section> : null}
    {stage >= 4 ? <ResultPanel title="已补回12桌、31位顾客" evidence="180份发送回执 + 12桌新增预约" impact="预计收官从 ¥92,000 提升到 ¥95,000；当前营业额仍是 ¥62,000。" growth="顾客经营 +1 · 连续完成2/7天" onContinue={() => { completeAction("memberRecall", "会员召回补回12桌顾客"); flow.replace(reservationScreen); }} onRestart={() => setState((current) => ({ ...current, memberRecallStage: 0 }))} onHelp={() => openHelp("会员召回没有达到预期")} /> : null}
    {busy?.startsWith("recall-") ? <BusyOverlay label="AI正在核对会员与预约结果" /> : null}
  </main></MobileScroll>;
}

function ReservationFlow({ flow }: { flow: FlowControls }) {
  const { state, runMock, busy, setState, completeAction, openHelp } = useDemo();
  const stage = state.reservationStage;
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="reservation-flow">
    <StageHeader eyebrow="16:40 · 第二个补客动作" title="跟进10桌未确认预约" stage={Math.min(stage, 3)} total={3} icon={CalendarIcon} />
    {stage === 0 ? <section className="workflow-card"><div className="reservation-list"><p><b>6桌</b><span>已留电话，未确认时间</span></p><p><b>3桌</b><span>线上咨询后未完成预订</span></p><p><b>1桌</b><span>昨日改期到今晚</span></p></div><MockButton busyKey="reservation-list" onClick={() => runMock("reservation-list", "AI已生成跟进清单和话术", (current) => ({ ...current, reservationStage: 1 }))}><MagicWandIcon /> 生成跟进清单</MockButton></section> : null}
    {stage === 1 ? <section className="workflow-card"><div className="message-preview"><span>一句话跟进建议</span><p>“您好，今晚的座位还为您保留到17:20，需要我现在帮您确认人数吗？”</p><small>李主管只需逐个确认，不群发催促。</small></div><MockButton busyKey="reservation-follow" onClick={() => runMock("reservation-follow", "10桌预约已完成跟进", (current) => ({ ...current, reservationStage: 2 }))}><PaperPlaneIcon /> 模拟跟进10桌</MockButton></section> : null}
    {stage === 2 ? <section className="workflow-card"><div className="result-metrics"><p><small>确认到店</small><b>7桌</b></p><p><small>确认顾客</small><b>18位</b></p><p><small>改期</small><b>2桌</b></p></div><MockButton busyKey="reservation-done" onClick={() => runMock("reservation-done", "预约跟进通过AI复查", (current) => ({ ...current, reservationStage: 3 }))}><CheckCircledIcon /> 完成预约确认</MockButton></section> : null}
    {stage >= 3 ? <ResultPanel title="累计补回19桌、49位顾客" evidence="10份跟进记录 + 7桌确认回执" impact="预计收官提升到 ¥98,000；还需要约6桌、16位顾客。" growth="顾客经营 +1 · 执行能力 +1" onContinue={() => { completeAction("reservationFollowup", "预约跟进确认7桌顾客"); flow.replace(experienceScreen); }} onRestart={() => setState((current) => ({ ...current, reservationStage: 0 }))} onHelp={() => openHelp("预约跟进遇到顾客拒绝")} /> : null}
    {busy?.startsWith("reservation-") ? <BusyOverlay label="AI正在整理预约回执" /> : null}
  </main></MobileScroll>;
}

function DinnerExperienceFlow({ flow }: { flow: FlowControls }) {
  const { state, runMock, busy, setState, completeAction, openHelp } = useDemo();
  const stage = state.experienceStage;
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="experience-flow">
    <StageHeader eyebrow="18:00 · 顾客已经到店" title="关注10桌体验，别把顾客再丢掉" stage={Math.min(stage, 3)} total={3} icon={CameraIcon} />
    {stage === 0 ? <section className="workflow-card"><div className="focus-table-list"><p><b>3桌</b><span>等待首轮出菜超过12分钟</span></p><p><b>4桌</b><span>会员召回到店，需要确认体验</span></p><p><b>3桌</b><span>新人服务区域，店长现场观察</span></p></div><MockButton busyKey="experience-photo" onClick={() => runMock("experience-photo", "10桌现场照片与反馈已回传", (current) => ({ ...current, experienceStage: 1 }))}><CameraIcon /> 模拟拍照并说一句反馈</MockButton></section> : null}
    {stage === 1 ? <section className="workflow-card"><AiReviewCard title="8桌体验正常，2桌需要加快出菜" body="AI已把2桌问题同步给厨房值班负责人，预计6分钟内完成首轮出菜。" /><MockButton busyKey="experience-fix" onClick={() => runMock("experience-fix", "2桌出菜问题已处理", (current) => ({ ...current, experienceStage: 2 }))}><PaperPlaneIcon /> 下发提醒并模拟处理</MockButton></section> : null}
    {stage === 2 ? <section className="workflow-card"><ReceiptSummary title="10桌顾客体验已确认" value="10/10" /><p className="feedback-quote">2桌等待问题已处理，顾客反馈“现在已经上齐了”。</p><MockButton busyKey="experience-done" onClick={() => runMock("experience-done", "晚市现场行动已闭环", (current) => ({ ...current, experienceStage: 3 }))}><CheckCircledIcon /> 完成晚市现场行动</MockButton></section> : null}
    {stage >= 3 ? <ResultPanel title="10桌顾客体验已守住" evidence="现场照片 + 10桌反馈 + 厨房处理回执" impact="没有新增等待投诉；会员召回顾客到店后的体验得到确认。" growth="营业管理 +1 · 顾客经营 +1" onContinue={() => { completeAction("dinnerExperience", "晚市10桌体验已确认"); flow.replace(feedbackScreen); }} onRestart={() => setState((current) => ({ ...current, experienceStage: 0 }))} onHelp={() => openHelp("晚市出菜速度仍未改善")} /> : null}
    {busy?.startsWith("experience-") ? <BusyOverlay label="AI正在核验现场反馈" /> : null}
  </main></MobileScroll>;
}

function FeedbackReviewFlow({ flow }: { flow: FlowControls }) {
  const { state, runMock, busy, setState, completeAction } = useDemo();
  const stage = state.feedbackStage;
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="feedback-flow">
    <StageHeader eyebrow="20:30 · 最后一次复查" title="确认今天的动作有没有真的改善" stage={Math.min(stage, 3)} total={3} icon={ActivityLogIcon} />
    {stage === 0 ? <section className="workflow-card"><div className="review-source-list"><p><CheckIcon /><span>收银实时结果</span></p><p><CheckIcon /><span>会员与预约回执</span></p><p><CheckIcon /><span>10桌顾客现场反馈</span></p></div><MockButton busyKey="feedback-analyze" onClick={() => runMock("feedback-analyze", "AI已汇总经营结果", (current) => ({ ...current, feedbackStage: 1 }))}><MagicWandIcon /> AI汇总今天的改善</MockButton></section> : null}
    {stage === 1 ? <section className="workflow-card"><div className="result-metrics"><p><small>新增到店</small><b>49位</b></p><p><small>补回预约</small><b>19桌</b></p><p><small>新增投诉</small><b>0条</b></p></div><div className="prediction-bridge"><span>08:30预计</span><b>¥92,000</b><ChevronRightIcon /><span>20:30预计</span><strong>¥100,600</strong></div><MockButton busyKey="feedback-confirm" onClick={() => runMock("feedback-confirm", "经营结果已确认", (current) => ({ ...current, feedbackStage: 2, moment: "closing" }))}><CheckCircledIcon /> 确认结果并进入收官</MockButton></section> : null}
    {stage === 2 ? <section className="workflow-card"><AiReviewCard title="今天的经营动作有效" body="会员召回与预约跟进贡献最明显；晚市体验没有重复出现昨日等待问题。" /><MockButton busyKey="feedback-done" onClick={() => runMock("feedback-done", "今日剧本已完成复查", (current) => ({ ...current, feedbackStage: 3 }))}><FileTextIcon /> 生成收官复盘</MockButton></section> : null}
    {stage >= 3 ? <ResultPanel title="完整经营剧本已走完" evidence="经营数据 + 5项行动 + 9份回执证据" impact="从预计少 ¥8,000 到实际多完成 ¥600，AI已准备今日复盘。" growth="营业管理 +1 · 执行能力 +1" onContinue={() => { completeAction("feedbackReview", "今日经营剧本已完成复查"); flow.replace(closingScreen); }} onRestart={() => setState((current) => ({ ...current, feedbackStage: 0 }))} /> : null}
    {busy?.startsWith("feedback-") ? <BusyOverlay label="AI正在对比预测、动作和实际结果" /> : null}
  </main></MobileScroll>;
}

function ClosingReviewFlow({ flow }: { flow: FlowControls }) {
  const { state, runMock, busy, setState, completeAction } = useDemo();
  const stage = state.closingStage;
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="closing-review">
    <StageHeader eyebrow="21:30 · 今日收官" title="今天做了什么，结果有没有变好" stage={Math.min(stage, 3)} total={3} icon={FileTextIcon} />
    {stage === 0 ? <section className="workflow-card"><div className="closing-board"><p><small>今日目标</small><b>¥100,000</b></p><p><small>08:30预计</small><b>¥92,000</b></p><p className="success"><small>实际收官</small><b>¥100,600</b></p></div><MockButton busyKey="closing-analyze" onClick={() => runMock("closing-analyze", "AI已生成3条复盘结论", (current) => ({ ...current, closingStage: 1 }))}><MagicWandIcon /> AI生成今日复盘</MockButton></section> : null}
    {stage === 1 ? <section className="workflow-card"><div className="three-conclusions"><span>只保留3条</span><p><b>1</b>会员召回和预约跟进补回19桌，是今天最有效的动作。</p><p><b>2</b>晚市10桌体验检查避免了等待问题重复发生。</p><p><b>3</b>明天继续提前确认晚市预约，不需要临时打折。</p></div><MockButton busyKey="closing-tomorrow" onClick={() => runMock("closing-tomorrow", "未完成事项已转为明日行动", (current) => ({ ...current, closingStage: 2 }))}><CalendarIcon /> 生成明日第一项行动</MockButton></section> : null}
    {stage === 2 ? <section className="workflow-card"><div className="tomorrow-card"><span>8月12日 · 08:40</span><h2>提前确认晚市预约名单</h2><p>负责人：李主管 · 证据：预约确认回执</p></div><MockButton busyKey="closing-done" onClick={() => runMock("closing-done", "今日经营日报已生成", (current) => ({ ...current, closingStage: 3 }))}><FileTextIcon /> 完成今日经营</MockButton></section> : null}
    {stage >= 3 ? <ResultPanel title="今天的经营已经收官" evidence="8月11日经营日报 + 5项行动证据" impact="实际营业额 ¥100,600，目标达成100.6%；明日首项行动已安排。" growth="连续完成2/7天" onContinue={() => { completeAction("feedbackReview", "今日经营日报已生成"); flow.pop(); }} onRestart={() => setState((current) => ({ ...current, closingStage: 0 }))} /> : null}
    {busy?.startsWith("closing-") ? <BusyOverlay label="AI正在生成简短经营复盘" /> : null}
  </main></MobileScroll>;
}

function InsightDetail({ flow }: { flow: FlowControls }) {
  const { activeInsight, setActiveTab, setSheet } = useDemo();
  const insight = businessInsights[activeInsight];
  const act = () => {
    if (activeInsight === "customerGap") flow.replace(memberRecallScreen);
    else if (activeInsight === "bookingGap") flow.replace(reservationScreen);
    else if (activeInsight === "onlineOrder") { setActiveTab("academy"); flow.pop(); }
    else if (activeInsight === "waitingTime") flow.replace(experienceScreen);
    else setSheet("legacy");
  };
  return <MobileScroll className="detail-scroll"><main className="detail-content" data-testid="insight-detail">
    <section className="insight-hero"><span>店长能听懂的判断</span><h1>{insight.plainLanguage}</h1><p>{insight.detail}</p></section>
    <section className="insight-proof"><div><span>数据来源</span><b>{insight.source}</b></div><div><span>更新时间</span><b>{insight.updatedAt}</b></div><div><span>AI判断可信度</span><b>{insight.confidence}%</b></div><div><span>预计影响</span><b>{insight.impact}</b></div></section>
    <section className="simple-reason"><MagicWandIcon /><div><span>AI区域经理建议</span><h2>{insight.actionLabel}</h2><p>店长只需要确认关键决定，系统负责整理、分发和复查。</p></div></section>
    <button className="primary-action" type="button" onClick={act}>{insight.actionLabel}<ChevronRightIcon /></button>
    <button className="secondary-action" type="button" onClick={() => setSheet("calculation")}><InfoCircledIcon /> 查看换算与预测依据</button>
  </main></MobileScroll>;
}

function ReminderCenter({ flow }: { flow: FlowControls }) {
  const { state, setState, setActiveInsight } = useDemo();
  const pending = state.reminders.filter((item) => !item.handled).length;
  const open = (item: DemoReminder) => {
    setState((current) => ({ ...current, reminders: current.reminders.map((reminder) => reminder.id === item.id ? { ...reminder, handled: true } : reminder) }));
    if (item.target === "playbook") flow.push(playbookScreen);
    else if (item.target === "regional") flow.push(regionalAssignmentScreen);
    else { setActiveInsight("customerGap"); flow.push(insightScreen); }
  };
  return <MobileScroll className="detail-scroll"><main className="detail-content reminder-content"><PageIntro eyebrow="AI只提醒需要处理的事" title={pending ? `${pending}件事需要处理` : "今天提醒已处理"} />
    <div className="reminder-list">{state.reminders.map((item) => <button key={item.id} className={item.handled ? "handled" : ""} type="button" onClick={() => open(item)}><time>{item.time}</time><span><b>{item.title}</b><small>{item.body}</small></span><em>{item.handled ? "已处理" : "去处理"}</em><ChevronRightIcon /></button>)}</div>
  </main></MobileScroll>;
}

const regionalStatusCopy: Record<RegionalTaskStatus, string> = {
  "not-issued": "未下发", sent: "待店长接收", accepted: "店长已接收", executing: "执行中", "regional-review": "等待区域验收", "needs-fix": "需补充证据", done: "已确认闭环",
};

function RegionHeader({ title, eyebrow }: { title: string; eyebrow: string }) {
  const { setSheet } = useDemo();
  return <header className="region-header"><div><span>{eyebrow}</span><h1>{title}</h1></div><button type="button" onClick={() => setSheet("role")}><PersonIcon /><span>林阳<small>区域经理</small></span><ChevronRightIcon /></button></header>;
}

function RegionOverview({ flow }: { flow: FlowControls }) {
  const { state } = useDemo();
  const tableGap = state.reservationStage >= 3 ? 6 : state.memberRecallStage >= 4 ? 16 : 25;
  const guestGap = state.reservationStage >= 3 ? 16 : state.memberRecallStage >= 4 ? 41 : 65;
  return <MobileScroll className="root-scroll"><main className="root-content region-content" data-testid="region-overview"><RegionHeader eyebrow="福州区域 · 6家店 · 演示数据" title="今天先帮助2家店" />
    <section className="region-summary"><div><small>区域预计营业</small><b>¥612,000</b></div><p><span>急需处理</span><b>2家</b></p><p><span>待验收证据</span><b>{state.regionalTaskStatus === "regional-review" ? 1 : 0}份</b></p><p><span>店长求助</span><b>{state.helpStatus === "sent" ? 1 : 0}条</b></p></section>
    <section className="region-priority"><div className="section-heading"><h2>现在最重要</h2><span>AI已排好</span></div><button type="button" onClick={() => flow.push(regionalStoreScreen)}><span>三盛广场演示店 · 黄店长</span><h2>预计还差{tableGap}桌、{guestGap}位顾客</h2><p>晚市顾客不足，区域可以下发补充行动或回复店长求助。</p><em>去帮助 <ChevronRightIcon /></em></button></section>
    <div className="section-heading"><h2>门店优先级</h2><span>按顾客缺口排序</span></div><div className="region-store-list">{regionStores.slice(0, 4).map((store) => <RegionStoreRow key={store.id} store={store} onClick={() => flow.push(regionalStoreScreen)} />)}</div>
  </main></MobileScroll>;
}

function RegionStores({ flow }: { flow: FlowControls }) {
  return <MobileScroll className="root-scroll"><main className="root-content region-content"><RegionHeader eyebrow="不看综合分，只看经营差距" title="6家门店" /><div className="region-store-list full">{regionStores.map((store) => <RegionStoreRow key={store.id} store={store} onClick={() => flow.push(regionalStoreScreen)} />)}</div></main></MobileScroll>;
}

function RegionStoreRow({ store, onClick }: { store: typeof regionStores[number]; onClick: () => void }) {
  return <button className="region-store-row" type="button" onClick={onClick}><span className={store.status === "急需处理" ? "danger" : store.status === "需要关注" ? "warning" : "good"}>{store.tableGap}桌</span><div><b>{store.name}</b><small>{store.manager} · 还差{store.guestGap}位顾客</small></div><em>{store.openActions}项未闭环</em><ChevronRightIcon /></button>;
}

function RegionTasks({ flow }: { flow: FlowControls }) {
  const { state } = useDemo();
  return <MobileScroll className="root-scroll"><main className="root-content region-content"><RegionHeader eyebrow="只看需要区域介入的行动" title="区域任务" />
    <section className="region-task-card"><span>区域任务</span><h2>晚市会员召回补充行动</h2><p>三盛广场演示店 · 黄店长 · 预计补回12桌</p><b>{regionalStatusCopy[state.regionalTaskStatus]}</b><button type="button" onClick={() => state.regionalTaskStatus === "regional-review" ? flow.push(regionalReviewScreen) : state.regionalTaskStatus === "not-issued" ? flow.push(regionalIssueScreen) : flow.push(regionalStoreScreen)}>{state.regionalTaskStatus === "regional-review" ? "验收证据" : state.regionalTaskStatus === "not-issued" ? "去下发" : "查看进度"}<ChevronRightIcon /></button></section>
  </main></MobileScroll>;
}

function RegionMessages() {
  const { state, setState, showToast } = useDemo();
  return <MobileScroll className="root-scroll"><main className="root-content region-content"><RegionHeader eyebrow="店长求助与异常升级" title="消息" />
    {state.helpStatus === "sent" ? <section className="help-message-card"><span>黄店长 · 三盛广场演示店</span><h2>晚市顾客召回需要帮助</h2><p>系统已附上：预计缺口25桌、已做动作和当前预约结果。</p><button className="primary-action" type="button" onClick={() => { setState((current) => ({ ...current, helpStatus: "replied", helpReply: "建议先跟进10桌未确认预约，区域已安排市场同事提供一条会员文案。", reminders: [{ id: "region-reply", time: "17:05", title: "区域经理已回复求助", body: "建议先跟进10桌未确认预约。", target: "regional", handled: false }, ...current.reminders] })); showToast("方案已回复黄店长"); }}><PaperPlaneIcon /> 一键回复方案</button></section> : <section className="empty-state"><CheckCircledIcon /><h2>{state.helpStatus === "replied" ? "求助已回复" : "暂时没有新求助"}</h2><p>只有店长真的需要区域帮助时才出现。</p></section>}
  </main></MobileScroll>;
}

function RegionMine() {
  const { setSheet } = useDemo();
  return <MobileScroll className="root-scroll"><main className="root-content region-content"><RegionHeader eyebrow="福州区域 · 演示角色" title="林阳" /><section className="region-profile"><div className="avatar"><PersonIcon /></div><div><span>管理范围</span><h2>6家门店</h2><p>今天重点帮助2家店解决顾客缺口</p></div></section><section className="settings-list"><button type="button" onClick={() => setSheet("role")}><ReloadIcon /><span><b>回到黄店长</b><small>继续店长全天主线</small></span><ChevronRightIcon /></button><button type="button" onClick={() => setSheet("moment")}><ClockIcon /><span><b>切换演示时段</b><small>快速验证晚市和收官</small></span><ChevronRightIcon /></button><button type="button" onClick={() => setSheet("reset")}><CounterClockwiseClockIcon /><span><b>重置全部演示</b><small>恢复08:30初始状态</small></span><ChevronRightIcon /></button></section></main></MobileScroll>;
}

function RegionalStoreDetail({ flow }: { flow: FlowControls }) {
  const { state } = useDemo();
  const tableGap = state.reservationStage >= 3 ? 6 : state.memberRecallStage >= 4 ? 16 : 25;
  const guestGap = state.reservationStage >= 3 ? 16 : state.memberRecallStage >= 4 ? 41 : 65;
  return <MobileScroll className="detail-scroll"><main className="detail-content" data-testid="region-store-detail"><section className="region-store-hero"><span>三盛广场演示店 · 黄店长</span><h1>预计还差{tableGap}桌、{guestGap}位顾客</h1><p>当前 ¥62,000 · 预计收官 {state.reservationStage >= 3 ? "¥98,000" : state.memberRecallStage >= 4 ? "¥95,000" : "¥92,000"}</p></section><section className="simple-reason"><MagicWandIcon /><div><span>AI区域判断 · 可信度92%</span><h2>问题是晚市顾客不足</h2><p>预约少11桌，近7天18点后到店人数也在下降。</p></div></section><div className="region-direct-grid"><p><span>未闭环行动</span><b>{Math.max(0, 5 - completedActionCount(state))}项</b></p><p><span>待验收证据</span><b>{state.regionalTaskStatus === "regional-review" ? "1份" : "0份"}</b></p><p><span>店长求助</span><b>{state.helpStatus === "sent" ? "1条" : "0条"}</b></p></div>{state.regionalTaskStatus === "not-issued" ? <button className="primary-action" type="button" onClick={() => flow.push(regionalIssueScreen)}><SpeakerLoudIcon /> 下发补充行动</button> : <button className="primary-action" type="button" onClick={() => state.regionalTaskStatus === "regional-review" ? flow.push(regionalReviewScreen) : flow.push(regionalIssueScreen)}>查看区域行动进度 <ChevronRightIcon /></button>}</main></MobileScroll>;
}

function RegionalIssueFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, showToast } = useDemo();
  const [stage, setStage] = useState(state.regionalTaskStatus === "not-issued" ? 0 : 3);
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="regional-issue-flow"><StageHeader eyebrow="林阳 · 区域经理" title="给黄店长一个清楚的补客动作" stage={stage} total={3} icon={SpeakerLoudIcon} />
    {stage === 0 ? <section className="workflow-card"><div className="voice-capture compact"><SpeakerLoudIcon /><b>点击开始语音演示</b><span>“让黄店长17:30前完成会员召回，并回传新增预约。”</span></div><button className="primary-action" type="button" onClick={() => setStage(1)}><SpeakerLoudIcon /> 开始并结束语音演示</button></section> : null}
    {stage === 1 ? <section className="workflow-card"><div className="generated-action-list"><p><span><b>晚市会员召回补充行动</b><small>黄店长 · 17:30前</small></span><em>区域任务</em></p><p><span><b>需要证据</b><small>发送截图 + 新增预约回执</small></span><em>AI初验</em></p></div><button className="primary-action" type="button" onClick={() => setStage(2)}><CheckIcon /> 确认内容</button></section> : null}
    {stage === 2 ? <section className="workflow-card"><button className="primary-action" type="button" onClick={() => { setState((current) => ({ ...current, regionalTaskStatus: "sent", reminders: [{ id: "regional-action", time: "16:05", title: "林阳下发了补客行动", body: "17:30前完成会员召回并回传新增预约。", target: "regional", handled: false }, ...current.reminders] })); setStage(3); showToast("区域行动已送达黄店长"); }}><PaperPlaneIcon /> 确认并下发</button></section> : null}
    {stage >= 3 ? <ResultPanel title="行动已送达黄店长" evidence="区域语音 + 行动卡 + 店长端提醒" impact={`当前状态：${regionalStatusCopy[state.regionalTaskStatus === "not-issued" ? "sent" : state.regionalTaskStatus]}`} growth="区域只介入需要帮助的门店" onContinue={() => flow.pop()} onRestart={() => { setState((current) => ({ ...current, regionalTaskStatus: "not-issued" })); setStage(0); }} /> : null}
  </main></MobileScroll>;
}

function RegionalAssignmentFlow({ flow }: { flow: FlowControls }) {
  const { state, runMock, busy, setState, openHelp } = useDemo();
  const status = state.regionalTaskStatus;
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="regional-assignment"><StageHeader eyebrow="区域任务 · 林阳下发" title="晚市会员召回补充行动" stage={status === "done" ? 4 : status === "regional-review" ? 3 : status === "executing" ? 2 : status === "accepted" ? 1 : 0} total={4} icon={TargetIcon} />
    {status === "sent" ? <section className="workflow-card"><p className="large-prompt">17:30前完成会员召回，并回传发送截图和新增预约。</p><MockButton busyKey="regional-accept" onClick={() => runMock("regional-accept", "区域行动已接收", (current) => ({ ...current, regionalTaskStatus: "accepted" }))}><CheckCircledIcon /> 接收行动</MockButton></section> : null}
    {status === "accepted" ? <section className="workflow-card"><div className="action-why"><MagicWandIcon /><span><b>系统已合并到今日剧本</b><p>不再新增一份重复待办，继续使用同一份会员召回证据。</p></span></div><MockButton busyKey="regional-do" onClick={() => runMock("regional-do", "开始执行区域行动", (current) => ({ ...current, regionalTaskStatus: "executing" }))}><RocketIcon /> 开始执行</MockButton></section> : null}
    {status === "executing" || status === "needs-fix" ? <section className="workflow-card">{status === "needs-fix" ? <div className="missing-topic"><ExclamationTriangleIcon /><span><b>区域经理要求补充证据</b><small>请补拍发送结果与新增预约同屏照片。</small></span></div> : null}<div className="capture-prompt"><CameraIcon /><b>拍照回传行动证据</b><p>AI先检查，再交给林阳确认。</p></div><MockButton busyKey="regional-proof" onClick={() => runMock("regional-proof", "证据已提交区域验收", (current) => ({ ...current, regionalTaskStatus: "regional-review" }))}><CameraIcon /> 模拟拍照并提交</MockButton></section> : null}
    {status === "regional-review" ? <section className="workflow-card"><ReceiptSummary title="证据已通过AI初验" value="待区域" /><p className="feedback-quote">已识别180份发送回执和12桌新增预约。</p><button className="secondary-action" type="button" onClick={() => flow.pop()}>等待林阳验收</button></section> : null}
    {status === "done" ? <ResultPanel title="区域已确认闭环" evidence="会员发送回执 + 12桌新增预约" impact="店长端与区域端使用同一份经营结果。" growth="顾客经营 +1" onContinue={() => flow.pop()} onRestart={() => setState((current) => ({ ...current, regionalTaskStatus: "sent" }))} /> : null}
    {status !== "done" ? <button className="help-link" type="button" onClick={() => openHelp("区域下发的会员召回行动")}><CrossCircledIcon /> 我做不了，请求帮助</button> : null}
    {busy?.startsWith("regional-") ? <BusyOverlay label="正在同步店长与区域状态" /> : null}
  </main></MobileScroll>;
}

function RegionalReviewFlow({ flow }: { flow: FlowControls }) {
  const { setState, showToast } = useDemo();
  const [done, setDone] = useState(false);
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="regional-review"><StageHeader eyebrow="黄店长 · 17:22回传" title="验收会员召回证据" stage={done ? 2 : 1} total={2} icon={CheckCircledIcon} />
    {!done ? <section className="workflow-card"><div className="evidence-preview"><img src={`${import.meta.env.BASE_URL}assets/task-evidence.jpg`} alt="会员召回任务模拟证据" draggable={false} /><div><span>AI初验通过</span><h2>180份发送回执</h2><p>新增12桌预约，共31位顾客。</p></div></div><div className="review-actions"><button className="secondary-action" type="button" onClick={() => { setState((current) => ({ ...current, regionalTaskStatus: "needs-fix" })); showToast("已退回黄店长补充证据"); flow.pop(); }}><ReloadIcon /> 退回补拍</button><button className="primary-action" type="button" onClick={() => { setState((current) => ({ ...current, regionalTaskStatus: "done", memberRecallStage: 4, moment: "dinner" })); setDone(true); showToast("区域已确认行动闭环"); }}><CheckCircledIcon /> 确认闭环</button></div></section> : <ResultPanel title="区域已确认闭环" evidence="发送回执 + 新增预约 + AI初验" impact="黄店长端已同步结果：预计收官提升到 ¥95,000。" growth="区域帮助完成一次经营闭环" onContinue={() => flow.pop()} onRestart={() => setDone(false)} />}
  </main></MobileScroll>;
}

function DemoSheet() {
  const { sheet, setSheet, state, setState, switchRole, resetDemo, helpTopic, showToast } = useDemo();
  const titleMap: Record<Exclude<SheetId, null>, string> = { reset: "重置演示", calculation: "换算与数据说明", role: "演示角色", moment: "切换经营时段", help: "请求帮助", legacy: "其他店务动作" };
  return <BottomSheet open={sheet !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheet ? titleMap[sheet] : ""} snap={sheet === "moment" ? 0.78 : 0.68}>
    {sheet === "calculation" ? <div className="calculation-sheet"><div className="data-demo-lock"><LockClosedIcon /><span><b>全部为模拟数据</b><small>不代表真实门店经营结果</small></span></div><h3>¥8,000 为什么是25桌、65位顾客？</h3><p>按今日预计每桌约 ¥320、平均每桌约2.6位顾客换算。系统会根据当天桌均消费、人数和预约实时更新。</p><div><span>预计金额缺口</span><b>¥8,000</b></div><div><span>换算桌数</span><b>约25桌</b></div><div><span>换算顾客</span><b>约65位</b></div><small>数据来源：收银POS、预约、会员、渠道与历史同星期模拟数据。</small><button className="primary-action" type="button" onClick={() => setSheet(null)}>我知道了</button></div> : null}
    {sheet === "reset" ? <div className="reset-sheet"><ExclamationTriangleIcon /><h3>确认恢复到08:30营业前？</h3><p>V4的晨会、行动、区域联动和成长记录会被清空；不会影响V3演示进度。</p><button className="secondary-action" type="button" onClick={() => setSheet(null)}>取消</button><button className="primary-action" type="button" onClick={resetDemo}>确认重置演示</button></div> : null}
    {sheet === "role" ? <div className="role-sheet"><p>黄店长是主线角色；区域经理只作为二级联动演示。</p><button className={state.role === "manager" ? "selected" : ""} type="button" onClick={() => switchRole("manager")}><PersonIcon /><span><b>黄店长</b><small>看判断、做行动、回传结果</small></span>{state.role === "manager" ? <CheckCircledIcon /> : <ChevronRightIcon />}</button><button className={state.role === "regional" ? "selected" : ""} type="button" onClick={() => switchRole("regional")}><DashboardIcon /><span><b>林阳 · 区域经理</b><small>下发、验收和回复求助</small></span>{state.role === "regional" ? <CheckCircledIcon /> : <ChevronRightIcon />}</button></div> : null}
    {sheet === "moment" ? <div className="moment-sheet"><p>用于快速验证一天内不同时间的首页变化。</p>{momentOrder.map((moment) => { const snapshot = getSnapshot(moment); return <button className={state.moment === moment ? "selected" : ""} type="button" key={moment} onClick={() => { setState((current) => ({ ...current, moment })); setSheet(null); showToast(`已切换到${snapshot.time} ${snapshot.label}`); }}><ClockIcon /><span><b>{snapshot.time} · {snapshot.label}</b><small>{snapshot.headline}</small></span>{state.moment === moment ? <CheckCircledIcon /> : <ChevronRightIcon />}</button>; })}</div> : null}
    {sheet === "help" ? <div className="help-sheet"><CrossCircledIcon /><h3>把困难交给区域经理</h3><p>求助主题：{helpTopic}</p><div><span>系统会自动附上</span><b>当前顾客缺口</b><b>已经做过的动作</b><b>相关照片和回执</b></div><button className="primary-action" type="button" onClick={() => { setState((current) => ({ ...current, helpStatus: "sent" })); setSheet(null); showToast("求助已发送给林阳区域经理"); }}><PaperPlaneIcon /> 一键发送求助</button></div> : null}
    {sheet === "legacy" ? <div className="legacy-sheet"><p>这些能力不再占首页，只在经营问题出现时快速调用。</p><button type="button" onClick={() => { setSheet(null); showToast("采购申请已生成，等待店长确认"); }}><ClipboardIcon /><span><b>鸡肉预计不足2天</b><small>提交采购申请，不进入复杂采购系统</small></span><em>去处理</em></button><button type="button" onClick={() => { setSheet(null); showToast("新人带教已加入明日行动"); }}><PersonIcon /><span><b>新人推荐动作待带教</b><small>生成一句话训练任务</small></span><em>去处理</em></button><button type="button" onClick={() => { setSheet(null); showToast("嫩牛肉已模拟同步沽清"); }}><MixerHorizontalIcon /><span><b>嫩牛肉只剩6份</b><small>确认后模拟同步三个渠道</small></span><em>去处理</em></button></div> : null}
  </BottomSheet>;
}

function PageIntro({ eyebrow, title, badge }: { eyebrow: string; title: string; badge?: string }) {
  return <header className="page-intro"><div><span>{eyebrow}</span><h1>{title}</h1></div>{badge ? <em>{badge}</em> : null}</header>;
}

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <div className="detail-header"><button type="button" onClick={onBack} aria-label="返回"><ArrowLeftIcon /></button><b>{title}</b><span>演示</span></div>;
}

function StageHeader({ eyebrow, title, stage, total, icon: Icon }: { eyebrow: string; title: string; stage: number; total: number; icon: IconType }) {
  return <section className="stage-header"><span><Icon /></span><div><small>{eyebrow}</small><h1>{title}</h1><p>{stage}/{total}步</p></div><div className="progress-line"><i style={{ width: `${Math.max(4, (stage / total) * 100)}%` }} /></div></section>;
}

function MockButton({ busyKey, onClick, children }: { busyKey: string; onClick: () => void; children: ReactNode }) {
  const { busy } = useDemo();
  return <button className="primary-action" type="button" disabled={busy !== null} onClick={onClick}>{busy === busyKey ? <><ReloadIcon className="spin" /> 正在处理</> : children}</button>;
}

function BusyOverlay({ label }: { label: string }) {
  return <div className="busy-overlay" role="status"><div><MagicWandIcon /><i /></div><b>{label}</b><span>正在匹配经营数据与周麻婆做法</span></div>;
}

function AiThinking() {
  return <section className="ai-thinking"><div><MagicWandIcon /><i /></div><span>正在分析当前门店问题……</span><b>正在匹配周麻婆优秀门店案例</b><small>马上给出今天能执行的做法</small></section>;
}

function ReceiptSummary({ title, value }: { title: string; value: string }) {
  return <div className="receipt-summary"><CheckCircledIcon /><span><b>{title}</b><small>系统回执 · 演示数据</small></span><strong>{value}</strong></div>;
}

function ReceiptRow({ name, role, status, tone }: { name: string; role: string; status: string; tone: string }) {
  return <div className="receipt-row"><PersonIcon /><span><b>{name}</b><small>{role}</small></span><em className={tone}>{status}</em></div>;
}

function AiReviewCard({ title, body }: { title: string; body: string }) {
  return <div className="ai-review-card"><MagicWandIcon /><div><span>AI复查结果</span><h2>{title}</h2><p>{body}</p></div><CheckCircledIcon /></div>;
}

function ResultPanel({ title, evidence, impact, growth, onContinue, onRestart, onHelp }: { title: string; evidence: string; impact: string; growth: string; onContinue: () => void; onRestart: () => void; onHelp?: () => void }) {
  return <section className="result-panel"><div className="result-check"><CheckCircledIcon /></div><span>行动完成 · AI已复查</span><h2>{title}</h2><div className="result-detail"><p><small>完成证据</small><b>{evidence}</b></p><p><small>经营结果</small><b>{impact}</b></p><p><small>店长成长</small><b>{growth}</b></p><p><small>下次复查</small><b>今日21:30</b></p></div><button className="primary-action" type="button" onClick={onContinue}>继续下一项 <ChevronRightIcon /></button><button className="secondary-action" type="button" onClick={onRestart}><ReloadIcon /> 重新处理</button>{onHelp ? <button className="help-link" type="button" onClick={onHelp}><CrossCircledIcon /> 我做不了，请求帮助</button> : null}</section>;
}

function openAction(flow: FlowControls, id: PlaybookActionId) {
  if (id === "meeting") flow.push(meetingScreen);
  else if (id === "memberRecall") flow.push(memberRecallScreen);
  else if (id === "reservationFollowup") flow.push(reservationScreen);
  else if (id === "dinnerExperience") flow.push(experienceScreen);
  else flow.push(feedbackScreen);
}
