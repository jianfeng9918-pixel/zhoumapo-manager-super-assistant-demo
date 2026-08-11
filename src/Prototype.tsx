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
  ArchiveIcon,
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
  IdCardIcon,
  InfoCircledIcon,
  LightningBoltIcon,
  LockClosedIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  PaperPlaneIcon,
  PersonIcon,
  PlayIcon,
  PlusIcon,
  ReaderIcon,
  ReloadIcon,
  RocketIcon,
  SewingPinIcon,
  Share2Icon,
  SpeakerLoudIcon,
  StarFilledIcon,
  TargetIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import {
  BottomSheet,
  Carousel,
  FlowStack,
  MobileScroll,
  type FlowControls,
  type FlowScreen,
} from "./mobile";
import {
  calculateHealth,
  formatMoney,
  getForecastGap,
  getSnapshot,
  getTargetGap,
  healthDimensionLabels,
  initialReminders,
  phaseOrder,
  regionStores,
  type DayPhaseId,
  type DemoReminder,
  type HealthDimensionId,
  type HelpStatus,
  type RegionalTaskStatus,
  type RoleId,
} from "./demo-model";

type TabId = "today" | "data" | "tasks" | "academy" | "mine";
type RegionTabId = "region-overview" | "region-stores" | "region-tasks" | "region-messages" | "region-mine";
type WorkflowId = "meeting" | "inspection" | "purchase" | "hr" | "soldout" | "growth" | "review" | "regional";
type GoalId = "revenue" | "traffic" | "rating" | "cost";
type TaskFilter = "全部" | "必做任务" | "总部任务" | "区域任务" | "AI推荐" | "自主领取" | "我下发";
type LessonId = "huang-revenue" | "founder-rhythm" | "meituan-review" | "strong-store";
type SheetId = "voice-task" | "reset" | "help" | "data-info" | "role-switch" | "phase-switch" | null;
type IconType = ComponentType<{ className?: string }>;

type DemoState = {
  role: RoleId;
  dayPhase: DayPhaseId;
  meetingStage: number;
  inspectionStage: number;
  purchaseStage: number;
  hrStage: number;
  soldoutStage: number;
  growthStage: number;
  reviewStage: number;
  activeGoal: GoalId | null;
  growthPackage: string | null;
  completedGoals: GoalId[];
  completedFlows: WorkflowId[];
  reminders: DemoReminder[];
  regionalTaskStatus: RegionalTaskStatus;
  helpStatus: HelpStatus;
  helpReply: string;
  tomorrowTasks: number;
  reportReady: boolean;
  points: number;
  helpRequests: number;
  voiceTasks: number;
  activity: string[];
};

type DemoContextValue = {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  regionTab: RegionTabId;
  setRegionTab: (tab: RegionTabId) => void;
  sheet: SheetId;
  setSheet: (sheet: SheetId) => void;
  state: DemoState;
  setState: Dispatch<SetStateAction<DemoState>>;
  toast: string;
  showToast: (message: string) => void;
  busy: string | null;
  runMock: (key: string, message: string, update: (current: DemoState) => DemoState) => void;
  completeFlow: (workflow: WorkflowId, points: number, message: string) => void;
  selectGoal: (goal: GoalId) => void;
  resetDemo: () => void;
  openHelp: (topic: string) => void;
  switchRole: (role: RoleId) => void;
  advancePhase: (phase: DayPhaseId, message: string) => void;
  markReminderHandled: (id: string) => void;
  helpTopic: string;
  taskFilter: TaskFilter;
  setTaskFilter: (filter: TaskFilter) => void;
  activeLesson: LessonId;
  setActiveLesson: (lesson: LessonId) => void;
  activeDimension: HealthDimensionId;
  setActiveDimension: (dimension: HealthDimensionId) => void;
};

const STORAGE_KEY = "zhoumapo-manager-assistant-v3";

const initialState: DemoState = {
  role: "manager",
  dayPhase: "opening",
  meetingStage: 0,
  inspectionStage: 0,
  purchaseStage: 0,
  hrStage: 0,
  soldoutStage: 0,
  growthStage: 0,
  reviewStage: 0,
  activeGoal: null,
  growthPackage: null,
  completedGoals: [],
  completedFlows: [],
  reminders: initialReminders,
  regionalTaskStatus: "not-issued",
  helpStatus: "none",
  helpReply: "",
  tomorrowTasks: 0,
  reportReady: false,
  points: 680,
  helpRequests: 0,
  voiceTasks: 0,
  activity: ["11:30 午市卫生巡检已通过AI识别", "08:42 总部晚市任务已送达"],
};

const goalCatalog: Record<GoalId, {
  label: string;
  short: string;
  metric: string;
  diagnosis: string;
  impact: string;
  reward: number;
  icon: IconType;
  tone: string;
}> = {
  revenue: {
    label: "增加业绩",
    short: "追回今日缺口",
    metric: "预计差额 ¥8,000",
    diagnosis: "流量基本正常，主动推荐率从42%降至31%，客单价是当前首要问题。",
    impact: "预计增加营业额 ¥6,000–8,000",
    reward: 20,
    icon: RocketIcon,
    tone: "red",
  },
  traffic: {
    label: "增加客流",
    short: "补足晚市到店",
    metric: "晚市缺口 38桌",
    diagnosis: "抖音曝光正常但到店率偏低，17:00前发布门店内容并激活社群最有效。",
    impact: "预计增加到店 24–32人",
    reward: 18,
    icon: PersonIcon,
    tone: "orange",
  },
  rating: {
    label: "提高评分",
    short: "处理3条差评",
    metric: "口碑健康 72",
    diagnosis: "近7日差评集中在上菜速度和服务主动性，需要先联系顾客再修复晚市流程。",
    impact: "预计7日评分提升 0.1–0.2",
    reward: 16,
    icon: StarFilledIcon,
    tone: "gold",
  },
  cost: {
    label: "控制成本",
    short: "降低备货损耗",
    metric: "损耗率 3.8%",
    diagnosis: "叶菜类和半成品备货偏高，结合晚市预测调整安全库存可立即止损。",
    impact: "预计本周减少损耗 ¥1,200",
    reward: 15,
    icon: ArchiveIcon,
    tone: "green",
  },
};

const workflowPoints: Record<WorkflowId, number> = {
  meeting: 12,
  inspection: 12,
  purchase: 15,
  hr: 14,
  soldout: 10,
  growth: 20,
  review: 30,
  regional: 30,
};

const lessonCatalog: Record<LessonId, {
  source: string;
  title: string;
  lead: string;
  duration: string;
  learners: string;
  goal: GoalId;
  steps: Array<{ title: string; body: string }>;
  result: string;
}> = {
  "huang-revenue": {
    source: "黄老师经营课",
    title: "客单价下降时，店长先做这3件事",
    lead: "不要先打折。先让员工会推荐、敢推荐、知道推荐什么。",
    duration: "3分钟",
    learners: "1,286位店长学过",
    goal: "revenue",
    steps: [
      { title: "锁定一个主推组合", body: "今天只推“招牌菜 + 饮品/小吃”，员工不需要记复杂套餐。" },
      { title: "统一一句话术", body: "让员工用一句自然的搭配建议完成推荐，不靠硬推。" },
      { title: "抽查两桌并及时反馈", body: "店长现场看两次真实推荐，做对立刻表扬，没做现场提醒。" },
    ],
    result: "18家模拟样本门店执行后，平均客单价提升7.2%",
  },
  "founder-rhythm": {
    source: "创始人讲经营",
    title: "店长不要盯一整天，只盯下一步",
    lead: "经营不是多填表，而是在正确时间把最关键的一件事做完。",
    duration: "5分钟",
    learners: "本月必学",
    goal: "revenue",
    steps: [
      { title: "开店前讲清目标", body: "晨会只讲今日差额、首要问题和每个人的下一步。" },
      { title: "午市后只复盘异常", body: "正常指标不耗时间，只处理差评、库存和转化异常。" },
      { title: "晚市前完成一次纠偏", body: "根据实时营业额与预测，调整推荐、客流或备货动作。" },
    ],
    result: "把店长一天的注意力压缩为5个关键经营节点",
  },
  "meituan-review": {
    source: "外部精选 · 模拟摘要",
    title: "美团差评24小时修复法",
    lead: "先分辨情绪与事实，再把回复、整改和复查变成同一条任务。",
    duration: "6分钟",
    learners: "近7日差评3条",
    goal: "rating",
    steps: [
      { title: "AI归因", body: "把反馈归到菜品、速度、服务或环境，避免只写道歉。" },
      { title: "负责人立即整改", body: "明确谁在几点前完成什么，并上传照片或语音证据。" },
      { title: "复联与复查", body: "联系顾客后，再看晚市同类问题是否继续出现。" },
    ],
    result: "形成“反馈—整改—复联—复查”的完整口碑闭环",
  },
  "strong-store": {
    source: "强店案例 · 演示内容",
    title: "晚市翻台提升：强店只做两个动作",
    lead: "不是催顾客，而是提前把迎宾、点单和出菜节奏排顺。",
    duration: "4分钟",
    learners: "区域优秀案例",
    goal: "traffic",
    steps: [
      { title: "17点前排一次岗", body: "按预订与预测客流安排迎宾、点单和传菜岗位。" },
      { title: "盯首轮出菜", body: "首轮菜品速度决定顾客体感，异常立即找厨房纠偏。" },
      { title: "高峰后复盘空档", body: "只记录等待最长的一个环节，第二天继续优化。" },
    ],
    result: "模拟强店案例中，晚市翻台率提升0.3次",
  },
};

const DemoContext = createContext<DemoContextValue | null>(null);

function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoContext");
  return value;
}

function getEffectiveHealth(state: DemoState) {
  const scores = { ...getSnapshot(state.dayPhase).health };
  if (state.purchaseStage >= 5) scores.cost = Math.min(100, scores.cost + 4);
  if (state.hrStage >= 4) scores.people = Math.min(100, scores.people + 6);
  if (state.soldoutStage >= 4) {
    scores.cost = Math.min(100, scores.cost + 2);
    scores.rating = Math.min(100, scores.rating + 1);
  }
  return scores;
}

function restoreDemoState(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      ...initialState,
      ...parsed,
      completedGoals: Array.isArray(parsed.completedGoals) ? parsed.completedGoals : [],
      completedFlows: Array.isArray(parsed.completedFlows) ? parsed.completedFlows : [],
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : initialState.reminders,
      activity: Array.isArray(parsed.activity) ? parsed.activity : initialState.activity,
    };
  } catch {
    return initialState;
  }
}

const tabs: Array<{ id: TabId; label: string; icon: IconType }> = [
  { id: "today", label: "今日", icon: HomeIcon },
  { id: "data", label: "数据", icon: BarChartIcon },
  { id: "tasks", label: "任务", icon: ClipboardIcon },
  { id: "academy", label: "学院", icon: BackpackIcon },
  { id: "mine", label: "我的", icon: PersonIcon },
];

const regionTabs: Array<{ id: RegionTabId; label: string; icon: IconType }> = [
  { id: "region-overview", label: "总览", icon: DashboardIcon },
  { id: "region-stores", label: "门店", icon: SewingPinIcon },
  { id: "region-tasks", label: "任务", icon: ClipboardIcon },
  { id: "region-messages", label: "消息", icon: BellIcon },
  { id: "region-mine", label: "我的", icon: PersonIcon },
];

const rootScreen: FlowScreen = {
  id: "manager-console-v3",
  footerHeight: 88,
  footer: (flow) => <BottomNav flow={flow} />,
  render: (flow) => <MainShell flow={flow} />,
};

function screenWithHeader(id: string, title: string, content: (flow: FlowControls) => ReactNode): FlowScreen {
  return {
    id,
    headerHeight: 52,
    header: (flow) => <DetailHeader title={title} onBack={flow.pop} />,
    render: content,
  };
}

const meetingScreen = screenWithHeader("meeting-flow", "AI晨会", (flow) => <MeetingFlow flow={flow} />);
const purchaseScreen = screenWithHeader("purchase-flow", "智能采购", (flow) => <PurchaseFlow flow={flow} />);
const hrScreen = screenWithHeader("hr-flow", "人员考核", (flow) => <HrFlow flow={flow} />);
const soldOutScreen = screenWithHeader("soldout-flow", "菜品沽清", (flow) => <SoldOutFlow flow={flow} />);
const growthScreen = screenWithHeader("growth-center", "经营提升", (flow) => <GrowthFlow flow={flow} />);
const healthDiagnosisScreen = screenWithHeader("health-diagnosis", "AI经营诊断", (flow) => <HealthDiagnosis flow={flow} />);
const inspectionScreen = screenWithHeader("inspection-flow", "午市拍照巡检", (flow) => <InspectionFlow flow={flow} />);
const closingReviewScreen = screenWithHeader("closing-review", "今日收官复盘", (flow) => <ClosingReviewFlow flow={flow} />);
const reminderScreen = screenWithHeader("reminder-center", "AI主动提醒", (flow) => <ReminderCenter flow={flow} />);
const regionStoreScreen = screenWithHeader("region-store", "门店经营详情", (flow) => <RegionStoreDetail flow={flow} />);
const regionalIssueScreen = screenWithHeader("regional-issue", "区域语音下发", (flow) => <RegionalIssueFlow flow={flow} />);
const regionalAssignmentScreen = screenWithHeader("regional-assignment", "区域任务执行", (flow) => <RegionalAssignmentFlow flow={flow} />);
const regionalReviewScreen = screenWithHeader("regional-review", "区域证据验收", (flow) => <RegionalReviewFlow flow={flow} />);
const academyArticleScreen = screenWithHeader("academy-article", "经营攻略", (flow) => <AcademyArticle flow={flow} />);
const promotionScreen = screenWithHeader("promotion", "三星店长晋升", () => <PromotionDetail />);

export default function Prototype() {
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [regionTab, setRegionTab] = useState<RegionTabId>("region-overview");
  const [sheet, setSheet] = useState<SheetId>(null);
  const [state, setState] = useState<DemoState>(restoreDemoState);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [helpTopic, setHelpTopic] = useState("当前任务");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("全部");
  const [activeLesson, setActiveLesson] = useState<LessonId>("huang-revenue");
  const [activeDimension, setActiveDimension] = useState<HealthDimensionId>("ticket");
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
    toastTimer.current = window.setTimeout(() => setToast(""), 2300);
  };

  const runMock = (key: string, message: string, update: (current: DemoState) => DemoState) => {
    if (busy) return;
    setBusy(key);
    mockTimer.current = window.setTimeout(() => {
      setState(update);
      setBusy(null);
      showToast(message);
    }, 620);
  };

  const completeFlow = (workflow: WorkflowId, points: number, message: string) => {
    setState((current) => {
      const alreadyRewarded = current.completedFlows.includes(workflow);
      return {
        ...current,
        points: alreadyRewarded ? current.points : current.points + points,
        completedFlows: alreadyRewarded ? current.completedFlows : [...current.completedFlows, workflow],
        completedGoals:
          workflow === "growth" && current.activeGoal && !current.completedGoals.includes(current.activeGoal)
            ? [...current.completedGoals, current.activeGoal]
            : current.completedGoals,
        activity: [message, ...current.activity].slice(0, 8),
      };
    });
    showToast(`${message}，成长值 +${points}`);
  };

  const selectGoal = (goal: GoalId) => {
    setState((current) => ({
      ...current,
      activeGoal: goal,
      growthStage: 1,
      growthPackage: null,
    }));
  };

  const resetDemo = () => {
    setState(initialState);
    window.localStorage.removeItem(STORAGE_KEY);
    setSheet(null);
    setActiveTab("today");
    setRegionTab("region-overview");
    setTaskFilter("全部");
    setActiveLesson("huang-revenue");
    setActiveDimension("ticket");
    showToast("演示已恢复到初始状态");
  };

  const openHelp = (topic: string) => {
    setHelpTopic(topic);
    setSheet("help");
  };

  const switchRole = (role: RoleId) => {
    setState((current) => ({ ...current, role }));
    setActiveTab("today");
    setRegionTab("region-overview");
    setSheet(null);
    showToast(role === "manager" ? "已切换到黄店长" : "已切换到林阳区域经理");
  };

  const phaseReminderCopy: Partial<Record<DayPhaseId, DemoReminder>> = {
    lunch: { id: "lunch-low-traffic", time: "11:30", title: "午市客流低于预测20%", body: "先拍一张现场照片，AI会判断是人员、卫生还是引流问题。", badge: "现在", severity: "danger", target: "inspection", handled: false },
    afternoon: { id: "afternoon-diagnosis", time: "14:30", title: "AI发现客单价异常", body: "流量正在恢复，主动推荐率下降是当前首要问题。", badge: "新", severity: "warning", target: "revenue", handled: false },
    preDinner: { id: "dinner-ready", time: "16:00", title: "晚市高峰即将开始", body: "请完成员工推荐训练和库存确认。", badge: "紧急", severity: "danger", target: "revenue", handled: false },
    dinner: { id: "inventory-check", time: "17:00", title: "预计业绩已追回¥6,000", body: "下一步守住库存和渠道体验，避免晚市缺菜。", badge: "下一项", severity: "good", target: "soldout", handled: false },
    closing: { id: "closing-ready", time: "21:30", title: "今日可以收官复盘", body: "营业额已达成，AI已整理结果、证据和明日事项。", badge: "待复盘", severity: "good", target: "none", handled: false },
  };

  const advancePhase = (phase: DayPhaseId, message: string) => {
    setState((current) => {
      const reminder = phaseReminderCopy[phase];
      const hasReminder = reminder ? current.reminders.some((item) => item.id === reminder.id) : false;
      return {
        ...current,
        dayPhase: phase,
        reminders: reminder && !hasReminder ? [reminder, ...current.reminders] : current.reminders,
        activity: [`${getSnapshot(phase).time} ${message}`, ...current.activity].slice(0, 10),
      };
    });
    showToast(`${message}，AI已重新安排下一项`);
  };

  const markReminderHandled = (id: string) => {
    setState((current) => ({
      ...current,
      reminders: current.reminders.map((item) => item.id === id ? { ...item, handled: true, badge: "已处理" } : item),
    }));
  };

  const context = useMemo<DemoContextValue>(() => ({
    activeTab,
    setActiveTab,
    regionTab,
    setRegionTab,
    sheet,
    setSheet,
    state,
    setState,
    toast,
    showToast,
    busy,
    runMock,
    completeFlow,
    selectGoal,
    resetDemo,
    openHelp,
    switchRole,
    advancePhase,
    markReminderHandled,
    helpTopic,
    taskFilter,
    setTaskFilter,
    activeLesson,
    setActiveLesson,
    activeDimension,
    setActiveDimension,
  }), [activeDimension, activeLesson, activeTab, busy, helpTopic, regionTab, sheet, state, taskFilter, toast]);

  return (
    <DemoContext.Provider value={context}>
      <FlowStack initial={rootScreen} />
      <DemoSheet />
      {toast ? (
        <div className="app-toast" role="status">
          <CheckCircledIcon />
          <span>{toast}</span>
        </div>
      ) : null}
    </DemoContext.Provider>
  );
}

function MainShell({ flow }: { flow: FlowControls }) {
  const { activeTab, regionTab, state } = useDemo();
  if (state.role === "regional") {
    return (
      <div className="app-shell region-shell">
        {regionTab === "region-overview" ? <RegionOverview flow={flow} /> : null}
        {regionTab === "region-stores" ? <RegionStores flow={flow} /> : null}
        {regionTab === "region-tasks" ? <RegionTasks flow={flow} /> : null}
        {regionTab === "region-messages" ? <RegionMessages flow={flow} /> : null}
        {regionTab === "region-mine" ? <RegionMine /> : null}
      </div>
    );
  }
  return (
    <div className="app-shell">
      {activeTab === "today" ? <TodayScreen flow={flow} /> : null}
      {activeTab === "data" ? <DataScreen flow={flow} /> : null}
      {activeTab === "tasks" ? <TasksScreen flow={flow} /> : null}
      {activeTab === "academy" ? <AcademyScreen flow={flow} /> : null}
      {activeTab === "mine" ? <MineScreen flow={flow} /> : null}
    </div>
  );
}

function BottomNav({ flow }: { flow: FlowControls }) {
  const { activeTab, setActiveTab, regionTab, setRegionTab, state } = useDemo();
  const navItems = state.role === "manager" ? tabs : regionTabs;
  return (
    <nav className="bottom-nav" aria-label="主要功能">
      {navItems.map((tab) => {
        const Icon = tab.icon;
        const selected = state.role === "manager" ? activeTab === tab.id : regionTab === tab.id;
        const badge = state.role === "manager"
          ? tab.id === "tasks" ? Math.max(0, 7 - state.completedFlows.length) : tab.id === "data" ? 2 : 0
          : tab.id === "region-messages" ? (state.helpStatus === "sent" ? 1 : 0) : tab.id === "region-tasks" && state.regionalTaskStatus === "regional-review" ? 1 : 0;
        return (
          <button
            key={tab.id}
            type="button"
            className={`nav-item ${selected ? "is-active" : ""}`}
            aria-current={selected ? "page" : undefined}
            onClick={() => {
              if (flow.canGoBack) flow.pop();
              if (state.role === "manager") setActiveTab(tab.id as TabId);
              else setRegionTab(tab.id as RegionTabId);
            }}
          >
            <span className="nav-icon-wrap">
              <Icon className="nav-icon" />
              {badge > 0 ? <span className="nav-badge">{badge}</span> : null}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function TodayScreen({ flow }: { flow: FlowControls }) {
  const { setActiveTab, setSheet, state, selectGoal, setTaskFilter, setActiveDimension } = useDemo();
  const snapshot = getSnapshot(state.dayPhase);
  const healthScores = getEffectiveHealth(state);
  const health = calculateHealth(healthScores);
  const targetGap = getTargetGap(snapshot);
  const forecastGap = getForecastGap(snapshot);
  const meetingDone = state.meetingStage >= 6;
  const inspectionDone = state.inspectionStage >= 3;
  const growthDone = state.growthStage >= 4;
  const reviewDone = state.reviewStage >= 3;
  const unreadCount = state.reminders.filter((item) => !item.handled).length;
  const phaseIndex = phaseOrder.indexOf(state.dayPhase);
  const greeting = state.dayPhase === "opening" ? "早上好" : state.dayPhase === "lunch" ? "午市稳住" : state.dayPhase === "afternoon" ? "下午好" : state.dayPhase === "preDinner" ? "晚市要冲刺了" : state.dayPhase === "dinner" ? "晚市守住结果" : "今天辛苦了";
  const nextAction = () => {
    if (state.dayPhase === "opening") flow.push(meetingScreen);
    else if (state.dayPhase === "lunch") flow.push(inspectionScreen);
    else if (state.dayPhase === "afternoon") {
      setActiveDimension("ticket");
      flow.push(healthDiagnosisScreen);
    } else if (state.dayPhase === "preDinner") {
      if (state.regionalTaskStatus !== "not-issued" && state.regionalTaskStatus !== "done") flow.push(regionalAssignmentScreen);
      else {
        selectGoal("revenue");
        flow.push(growthScreen);
      }
    } else if (state.dayPhase === "dinner") flow.push(soldOutScreen);
    else flow.push(closingReviewScreen);
  };
  const completedCount = [meetingDone, inspectionDone, growthDone || state.regionalTaskStatus === "done", state.soldoutStage >= 4, reviewDone].filter(Boolean).length;
  const openTasks = (filter: TaskFilter) => {
    setTaskFilter(filter);
    setActiveTab("tasks");
  };

  return (
    <MobileScroll className="root-scroll home-scroll">
      <main className="root-content home-content" data-testid="today-screen">
        <header className="brand-row">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}assets/zhoumapo-logo.png`} alt="周麻婆 川式小炒" draggable={false} />
          <button className="icon-button notification-button" type="button" aria-label={`查看提醒，${unreadCount}条未处理`} onClick={() => flow.push(reminderScreen)}>
            <BellIcon />{unreadCount > 0 ? <span>{unreadCount}</span> : null}
          </button>
        </header>

        <div className="welcome-row">
          <div>
            <h1>黄店长，{greeting}</h1>
            <p>三盛广场演示店 · 8月11日 <span className="demo-tag">演示数据</span></p>
          </div>
          <button className="level-block role-entry" type="button" onClick={() => setSheet("role-switch")} aria-label={`演示角色为黄店长，2星店长，成长值${state.points}`}>
            <span><StarFilledIcon /> 2星店长 · {state.points}/1000</span>
            <progress value={state.points} max="1000" />
            <small>演示角色 <ChevronRightIcon /></small>
          </button>
        </div>

        <button className="kpi-strip" type="button" onClick={() => setActiveTab("data")} aria-label="查看今日经营数据">
          <div className="kpi-main">
            <span>当前完成 · {snapshot.time}</span>
            <strong className="metric-roll">{formatMoney(snapshot.currentRevenue)} <small>/ {formatMoney(snapshot.targetRevenue)}</small></strong>
            <div className="progress-line"><i style={{ width: `${Math.min(100, (snapshot.currentRevenue / snapshot.targetRevenue) * 100)}%` }} /></div>
            <em>{((snapshot.currentRevenue / snapshot.targetRevenue) * 100).toFixed(1)}%</em>
          </div>
          <KpiMini label="离目标还差" value={formatMoney(targetGap)} />
          <KpiMini label="预计收官" value={formatMoney(snapshot.forecastRevenue)} positive={snapshot.forecastRevenue >= snapshot.targetRevenue} />
          <KpiMini label="预测缺口" value={forecastGap ? formatMoney(forecastGap) : "已达成"} alert={forecastGap > 0} positive={forecastGap === 0} />
          <div className="health-score"><span>门店健康</span><b className="metric-roll">{health}</b><small>{health >= 80 ? "健康" : health >= 70 ? "需关注" : "异常"}</small></div>
        </button>

        <section className="day-phase-strip" aria-label="今日经营时段">
          {phaseOrder.filter((id) => id !== "preDinner").map((id) => {
            const item = getSnapshot(id);
            const index = phaseOrder.indexOf(id);
            const stateName = index < phaseIndex ? "done" : id === state.dayPhase || (state.dayPhase === "preDinner" && id === "afternoon") ? "active" : "todo";
            return <button key={id} type="button" className={stateName} onClick={() => setSheet("phase-switch")}><i>{stateName === "done" ? <CheckIcon /> : null}</i><span>{item.time}</span><small>{item.label}</small></button>;
          })}
        </section>

        <section className="next-action-block">
          <div className="section-title-row compact-heading"><h2>现在最重要</h2><span>{snapshot.label} · AI已排好</span></div>
          <article className="current-task-card next-best-card">
            <div className="task-heading"><h3>{snapshot.primaryTitle}</h3><span>现在做</span></div>
            <p><MagicWandIcon /> {snapshot.primaryMeta}</p>
            <div className="decision-proof"><span>数据依据</span><b>可信度 92%</b><small>完成后自动复查经营结果</small></div>
            <button className="primary-action" type="button" onClick={nextAction}>开始执行 <ChevronRightIcon /></button>
            <small className="growth-reward"><StarFilledIcon /> 完成后自动给出结果反馈</small>
          </article>
        </section>

        <section className="daily-source-section">
          <div className="section-title-row compact-heading"><h2>我的每日任务</h2><button type="button" onClick={() => openTasks("全部")}>全部任务 <ChevronRightIcon /></button></div>
          <div className="daily-source-grid">
            <TaskSourceButton icon={CheckCircledIcon} tone="red" label="必做任务" value={`${completedCount}/5`} meta={meetingDone ? "系统已安排下一项" : "晨会还未完成"} onClick={() => openTasks("必做任务")} />
            <TaskSourceButton icon={PaperPlaneIcon} tone="orange" label="区域任务" value={state.regionalTaskStatus === "not-issued" ? "0项" : "1项"} meta={state.regionalTaskStatus === "regional-review" ? "等待区域验收" : state.regionalTaskStatus === "done" ? "已闭环" : "跨角色实时联动"} onClick={() => openTasks("区域任务")} />
            <TaskSourceButton icon={TargetIcon} tone="green" label="自主领取" value={state.activeGoal ? "1项" : "0项"} meta={state.activeGoal ? "经营行动执行中" : "按目标主动领"} onClick={() => openTasks("自主领取")} />
          </div>
        </section>

        <section className="workbench-section">
          <div className="section-title-row compact-heading"><h2>店务快捷处理</h2><span>少填表，直接做</span></div>
          <button className="store-voice-command" type="button" onClick={() => setSheet("voice-task")}>
            <span><SpeakerLoudIcon /></span><div><b>一句话安排店务</b><small>说清事情，AI自动拆任务并分发</small></div><em>按住说</em>
          </button>
          <div className="tool-grid">
            <ToolButton icon={SpeakerLoudIcon} label="开晨会" meta={meetingDone ? "已闭环" : "AI拆任务"} tone="red" done={meetingDone} onClick={() => flow.push(meetingScreen)} />
            <ToolButton icon={CameraIcon} label="拍照巡检" meta={inspectionDone ? "AI已验收" : "午市必做"} tone="green" done={inspectionDone} onClick={() => flow.push(inspectionScreen)} />
            <ToolButton icon={ArchiveIcon} label="采购下单" meta={state.purchaseStage >= 5 ? "已验收" : "3项缺货"} tone="orange" done={state.purchaseStage >= 5} onClick={() => flow.push(purchaseScreen)} />
            <ToolButton icon={MixerHorizontalIcon} label="菜品沽清" meta={state.soldoutStage >= 4 ? "已上架" : "1项预警"} tone="gold" done={state.soldoutStage >= 4} onClick={() => flow.push(soldOutScreen)} />
            <ToolButton icon={IdCardIcon} label="人员考核" meta={state.hrStage >= 4 ? "已确认" : "2人待看"} tone="green" done={state.hrStage >= 4} onClick={() => flow.push(hrScreen)} />
            <ToolButton icon={FileTextIcon} label="收官复盘" meta={reviewDone ? "日报已生成" : "21:30执行"} tone="red" done={reviewDone} onClick={() => flow.push(closingReviewScreen)} />
          </div>
        </section>

        <section className="growth-section">
          <div className="section-title-row compact-heading"><h2>我想提升</h2><button type="button" onClick={() => flow.push(growthScreen)}>全部方案 <ChevronRightIcon /></button></div>
          <Carousel ariaLabel="经营提升目标" className="goal-carousel" contentClassName="goal-carousel-track">
            {(Object.keys(goalCatalog) as GoalId[]).map((goalId) => {
              const goal = goalCatalog[goalId];
              const Icon = goal.icon;
              const done = state.completedGoals.includes(goalId);
              return (
                <button key={goalId} className={`goal-card ${goal.tone}`} type="button" onClick={() => { selectGoal(goalId); flow.push(growthScreen); }}>
                  <span><Icon /></span><b>{goal.label}</b><small>{done ? "已完成，可重看" : goal.metric}</small><ChevronRightIcon />
                </button>
              );
            })}
          </Carousel>
        </section>

        <section className="today-section">
          <div className="section-title-row"><h2>今日任务地图</h2><span>主线完成 <b>{completedCount}</b>/5</span></div>
          <div className="timeline slim-timeline">
            <TimelineItem time="09:00" state={meetingDone ? "done" : state.dayPhase === "opening" ? "current" : "todo"} title="晨会与分工" meta={meetingDone ? "4项任务已下发并回执" : "语音记录，AI自动拆任务"} onClick={() => flow.push(meetingScreen)} />
            <TimelineItem time="11:30" state={inspectionDone ? "done" : state.dayPhase === "lunch" ? "current" : "todo"} title="午市拍照巡检" meta={inspectionDone ? "环境92分 · 整改已闭环" : "拍一张，AI判断现场问题"} onClick={() => flow.push(inspectionScreen)} />
            <TimelineItem time="14:30" state={growthDone || state.regionalTaskStatus === "done" ? "done" : ["afternoon", "preDinner"].includes(state.dayPhase) ? "current" : "todo"} title="经营提升" meta="诊断→领取→执行→回传" onClick={() => { setActiveDimension("ticket"); flow.push(healthDiagnosisScreen); }} />
            <TimelineItem time="17:00" state={state.soldoutStage >= 4 ? "done" : state.dayPhase === "dinner" ? "current" : "todo"} title="晚市保障" meta="库存、沽清与渠道同步" onClick={() => flow.push(soldOutScreen)} />
            <TimelineItem time="21:30" state={reviewDone ? "done" : state.dayPhase === "closing" ? "current" : "todo"} title="收官复盘" meta="目标、预测与实际核对" onClick={() => flow.push(closingReviewScreen)} />
          </div>
        </section>

        <section className="exception-card">
          <button type="button" className="exception-top" onClick={() => setActiveTab("data")}>
            <ExclamationTriangleIcon /><b>经营异常 {health >= 78 ? "1" : "2"}项</b><span className="danger-chip">客单 {healthScores.ticket}</span><span className="warning-chip">口碑 {healthScores.rating}</span><em>查看数据 <ChevronRightIcon /></em>
          </button>
          <div className="exception-bottom">
            <button type="button" onClick={() => setActiveTab("data")}><DashboardIcon /> 本月 <b>¥426,800</b></button>
            <button type="button" onClick={() => setActiveTab("tasks")}><PersonIcon /> 本周社群 <b>22/40</b></button>
          </div>
        </section>
      </main>
    </MobileScroll>
  );
}

function KpiMini({ label, value, alert, positive }: { label: string; value: string; alert?: boolean; positive?: boolean }) {
  return <div className="kpi-mini"><span>{label}</span><b className={alert ? "text-danger" : positive ? "text-positive" : ""}>{value}</b></div>;
}

function ToolButton({ icon: Icon, label, meta, tone, done, onClick }: { icon: IconType; label: string; meta: string; tone: string; done: boolean; onClick: () => void }) {
  return (
    <button className={`tool-button ${tone}`} type="button" onClick={onClick}>
      <span><Icon /></span><div><b>{label}</b><small>{meta}</small></div>{done ? <CheckCircledIcon className="tool-state done" /> : <ChevronRightIcon className="tool-state" />}
    </button>
  );
}

function TaskSourceButton({ icon: Icon, tone, label, value, meta, onClick }: { icon: IconType; tone: string; label: string; value: string; meta: string; onClick: () => void }) {
  return (
    <button className={`task-source-button ${tone}`} type="button" onClick={onClick}>
      <span><Icon /></span><b>{label}</b><strong>{value}</strong><small>{meta}</small><ChevronRightIcon />
    </button>
  );
}

function TimelineItem({ time, state, title, meta, onClick }: { time: string; state: "done" | "current" | "todo"; title: string; meta: string; onClick: () => void }) {
  return (
    <button className={`timeline-row compact ${state}`} type="button" onClick={onClick}>
      <time>{time}</time><span className={`timeline-node ${state === "current" ? "pulse-node" : ""}`}>{state === "done" ? <CheckIcon /> : state === "current" ? <span /> : null}</span>
      <span className="timeline-copy"><span><b>{title}</b><i>{state === "done" ? "已完成" : state === "current" ? "现在" : "待办"}</i></span><small>{meta}</small></span><ChevronRightIcon className="row-chevron" />
    </button>
  );
}

function DataScreen({ flow }: { flow: FlowControls }) {
  const { selectGoal, showToast, state, setActiveDimension } = useDemo();
  const [view, setView] = useState("概览");
  const views = ["概览", "流量", "转化", "口碑", "成本"];
  const snapshot = getSnapshot(state.dayPhase);
  const healthScores = getEffectiveHealth(state);
  const totalHealth = calculateHealth(healthScores);
  const dimensionCopy: Record<string, { value: string; label: string; detail: string }> = {
    概览: { value: String(totalHealth), label: "经营健康", detail: totalHealth >= 78 ? "1项异常 · 2项关注" : "2项异常 · 3项关注" },
    流量: { value: "720", label: "今日访问", detail: "较昨日 -3.1%" },
    转化: { value: "39.4%", label: "综合转化", detail: "较昨日 +2.4%" },
    口碑: { value: "4.62", label: "渠道评分", detail: "近7日差评3条" },
    成本: { value: "61.8%", label: "今日毛利率", detail: "损耗率 3.8%" },
  };
  const current = dimensionCopy[view];

  const goToGoal = (goal: GoalId) => {
    selectGoal(goal);
    flow.push(growthScreen);
  };

  const goToDimension = (dimension: HealthDimensionId) => {
    setActiveDimension(dimension);
    flow.push(healthDiagnosisScreen);
  };

  return (
    <MobileScroll className="root-scroll">
      <main className="root-content data-content" data-testid="data-screen">
        <PageIntro eyebrow={`8月11日 · ${snapshot.time}更新 · 演示数据`} title="经营数据" action={<button className="icon-button" type="button" aria-label="AI经营诊断" onClick={() => goToDimension("ticket")}><MagicWandIcon /></button>} />
        <section className="data-hero v2-data-hero">
          <div><span>{current.label}</span><strong>{current.value}</strong><p>{current.detail}</p></div>
          <div className="forecast-box"><span>当前完成</span><b className="metric-roll">{formatMoney(snapshot.currentRevenue)}</b><small>预计收官 {formatMoney(snapshot.forecastRevenue)}</small></div>
          <div className="progress-line wide"><i style={{ width: `${Math.min(100, (snapshot.currentRevenue / snapshot.targetRevenue) * 100)}%` }} /></div>
        </section>

        <div className="segmented-tabs" role="tablist" aria-label="数据维度">
          {views.map((item) => <button type="button" key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}
        </div>

        <section>
          <div className="section-heading"><h2>六维健康</h2><span>点指标查看AI诊断</span></div>
          <div className="health-grid six-grid">
            <HealthCard label="流量" score={healthScores.traffic} state={healthScores.traffic >= 80 ? "健康" : healthScores.traffic < 70 ? "异常" : "关注"} tone={healthScores.traffic >= 80 ? "good" : healthScores.traffic < 70 ? "danger" : "warning"} delta="-3.1%" onClick={() => goToDimension("traffic")} />
            <HealthCard label="转化" score={healthScores.conversion} state={healthScores.conversion >= 80 ? "健康" : "关注"} tone={healthScores.conversion >= 80 ? "good" : "warning"} delta="+2.4%" onClick={() => goToDimension("conversion")} />
            <HealthCard label="客单" score={healthScores.ticket} state={healthScores.ticket >= 70 ? "关注" : "异常"} tone={healthScores.ticket >= 70 ? "warning" : "danger"} delta={healthScores.ticket >= 70 ? "+7.2%" : "-9.4%"} onClick={() => goToDimension("ticket")} />
            <HealthCard label="口碑" score={healthScores.rating} state={healthScores.rating >= 80 ? "健康" : "关注"} tone={healthScores.rating >= 80 ? "good" : "warning"} delta="3条差评" onClick={() => goToDimension("rating")} />
            <HealthCard label="成本" score={healthScores.cost} state={healthScores.cost >= 80 ? "健康" : "关注"} tone={healthScores.cost >= 80 ? "good" : "warning"} delta="损耗3.8%" onClick={() => goToDimension("cost")} />
            <HealthCard label="人员" score={healthScores.people} state={healthScores.people >= 82 ? "健康" : "关注"} tone={healthScores.people >= 82 ? "good" : "warning"} delta="2人待带教" onClick={() => goToDimension("people")} />
          </div>
        </section>

        <section className="ai-diagnosis-card">
          <div className="diagnosis-icon"><MagicWandIcon /></div>
          <div><span>AI经营诊断 · 可信度92%</span><h3>首要问题不是流量，而是客单价</h3><p>主动推荐率从42%降到31%，预计影响营业额约¥7,600。</p></div>
          <button type="button" onClick={() => goToDimension("ticket")}>查看原因并行动 <ChevronRightIcon /></button>
        </section>

        <section className="live-pulse-section">
          <div className="section-heading"><h2>实时经营信号</h2><span>系统自动汇总</span></div>
          <div className="live-pulse-list">
            <DataPulse icon={StarFilledIcon} tone="danger" source="美团评价 · 16:08" title="新增1条两星评价：上菜偏慢" metric="待处理" meta="AI已归因到午市出菜速度" onClick={() => goToGoal("rating")} />
            <DataPulse icon={DashboardIcon} tone="warning" source="收银POS · 15:50" title="主动推荐率降至31%" metric="-11%" meta="目标42%，预计影响营业额¥7,600" onClick={() => goToGoal("revenue")} />
            <DataPulse icon={PersonIcon} tone="good" source="顾客反馈 · 14:26" title="堂食新增1条员工表扬" metric="+1" meta="顾客点名表扬王小丽服务主动" onClick={() => showToast("表扬已计入王小丽本周考核")} />
          </div>
          <div className="data-source-line"><LockClosedIcon /><span>演示数据源</span><b>美团</b><b>抖音</b><b>收银POS</b><b>顾客反馈</b></div>
        </section>

        <section>
          <div className="section-heading"><h2>全渠道经营漏斗</h2><span>模拟实时回传</span></div>
          <div className="channel-list">
            <ChannelRow name="美团" color="#f0a116" visitors="326" orders="128" revenue="¥31,800" share={50} onClick={() => showToast("美团：访问326，转化39.3%")} />
            <ChannelRow name="抖音" color="#202124" visitors="184" orders="62" revenue="¥15,600" share={25} onClick={() => goToGoal("traffic")} />
            <ChannelRow name="到店" color="#2e9d5b" visitors="210" orders="94" revenue="¥16,400" share={26} onClick={() => showToast("线下到店转化44.8%，表现健康")} />
            <ChannelRow name="社群" color="#df2517" visitors="86" orders="21" revenue="¥4,900" share={8} onClick={() => goToGoal("traffic")} />
          </div>
        </section>

        <section className="metric-board">
          <Metric title="本月业绩" value="¥426,800" meta="目标 ¥1,000,000" progress={42.7} onClick={() => goToGoal("revenue")} />
          <Metric title="近7日评价" value="38条" meta="差评 3条" progress={79} danger onClick={() => goToGoal("rating")} />
          <Metric title="本周社群" value="22人" meta="目标 40人" progress={55} onClick={() => goToGoal("traffic")} />
          <Metric title="损耗率" value="3.8%" meta="健康线 2.5%" progress={64} danger onClick={() => goToGoal("cost")} />
        </section>
      </main>
    </MobileScroll>
  );
}

function HealthCard({ label, score, state, tone, delta, onClick }: { label: string; score: number; state: string; tone: string; delta: string; onClick: () => void }) {
  return <button className={`health-card ${tone}`} type="button" onClick={onClick}><span>{label}</span><b>{score}</b><i>{state}</i><small>{delta}</small></button>;
}

function ChannelRow({ name, color, visitors, orders, revenue, share, onClick }: { name: string; color: string; visitors: string; orders: string; revenue: string; share: number; onClick: () => void }) {
  return (
    <button className="channel-row" type="button" onClick={onClick}>
      <span className="channel-name"><i style={{ backgroundColor: color }} />{name}</span><span><small>访问</small><b>{visitors}</b></span><ChevronRightIcon /><span><small>下单</small><b>{orders}</b></span><span className="channel-revenue"><small>营业额</small><b>{revenue}</b><i><em style={{ width: `${share}%` }} /></i></span>
    </button>
  );
}

function DataPulse({ icon: Icon, tone, source, title, metric, meta, onClick }: { icon: IconType; tone: string; source: string; title: string; metric: string; meta: string; onClick: () => void }) {
  return (
    <button className="data-pulse-row" type="button" onClick={onClick}>
      <span className={tone}><Icon /></span><div><small>{source}</small><b>{title}</b><p>{meta}</p></div><em className={tone}>{metric}</em><ChevronRightIcon />
    </button>
  );
}

function Metric({ title, value, meta, progress, danger, onClick }: { title: string; value: string; meta: string; progress: number; danger?: boolean; onClick: () => void }) {
  return <button className="metric-card" type="button" onClick={onClick}><span>{title}</span><b>{value}</b><small>{meta}</small><div className="progress-line"><i className={danger ? "danger" : ""} style={{ width: `${progress}%` }} /></div></button>;
}

function TasksScreen({ flow }: { flow: FlowControls }) {
  const { state, setSheet, taskFilter: filter, setTaskFilter: setFilter, selectGoal } = useDemo();
  const filters: TaskFilter[] = ["全部", "必做任务", "总部任务", "区域任务", "AI推荐", "自主领取", "我下发"];
  const regionalStatusCopy: Record<RegionalTaskStatus, string> = {
    "not-issued": "未下发",
    sent: "待接收",
    accepted: "已接收",
    executing: "待回传",
    "regional-review": "待区域验收",
    "needs-fix": "需整改",
    done: "已完成",
  };
  const tasks: Array<{ source: TaskFilter; tone: string; title: string; owner: string; deadline: string; evidence: string; reminders: number; impact: string; reward: number; progress: number; status: string; action: () => void }> = [
    { source: "必做任务", tone: "danger", title: "晨会与今日分工", owner: "黄店长", deadline: "09:10前", evidence: "语音+员工回执", reminders: state.meetingStage ? 0 : 1, impact: "节省记录20分钟", reward: 12, progress: Math.min(100, state.meetingStage * 17), status: state.meetingStage >= 6 ? "已完成" : state.meetingStage ? "执行中" : "待处理", action: () => flow.push(meetingScreen) },
    { source: "必做任务", tone: "danger", title: "午市拍照巡检", owner: "王小丽", deadline: "11:30前", evidence: "现场照片", reminders: state.inspectionStage ? 0 : 1, impact: "防止卫生差评", reward: 12, progress: Math.min(100, state.inspectionStage * 34), status: state.inspectionStage >= 3 ? "已完成" : state.inspectionStage ? "待验收" : "待处理", action: () => flow.push(inspectionScreen) },
    { source: "必做任务", tone: "neutral", title: "晚市库存与沽清检查", owner: "黄店长", deadline: "17:00前", evidence: "库存+渠道回执", reminders: 0, impact: "预计保住¥2,400", reward: 10, progress: state.soldoutStage * 25, status: state.soldoutStage >= 4 ? "已完成" : "待处理", action: () => flow.push(soldOutScreen) },
    { source: "必做任务", tone: "neutral", title: "收官经营复盘", owner: "黄店长", deadline: "21:30", evidence: "经营数据", reminders: 0, impact: "生成明日行动", reward: 30, progress: state.reviewStage * 34, status: state.reviewStage >= 3 ? "已完成" : "待处理", action: () => flow.push(closingReviewScreen) },
    { source: "总部任务", tone: "warning", title: "周末门店朋友圈发布", owner: "黄店长", deadline: "17:30前", evidence: "发布截图", reminders: 1, impact: "预计触达50位会员", reward: 8, progress: 0, status: "待接收", action: () => setSheet("voice-task") },
    ...(state.regionalTaskStatus !== "not-issued" ? [{ source: "区域任务" as TaskFilter, tone: "warning", title: "晚市主动推荐训练", owner: "黄店长·前厅4人", deadline: "16:30前", evidence: "照片+AI初验", reminders: state.regionalTaskStatus === "sent" ? 1 : 0, impact: "预计追回¥6,000", reward: 30, progress: state.regionalTaskStatus === "done" ? 100 : state.regionalTaskStatus === "regional-review" ? 85 : state.regionalTaskStatus === "needs-fix" ? 70 : state.regionalTaskStatus === "executing" ? 55 : 20, status: regionalStatusCopy[state.regionalTaskStatus], action: () => flow.push(regionalAssignmentScreen) }] : []),
    { source: "AI推荐", tone: "good", title: "客单价提升行动", owner: "黄店长·前厅4人", deadline: "晚市前", evidence: "照片或语音", reminders: 0, impact: "预计增加¥6,000–8,000", reward: 20, progress: Math.min(100, state.growthStage * 25), status: state.growthStage >= 4 ? "已完成" : state.growthStage ? "执行中" : "可领取", action: () => { selectGoal("revenue"); flow.push(growthScreen); } },
    { source: "自主领取", tone: "good", title: "本周社群新增40人", owner: "黄店长", deadline: "周日", evidence: "系统新增人数", reminders: 0, impact: "当前22/40人", reward: 18, progress: 55, status: "执行中", action: () => { selectGoal("traffic"); flow.push(growthScreen); } },
    ...(state.voiceTasks > 0 ? [{ source: "我下发" as TaskFilter, tone: "neutral", title: "新品推荐训练", owner: "前厅4人", deadline: "8月12日16:00", evidence: "拍照验收", reminders: 0, impact: "提升主动推荐率", reward: 8, progress: 100, status: "已接收", action: () => setSheet("voice-task") }] : []),
  ];
  const visible = filter === "全部" ? tasks : tasks.filter((task) => task.source === filter);
  const mapItems = [
    { title: "晨会", done: state.meetingStage >= 6 },
    { title: "巡检", done: state.inspectionStage >= 3 },
    { title: "提升", done: state.growthStage >= 4 || state.regionalTaskStatus === "done" },
    { title: "保障", done: state.soldoutStage >= 4 },
    { title: "收官", done: state.reviewStage >= 3 },
  ];
  const activeMapIndex = Math.max(0, mapItems.findIndex((item) => !item.done));
  return (
    <MobileScroll className="root-scroll">
      <main className="root-content tasks-content" data-testid="tasks-screen">
        <PageIntro eyebrow="任务地图 · 演示数据" title="今天只盯下一步" action={<button className="add-button" type="button" onClick={() => setSheet("voice-task")}><PlusIcon /> 语音下发</button>} />
        <section className="mission-map-card">
          <div className="section-heading"><h2>今日主线</h2><span>{mapItems.filter((item) => item.done).length}/5完成</span></div>
          <div className="mission-map-track">{mapItems.map((item, index) => <button key={item.title} type="button" className={item.done ? "done" : index === activeMapIndex ? "active" : "todo"} onClick={() => index === 0 ? flow.push(meetingScreen) : index === 1 ? flow.push(inspectionScreen) : index === 2 ? (state.regionalTaskStatus !== "not-issued" ? flow.push(regionalAssignmentScreen) : (selectGoal("revenue"), flow.push(growthScreen))) : index === 3 ? flow.push(soldOutScreen) : flow.push(closingReviewScreen)}><i>{item.done ? <CheckIcon /> : index + 1}</i><span>{item.title}</span></button>)}</div>
          <div className="mission-mainline"><MagicWandIcon /><span><small>当前主线</small><b>{mapItems[activeMapIndex]?.title ?? "今日已完成"}</b><p>完成后AI自动重排，奖励经营成长值</p></span></div>
        </section>
        <section className="task-source-summary">
          <button type="button" className={filter === "必做任务" ? "active" : ""} onClick={() => setFilter("必做任务")}><CheckCircledIcon /><span>必做任务<b>4项</b><small>门店每日节奏</small></span></button>
          <button type="button" className={filter === "总部任务" ? "active" : ""} onClick={() => setFilter("总部任务")}><PaperPlaneIcon /><span>总部任务<b>1项</b><small>运营中心要求</small></span></button>
          <button type="button" className={filter === "区域任务" ? "active" : ""} onClick={() => setFilter("区域任务")}><TargetIcon /><span>区域任务<b>{state.regionalTaskStatus === "not-issued" ? "0项" : "1项"}</b><small>跨角色实时联动</small></span></button>
        </section>
        <button className="voice-command-card" type="button" onClick={() => setSheet("voice-task")}><span><SpeakerLoudIcon /></span><div><b>说一句话，就能下发任务</b><small>AI自动补责任人、截止时间和验收方式</small></div><ChevronRightIcon /></button>
        <button className="ai-claim-card" type="button" onClick={() => { selectGoal("revenue"); flow.push(growthScreen); }}><MagicWandIcon /><div><span>AI今日建议</span><b>领取“客单价提升”行动</b><small>预计追回营业额 ¥6,000–8,000</small></div><em>去领取 <ChevronRightIcon /></em></button>
        <Carousel ariaLabel="任务筛选" className="filter-carousel" contentClassName="filter-carousel-track">
          {filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
        </Carousel>
        <div className="section-heading"><h2>{filter} · {visible.length}项</h2><span>按优先级排序</span></div>
        <div className="task-list">{visible.map((task) => <TaskCard key={`${task.source}-${task.title}`} {...task} onClick={task.action} />)}</div>
      </main>
    </MobileScroll>
  );
}

function TaskCard({ source, tone, title, owner, deadline, evidence, reminders, impact, reward, progress, status, onClick }: { source: string; tone: string; title: string; owner: string; deadline: string; evidence: string; reminders: number; impact: string; reward: number; progress: number; status: string; onClick: () => void }) {
  return <button className="task-card v3-task-card" type="button" onClick={onClick}><span className={`source-tag ${tone}`}>{source}</span><span className="task-status">{status}<ChevronRightIcon /></span><div className="task-card-main"><h3>{title}</h3><p>{owner} · {deadline}</p><div className="task-evidence-line"><span><CameraIcon /> {evidence}</span>{reminders > 0 ? <em><BellIcon /> 已催{reminders}次</em> : <em className="positive"><StarFilledIcon /> +{reward}</em>}</div><div className="progress-line"><i style={{ width: `${progress}%` }} /></div><small>{impact}</small></div></button>;
}

function AcademyScreen({ flow }: { flow: FlowControls }) {
  const { showToast, selectGoal, setActiveLesson } = useDemo();
  const [topic, setTopic] = useState("提升业绩");
  const topics: Array<{ label: string; icon: IconType }> = [
    { label: "提升业绩", icon: RocketIcon },
    { label: "提升流量", icon: SewingPinIcon },
    { label: "人员带教", icon: PersonIcon },
    { label: "差评处理", icon: CrossCircledIcon },
  ];
  const openLesson = (lesson: LessonId) => {
    setActiveLesson(lesson);
    flow.push(academyArticleScreen);
  };
  return (
    <MobileScroll className="root-scroll">
      <main className="root-content academy-content" data-testid="academy-screen">
        <PageIntro eyebrow="麻婆学院 · 课程与经营经验" title="有问题，直接找做法" />
        <button className="academy-search" type="button" onClick={() => showToast("可以直接说：客流不够怎么办？")}><MagnifyingGlassIcon /> 搜索经营问题或做法</button>
        <div className="topic-grid">
          {topics.map(({ label, icon: Icon }) => <button type="button" key={label} className={topic === label ? "active" : ""} onClick={() => setTopic(label)}><Icon /><span>{label}</span></button>)}
        </div>
        <section className="coach-pick"><span><MagicWandIcon /> 根据今日客单异常推荐</span><h2>客单价下降时，店长先做这3件事</h2><p>黄老师经营课 · 3分钟 · 学完可直接转成行动。</p><button type="button" onClick={() => openLesson("huang-revenue")}>立即学习 <ChevronRightIcon /></button></section>

        <div className="section-heading academy-lane-title"><h2>黄老师经营课</h2><span>把经验变成动作</span></div>
        <CourseCard icon={PersonIcon} tone="teacher" source="黄老师 · 今日推荐" title="客单价提升的3步现场法" meta="3分钟 · 含话术与抽查动作" onClick={() => openLesson("huang-revenue")} />

        <div className="section-heading academy-lane-title"><h2>创始人讲经营</h2><span>每周一讲</span></div>
        <CourseCard icon={SpeakerLoudIcon} tone="founder" source="创始人讲 · 第08期" title="店长不要盯一整天，只盯下一步" meta="5分钟 · 开店、午市、晚市三个节点" onClick={() => openLesson("founder-rhythm")} />

        <div className="section-heading academy-lane-title"><h2>{topic} · 案例精选</h2><span>可直接转任务</span></div>
        <div className="guide-list">
          <GuideCard index="01" title="美团差评24小时修复法" meta="外部精选 · 模拟摘要 · 6分钟" onClick={() => openLesson("meituan-review")} />
          <GuideCard index="02" title="强店晚市翻台提升：只做两个动作" meta="区域案例 · 4分钟" onClick={() => openLesson("strong-store")} />
          <GuideCard index="03" title="社群每周新增40人的门店动作" meta="门店案例 · 5分钟" onClick={() => { selectGoal("traffic"); flow.push(growthScreen); }} />
          <GuideCard index="04" title="晚市备货怎么定，降低损耗不缺菜" meta="经营工具 · 8分钟" onClick={() => { selectGoal("cost"); flow.push(growthScreen); }} />
        </div>
      </main>
    </MobileScroll>
  );
}

function CourseCard({ icon: Icon, tone, source, title, meta, onClick }: { icon: IconType; tone: string; source: string; title: string; meta: string; onClick: () => void }) {
  return (
    <button className={`course-card ${tone}`} type="button" onClick={onClick}>
      <span><Icon /></span><div><small>{source}</small><b>{title}</b><p>{meta}</p></div><em><PlayIcon /> 开始</em>
    </button>
  );
}

function GuideCard({ index, title, meta, onClick }: { index: string; title: string; meta: string; onClick: () => void }) {
  return <button className="guide-card" type="button" onClick={onClick}><span>{index}</span><div><b>{title}</b><small>{meta}</small></div><ChevronRightIcon /></button>;
}

function MineScreen({ flow }: { flow: FlowControls }) {
  const { state, setActiveTab, setSheet, showToast } = useDemo();
  const snapshot = getSnapshot(state.dayPhase);
  const completionRate = Math.round((state.completedFlows.length / 7) * 100);
  return (
    <MobileScroll className="root-scroll">
      <main className="root-content mine-content" data-testid="mine-screen">
        <PageIntro eyebrow={`三盛广场演示店 · ${snapshot.time} · 演示数据`} title="黄店长" action={<button className="role-entry compact" type="button" onClick={() => setSheet("role-switch")}><ReloadIcon /> 切换角色</button>} />
        <section className="profile-card"><div className="avatar"><PersonIcon /></div><div><span>当前等级</span><h2><StarFilledIcon /> 2星店长</h2><p>成长值 {state.points} / 1000</p></div><b>区域第18名</b><div className="progress-line wide"><i style={{ width: `${Math.min(100, state.points / 10)}%` }} /></div></section>
        <section className="promotion-card"><div className="promotion-title"><div><span>下一等级</span><h2>三星店长</h2></div><strong>1/3 达成</strong></div><Requirement done title="年度评比进入 Top 20" meta="当前第18名" /><Requirement title="在职年限超过 2 年" meta="当前1年8个月" /><Requirement title="连续 3 个月盈利" meta="已连续2个月" progress="2/3" /><button className="secondary-action" type="button" onClick={() => flow.push(promotionScreen)}>查看晋升路线 <ChevronRightIcon /></button></section>
        <div className="section-heading"><h2>我的经营</h2><span>本月</span></div>
        <div className="personal-grid">
          <button type="button" onClick={() => setActiveTab("data")}><TargetIcon /><b>{Math.round((snapshot.currentRevenue / snapshot.targetRevenue) * 100)}%</b><span>今日目标</span></button>
          <button type="button" onClick={() => setActiveTab("tasks")}><CheckCircledIcon /><b>{completionRate}%</b><span>闭环完成率</span></button>
          <button type="button" onClick={() => showToast(`本月累计成长值 +${Math.max(120, state.points - 560)}`)}><StarFilledIcon /><b>+{Math.max(120, state.points - 560)}</b><span>本月成长值</span></button>
          <button type="button" onClick={() => setActiveTab("academy")}><ReaderIcon /><b>6篇</b><span>已学攻略</span></button>
        </div>
        <section className="activity-card"><div className="section-heading"><h2>最近反馈</h2><span>{state.activity.length}条</span></div>{state.activity.slice(0, 3).map((item) => <p key={item}><CheckCircledIcon /><span>{item}</span></p>)}</section>
        <section className="settings-list">
          <button type="button" onClick={() => showToast("8月第2周周报已生成（演示）")}><FileTextIcon /> 我的周报 <span>8月第2周 <ChevronRightIcon /></span></button>
          <button type="button" onClick={() => setActiveTab("data")}><CalendarIcon /> 本月目标 <span>42.7% <ChevronRightIcon /></span></button>
          <button type="button" onClick={() => setSheet("role-switch")}><ReloadIcon /> 切换演示角色 <span>林阳区域经理 <ChevronRightIcon /></span></button>
          <button type="button" onClick={() => setSheet("phase-switch")}><ClockIcon /> 演示经营时段 <span>{snapshot.time} {snapshot.label} <ChevronRightIcon /></span></button>
          <button type="button" onClick={() => setSheet("data-info")}><InfoCircledIcon /> 数据说明 <span>演示版 <ChevronRightIcon /></span></button>
          <button type="button" onClick={() => setSheet("reset")}><CounterClockwiseClockIcon /> 重置全部演示 <span>重新体验 <ChevronRightIcon /></span></button>
        </section>
      </main>
    </MobileScroll>
  );
}

function Requirement({ done, title, meta, progress }: { done?: boolean; title: string; meta: string; progress?: string }) {
  return <div className={`requirement ${done ? "done" : ""}`}><span>{done ? <CheckIcon /> : <ClockIcon />}</span><div><b>{title}</b><small>{meta}</small></div>{progress ? <em>{progress}</em> : null}</div>;
}

function PageIntro({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <header className="page-intro"><div><span>{eyebrow}</span><h1>{title}</h1></div>{action}</header>;
}

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <div className="detail-header"><button type="button" onClick={onBack} aria-label="返回"><ArrowLeftIcon /></button><b>{title}</b><span className="header-demo-tag">演示</span></div>;
}

function StageHeader({ eyebrow, title, summary, stage, total, icon: Icon }: { eyebrow: string; title: string; summary: string; stage: number; total: number; icon: IconType }) {
  return (
    <section className="flow-hero"><span className="flow-hero-icon"><Icon /></span><div><span>{eyebrow}</span><h1>{title}</h1><p>{summary}</p></div><b>{stage}/{total}</b><div className="progress-line wide"><i style={{ width: `${Math.min(100, (stage / total) * 100)}%` }} /></div></section>
  );
}

function MockButton({ busyKey, children, onClick, secondary = false }: { busyKey: string; children: ReactNode; onClick: () => void; secondary?: boolean }) {
  const { busy } = useDemo();
  return <button className={secondary ? "secondary-action" : "primary-action"} type="button" disabled={busy !== null} onClick={onClick}>{busy === busyKey ? <><ReloadIcon className="spin-icon" /> AI处理中…</> : children}</button>;
}

function MeetingFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, runMock, completeFlow, openHelp, setActiveTab, setTaskFilter, advancePhase } = useDemo();
  const stage = state.meetingStage;
  const setStage = (next: number, message: string, key: string) => runMock(key, message, (current) => ({ ...current, meetingStage: next }));
  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content" data-testid="meeting-flow">
        <StageHeader eyebrow="09:00 · 7人到会 · 演示数据" title="AI晨会助手" summary="你只管开会，AI负责记录、查漏、拆任务和追反馈。" stage={Math.min(stage, 6)} total={6} icon={SpeakerLoudIcon} />
        {stage === 0 ? (
          <section className="voice-start-card"><div className="voice-orb ai-orb"><SpeakerLoudIcon /></div><h2>点击后直接开始讲</h2><p>不用准备表格，卫生、服务、库存和业绩都会自动识别。</p><MockButton busyKey="meeting-record" onClick={() => setStage(1, "晨会语音正在实时记录", "meeting-record")}><PlayIcon /> 开始语音晨会</MockButton></section>
        ) : null}
        {stage === 1 ? (
          <section><div className="voice-listening meeting-live"><div className="voice-wave" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => <i key={item} />)}</div><b>正在记录 · 06:32</b><p>“今天目标十万，晚市重点推荐爆炒鲜椒鸡。王小丽负责午市卫生，嫩牛肉库存尽快确认……”</p></div><div className="live-extract"><span><ActivityLogIcon /> AI实时提取</span><b>营业目标 ¥100,000</b><b>重点菜 爆炒鲜椒鸡</b><b>责任人 王小丽</b></div><MockButton busyKey="meeting-parse" onClick={() => setStage(2, "晨会已转写，AI正在检查漏项", "meeting-parse")}><MagicWandIcon /> 结束并检查晨会</MockButton></section>
        ) : null}
        {stage === 2 ? (
          <section><div className="meeting-score-card"><div><span>晨会完整度</span><b>82<small>分</small></b><p>目标、菜品、人员、卫生和库存已讲清</p></div><strong>发现1项遗漏</strong></div><div className="coverage-grid"><Signal label="营业目标" value="已讲" tone="good" /><Signal label="重点菜品" value="已讲" tone="good" /><Signal label="人员安排" value="已讲" tone="good" /><Signal label="差评复盘" value="漏讲" tone="danger" /></div><div className="ai-gap-card"><MagicWandIcon /><span><b>建议补充</b><p>近7日有3条差评，尚未安排负责人和复查时间。</p></span></div><MockButton busyKey="meeting-supplement" onClick={() => setStage(3, "已补充差评负责人和复查时间", "meeting-supplement")}><SpeakerLoudIcon /> 一句话采用AI补充</MockButton></section>
        ) : null}
        {stage === 3 ? (
          <section><div className="section-heading"><h2>确认4项任务</h2><span>已检查当班与时间冲突</span></div><div className="generated-tasks v2-generated-tasks"><FlowListRow icon={CameraIcon} title="午市卫生复查" meta="王小丽 · 11:30前 · 拍照" status="无冲突" /><FlowListRow icon={RocketIcon} title="主动推荐训练" meta="前厅4人 · 15:30前 · 语音+照片" status="无冲突" /><FlowListRow icon={ArchiveIcon} title="嫩牛肉采购确认" meta="黄店长 · 16:30前 · 系统验收" status="无冲突" /><FlowListRow icon={StarFilledIcon} title="近7日差评复盘" meta="李主管 · 18:00前 · 语音反馈" status="已补充" /></div><button className="link-action" type="button" onClick={() => setState((current) => ({ ...current, voiceTasks: current.voiceTasks + 1 }))}><PlusIcon /> 再补充一项口头任务</button><MockButton busyKey="meeting-send" onClick={() => setStage(4, "4项任务已一键下发", "meeting-send")}><PaperPlaneIcon /> 确认并下发4项</MockButton></section>
        ) : null}
        {stage === 4 ? (
          <section><div className="receipt-summary"><CheckCircledIcon /><div><b>任务已经送达</b><p>3人已接收，李主管暂未确认</p></div><strong>3/4</strong></div><div className="receipt-list"><ReceiptRow name="王小丽" role="前厅主管" state="已接收" tone="good" /><ReceiptRow name="李明等4人" role="前厅员工" state="已接收" tone="good" /><ReceiptRow name="采购负责人" role="供应链" state="已接收" tone="good" /><ReceiptRow name="李主管" role="值班主管" state="未确认·已催1次" tone="warning" /></div><MockButton busyKey="meeting-receipt" onClick={() => setStage(5, "李主管已确认，午市任务已回传", "meeting-receipt")}><ReloadIcon /> 模拟员工反馈</MockButton></section>
        ) : null}
        {stage === 5 ? <section><div className="evidence-card"><img src={`${import.meta.env.BASE_URL}assets/task-evidence.jpg`} alt="员工午市任务回传" draggable={false} /><div><span><CheckCircledIcon /> AI验收通过</span><h2>任务接收与首项回传正常</h2><p>4项任务全部确认；午市巡检等待王小丽拍照。</p></div></div><div className="impact-row"><span>任务接收</span><b>4/4</b><span>已完成</span><b>1/4</b><span>待复查</span><b>11:30</b></div><MockButton busyKey="meeting-complete" onClick={() => { setState((current) => ({ ...current, meetingStage: 6 })); completeFlow("meeting", workflowPoints.meeting, "晨会闭环已完成"); advancePhase("lunch", "晨会已完成，进入午市检查"); }}><CheckCircledIcon /> 完成晨会闭环</MockButton></section> : null}
        {stage >= 6 ? <ResultPanel flow={flow} title="晨会闭环完成" evidence="语音转写 + 完整度检查 + 4项任务回执" impact="减少会议记录时间约20分钟，漏讲事项已补齐，所有任务都有责任人与截止时间" reward={12} nextTitle="进入今日任务地图" nextMeta="下一步：王小丽在11:30前完成午市巡检并拍照回传" onNext={() => { setTaskFilter("必做任务"); setActiveTab("tasks"); }} onRestart={() => setState((current) => ({ ...current, meetingStage: 0 }))} onHelp={() => openHelp("晨会任务没有人确认")} /> : null}
      </main>
    </MobileScroll>
  );
}

function HealthDiagnosis({ flow }: { flow: FlowControls }) {
  const { activeDimension, state, selectGoal, markReminderHandled, advancePhase, openHelp } = useDemo();
  const snapshot = getSnapshot(state.dayPhase);
  const healthScores = getEffectiveHealth(state);
  const copy: Record<HealthDimensionId, { state: string; anomaly: string; causes: string[]; source: string; confidence: string; impact: string; action: string; duration: string; difficulty: string; goal: GoalId | null }> = {
    traffic: { state: healthScores.traffic < 70 ? "异常" : "关注", anomaly: "午市自然到店较预测低20%", causes: ["美团曝光正常，进店率下降", "午市社群触达比昨日少18人", "门店外摆信息未及时更新"], source: "美团曝光 + 到店客流 + 社群触达", confidence: "89%", impact: "预计少到店24–32人", action: "启动午市客流补救", duration: "20分钟", difficulty: "容易", goal: "traffic" },
    conversion: { state: "健康", anomaly: "综合转化保持在39.4%", causes: ["线上下单转化稳定", "到店点单率高于区域均值", "无需额外促销"], source: "美团 + 抖音 + 收银POS", confidence: "94%", impact: "继续保持当前动作", action: "查看保持动作", duration: "5分钟", difficulty: "容易", goal: "revenue" },
    ticket: { state: healthScores.ticket >= 70 ? "改善中" : "异常", anomaly: healthScores.ticket >= 70 ? "主动推荐率已回升至38%" : "客单价下降9.4%", causes: ["主动推荐率从42%降至31%", "招牌菜搭配推荐次数下降", "流量基本正常，不是首要问题"], source: "收银POS + 菜品明细 + 员工推荐记录", confidence: "92%", impact: healthScores.ticket >= 70 ? "预计收官已提升至¥98,000" : "预计影响营业额约¥7,600", action: healthScores.ticket >= 70 ? "复查晚市执行" : "领取客单价提升行动", duration: "30分钟", difficulty: "中等", goal: "revenue" },
    rating: { state: "关注", anomaly: "近7日新增3条差评", causes: ["2条集中在上菜速度", "1条集中在服务主动性", "午市首轮出菜慢6分钟"], source: "美团评价 + 顾客反馈 + 出菜时长", confidence: "91%", impact: "预计7日评分影响0.1–0.2", action: "领取差评修复行动", duration: "25分钟", difficulty: "中等", goal: "rating" },
    cost: { state: "关注", anomaly: "损耗率3.8%，高于健康线2.5%", causes: ["叶菜备货偏高", "嫩牛肉安全库存不足", "晚市预测未同步采购"], source: "库存 + 采购 + 收银POS", confidence: "87%", impact: "预计本周可减少损耗¥1,200", action: "领取成本控制行动", duration: "20分钟", difficulty: "容易", goal: "cost" },
    people: { state: "关注", anomaly: "2名员工需要现场带教", causes: ["新人主动推荐完成率68%", "王小丽具备带教条件", "晚市前有30分钟训练窗口"], source: "考勤 + 任务回传 + 顾客反馈", confidence: "90%", impact: "预计主动推荐率提升6–9%", action: "进入人员带教", duration: "30分钟", difficulty: "中等", goal: null },
  };
  const item = copy[activeDimension];
  const claim = () => {
    state.reminders.filter((reminder) => (activeDimension === "rating" ? reminder.target === "rating" : reminder.target === "revenue")).forEach((reminder) => markReminderHandled(reminder.id));
    if (activeDimension === "people") {
      flow.replace(hrScreen);
      return;
    }
    if (item.goal) selectGoal(item.goal);
    if (activeDimension === "ticket" && ["opening", "lunch", "afternoon"].includes(state.dayPhase)) advancePhase("preDinner", "诊断已完成，进入晚市纠偏");
    flow.replace(growthScreen);
  };
  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content diagnosis-page" data-testid="health-diagnosis">
        <section className="diagnosis-score-hero"><span>门店健康诊断 · 演示数据</span><div><b>{healthDimensionLabels[activeDimension]}</b><strong>{healthScores[activeDimension]}</strong><em>{item.state}</em></div><div className="health-meter"><i style={{ width: `${healthScores[activeDimension]}%` }} /></div></section>
        <section className="ai-thinking-card"><div className="diagnosis-icon ai-orb"><MagicWandIcon /></div><div><span>AI已分析3类经营数据</span><h2>{item.anomaly}</h2><p>判断可信度 {item.confidence} · 数据更新 {snapshot.time}</p></div></section>
        <section><div className="section-heading"><h2>为什么会这样</h2><span>原因链</span></div><div className="cause-chain">{item.causes.map((cause, index) => <div key={cause}><i>{index + 1}</i><span>{cause}</span>{index < item.causes.length - 1 ? <ChevronRightIcon /> : null}</div>)}</div></section>
        <section className="diagnosis-source-card"><LockClosedIcon /><div><span>数据来源</span><b>{item.source}</b><small>全部为模拟数据，不代表真实门店结果</small></div></section>
        <section className="action-brief-card"><div><span>推荐行动</span><h2>{item.action}</h2><p>{item.impact}</p></div><div className="action-brief-facts"><span>耗时<b>{item.duration}</b></span><span>难度<b>{item.difficulty}</b></span><span>复查<b>21:30</b></span></div><button className="primary-action" type="button" onClick={claim}><TargetIcon /> 立即领取任务</button></section>
        <button className="help-action" type="button" onClick={() => openHelp(`${healthDimensionLabels[activeDimension]}诊断需要区域经理帮助判断`)}><InfoCircledIcon /> 我不确定，请区域经理帮助判断</button>
      </main>
    </MobileScroll>
  );
}

function InspectionFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, runMock, completeFlow, openHelp, advancePhase, setActiveTab, setActiveDimension } = useDemo();
  const stage = state.inspectionStage;
  const setStage = (next: number, message: string, key: string) => runMock(key, message, (current) => ({ ...current, inspectionStage: next }));
  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content" data-testid="inspection-flow">
        <StageHeader eyebrow="11:30午市巡检 · 演示数据" title="拍一张，AI替你检查" summary="不填巡检表，拍现场照片后只处理真正异常。" stage={Math.min(stage, 3)} total={3} icon={CameraIcon} />
        {stage === 0 ? <section><div className="capture-prompt"><CameraIcon /><b>拍摄前厅与调料台</b><p>AI会识别环境整洁、人员到岗和高风险问题。</p></div><div className="capture-guide"><span><CheckCircledIcon /> 保持画面清晰</span><span><CheckCircledIcon /> 包含主要工作区域</span><span><CheckCircledIcon /> 不需要逐项填写</span></div><MockButton busyKey="inspection-capture" onClick={() => setStage(1, "照片已上传，AI正在识别", "inspection-capture")}><CameraIcon /> 模拟拍照并识别</MockButton></section> : null}
        {stage === 1 ? <section><div className="evidence-card inspection-evidence"><img src={`${import.meta.env.BASE_URL}assets/task-evidence.jpg`} alt="午市巡检现场照片" draggable={false} /><div><span><MagicWandIcon /> AI识别完成</span><h2>环境整洁度92分</h2><p>人员6/6到岗；发现调料台边角有1处待清理。</p></div></div><div className="acceptance-grid"><Signal label="环境整洁" value="92分" tone="good" /><Signal label="人员到岗" value="6/6" tone="good" /><Signal label="高风险" value="0项" tone="good" /><Signal label="待整改" value="1项" tone="warning" /></div><div className="rectify-card"><ExclamationTriangleIcon /><span><b>调料台边角待清理</b><p>已自动生成王小丽的5分钟整改任务。</p></span></div><MockButton busyKey="inspection-rectify" onClick={() => setStage(2, "整改任务已完成，等待补拍", "inspection-rectify")}><PaperPlaneIcon /> 下发整改并模拟完成</MockButton></section> : null}
        {stage === 2 ? <section><div className="before-after"><div><span>整改前</span><img src={`${import.meta.env.BASE_URL}assets/task-evidence.jpg`} alt="整改前" draggable={false} /></div><ChevronRightIcon /><div><span>补拍后</span><img src={`${import.meta.env.BASE_URL}assets/task-evidence.jpg`} alt="整改后" draggable={false} /></div></div><div className="confirmation-card"><CheckCircledIcon /><h2>AI复验通过</h2><p>问题区域已清理，照片清晰度和环境状态符合标准。</p><span>完成：王小丽 · 11:37</span></div><MockButton busyKey="inspection-complete" onClick={() => { setState((current) => ({ ...current, inspectionStage: 3 })); completeFlow("inspection", workflowPoints.inspection, "午市拍照巡检已闭环"); advancePhase("afternoon", "午市巡检完成，进入午后诊断"); }}><CheckCircledIcon /> 完成巡检闭环</MockButton></section> : null}
        {stage >= 3 ? <ResultPanel flow={flow} title="午市巡检完成" evidence="现场照片 + AI识别 + 整改补拍" impact="环境整洁度92分，1处问题已在7分钟内完成整改" reward={12} nextTitle="查看午后经营诊断" nextMeta="流量正在恢复，AI发现客单价仍是首要问题" onNext={() => { setActiveDimension("ticket"); setActiveTab("data"); }} onRestart={() => setState((current) => ({ ...current, inspectionStage: 0 }))} onHelp={() => openHelp("巡检照片无法通过AI识别")} /> : null}
      </main>
    </MobileScroll>
  );
}

function ClosingReviewFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, runMock, completeFlow, openHelp, advancePhase } = useDemo();
  const stage = state.reviewStage;
  const setStage = (next: number, message: string, key: string) => runMock(key, message, (current) => ({ ...current, reviewStage: next }));
  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content" data-testid="closing-review">
        <StageHeader eyebrow="21:30经营收官 · 演示数据" title="今天做成了什么？" summary="AI核对目标、预测和实际，把未完成事项带到明天。" stage={Math.min(stage, 3)} total={3} icon={FileTextIcon} />
        {stage === 0 ? <section><div className="closing-scoreboard"><div><span>今日目标</span><b>¥100,000</b></div><div><span>16:20预测</span><b>¥92,000</b></div><div className="success"><span>实际收官</span><b>¥100,600</b></div></div><div className="review-summary-grid"><Signal label="主线任务" value={`${Math.max(4, state.completedFlows.length)}/5`} tone="good" /><Signal label="预测追回" value="¥8,600" tone="good" /><Signal label="差评整改" value="2/3" tone="warning" /><Signal label="经营健康" value="80分" tone="good" /></div><MockButton busyKey="review-ai" onClick={() => { if (state.dayPhase !== "closing") advancePhase("closing", "进入今日收官复盘"); setStage(1, "AI已生成三条经营结论", "review-ai"); }}><MagicWandIcon /> AI生成今日复盘</MockButton></section> : null}
        {stage === 1 ? <section><div className="section-heading"><h2>AI复盘结论</h2><span>只保留3条</span></div><div className="review-lessons"><div><i>1</i><span><b>客单价动作有效</b><p>主动推荐训练后，预计收官从¥92,000提升至¥98,000。</p></span></div><div><i>2</i><span><b>午市巡检及时</b><p>卫生问题在7分钟内完成整改，没有形成新增差评。</p></span></div><div><i>3</i><span><b>仍有1条差评待复联</b><p>建议明日10:30前由李主管完成顾客回访。</p></span></div></div><button className="secondary-action" type="button" onClick={() => setState((current) => ({ ...current, tomorrowTasks: 1 }))}><CalendarIcon /> 将未完成事项转为明日任务</button><MockButton busyKey="review-report" onClick={() => setStage(2, "明日任务和经营日报已生成", "review-report")}><FileTextIcon /> 生成日报与明日任务</MockButton></section> : null}
        {stage === 2 ? <section><div className="report-ready-card"><CheckCircledIcon /><span>8月11日经营日报</span><h2>目标达成 100.6%</h2><p>已记录经营动作7项、证据9份、待跟进1项。</p><div><b>明日首项</b><small>10:30前完成差评顾客复联</small></div></div><MockButton busyKey="review-complete" onClick={() => { setState((current) => ({ ...current, reviewStage: 3, reportReady: true, tomorrowTasks: Math.max(1, current.tomorrowTasks) })); completeFlow("review", workflowPoints.review, "今日经营复盘已完成"); }}><CheckCircledIcon /> 完成今日经营</MockButton></section> : null}
        {stage >= 3 ? <ResultPanel flow={flow} title="今日经营已收官" evidence="经营数据 + 任务回执 + 9份现场证据" impact="实际营业额¥100,600，目标达成100.6%，明日首项任务已准备" reward={30} nextTitle="回到首页查看最终战报" nextMeta="门店健康80分，今日主线已完成" onRestart={() => setState((current) => ({ ...current, reviewStage: 0, reportReady: false }))} onHelp={() => openHelp("收官数据与实际经营不一致")} /> : null}
      </main>
    </MobileScroll>
  );
}

function ReminderCenter({ flow }: { flow: FlowControls }) {
  const { state, markReminderHandled, selectGoal, setActiveDimension } = useDemo();
  const openReminder = (reminder: DemoReminder) => {
    markReminderHandled(reminder.id);
    if (reminder.target === "meeting") flow.push(meetingScreen);
    else if (reminder.target === "inspection") flow.push(inspectionScreen);
    else if (reminder.target === "soldout") flow.push(soldOutScreen);
    else if (reminder.target === "regional-task") flow.push(regionalAssignmentScreen);
    else if (reminder.target === "rating") { setActiveDimension("rating"); flow.push(healthDiagnosisScreen); }
    else if (reminder.target === "revenue") { setActiveDimension("ticket"); flow.push(healthDiagnosisScreen); }
    else if (reminder.target === "tasks") { selectGoal("revenue"); flow.push(growthScreen); }
    else flow.push(closingReviewScreen);
  };
  const unread = state.reminders.filter((item) => !item.handled).length;
  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content reminder-center" data-testid="reminder-center">
        <section className="reminder-hero"><div><BellIcon /></div><span><small>AI主动提醒</small><h1>{unread ? `${unread}件事需要处理` : "提醒已经全部处理"}</h1><p>只提醒会影响今天经营结果的事情。</p></span></section>
        <div className="reminder-timeline">{state.reminders.map((reminder) => <button type="button" key={reminder.id} className={`${reminder.severity} ${reminder.handled ? "handled" : ""}`} onClick={() => openReminder(reminder)}><time>{reminder.time}</time><i>{reminder.handled ? <CheckIcon /> : <BellIcon />}</i><span><b>{reminder.title}</b><p>{reminder.body}</p><small>{reminder.handled ? "已处理" : "点击立即处理"}</small></span><em>{reminder.badge}</em></button>)}</div>
        <section className="automation-note"><MagicWandIcon /><span><b>系统会自动追踪</b><p>任务超时后先提醒责任人，再催办，仍无反馈才升级给店长。</p></span></section>
      </main>
    </MobileScroll>
  );
}

function RegionPageHeader({ title, eyebrow = "周麻婆区域经营 · 演示数据" }: { title: string; eyebrow?: string }) {
  const { setSheet } = useDemo();
  return <header className="region-page-header"><div><span>{eyebrow}</span><h1>{title}</h1></div><button type="button" onClick={() => setSheet("role-switch")}><PersonIcon /><span>林阳<small>区域经理</small></span><ChevronRightIcon /></button></header>;
}

function RegionOverview({ flow }: { flow: FlowControls }) {
  const { state } = useDemo();
  const snapshot = getSnapshot(state.dayPhase);
  const storeHealth = calculateHealth(getEffectiveHealth(state));
  return (
    <MobileScroll className="root-scroll">
      <main className="root-content region-content" data-testid="region-overview">
        <RegionPageHeader title="区域经营总览" />
        <section className="region-hero"><span>区域今日营业额</span><strong>¥328,400 <small>/ ¥620,000</small></strong><div className="progress-line"><i style={{ width: "53%" }} /></div><div><p>预计收官<b>¥598,000</b></p><p>预测缺口<b>¥22,000</b></p><p>闭环率<b>78%</b></p></div></section>
        <section className="region-health-row"><button type="button"><b>3</b><span>健康门店</span></button><button type="button"><b>1</b><span>关注门店</span></button><button type="button" className="danger"><b>2</b><span>异常门店</span></button></section>
        <section className="region-primary-card"><div className="section-heading"><h2>现在最重要</h2><span>AI已排好优先级</span></div><button type="button" onClick={() => flow.push(regionStoreScreen)}><div><span>三盛广场演示店 · 健康{storeHealth}</span><h2>预计缺口 {formatMoney(getForecastGap(snapshot))}</h2><p>首要问题：主动推荐率下降，区域可直接下发行动。</p></div><em>去处理 <ChevronRightIcon /></em></button></section>
        <section><div className="section-heading"><h2>异常门店</h2><button type="button" onClick={() => flow.push(regionStoreScreen)}>查看三盛详情 <ChevronRightIcon /></button></div><div className="region-store-list">{regionStores.slice(0, 4).map((store) => <RegionStoreRow key={store.id} store={store.id === "sansheng" ? { ...store, health: storeHealth, currentRevenue: snapshot.currentRevenue, forecastGap: getForecastGap(snapshot) } : store} onClick={() => flow.push(regionStoreScreen)} />)}</div></section>
        <section className="region-task-snapshot"><div className="section-heading"><h2>区域任务</h2><span>实时联动</span></div><button type="button" onClick={() => state.regionalTaskStatus === "not-issued" ? flow.push(regionalIssueScreen) : state.regionalTaskStatus === "regional-review" ? flow.push(regionalReviewScreen) : flow.push(regionStoreScreen)}><PaperPlaneIcon /><span><b>{state.regionalTaskStatus === "not-issued" ? "给三盛下发晚市纠偏" : "晚市主动推荐训练"}</b><small>{state.regionalTaskStatus === "regional-review" ? "黄店长已回传，等待验收" : state.regionalTaskStatus === "done" ? "区域已确认闭环" : state.regionalTaskStatus === "not-issued" ? "语音说一句，AI自动补齐" : "任务已送达黄店长"}</small></span><em>{state.regionalTaskStatus === "regional-review" ? "待验收" : state.regionalTaskStatus === "done" ? "已完成" : "处理"}<ChevronRightIcon /></em></button></section>
      </main>
    </MobileScroll>
  );
}

function RegionStores({ flow }: { flow: FlowControls }) {
  const { state } = useDemo();
  const snapshot = getSnapshot(state.dayPhase);
  return <MobileScroll className="root-scroll"><main className="root-content region-content" data-testid="region-stores"><RegionPageHeader title="6家门店" eyebrow="按经营风险排序 · 演示数据" /><div className="segmented-tabs region-filter"><button className="active" type="button">全部</button><button type="button">异常2</button><button type="button">关注1</button><button type="button">健康3</button></div><div className="region-store-list full">{regionStores.map((store) => <RegionStoreRow key={store.id} store={store.id === "sansheng" ? { ...store, health: calculateHealth(getEffectiveHealth(state)), currentRevenue: snapshot.currentRevenue, forecastGap: getForecastGap(snapshot) } : store} onClick={() => flow.push(regionStoreScreen)} />)}</div></main></MobileScroll>;
}

function RegionStoreRow({ store, onClick }: { store: (typeof regionStores)[number]; onClick: () => void }) {
  return <button className="region-store-row" type="button" onClick={onClick}><span className={store.status === "异常" ? "danger" : store.status === "关注" ? "warning" : "good"}><b>{store.health}</b><small>{store.status}</small></span><div><h3>{store.name}</h3><p>{store.manager} · 当前{formatMoney(store.currentRevenue)}</p><small>任务闭环率 {store.closureRate}%</small></div><em className={store.forecastGap > 5000 ? "danger" : "good"}>{store.forecastGap ? `缺口${formatMoney(store.forecastGap)}` : "预计达成"}</em><ChevronRightIcon /></button>;
}

function RegionTasks({ flow }: { flow: FlowControls }) {
  const { state } = useDemo();
  const label: Record<RegionalTaskStatus, string> = { "not-issued": "未下发", sent: "待店长接收", accepted: "已接收", executing: "执行中", "regional-review": "待区域验收", "needs-fix": "需整改", done: "已完成" };
  return <MobileScroll className="root-scroll"><main className="root-content region-content" data-testid="region-tasks"><RegionPageHeader title="区域任务" eyebrow="下发、追踪与证据验收" /><section className="region-task-board"><div className="section-heading"><h2>三盛广场演示店</h2><span>{state.regionalTaskStatus === "not-issued" ? "暂无任务" : "1项"}</span></div>{state.regionalTaskStatus === "not-issued" ? <button className="region-empty-action" type="button" onClick={() => flow.push(regionalIssueScreen)}><PaperPlaneIcon /><b>语音下发晚市纠偏任务</b><small>AI自动补齐责任人、时间和验收证据</small></button> : <button className="region-linked-task" type="button" onClick={() => state.regionalTaskStatus === "regional-review" ? flow.push(regionalReviewScreen) : flow.push(regionStoreScreen)}><span className="source-tag warning">区域任务</span><em>{label[state.regionalTaskStatus]}</em><h3>晚市主动推荐训练</h3><p>黄店长 · 前厅4人 · 16:30前</p><div className="task-evidence-line"><span><CameraIcon /> 照片+AI初验</span><b>预计追回¥6,000</b></div><ChevronRightIcon /></button>}</section><section><div className="section-heading"><h2>总部任务</h2><span>2项</span></div><div className="simple-region-tasks"><button type="button"><FileTextIcon /><span><b>周末朋友圈内容发布</b><small>4/6门店已完成</small></span><em>67%</em></button><button type="button"><StarFilledIcon /><span><b>近7日差评复盘</b><small>5/6门店已完成</small></span><em>83%</em></button></div></section></main></MobileScroll>;
}

function RegionMessages({ flow }: { flow: FlowControls }) {
  const { state, setState, showToast } = useDemo();
  const reply = () => {
    setState((current) => ({ ...current, helpStatus: "replied", helpReply: "先执行15分钟快速行动，我已安排运营教练10分钟内支持。", reminders: [{ id: "region-help-reply", time: "16:26", title: "区域经理已回复求助", body: "先执行15分钟快速行动，运营教练10分钟内支持。", badge: "新回复", severity: "good", target: "regional-task", handled: false }, ...current.reminders.filter((item) => item.id !== "region-help-reply")], activity: ["区域经理已回复经营求助", ...current.activity] }));
    showToast("回复已同步给黄店长");
  };
  return <MobileScroll className="root-scroll"><main className="root-content region-content" data-testid="region-messages"><RegionPageHeader title="区域消息" eyebrow="求助、异常升级与超时提醒" />{state.helpStatus === "sent" ? <section className="region-help-request"><span><InfoCircledIcon /></span><div><small>黄店长 · 刚刚</small><h2>客单价提升行动需要帮助</h2><p>AI已附上当前数据、已做动作和卡点，不需要店长再写说明。</p><div><b>预计缺口 ¥8,000</b><b>主动推荐率31%</b></div></div><button className="primary-action" type="button" onClick={reply}><PaperPlaneIcon /> 一键回复并安排支持</button><button className="secondary-action" type="button" onClick={() => { setState((current) => ({ ...current, helpStatus: "replied", helpReply: "已转运营中心跟进。" })); showToast("已转运营中心"); }}>转总部职能</button></section> : state.helpStatus === "replied" ? <section className="confirmation-card"><CheckCircledIcon /><h2>求助已回复</h2><p>{state.helpReply}</p><span>黄店长端已收到</span></section> : <section className="empty-message-card"><CheckCircledIcon /><h2>暂无待处理求助</h2><p>店长请求帮助时，AI会自动附上数据和已经做过的动作。</p></section>}<section><div className="section-heading"><h2>经营提醒</h2><span>2条</span></div><div className="sheet-list embedded"><SheetRow icon={ExclamationTriangleIcon} tone="danger" title="东二环预计缺口¥12,600" meta="连续2个时段低于预测" badge="紧急" onClick={() => flow.push(regionStoreScreen)} /><SheetRow icon={ClockIcon} tone="warning" title="三盛任务即将到期" meta="晚市主动推荐训练 · 16:30" badge="关注" onClick={() => flow.push(regionStoreScreen)} /></div></section></main></MobileScroll>;
}

function RegionMine() {
  const { state, setSheet } = useDemo();
  return <MobileScroll className="root-scroll"><main className="root-content region-content" data-testid="region-mine"><RegionPageHeader title="林阳" eyebrow="区域经理 · 演示角色" /><section className="profile-card region-profile"><div className="avatar"><PersonIcon /></div><div><span>管理范围</span><h2>福州区域 · 6家店</h2><p>今日区域任务闭环率78%</p></div><b>异常2家</b></section><section className="settings-list"><button type="button" onClick={() => setSheet("role-switch")}><ReloadIcon /> 切换演示角色 <span>黄店长 <ChevronRightIcon /></span></button><button type="button" onClick={() => setSheet("phase-switch")}><ClockIcon /> 演示经营时段 <span>{getSnapshot(state.dayPhase).time} <ChevronRightIcon /></span></button><button type="button" onClick={() => setSheet("data-info")}><InfoCircledIcon /> 数据说明 <span>全部模拟 <ChevronRightIcon /></span></button><button type="button" onClick={() => setSheet("reset")}><CounterClockwiseClockIcon /> 重置全部演示 <span>重新体验 <ChevronRightIcon /></span></button></section></main></MobileScroll>;
}

function RegionStoreDetail({ flow }: { flow: FlowControls }) {
  const { state } = useDemo();
  const snapshot = getSnapshot(state.dayPhase);
  const statusText: Record<RegionalTaskStatus, string> = { "not-issued": "未下发", sent: "待店长接收", accepted: "店长已接收", executing: "执行中", "regional-review": "等待区域验收", "needs-fix": "已退回整改", done: "区域已确认闭环" };
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="region-store-detail"><section className="store-detail-hero"><span>三盛广场演示店 · 黄店长</span><div><strong>{calculateHealth(getEffectiveHealth(state))}</strong><small>门店健康</small></div><h1>预计缺口 {formatMoney(getForecastGap(snapshot))}</h1><p>当前{formatMoney(snapshot.currentRevenue)} · 预计收官{formatMoney(snapshot.forecastRevenue)}</p></section><section className="diagnosis-detail"><span><ActivityLogIcon /> AI区域判断 · 可信度92%</span><h2>首要问题：客单价</h2><p>流量基本正常，主动推荐率从42%降至31%，预计影响营业额约¥7,600。</p><div><b>建议下发晚市主动推荐训练</b><small>前厅4人 · 30分钟 · 照片+AI初验</small></div></section>{state.regionalTaskStatus === "not-issued" ? <button className="primary-action" type="button" onClick={() => flow.push(regionalIssueScreen)}><SpeakerLoudIcon /> 语音下发任务</button> : <section className="region-linked-status"><PaperPlaneIcon /><span><small>跨角色任务</small><b>晚市主动推荐训练</b><p>{statusText[state.regionalTaskStatus]}</p></span><button type="button" onClick={() => state.regionalTaskStatus === "regional-review" ? flow.push(regionalReviewScreen) : flow.push(regionalIssueScreen)}>查看 <ChevronRightIcon /></button></section>}<section><div className="section-heading"><h2>今日执行</h2><span>店长端实时同步</span></div><div className="review-summary-grid"><Signal label="必做任务" value={`${state.completedFlows.length}/5`} tone="good" /><Signal label="待验收" value={state.regionalTaskStatus === "regional-review" ? "1项" : "0项"} tone={state.regionalTaskStatus === "regional-review" ? "warning" : "good"} /><Signal label="求助" value={state.helpStatus === "sent" ? "1项" : "0项"} tone={state.helpStatus === "sent" ? "warning" : "good"} /><Signal label="成长值" value={String(state.points)} tone="good" /></div></section></main></MobileScroll>;
}

function RegionalIssueFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, showToast, setRegionTab } = useDemo();
  const [stage, setStage] = useState(state.regionalTaskStatus === "not-issued" ? 0 : 3);
  const issue = () => {
    setState((current) => ({ ...current, regionalTaskStatus: "sent", reminders: [{ id: "regional-assignment", time: "09:05", title: "林阳区域经理下发新任务", body: "晚市主动推荐训练 · 前厅4人 · 16:30前。", badge: "区域任务", severity: "danger", target: "regional-task", handled: false }, ...current.reminders.filter((item) => item.id !== "regional-assignment")], activity: ["区域任务已送达：晚市主动推荐训练", ...current.activity] }));
    setStage(3);
    showToast("任务已送达黄店长");
  };
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="regional-issue-flow"><StageHeader eyebrow="区域任务下发 · 演示数据" title="说一句，AI替你补齐" summary="区域经理只确认经营目标，系统负责责任人、时间和验收。" stage={stage} total={3} icon={SpeakerLoudIcon} />{stage === 0 ? <section className="voice-start-card"><div className="voice-orb ai-orb"><SpeakerLoudIcon /></div><h2>给三盛下发晚市纠偏</h2><p>“让黄店长晚市前完成前厅主动推荐训练，拍照回传。”</p><button className="primary-action" type="button" onClick={() => setStage(1)}><SpeakerLoudIcon /> 开始语音演示</button></section> : null}{stage === 1 ? <section><div className="voice-listening"><div className="voice-wave">{[1,2,3,4,5,6,7].map((item) => <i key={item} />)}</div><b>正在听 · 00:08</b><p>“让黄店长晚市前完成前厅主动推荐训练，拍照回传。”</p></div><button className="primary-action" type="button" onClick={() => setStage(2)}><MagicWandIcon /> 结束并让AI整理</button></section> : null}{stage === 2 ? <section><div className="parsed-task regional-parsed"><p><span>门店</span><b>三盛广场演示店</b><em>已匹配</em></p><p><span>任务</span><b>晚市主动推荐训练</b><em>AI生成</em></p><p><span>责任</span><b>黄店长 · 前厅4人</b><em>当班</em></p><p><span>截止</span><b>今天16:30</b><em>无冲突</em></p><p><span>验收</span><b>照片 + AI初验 + 区域确认</b><em>完整</em></p></div><div className="action-brief-card compact"><div><span>预计经营影响</span><h2>追回营业额约¥6,000</h2><p>基于主动推荐率从31%恢复至38%估算</p></div></div><button className="primary-action" type="button" onClick={issue}><PaperPlaneIcon /> 确认并下发</button></section> : null}{stage >= 3 ? <section><div className="confirmation-card"><CheckCircledIcon /><h2>任务已送达黄店长</h2><p>店长端提醒和“区域任务”已经同步更新。</p><span>等待店长接收 · 09:05</span></div><button className="primary-action" type="button" onClick={() => { setRegionTab("region-tasks"); flow.pop(); }}>查看区域任务状态</button></section> : null}</main></MobileScroll>;
}

function RegionalAssignmentFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, runMock, openHelp, showToast } = useDemo();
  const status = state.regionalTaskStatus;
  const update = (next: RegionalTaskStatus, message: string, key: string) => runMock(key, message, (current) => ({ ...current, regionalTaskStatus: next }));
  if (status === "not-issued") return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content"><div className="empty-message-card"><InfoCircledIcon /><h2>区域任务尚未下发</h2><p>请先切换到林阳区域经理，在三盛门店详情中下发任务。</p></div></main></MobileScroll>;
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="regional-assignment-flow"><StageHeader eyebrow="林阳区域经理 · 09:05下发" title="晚市主动推荐训练" summary="前厅4人 · 今天16:30前 · 照片+AI初验" stage={status === "sent" ? 1 : status === "accepted" ? 2 : status === "executing" || status === "needs-fix" ? 3 : 4} total={4} icon={PaperPlaneIcon} />{status === "sent" ? <section><div className="region-task-order"><span className="source-tag warning">区域任务</span><h2>为什么现在做</h2><p>主动推荐率从42%降至31%，是今日预计缺口¥8,000的首要原因。</p><div><b>预计追回¥6,000</b><small>区域将查看AI初验证据</small></div></div><MockButton busyKey="regional-accept" onClick={() => update("accepted", "区域任务已接收", "regional-accept")}><CheckCircledIcon /> 接收任务</MockButton></section> : null}{status === "accepted" ? <section><div className="execution-steps"><ExecutionStep number="1" icon={ReaderIcon} title="统一推荐话术" meta="爆炒鲜椒鸡+饮品搭配" done action="已准备" onClick={() => showToast("推荐话术已查看")} /><ExecutionStep number="2" icon={PersonIcon} title="训练前厅4人" meta="系统已匹配当班员工" done={false} action="开始" onClick={() => showToast("前厅4人已收到训练")}/><ExecutionStep number="3" icon={CameraIcon} title="现场拍照回传" meta="AI识别人、话术卡和现场" done={false} action="待回传" onClick={() => update("executing", "训练已完成，等待现场照片", "regional-start")}/></div><MockButton busyKey="regional-start" onClick={() => update("executing", "训练已完成，等待现场照片", "regional-start")}><PlayIcon /> 开始执行训练</MockButton></section> : null}{status === "executing" || status === "needs-fix" ? <section>{status === "needs-fix" ? <div className="alert-panel danger"><ExclamationTriangleIcon /><div><b>区域经理要求补拍</b><p>需要让4名员工和推荐话术卡同时入镜。</p></div></div> : null}<div className="capture-prompt"><CameraIcon /><b>{status === "needs-fix" ? "按要求重新拍照" : "拍一张训练完成照片"}</b><p>AI先检查证据完整度，再提交区域经理确认。</p></div><MockButton busyKey="regional-proof" onClick={() => update("regional-review", "AI初验通过，已提交区域经理", "regional-proof")}><CameraIcon /> 模拟拍照并提交</MockButton><button className="help-action" type="button" onClick={() => openHelp("区域任务执行困难")}><InfoCircledIcon /> 我做不了，请求帮助</button></section> : null}{status === "regional-review" ? <section><div className="evidence-card"><img src={`${import.meta.env.BASE_URL}assets/task-evidence.jpg`} alt="区域任务现场回传" draggable={false} /><div><span><MagicWandIcon /> AI初验通过</span><h2>证据已提交区域经理</h2><p>人员4/4、动作3/3、照片清晰，等待区域确认。</p></div></div><div className="confirmation-card"><ClockIcon /><h2>等待林阳验收</h2><p>切换到区域经理，即可查看证据并确认或退回补拍。</p><span>提交时间 16:24</span></div></section> : null}{status === "done" ? <ResultPanel flow={flow} title="区域任务已闭环" evidence="区域下发 + 店长照片 + AI初验 + 区域确认" impact="主动推荐率预计升至38%，预计追回营业额约¥6,000" reward={30} onRestart={() => setState((current) => ({ ...current, regionalTaskStatus: "sent" }))} onHelp={() => openHelp("区域验收后结果未达预期")} /> : null}</main></MobileScroll>;
}

function RegionalReviewFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, showToast, advancePhase } = useDemo();
  const approve = () => {
    setState((current) => ({ ...current, regionalTaskStatus: "done", growthStage: Math.max(4, current.growthStage), points: current.completedFlows.includes("regional") ? current.points : current.points + workflowPoints.regional, completedFlows: current.completedFlows.includes("regional") ? current.completedFlows : [...current.completedFlows, "regional"], reminders: [{ id: "regional-approved", time: "16:28", title: "区域经理已确认闭环", body: "晚市主动推荐训练验收通过，预计追回营业额约¥6,000。", badge: "已通过", severity: "good", target: "tasks", handled: false }, ...current.reminders.filter((item) => item.id !== "regional-approved")], activity: ["区域任务验收通过：晚市主动推荐训练", ...current.activity] }));
    advancePhase("dinner", "区域任务验收通过，预计业绩已提升");
    showToast("已确认闭环，结果同步给黄店长");
  };
  const reject = () => {
    setState((current) => ({ ...current, regionalTaskStatus: "needs-fix", reminders: [{ id: "regional-rejected", time: "16:28", title: "区域经理要求补拍", body: "需要让4名员工和推荐话术卡同时入镜。", badge: "需整改", severity: "danger", target: "regional-task", handled: false }, ...current.reminders.filter((item) => item.id !== "regional-rejected")], activity: ["区域任务被退回：需要补拍", ...current.activity] }));
    showToast("已退回补拍，黄店长端已收到");
  };
  if (state.regionalTaskStatus !== "regional-review" && state.regionalTaskStatus !== "done") return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content"><div className="empty-message-card"><InfoCircledIcon /><h2>暂无待验收证据</h2><p>店长提交照片并通过AI初验后，会出现在这里。</p></div></main></MobileScroll>;
  return <MobileScroll className="detail-scroll"><main className="detail-content workflow-content" data-testid="regional-review-flow"><StageHeader eyebrow="三盛广场演示店 · 黄店长回传" title="晚市主动推荐训练" summary="AI已完成初验，区域经理只确认关键结果。" stage={state.regionalTaskStatus === "done" ? 3 : 2} total={3} icon={CheckCircledIcon} /><section><div className="evidence-card"><img src={`${import.meta.env.BASE_URL}assets/task-evidence.jpg`} alt="区域经理验收证据" draggable={false} /><div><span><MagicWandIcon /> AI初验通过</span><h2>人员、动作和照片完整</h2><p>前厅4人全部入镜；推荐话术卡清晰可见。</p></div></div><div className="acceptance-grid"><Signal label="人员到位" value="4/4" tone="good" /><Signal label="动作完成" value="3/3" tone="good" /><Signal label="照片质量" value="清晰" tone="good" /><Signal label="预计影响" value="+¥6,000" tone="good" /></div>{state.regionalTaskStatus === "regional-review" ? <><button className="primary-action" type="button" onClick={approve}><CheckCircledIcon /> 确认闭环</button><button className="secondary-action" type="button" onClick={reject}><ReloadIcon /> 退回补拍</button></> : <div className="confirmation-card"><CheckCircledIcon /><h2>区域已确认闭环</h2><p>任务结果、成长值和经营预测已经同步到黄店长端。</p><span>16:28完成</span></div>}<button className="help-action" type="button" onClick={() => flow.pop()}><ArrowLeftIcon /> 返回区域任务</button></section></main></MobileScroll>;
}

function PurchaseFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, runMock, completeFlow, openHelp } = useDemo();
  const stage = state.purchaseStage;
  const setStage = (next: number, message: string, key: string) => runMock(key, message, (current) => ({ ...current, purchaseStage: next }));
  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content" data-testid="purchase-flow">
        <StageHeader eyebrow="16:20库存预警 · 演示数据" title="智能采购下单" summary="按销量预测备货，避免缺菜也避免买多。" stage={Math.min(stage, 5)} total={5} icon={ArchiveIcon} />
        {stage === 0 ? <section><div className="alert-panel danger"><ExclamationTriangleIcon /><div><b>3项食材低于晚市安全库存</b><p>按预计92桌计算，嫩牛肉最早17:40售罄。</p></div></div><div className="inventory-list"><InventoryRow name="嫩牛肉" stock="6份" need="需28份" risk="高风险" /><InventoryRow name="青椒" stock="8kg" need="需15kg" risk="需补货" /><InventoryRow name="鲜笋" stock="5kg" need="需9kg" risk="需补货" /></div><MockButton busyKey="purchase-plan" onClick={() => setStage(1, "AI已生成合理采购量", "purchase-plan")}><MagicWandIcon /> 生成采购清单</MockButton></section> : null}
        {stage === 1 ? <section><div className="section-heading"><h2>AI建议采购</h2><span>预计覆盖晚市+10%安全量</span></div><div className="order-list"><OrderRow name="嫩牛肉" amount="25kg" price="¥1,500" reason="补22份+安全量" /><OrderRow name="青椒" amount="8kg" price="¥96" reason="补7kg+损耗" /><OrderRow name="鲜笋" amount="5kg" price="¥85" reason="补4kg+损耗" /></div><div className="budget-card"><span>采购预算</span><b>¥1,681</b><small>比人工建议少 ¥219</small></div><MockButton busyKey="purchase-supplier" onClick={() => setStage(2, "供应商与预算已确认", "purchase-supplier")}><CheckIcon /> 确认清单，选择供应商</MockButton></section> : null}
        {stage === 2 ? <section><div className="supplier-card selected"><span><ArchiveIcon /></span><div><b>达旺食材配送</b><p>历史准时率98% · 预计16:55送达</p></div><strong>¥1,681</strong><CheckCircledIcon /></div><div className="supplier-card"><span><ArchiveIcon /></span><div><b>优鲜供应链</b><p>历史准时率91% · 预计17:20送达</p></div><strong>¥1,620</strong></div><div className="approval-note"><LockClosedIcon /><span><b>预算内自动审批</b><p>未超过门店单次采购授权 ¥2,000</p></span></div><MockButton busyKey="purchase-order" onClick={() => setStage(3, "订单已提交，供应商确认接单", "purchase-order")}><PaperPlaneIcon /> 提交订单 ¥1,681</MockButton></section> : null}
        {stage === 3 ? <section><div className="delivery-track"><ProcessStep done title="订单已提交" meta="16:24" /><ProcessStep done title="供应商已接单" meta="16:26" /><ProcessStep active title="配送途中" meta="预计16:55到店" /><ProcessStep title="到货验收" meta="等待门店拍照" /></div><div className="map-note"><SewingPinIcon /><span><b>配送员距门店2.8km</b><p>预计还有18分钟到达</p></span></div><MockButton busyKey="purchase-arrive" onClick={() => setStage(4, "食材已到店，可以拍照验收", "purchase-arrive")}><ReloadIcon /> 模拟到货</MockButton></section> : null}
        {stage === 4 ? <section><div className="capture-prompt compact-capture"><CameraIcon /><b>拍一张到货食材照片</b><p>AI核对数量、包装和新鲜度，不需要手填验收表。</p></div><div className="acceptance-grid"><Signal label="数量" value="38kg足量" tone="good" /><Signal label="包装" value="完整" tone="good" /><Signal label="新鲜度" value="94分" tone="good" /><Signal label="差异" value="0项" tone="good" /></div><MockButton busyKey="purchase-accept" onClick={() => { setState((current) => ({ ...current, purchaseStage: 5 })); completeFlow("purchase", workflowPoints.purchase, "采购到货验收完成"); }}><CameraIcon /> 模拟拍照并验收</MockButton></section> : null}
        {stage >= 5 ? <ResultPanel flow={flow} title="采购闭环完成" evidence="系统库存 + 订单回执 + 到货照片" impact="晚市缺货风险解除，采购比人工建议节省 ¥219" reward={15} onRestart={() => setState((current) => ({ ...current, purchaseStage: 0 }))} onHelp={() => openHelp("采购到货数量或质量异常")} /> : null}
      </main>
    </MobileScroll>
  );
}

function HrFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, runMock, completeFlow, openHelp, showToast } = useDemo();
  const stage = state.hrStage;
  const setStage = (next: number, message: string, key: string) => runMock(key, message, (current) => ({ ...current, hrStage: next }));
  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content" data-testid="hr-flow">
        <StageHeader eyebrow="本周人员表现 · 演示数据" title="人事考核与带教" summary="AI只整理事实，表扬、辅导或改进由店长决定。" stage={Math.min(stage, 4)} total={4} icon={IdCardIcon} />
        {stage === 0 ? <section><div className="employee-card selected"><span className="employee-avatar"><PersonIcon /></span><div><b>王小丽 · 前厅主管</b><p>出勤100% · 任务完成92% · 顾客表扬3次</p></div><strong>86分</strong></div><div className="employee-card"><span className="employee-avatar"><PersonIcon /></span><div><b>陈佳 · 新员工</b><p>出勤100% · 任务完成68% · 带教第5天</p></div><strong>72分</strong></div><div className="evidence-source"><InfoCircledIcon /><span><b>考核依据</b><p>只使用考勤、任务回传和顾客反馈，不由AI自动处罚。</p></span></div><MockButton busyKey="hr-draft" onClick={() => setStage(1, "AI已生成王小丽考核草稿", "hr-draft")}><MagicWandIcon /> 生成考核草稿</MockButton></section> : null}
        {stage === 1 ? <section><div className="assessment-card"><span>AI考核草稿</span><h2>建议：表扬 + 安排带教任务</h2><p>王小丽本周执行稳定，并主动解决2次顾客催菜；建议由她带教陈佳的迎宾与主动推荐。</p><div className="score-breakdown"><span>执行力<b>92</b></span><span>服务力<b>88</b></span><span>带教力<b>78</b></span></div></div><div className="decision-row"><button className="active" type="button" onClick={() => showToast("已选择：表扬+带教")}><StarFilledIcon /> 表扬+带教</button><button type="button" onClick={() => showToast("已选择：日常辅导")}><PersonIcon /> 日常辅导</button><button type="button" onClick={() => showToast("已选择：改进计划")}><TargetIcon /> 改进计划</button></div><button className="voice-note-button" type="button" onClick={() => showToast("已记录店长语音：重点教会主动推荐")}><SpeakerLoudIcon /><span><b>语音补充店长判断</b><small>说一句就行，不用写评语</small></span><ChevronRightIcon /></button><MockButton busyKey="hr-task" onClick={() => setStage(2, "考核已确认并生成带教任务", "hr-task")}><CheckIcon /> 确认并生成任务</MockButton></section> : null}
        {stage === 2 ? <section><div className="task-brief"><span><TargetIcon /></span><div><b>陈佳主动推荐带教</b><p>王小丽负责 · 8月14日前 · 现场抽查+语音反馈</p></div><em>+14成长值</em></div><div className="receipt-summary"><PaperPlaneIcon /><div><b>考核与任务已送达</b><p>王小丽已读，等待确认接受带教</p></div><strong>已读</strong></div><MockButton busyKey="hr-receipt" onClick={() => setStage(3, "王小丽已确认接受带教任务", "hr-receipt")}><ReloadIcon /> 模拟员工确认</MockButton></section> : null}
        {stage === 3 ? <section><div className="confirmation-card"><CheckCircledIcon /><h2>王小丽已确认</h2><p>“收到，今天晚市先带陈佳练一遍推荐话术，明天回传抽查结果。”</p><span>复查时间：8月14日 18:00</span></div><MockButton busyKey="hr-complete" onClick={() => { setState((current) => ({ ...current, hrStage: 4 })); completeFlow("hr", workflowPoints.hr, "人员考核与带教已闭环"); }}><CheckCircledIcon /> 完成人事闭环</MockButton></section> : null}
        {stage >= 4 ? <ResultPanel flow={flow} title="考核与带教已闭环" evidence="考勤 + 任务完成率 + 顾客反馈 + 员工确认" impact="优秀员工获得认可，新员工带教责任和复查时间已明确" reward={14} onRestart={() => setState((current) => ({ ...current, hrStage: 0 }))} onHelp={() => openHelp("员工对考核结果有异议")} /> : null}
      </main>
    </MobileScroll>
  );
}

function SoldOutFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, runMock, completeFlow, openHelp, showToast, advancePhase } = useDemo();
  const stage = state.soldoutStage;
  const setStage = (next: number, message: string, key: string) => runMock(key, message, (current) => ({ ...current, soldoutStage: next }));
  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content" data-testid="soldout-flow">
        <StageHeader eyebrow="晚市库存预警 · 演示数据" title="菜品沽清与恢复" summary="一次操作同步所有渠道，避免顾客下单后再取消。" stage={Math.min(stage, 4)} total={4} icon={MixerHorizontalIcon} />
        {stage === 0 ? <section><div className="dish-alert-card"><span className="dish-icon"><ExclamationTriangleIcon /></span><div><span>高风险</span><h2>嫩牛肉系列仅剩6份</h2><p>晚市预计需求28份，最早17:40售罄。</p></div><strong>6份</strong></div><div className="dish-list"><p><b>嫩牛肉小炒</b><span>预计缺12份</span></p><p><b>泡椒嫩牛肉</b><span>预计缺7份</span></p><p><b>双椒牛肉套餐</b><span>预计缺3份</span></p></div><button className="secondary-action" type="button" onClick={() => { showToast("已跳转采购补货方案"); flow.replace(purchaseScreen); }}><ArchiveIcon /> 先紧急补货</button><MockButton busyKey="soldout-start" onClick={() => setStage(1, "已进入三渠道同步确认", "soldout-start")}><MixerHorizontalIcon /> 一键沽清相关菜品</MockButton></section> : null}
        {stage === 1 ? <section><div className="sync-list"><SyncRow name="收银POS" state="待同步" icon={DashboardIcon} /><SyncRow name="美团外卖" state="待同步" icon={SewingPinIcon} /><SyncRow name="抖音团购" state="待同步" icon={PlayIcon} /></div><div className="approval-note"><InfoCircledIcon /><span><b>不会删除菜品</b><p>只暂停售卖，库存恢复后可一键重新上架。</p></span></div><MockButton busyKey="soldout-sync" onClick={() => setStage(2, "收银、美团、抖音已全部同步", "soldout-sync")}><Share2Icon /> 确认同步三渠道</MockButton></section> : null}
        {stage === 2 ? <section><div className="sync-list complete"><SyncRow name="收银POS" state="同步成功" icon={DashboardIcon} done /><SyncRow name="美团外卖" state="同步成功" icon={SewingPinIcon} done /><SyncRow name="抖音团购" state="同步成功" icon={PlayIcon} done /></div><div className="substitute-card"><MagicWandIcon /><div><span>AI替代推荐</span><h2>主推青椒肉丝套餐</h2><p>口味接近、库存充足，预计可承接70%的牛肉菜需求。</p></div></div><MockButton busyKey="soldout-notify" onClick={() => setStage(3, "前厅6人已收到替代推荐话术", "soldout-notify")}><PaperPlaneIcon /> 通知前厅并下发话术</MockButton></section> : null}
        {stage === 3 ? <section><div className="receipt-summary"><CheckCircledIcon /><div><b>前厅6人全部已读</b><p>推荐话术与替代菜已同步到任务栏</p></div><strong>6/6</strong></div><div className="restock-card"><ArchiveIcon /><div><b>采购补货已到店</b><p>嫩牛肉新增25kg，可恢复约34份菜品。</p></div><span>17:02</span></div><MockButton busyKey="soldout-restore" onClick={() => { setState((current) => ({ ...current, soldoutStage: 4 })); completeFlow("soldout", workflowPoints.soldout, "菜品已恢复三渠道上架"); advancePhase("closing", "晚市保障完成，进入收官复盘"); }}><ReloadIcon /> 一键恢复上架</MockButton></section> : null}
        {stage >= 4 ? <ResultPanel flow={flow} title="沽清与恢复已闭环" evidence="库存预警 + 三渠道回执 + 员工已读" impact="避免超卖和退单，替代推荐预计保住约 ¥2,400 营业额" reward={10} onRestart={() => setState((current) => ({ ...current, soldoutStage: 0 }))} onHelp={() => openHelp("某个渠道同步失败")} /> : null}
      </main>
    </MobileScroll>
  );
}

function GrowthFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, selectGoal, runMock, openHelp, showToast } = useDemo();
  const goalId = state.activeGoal;
  const goal = goalId ? goalCatalog[goalId] : null;
  const stage = goal ? state.growthStage : 0;
  const packages = [
    { id: "quick", name: "快速动作", time: "15分钟", note: "自己完成1个关键动作" },
    { id: "team", name: "团队行动", time: "30分钟", note: "分发给当班员工共同执行" },
    { id: "full", name: "完整方案", time: "60分钟", note: "含训练、执行、拍照与复盘" },
  ];
  const acceptGrowth = () => {
    runMock("growth-accept", "AI验收通过，经营结果已重新预测", (current) => {
      const alreadyRewarded = goalId ? current.completedGoals.includes(goalId) : current.completedFlows.includes("growth");
      const reward = goal?.reward ?? workflowPoints.growth;
      const nextReminder: DemoReminder = { id: "inventory-check", time: "17:00", title: "预计业绩已追回¥6,000", body: "下一步守住库存和渠道体验，避免晚市缺菜。", badge: "下一项", severity: "good", target: "soldout", handled: false };
      const shouldAdvance = goalId === "revenue";
      return {
        ...current,
        growthStage: 4,
        dayPhase: shouldAdvance ? "dinner" : current.dayPhase,
        points: alreadyRewarded ? current.points : current.points + reward,
        completedFlows: current.completedFlows.includes("growth") ? current.completedFlows : [...current.completedFlows, "growth"],
        completedGoals: goalId && !current.completedGoals.includes(goalId) ? [...current.completedGoals, goalId] : current.completedGoals,
        reminders: shouldAdvance && !current.reminders.some((item) => item.id === nextReminder.id) ? [nextReminder, ...current.reminders] : current.reminders,
        activity: [`${goal?.label ?? "经营提升"}任务验收通过${shouldAdvance ? "，预计收官升至¥98,000" : ""}`, ...current.activity].slice(0, 10),
      };
    });
  };

  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content" data-testid="growth-flow">
        <StageHeader eyebrow="专属经营教练 · 演示数据" title={goal ? goal.label : "你今天想提升什么？"} summary={goal ? goal.diagnosis : "选一个目标，AI会根据门店数据给出最省力的行动。"} stage={Math.min(stage, 4)} total={4} icon={MagicWandIcon} />
        {!goal ? <section><div className="goal-choice-grid">{(Object.keys(goalCatalog) as GoalId[]).map((id) => { const item = goalCatalog[id]; const Icon = item.icon; return <button key={id} className={`goal-choice ${item.tone}`} type="button" onClick={() => selectGoal(id)}><span><Icon /></span><div><b>{item.label}</b><p>{item.short}</p><small>{item.metric}</small></div><ChevronRightIcon /></button>; })}</div></section> : null}
        {goal && stage === 1 ? <section><div className="diagnosis-detail"><span><ActivityLogIcon /> AI数据判断</span><h2>{goal.metric}</h2><p>{goal.diagnosis}</p><div><b>{goal.impact}</b><small>基于同类门店最佳实践估算</small></div></div><div className="section-heading"><h2>选择行动强度</h2><span>都可以随时求助</span></div><div className="package-list">{packages.map((item) => <button key={item.id} className={state.growthPackage === item.id ? "selected" : ""} type="button" onClick={() => setState((current) => ({ ...current, growthPackage: item.id }))}><span><LightningBoltIcon /></span><div><b>{item.name}</b><p>{item.note}</p></div><em>{item.time}</em>{state.growthPackage === item.id ? <CheckCircledIcon /> : <ChevronRightIcon />}</button>)}</div><MockButton busyKey="growth-claim" onClick={() => { if (!state.growthPackage) { showToast("先选择一个行动强度"); return; } runMock("growth-claim", "行动已领取并加入今日任务", (current) => ({ ...current, growthStage: 2 })); }}><TargetIcon /> 领取这项行动</MockButton></section> : null}
        {goal && stage === 2 ? <section><div className="task-brief"><span><TargetIcon /></span><div><b>{goal.label}行动包</b><p>今天完成 · 自己执行或分发 · AI验收</p></div><em>+{goal.reward}成长值</em></div><div className="execution-steps"><ExecutionStep number="1" icon={ReaderIcon} title="看懂AI建议" meta="1分钟 · 只看最关键做法" done action="已完成" onClick={() => showToast("关键做法已查看")} /><ExecutionStep number="2" icon={PaperPlaneIcon} title="执行或分发" meta="系统已匹配当班员工" done={false} action="一键执行" onClick={() => showToast("已分发给前厅4人")} /><ExecutionStep number="3" icon={CameraIcon} title="拍照或说一段话" meta="不用填表，AI自动识别" done={false} action="去回传" onClick={() => runMock("growth-proof", "现场证据已回传", (current) => ({ ...current, growthStage: 3 }))} /></div><button className="secondary-action" type="button" onClick={() => openHelp(`${goal.label}行动执行困难`)}>我做不了，请求帮助</button><MockButton busyKey="growth-proof" onClick={() => runMock("growth-proof", "现场照片与语音已回传", (current) => ({ ...current, growthStage: 3 }))}><CameraIcon /> 模拟拍照并回传</MockButton></section> : null}
        {goal && stage === 3 ? <section><div className="evidence-card"><img src={`${import.meta.env.BASE_URL}assets/task-evidence.jpg`} alt="经营提升任务回传" draggable={false} /><div><span><MagicWandIcon /> AI正在核验</span><h2>执行证据完整</h2><p>已识别人员、门店环境和推荐动作，符合验收标准。</p></div></div><div className="acceptance-grid"><Signal label="人员到位" value="4/4" tone="good" /><Signal label="动作完成" value="3/3" tone="good" /><Signal label="照片质量" value="清晰" tone="good" /><Signal label="数据复查" value="21:30" tone="warning" /></div><MockButton busyKey="growth-accept" onClick={acceptGrowth}><MagicWandIcon /> AI验收并看结果</MockButton></section> : null}
        {goal && stage >= 4 ? <ResultPanel flow={flow} title={`${goal.label}行动完成`} evidence="任务分发 + 现场照片 + AI识别" impact={goal.impact} reward={goal.reward} onRestart={() => setState((current) => ({ ...current, growthStage: 1, growthPackage: null }))} onHelp={() => openHelp(`${goal.label}结果未达预期`)} extraAction={<button className="secondary-action" type="button" onClick={() => setState((current) => ({ ...current, activeGoal: null, growthStage: 0, growthPackage: null }))}>再领取一个经营目标</button>} /> : null}
      </main>
    </MobileScroll>
  );
}

function ExecutionStep({ number, icon: Icon, title, meta, done, action, onClick }: { number: string; icon: IconType; title: string; meta: string; done: boolean; action: string; onClick: () => void }) {
  return <button className={`execution-step ${done ? "done" : ""}`} type="button" onClick={onClick}><span className="step-number">{done ? <CheckIcon /> : number}</span><span className="step-icon"><Icon /></span><span className="step-copy"><b>{title}</b><small>{meta}</small></span><em>{action}<ChevronRightIcon /></em></button>;
}

function ResultPanel({ flow, title, evidence, impact, reward, onRestart, onHelp, onContinue, onNext, nextTitle = "回到今日，继续下一项", nextMeta = "AI会根据实时数据重新安排优先级", extraAction }: { flow: FlowControls; title: string; evidence: string; impact: string; reward: number; onRestart: () => void; onHelp: () => void; onContinue?: () => void; onNext?: () => void; nextTitle?: string; nextMeta?: string; extraAction?: ReactNode }) {
  const { showToast } = useDemo();
  return (
    <section className="result-panel" data-testid="result-panel"><div className="result-check"><CheckIcon /></div><span>AI验收通过 · 演示反馈</span><h1>{title}</h1><p>{impact}</p><div className="result-facts"><div><small>完成证据</small><b>{evidence}</b></div><div><small>成长奖励</small><b><StarFilledIcon /> +{reward}</b></div><div><small>下次复查</small><b>今天 21:30</b></div></div><div className="result-next"><MagicWandIcon /><span><small>建议下一步</small><b>{nextTitle}</b><p>{nextMeta}</p></span></div><button className="primary-action" type="button" onClick={() => { onContinue?.(); onNext?.(); showToast(onNext ? "已进入下一步" : "已回到今日操作台"); flow.pop(); }}>继续下一项</button>{extraAction}<button className="secondary-action" type="button" onClick={onRestart}><CounterClockwiseClockIcon /> 重新演示（奖励不重复）</button><button className="help-action" type="button" onClick={onHelp}><InfoCircledIcon /> 我做不了，请求帮助</button></section>
  );
}

function Signal({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={`signal-card ${tone}`}><span>{label}</span><b>{value}</b></div>;
}

function FlowListRow({ icon: Icon, title, meta, status }: { icon: IconType; title: string; meta: string; status: string }) {
  return <div className="flow-list-row"><span><Icon /></span><div><b>{title}</b><small>{meta}</small></div><em>{status}</em></div>;
}

function ReceiptRow({ name, role, state, tone }: { name: string; role: string; state: string; tone: string }) {
  return <div className="receipt-row"><span className="employee-avatar"><PersonIcon /></span><div><b>{name}</b><small>{role}</small></div><em className={tone}>{state}</em></div>;
}

function InventoryRow({ name, stock, need, risk }: { name: string; stock: string; need: string; risk: string }) {
  return <div className="inventory-row"><span><ArchiveIcon /></span><div><b>{name}</b><small>现有 {stock}</small></div><p>{need}</p><em>{risk}</em></div>;
}

function OrderRow({ name, amount, price, reason }: { name: string; amount: string; price: string; reason: string }) {
  return <div className="order-row"><div><b>{name}</b><small>{reason}</small></div><strong>{amount}</strong><em>{price}</em></div>;
}

function ProcessStep({ title, meta, done, active }: { title: string; meta: string; done?: boolean; active?: boolean }) {
  return <div className={`process-step ${done ? "done" : ""} ${active ? "active" : ""}`}><span>{done ? <CheckIcon /> : active ? <ReloadIcon /> : null}</span><div><b>{title}</b><small>{meta}</small></div></div>;
}

function SyncRow({ name, state, icon: Icon, done }: { name: string; state: string; icon: IconType; done?: boolean }) {
  return <div className={`sync-row ${done ? "done" : ""}`}><span><Icon /></span><b>{name}</b><em>{done ? <><CheckCircledIcon /> {state}</> : state}</em></div>;
}

function AcademyArticle({ flow }: { flow: FlowControls }) {
  const { selectGoal, showToast, activeLesson } = useDemo();
  const lesson = lessonCatalog[activeLesson];
  return (
    <MobileScroll className="detail-scroll">
      <article className="detail-content article-content"><span className="article-tag">{lesson.source} · {lesson.duration} · 演示内容</span><h1>{lesson.title}</h1><p className="article-lead">{lesson.lead}</p>{lesson.steps.map((step, index) => <section key={step.title}><b>{String(index + 1).padStart(2, "0")}</b><div><h2>{step.title}</h2><p>{step.body}</p></div></section>)}<div className="case-result"><StarFilledIcon /><span><b>学完可以做到</b><small>{lesson.result}</small></span></div><button className="primary-action" type="button" onClick={() => { selectGoal(lesson.goal); showToast("课程要点已转成今日行动"); flow.replace(growthScreen); }}>一键转成行动任务</button></article>
    </MobileScroll>
  );
}

function PromotionDetail() {
  return (
    <MobileScroll className="detail-scroll"><main className="detail-content promotion-detail"><section className="promotion-hero"><StarFilledIcon /><span>2星店长</span><ChevronRightIcon /><RocketIcon /><b>3星店长</b></section><h1>还差2个条件</h1><p>按当前经营趋势，预计2个月后可申请晋升。</p><div className="promotion-path"><Requirement done title="年度评比进入 Top 20" meta="当前第18名，保持即可" /><Requirement title="在职年限超过2年" meta="还差4个月，系统自动累计" /><Requirement title="连续3个月盈利" meta="本月保持盈利即可达成" progress="2/3" /></div><section className="coach-plan"><MagicWandIcon /><div><b>AI晋升建议</b><p>本月重点守住客单价与差评率，任务闭环率达到90%可额外获得120成长值。</p></div></section></main></MobileScroll>
  );
}

function DemoSheet() {
  const { sheet, setSheet, state, setState, showToast, resetDemo, helpTopic, switchRole, advancePhase } = useDemo();
  const titles: Record<Exclude<SheetId, null>, string> = {
    "voice-task": "语音下发任务",
    reset: "重置全部演示",
    help: "请求帮助",
    "data-info": "演示数据说明",
    "role-switch": "切换演示角色",
    "phase-switch": "跳转演示时段",
  };
  return (
    <BottomSheet open={sheet !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheet ? titles[sheet] : ""} snap={0.7}>
      {sheet === "voice-task" ? <VoiceTaskSheet /> : null}
      {sheet === "reset" ? <div className="reset-sheet"><div className="reset-icon"><CounterClockwiseClockIcon /></div><h3>恢复到08:50初始场景？</h3><p>V3的双角色任务、全天进度、成长值和反馈都会重置；V2标签与线上代码不会受影响。</p><button className="primary-action" type="button" onClick={resetDemo}>确认重置演示</button><button className="secondary-action" type="button" onClick={() => setSheet(null)}>取消</button></div> : null}
      {sheet === "help" ? <div className="help-sheet"><div className="help-hero"><InfoCircledIcon /><div><span>当前卡点</span><h3>{helpTopic}</h3></div></div><p>AI已附上问题、经营数据和已经做过的动作，店长不用再写说明。</p><div className="help-targets"><button className="selected" type="button" onClick={() => showToast("已选择区域经理")}>区域经理<span>经营判断</span></button><button type="button" onClick={() => showToast("已选择总部职能")}>总部职能<span>专业支持</span></button><button type="button" onClick={() => showToast("已选择技术中心")}>技术中心<span>系统异常</span></button></div><button className="primary-action" type="button" onClick={() => { setState((current) => ({ ...current, helpStatus: "sent", helpReply: "", helpRequests: current.helpRequests + 1, activity: [`求助已发出：${helpTopic}`, ...current.activity] })); setSheet(null); showToast("求助已同步给林阳区域经理"); }}><PaperPlaneIcon /> 一键发送求助</button></div> : null}
      {sheet === "data-info" ? <div className="data-info-sheet"><div className="data-info-lock"><LockClosedIcon /></div><h3>本页全部为模拟数据</h3><p>营业额、评价、员工、库存、采购、平台回执和AI判断仅用于演示交互，不代表任何真实门店经营结果。</p><div><span>模拟门店</span><b>三盛广场演示店</b></div><div><span>模拟日期</span><b>8月11日</b></div><div><span>更新方式</span><b>本地状态联动</b></div><button className="primary-action" type="button" onClick={() => setSheet(null)}>我知道了</button></div> : null}
      {sheet === "role-switch" ? <div className="role-switch-sheet"><p>正式系统会按账号权限显示；本轮仅用于演示跨角色联动。</p><button className={state.role === "manager" ? "selected" : ""} type="button" onClick={() => switchRole("manager")}><span><PersonIcon /></span><div><b>黄店长</b><small>三盛广场演示店 · 执行与回传</small></div>{state.role === "manager" ? <CheckCircledIcon /> : <ChevronRightIcon />}</button><button className={state.role === "regional" ? "selected" : ""} type="button" onClick={() => switchRole("regional")}><span><DashboardIcon /></span><div><b>林阳 · 区域经理</b><small>6家门店 · 下发、验收与帮助</small></div>{state.role === "regional" ? <CheckCircledIcon /> : <ChevronRightIcon />}</button></div> : null}
      {sheet === "phase-switch" ? <div className="phase-switch-sheet"><p>快速跳转只改变演示时间和经营快照，已完成的任务进度会保留。</p>{phaseOrder.map((phase) => { const snapshot = getSnapshot(phase); return <button className={state.dayPhase === phase ? "selected" : ""} type="button" key={phase} onClick={() => { advancePhase(phase, `已跳转到${snapshot.time}${snapshot.label}`); setSheet(null); }}><time>{snapshot.time}</time><span><b>{snapshot.label}</b><small>{formatMoney(snapshot.currentRevenue)} · 预计{formatMoney(snapshot.forecastRevenue)}</small></span>{state.dayPhase === phase ? <CheckCircledIcon /> : <ChevronRightIcon />}</button>; })}</div> : null}
    </BottomSheet>
  );
}

function VoiceTaskSheet() {
  const { setSheet, showToast, setState, setActiveTab, setTaskFilter } = useDemo();
  const [stage, setStage] = useState(0);
  return (
    <div className="voice-task-sheet">
      {stage === 0 ? <><div className="voice-orb"><SpeakerLoudIcon /></div><h3>不用填表，说清楚事情就行</h3><p>AI会自动补齐责任人、时间、步骤和回传方式。</p><button className="primary-action" type="button" onClick={() => setStage(1)}><SpeakerLoudIcon /> 点击开始语音演示</button></> : null}
      {stage === 1 ? <><div className="voice-listening"><div className="voice-wave" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7].map((item) => <i key={item} />)}</div><b>正在听 · 00:08</b><p>“明天下午4点前，让前厅完成新品推荐训练，拍照回传。”</p></div><button className="primary-action" type="button" onClick={() => setStage(2)}><MagicWandIcon /> 结束录音并让AI整理</button></> : null}
      {stage === 2 ? <><div className="voice-transcript"><span>AI识别原话</span>“明天下午4点前，让前厅完成新品推荐训练，拍照回传。”</div><div className="parsed-task"><p><span>任务</span><b>新品推荐训练</b><button type="button" onClick={() => showToast("演示版：可语音修改任务内容")}>修改</button></p><p><span>责任人</span><b>前厅4人</b><button type="button" onClick={() => showToast("已匹配今天当班前厅员工")}>4人</button></p><p><span>截止</span><b>8月12日 16:00</b><button type="button" onClick={() => showToast("演示版：可点击调整截止时间")}>调整</button></p><p><span>验收</span><b>拍照 + AI识别</b><button type="button" onClick={() => showToast("可改为语音或系统数据验收")}>更换</button></p></div><div className="voice-ai-note"><MagicWandIcon /><span><b>AI已补充</b><small>训练步骤、4名当班员工、提醒时间和验收标准</small></span></div><button className="primary-action" type="button" onClick={() => { setState((current) => ({ ...current, voiceTasks: current.voiceTasks + 1, activity: ["语音任务已分发：新品推荐训练", ...current.activity] })); setStage(3); showToast("任务已创建并分发给前厅4人"); }}><PaperPlaneIcon /> 确认并分发</button></> : null}
      {stage === 3 ? <><div className="voice-receipt-success"><CheckCircledIcon /><span>任务已送达</span><h3>前厅4人全部接收</h3><p>系统将在8月12日15:30提醒，并在16:00等待照片回传。</p><div><b>李明</b><b>陈佳</b><b>王小丽</b><b>张雪</b></div></div><button className="primary-action" type="button" onClick={() => { setTaskFilter("我下发"); setActiveTab("tasks"); setSheet(null); }}>查看我下发的任务</button><button className="secondary-action" type="button" onClick={() => setStage(0)}>再下一项任务</button></> : null}
    </div>
  );
}

function SheetRow({ icon: Icon, tone, title, meta, badge, onClick }: { icon: IconType; tone: string; title: string; meta: string; badge: string; onClick: () => void }) {
  return <button type="button" className="sheet-row" onClick={onClick}><span className={tone}><Icon /></span><div><b>{title}</b><small>{meta}</small></div><em>{badge}</em><ChevronRightIcon /></button>;
}
