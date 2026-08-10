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

type TabId = "today" | "data" | "tasks" | "academy" | "mine";
type WorkflowId = "meeting" | "purchase" | "hr" | "soldout" | "growth";
type GoalId = "revenue" | "traffic" | "rating" | "cost";
type TaskFilter = "全部" | "必做任务" | "领导下发" | "自己领取" | "我下发";
type LessonId = "huang-revenue" | "founder-rhythm" | "meituan-review" | "strong-store";
type SheetId = "notifications" | "voice-task" | "reset" | "help" | "data-info" | null;
type IconType = ComponentType<{ className?: string }>;

type DemoState = {
  meetingStage: number;
  purchaseStage: number;
  hrStage: number;
  soldoutStage: number;
  growthStage: number;
  activeGoal: GoalId | null;
  growthPackage: string | null;
  completedGoals: GoalId[];
  completedFlows: WorkflowId[];
  points: number;
  helpRequests: number;
  voiceTasks: number;
  activity: string[];
};

type DemoContextValue = {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
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
  helpTopic: string;
  taskFilter: TaskFilter;
  setTaskFilter: (filter: TaskFilter) => void;
  activeLesson: LessonId;
  setActiveLesson: (lesson: LessonId) => void;
};

const STORAGE_KEY = "zhoumapo-manager-assistant-v2";

const initialState: DemoState = {
  meetingStage: 0,
  purchaseStage: 0,
  hrStage: 0,
  soldoutStage: 0,
  growthStage: 0,
  activeGoal: null,
  growthPackage: null,
  completedGoals: [],
  completedFlows: [],
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
  purchase: 15,
  hr: 14,
  soldout: 10,
  growth: 20,
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

const rootScreen: FlowScreen = {
  id: "manager-console-v2",
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
const academyArticleScreen = screenWithHeader("academy-article", "经营攻略", (flow) => <AcademyArticle flow={flow} />);
const promotionScreen = screenWithHeader("promotion", "三星店长晋升", () => <PromotionDetail />);

export default function Prototype() {
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [sheet, setSheet] = useState<SheetId>(null);
  const [state, setState] = useState<DemoState>(restoreDemoState);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [helpTopic, setHelpTopic] = useState("当前任务");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("全部");
  const [activeLesson, setActiveLesson] = useState<LessonId>("huang-revenue");
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
    setTaskFilter("全部");
    setActiveLesson("huang-revenue");
    showToast("演示已恢复到初始状态");
  };

  const openHelp = (topic: string) => {
    setHelpTopic(topic);
    setSheet("help");
  };

  const context = useMemo<DemoContextValue>(() => ({
    activeTab,
    setActiveTab,
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
    helpTopic,
    taskFilter,
    setTaskFilter,
    activeLesson,
    setActiveLesson,
  }), [activeLesson, activeTab, busy, helpTopic, sheet, state, taskFilter, toast]);

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
  const { activeTab } = useDemo();
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
  const { activeTab, setActiveTab, state } = useDemo();
  return (
    <nav className="bottom-nav" aria-label="主要功能">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;
        const badge = tab.id === "tasks" ? Math.max(0, 5 - state.completedFlows.length) : tab.id === "data" ? 2 : 0;
        return (
          <button
            key={tab.id}
            type="button"
            className={`nav-item ${selected ? "is-active" : ""}`}
            aria-current={selected ? "page" : undefined}
            onClick={() => {
              if (flow.canGoBack) flow.pop();
              setActiveTab(tab.id);
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
  const { setActiveTab, setSheet, state, selectGoal, setTaskFilter } = useDemo();
  const meetingDone = state.meetingStage >= 5;
  const growthDone = state.growthStage >= 4;
  const nextTitle = !meetingDone ? "先开晨会，把今天讲清楚" : !growthDone ? "客单价提升" : "处理晚市菜品库存";
  const nextMeta = !meetingDone
    ? "AI会边听边拆任务，不用再写会议纪要"
    : !growthDone
      ? "客单价下降 9.4%，预计影响营业额 ¥7,600"
      : "嫩牛肉仅剩6份，晚市预计需求28份";
  const nextAction = () => {
    if (!meetingDone) flow.push(meetingScreen);
    else if (!growthDone) {
      selectGoal("revenue");
      flow.push(growthScreen);
    } else flow.push(soldOutScreen);
  };
  const completedCount = 2 + state.completedFlows.length;
  const openTasks = (filter: TaskFilter) => {
    setTaskFilter(filter);
    setActiveTab("tasks");
  };

  return (
    <MobileScroll className="root-scroll home-scroll">
      <main className="root-content home-content" data-testid="today-screen">
        <header className="brand-row">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}assets/zhoumapo-logo.png`} alt="周麻婆 川式小炒" draggable={false} />
          <button className="icon-button notification-button" type="button" aria-label="查看提醒" onClick={() => setSheet("notifications")}>
            <BellIcon /><span>4</span>
          </button>
        </header>

        <div className="welcome-row">
          <div>
            <h1>黄店长，今天按节奏赢下来</h1>
            <p>三盛广场演示店 · 8月11日 <span className="demo-tag">演示数据</span></p>
          </div>
          <div className="level-block" aria-label={`2星店长，成长值${state.points}`}>
            <span><StarFilledIcon /> 2星店长 · {state.points}/1000</span>
            <progress value={state.points} max="1000" />
          </div>
        </div>

        <button className="kpi-strip" type="button" onClick={() => setActiveTab("data")} aria-label="查看今日经营数据">
          <div className="kpi-main">
            <span>今日</span>
            <strong>¥63,800 <small>/ ¥100,000</small></strong>
            <div className="progress-line"><i style={{ width: "63.8%" }} /></div>
            <em>63.8%</em>
          </div>
          <KpiMini label="预计" value="¥92,000" />
          <KpiMini label="差额" value="¥8,000" alert />
          <KpiMini label="较昨日" value="-7.8%" positive />
          <div className="health-score"><span>经营健康</span><b>73</b><small>需关注</small></div>
        </button>

        <section className="next-action-block">
          <div className="section-title-row compact-heading"><h2>现在最重要</h2><span>AI已排好优先级</span></div>
          <article className="current-task-card next-best-card">
            <div className="task-heading"><h3>{nextTitle}</h3><span>现在做</span></div>
            <p><MagicWandIcon /> {nextMeta}</p>
            <button className="primary-action" type="button" onClick={nextAction}>开始执行 <ChevronRightIcon /></button>
            <small className="growth-reward"><StarFilledIcon /> 完成后自动给出结果反馈</small>
          </article>
        </section>

        <section className="daily-source-section">
          <div className="section-title-row compact-heading"><h2>我的每日任务</h2><button type="button" onClick={() => openTasks("全部")}>全部任务 <ChevronRightIcon /></button></div>
          <div className="daily-source-grid">
            <TaskSourceButton icon={CheckCircledIcon} tone="red" label="必做任务" value={meetingDone ? "2/4" : "1/4"} meta={meetingDone ? "下一项：午市巡检" : "晨会还未完成"} onClick={() => openTasks("必做任务")} />
            <TaskSourceButton icon={PaperPlaneIcon} tone="orange" label="领导下发" value="2项" meta="运营中心 · 1项紧急" onClick={() => openTasks("领导下发")} />
            <TaskSourceButton icon={TargetIcon} tone="green" label="自己领取" value={state.activeGoal ? "1项" : "0项"} meta={state.activeGoal ? "经营行动执行中" : "按目标主动领"} onClick={() => openTasks("自己领取")} />
          </div>
        </section>

        <section className="workbench-section">
          <div className="section-title-row compact-heading"><h2>店务快捷处理</h2><span>少填表，直接做</span></div>
          <button className="store-voice-command" type="button" onClick={() => setSheet("voice-task")}>
            <span><SpeakerLoudIcon /></span><div><b>一句话安排店务</b><small>说清事情，AI自动拆任务并分发</small></div><em>按住说</em>
          </button>
          <div className="tool-grid">
            <ToolButton icon={SpeakerLoudIcon} label="开晨会" meta={meetingDone ? "已闭环" : "AI拆任务"} tone="red" done={meetingDone} onClick={() => flow.push(meetingScreen)} />
            <ToolButton icon={ArchiveIcon} label="采购下单" meta={state.purchaseStage >= 5 ? "已验收" : "3项缺货"} tone="orange" done={state.purchaseStage >= 5} onClick={() => flow.push(purchaseScreen)} />
            <ToolButton icon={MixerHorizontalIcon} label="菜品沽清" meta={state.soldoutStage >= 4 ? "已上架" : "1项预警"} tone="gold" done={state.soldoutStage >= 4} onClick={() => flow.push(soldOutScreen)} />
            <ToolButton icon={IdCardIcon} label="人员考核" meta={state.hrStage >= 4 ? "已确认" : "2人待看"} tone="green" done={state.hrStage >= 4} onClick={() => flow.push(hrScreen)} />
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
          <div className="section-title-row"><h2>今日行动路线</h2><span>已完成 <b>{completedCount}</b>/8</span></div>
          <div className="timeline slim-timeline">
            <TimelineItem time="09:00" state={meetingDone ? "done" : "current"} title="晨会" meta={meetingDone ? "4项任务已下发并回执" : "语音记录，AI自动拆任务"} onClick={() => flow.push(meetingScreen)} />
            <TimelineItem time="11:30" state="done" title="午市巡检" meta="卫生照片已识别 · 92分" onClick={() => setSheet("data-info")} />
            <TimelineItem time="15:30" state={growthDone ? "done" : meetingDone ? "current" : "todo"} title="经营提升" meta="客单价是今天首要问题" onClick={() => { selectGoal("revenue"); flow.push(growthScreen); }} />
            <TimelineItem time="18:00" state="todo" title="差评复盘" meta="近7日差评3条" onClick={() => { selectGoal("rating"); flow.push(growthScreen); }} />
            <TimelineItem time="21:30" state="todo" title="收官复盘" meta="AI预测与实际核对" onClick={() => setActiveTab("data")} />
          </div>
        </section>

        <section className="exception-card">
          <button type="button" className="exception-top" onClick={() => setActiveTab("data")}>
            <ExclamationTriangleIcon /><b>经营异常 2项</b><span className="danger-chip">客单 58</span><span className="warning-chip">口碑 72</span><em>查看数据 <ChevronRightIcon /></em>
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
  const { selectGoal, showToast } = useDemo();
  const [view, setView] = useState("概览");
  const views = ["概览", "流量", "转化", "口碑", "成本"];
  const dimensionCopy: Record<string, { value: string; label: string; detail: string }> = {
    概览: { value: "73", label: "经营健康", detail: "2项异常 · 3项关注" },
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

  return (
    <MobileScroll className="root-scroll">
      <main className="root-content data-content" data-testid="data-screen">
        <PageIntro eyebrow="8月11日 · 16:20更新 · 演示数据" title="经营数据" action={<button className="icon-button" type="button" aria-label="AI经营诊断" onClick={() => goToGoal("revenue")}><MagicWandIcon /></button>} />
        <section className="data-hero v2-data-hero">
          <div><span>{current.label}</span><strong>{current.value}</strong><p>{current.detail}</p></div>
          <div className="forecast-box"><span>今日营业额</span><b>¥63,800</b><small>预计收官 ¥92,000</small></div>
          <div className="progress-line wide"><i style={{ width: "63.8%" }} /></div>
        </section>

        <div className="segmented-tabs" role="tablist" aria-label="数据维度">
          {views.map((item) => <button type="button" key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}
        </div>

        <section>
          <div className="section-heading"><h2>六维健康</h2><span>点异常直接行动</span></div>
          <div className="health-grid six-grid">
            <HealthCard label="流量" score={76} state="关注" tone="warning" delta="-3.1%" onClick={() => goToGoal("traffic")} />
            <HealthCard label="转化" score={84} state="健康" tone="good" delta="+2.4%" onClick={() => showToast("转化健康，继续保持当前动作")} />
            <HealthCard label="客单" score={58} state="异常" tone="danger" delta="-9.4%" onClick={() => goToGoal("revenue")} />
            <HealthCard label="口碑" score={72} state="关注" tone="warning" delta="3条差评" onClick={() => goToGoal("rating")} />
            <HealthCard label="毛利" score={82} state="健康" tone="good" delta="61.8%" onClick={() => goToGoal("cost")} />
            <HealthCard label="人员" score={78} state="关注" tone="warning" delta="2人待带教" onClick={() => flow.push(hrScreen)} />
          </div>
        </section>

        <section className="ai-diagnosis-card">
          <div className="diagnosis-icon"><MagicWandIcon /></div>
          <div><span>AI经营诊断</span><h3>首要问题不是流量，而是客单价</h3><p>主动推荐率从42%降到31%，预计影响营业额约¥7,600。</p></div>
          <button type="button" onClick={() => goToGoal("revenue")}>生成行动 <ChevronRightIcon /></button>
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
  const filters: TaskFilter[] = ["全部", "必做任务", "领导下发", "自己领取", "我下发"];
  const tasks: Array<{ source: string; tone: string; title: string; meta: string; progress: number; status: string; action: () => void }> = [
    { source: "必做任务", tone: "danger", title: "晨会与今日分工", meta: "09:10前 · 语音会议+员工回执", progress: state.meetingStage * 20, status: state.meetingStage >= 5 ? "已闭环" : state.meetingStage ? "进行中" : "现在做", action: () => flow.push(meetingScreen) },
    { source: "必做任务", tone: "neutral", title: "晚市库存与沽清检查", meta: "17:00前 · 系统库存校验", progress: state.soldoutStage * 25, status: state.soldoutStage >= 4 ? "已恢复" : "待处理", action: () => flow.push(soldOutScreen) },
    { source: "必做任务", tone: "neutral", title: "收官经营复盘", meta: "21:30 · 预测与实际核对", progress: 0, status: "未开始", action: () => flow.push(growthScreen) },
    { source: "领导下发", tone: "warning", title: "晚市新品主动推荐", meta: "运营中心·林阳 · 18:00前 · 拍照+语音", progress: state.growthStage >= 4 ? 100 : 20, status: state.growthStage >= 4 ? "已完成" : "待执行", action: () => { selectGoal("revenue"); flow.push(growthScreen); } },
    { source: "领导下发", tone: "warning", title: "周末门店朋友圈发布", meta: "市场中心 · 今天17:30前 · 截图回传", progress: 0, status: "待接收", action: () => setSheet("voice-task") },
    { source: "自己领取", tone: "good", title: "客单价提升行动", meta: "AI诊断后主动领取 · 3个动作", progress: Math.min(100, state.growthStage * 25), status: state.growthStage >= 4 ? "已完成" : state.growthStage ? "进行中" : "可领取", action: () => { selectGoal("revenue"); flow.push(growthScreen); } },
    { source: "自己领取", tone: "good", title: "本周社群新增40人", meta: "周日截止 · 当前22人", progress: 55, status: "22/40", action: () => { selectGoal("traffic"); flow.push(growthScreen); } },
    ...(state.voiceTasks > 0 ? [{ source: "我下发", tone: "neutral", title: "新品推荐训练", meta: "前厅4人 · 8月12日16:00 · 拍照验收", progress: 100, status: "4/4已接收", action: () => setSheet("voice-task") }] : []),
  ];
  const visible = filter === "全部" ? tasks : tasks.filter((task) => task.source === filter);
  return (
    <MobileScroll className="root-scroll">
      <main className="root-content tasks-content" data-testid="tasks-screen">
        <PageIntro eyebrow="三类任务来源 · 演示数据" title="今日任务" action={<button className="add-button" type="button" onClick={() => setSheet("voice-task")}><PlusIcon /> 语音下发</button>} />
        <section className="task-source-summary">
          <button type="button" className={filter === "必做任务" ? "active" : ""} onClick={() => setFilter("必做任务")}><CheckCircledIcon /><span>必做任务<b>{state.meetingStage >= 5 ? "2/4" : "1/4"}</b><small>门店每日节奏</small></span></button>
          <button type="button" className={filter === "领导下发" ? "active" : ""} onClick={() => setFilter("领导下发")}><PaperPlaneIcon /><span>领导下发<b>2项</b><small>总部与区域要求</small></span></button>
          <button type="button" className={filter === "自己领取" ? "active" : ""} onClick={() => setFilter("自己领取")}><TargetIcon /><span>自己领取<b>{state.activeGoal ? "1项" : "0项"}</b><small>主动提升经营</small></span></button>
        </section>
        <button className="voice-command-card" type="button" onClick={() => setSheet("voice-task")}><span><SpeakerLoudIcon /></span><div><b>说一句话，就能下发任务</b><small>AI自动补责任人、截止时间和验收方式</small></div><ChevronRightIcon /></button>
        <button className="ai-claim-card" type="button" onClick={() => { selectGoal("revenue"); flow.push(growthScreen); }}><MagicWandIcon /><div><span>AI今日建议</span><b>领取“客单价提升”行动</b><small>预计追回营业额 ¥6,000–8,000</small></div><em>去领取 <ChevronRightIcon /></em></button>
        <Carousel ariaLabel="任务筛选" className="filter-carousel" contentClassName="filter-carousel-track">
          {filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
        </Carousel>
        <div className="section-heading"><h2>{filter} · {visible.length}项</h2><span>按优先级排序</span></div>
        <div className="task-list">
          {visible.map((task) => <TaskCard key={task.title} {...task} onClick={task.action} />)}
        </div>
      </main>
    </MobileScroll>
  );
}

function TaskCard({ source, tone, title, meta, progress, status, onClick }: { source: string; tone: string; title: string; meta: string; progress: number; status: string; onClick: () => void }) {
  return <button className="task-card" type="button" onClick={onClick}><span className={`source-tag ${tone}`}>{source}</span><div className="task-card-main"><h3>{title}</h3><p>{meta}</p><div className="progress-line"><i style={{ width: `${progress}%` }} /></div></div><span className="task-status">{status}<ChevronRightIcon /></span></button>;
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
  return (
    <MobileScroll className="root-scroll">
      <main className="root-content mine-content" data-testid="mine-screen">
        <PageIntro eyebrow="三盛广场演示店 · 演示数据" title="黄店长" />
        <section className="profile-card"><div className="avatar"><PersonIcon /></div><div><span>当前等级</span><h2><StarFilledIcon /> 2星店长</h2><p>成长值 {state.points} / 1000</p></div><b>区域第18名</b><div className="progress-line wide"><i style={{ width: `${Math.min(100, state.points / 10)}%` }} /></div></section>
        <section className="promotion-card"><div className="promotion-title"><div><span>下一等级</span><h2>三星店长</h2></div><strong>1/3 达成</strong></div><Requirement done title="年度评比进入 Top 20" meta="当前第18名" /><Requirement title="在职年限超过 2 年" meta="当前1年8个月" /><Requirement title="连续 3 个月盈利" meta="已连续2个月" progress="2/3" /><button className="secondary-action" type="button" onClick={() => flow.push(promotionScreen)}>查看晋升路线 <ChevronRightIcon /></button></section>
        <div className="section-heading"><h2>我的经营</h2><span>本月</span></div>
        <div className="personal-grid">
          <button type="button" onClick={() => setActiveTab("data")}><TargetIcon /><b>63.8%</b><span>今日目标</span></button>
          <button type="button" onClick={() => setActiveTab("tasks")}><CheckCircledIcon /><b>{Math.round((state.completedFlows.length / 5) * 100)}%</b><span>闭环完成率</span></button>
          <button type="button" onClick={() => showToast(`本月累计成长值 +${Math.max(120, state.points - 560)}`)}><StarFilledIcon /><b>+{Math.max(120, state.points - 560)}</b><span>本月成长值</span></button>
          <button type="button" onClick={() => setActiveTab("academy")}><ReaderIcon /><b>6篇</b><span>已学攻略</span></button>
        </div>
        <section className="activity-card"><div className="section-heading"><h2>最近反馈</h2><span>{state.activity.length}条</span></div>{state.activity.slice(0, 3).map((item) => <p key={item}><CheckCircledIcon /><span>{item}</span></p>)}</section>
        <section className="settings-list">
          <button type="button" onClick={() => showToast("8月第2周周报已生成（演示）")}><FileTextIcon /> 我的周报 <span>8月第2周 <ChevronRightIcon /></span></button>
          <button type="button" onClick={() => setActiveTab("data")}><CalendarIcon /> 本月目标 <span>42.7% <ChevronRightIcon /></span></button>
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
  const { state, setState, runMock, completeFlow, openHelp, setActiveTab, setTaskFilter } = useDemo();
  const stage = state.meetingStage;
  const setStage = (next: number, message: string, key: string) => runMock(key, message, (current) => ({ ...current, meetingStage: next }));
  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content" data-testid="meeting-flow">
        <StageHeader eyebrow="09:00 · 7人到会 · 演示数据" title="AI晨会助手" summary="你只管开会，AI负责记录、拆任务和追反馈。" stage={Math.min(stage, 5)} total={5} icon={SpeakerLoudIcon} />
        {stage === 0 ? (
          <section className="voice-start-card"><div className="voice-orb"><SpeakerLoudIcon /></div><h2>点击后直接开始讲</h2><p>不用准备表格，卫生、服务、库存和业绩都会自动识别。</p><MockButton busyKey="meeting-record" onClick={() => setStage(1, "6分32秒晨会已转写", "meeting-record")}><PlayIcon /> 开始语音晨会</MockButton></section>
        ) : null}
        {stage === 1 ? (
          <section><div className="transcript-card"><span><ActivityLogIcon /> AI实时转写 · 6分32秒</span><p>“昨天营业额差了七千多。午市卫生要王小丽再看一遍，晚市每个人都要主动推荐新品。嫩牛肉库存不够，采购尽快确认。近几天的差评也要复盘。”</p></div><div className="signal-grid"><Signal label="业绩" value="缺口¥8,000" tone="danger" /><Signal label="卫生" value="午市复查" tone="good" /><Signal label="库存" value="嫩牛肉不足" tone="warning" /><Signal label="口碑" value="3条差评" tone="warning" /></div><MockButton busyKey="meeting-parse" onClick={() => setStage(2, "AI已拆解4项可执行任务", "meeting-parse")}><MagicWandIcon /> AI拆成任务</MockButton></section>
        ) : null}
        {stage === 2 ? (
          <section><div className="section-heading"><h2>确认4项任务</h2><span>责任人与时间已补齐</span></div><div className="generated-tasks v2-generated-tasks"><FlowListRow icon={CameraIcon} title="午市卫生复查" meta="王小丽 · 11:30前 · 拍照" status="已匹配" /><FlowListRow icon={RocketIcon} title="主动推荐训练" meta="前厅4人 · 15:30前 · 语音+照片" status="已匹配" /><FlowListRow icon={ArchiveIcon} title="嫩牛肉采购确认" meta="黄店长 · 16:30前 · 系统验收" status="已匹配" /><FlowListRow icon={StarFilledIcon} title="近7日差评复盘" meta="李主管 · 18:00前 · 语音反馈" status="已匹配" /></div><button className="link-action" type="button" onClick={() => setState((current) => ({ ...current, voiceTasks: current.voiceTasks + 1 }))}><PlusIcon /> 再补充一项口头任务</button><MockButton busyKey="meeting-send" onClick={() => setStage(3, "4项任务已一键下发", "meeting-send")}><PaperPlaneIcon /> 确认并下发4项</MockButton></section>
        ) : null}
        {stage === 3 ? (
          <section><div className="receipt-summary"><CheckCircledIcon /><div><b>任务已经送达</b><p>3人已接收，李主管暂未确认</p></div><strong>3/4</strong></div><div className="receipt-list"><ReceiptRow name="王小丽" role="前厅主管" state="已接收" tone="good" /><ReceiptRow name="李明等4人" role="前厅员工" state="已接收" tone="good" /><ReceiptRow name="采购负责人" role="供应链" state="已接收" tone="good" /><ReceiptRow name="李主管" role="值班主管" state="未确认" tone="warning" /></div><MockButton busyKey="meeting-receipt" onClick={() => setStage(4, "李主管已确认，午市任务已回传", "meeting-receipt")}><ReloadIcon /> 模拟员工反馈</MockButton></section>
        ) : null}
        {stage === 4 ? (
          <section><div className="evidence-card"><img src={`${import.meta.env.BASE_URL}assets/task-evidence.jpg`} alt="员工午市任务回传" draggable={false} /><div><span><CheckCircledIcon /> AI验收通过</span><h2>午市卫生与主动推荐已执行</h2><p>照片环境整洁度92分；4名员工全部完成话术训练。</p></div></div><div className="impact-row"><span>任务接收</span><b>4/4</b><span>已完成</span><b>2/4</b><span>待复查</span><b>18:00</b></div><MockButton busyKey="meeting-complete" onClick={() => { setState((current) => ({ ...current, meetingStage: 5 })); completeFlow("meeting", workflowPoints.meeting, "晨会闭环已完成"); }}><CheckCircledIcon /> 完成晨会闭环</MockButton></section>
        ) : null}
        {stage >= 5 ? <ResultPanel flow={flow} title="晨会闭环完成" evidence="语音转写 + 4项任务回执 + 午市照片" impact="减少会议记录时间约20分钟，4项任务都有责任人与截止时间" reward={12} nextTitle="去看4项任务的接收与进度" nextMeta="下一步：王小丽在11:30前完成午市巡检并拍照回传" onNext={() => { setTaskFilter("必做任务"); setActiveTab("tasks"); }} onRestart={() => setState((current) => ({ ...current, meetingStage: 0 }))} onHelp={() => openHelp("晨会任务没有人确认")} /> : null}
      </main>
    </MobileScroll>
  );
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
  const { state, setState, runMock, completeFlow, openHelp, showToast } = useDemo();
  const stage = state.soldoutStage;
  const setStage = (next: number, message: string, key: string) => runMock(key, message, (current) => ({ ...current, soldoutStage: next }));
  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content" data-testid="soldout-flow">
        <StageHeader eyebrow="晚市库存预警 · 演示数据" title="菜品沽清与恢复" summary="一次操作同步所有渠道，避免顾客下单后再取消。" stage={Math.min(stage, 4)} total={4} icon={MixerHorizontalIcon} />
        {stage === 0 ? <section><div className="dish-alert-card"><span className="dish-icon"><ExclamationTriangleIcon /></span><div><span>高风险</span><h2>嫩牛肉系列仅剩6份</h2><p>晚市预计需求28份，最早17:40售罄。</p></div><strong>6份</strong></div><div className="dish-list"><p><b>嫩牛肉小炒</b><span>预计缺12份</span></p><p><b>泡椒嫩牛肉</b><span>预计缺7份</span></p><p><b>双椒牛肉套餐</b><span>预计缺3份</span></p></div><button className="secondary-action" type="button" onClick={() => { showToast("已跳转采购补货方案"); flow.replace(purchaseScreen); }}><ArchiveIcon /> 先紧急补货</button><MockButton busyKey="soldout-start" onClick={() => setStage(1, "已进入三渠道同步确认", "soldout-start")}><MixerHorizontalIcon /> 一键沽清相关菜品</MockButton></section> : null}
        {stage === 1 ? <section><div className="sync-list"><SyncRow name="收银POS" state="待同步" icon={DashboardIcon} /><SyncRow name="美团外卖" state="待同步" icon={SewingPinIcon} /><SyncRow name="抖音团购" state="待同步" icon={PlayIcon} /></div><div className="approval-note"><InfoCircledIcon /><span><b>不会删除菜品</b><p>只暂停售卖，库存恢复后可一键重新上架。</p></span></div><MockButton busyKey="soldout-sync" onClick={() => setStage(2, "收银、美团、抖音已全部同步", "soldout-sync")}><Share2Icon /> 确认同步三渠道</MockButton></section> : null}
        {stage === 2 ? <section><div className="sync-list complete"><SyncRow name="收银POS" state="同步成功" icon={DashboardIcon} done /><SyncRow name="美团外卖" state="同步成功" icon={SewingPinIcon} done /><SyncRow name="抖音团购" state="同步成功" icon={PlayIcon} done /></div><div className="substitute-card"><MagicWandIcon /><div><span>AI替代推荐</span><h2>主推青椒肉丝套餐</h2><p>口味接近、库存充足，预计可承接70%的牛肉菜需求。</p></div></div><MockButton busyKey="soldout-notify" onClick={() => setStage(3, "前厅6人已收到替代推荐话术", "soldout-notify")}><PaperPlaneIcon /> 通知前厅并下发话术</MockButton></section> : null}
        {stage === 3 ? <section><div className="receipt-summary"><CheckCircledIcon /><div><b>前厅6人全部已读</b><p>推荐话术与替代菜已同步到任务栏</p></div><strong>6/6</strong></div><div className="restock-card"><ArchiveIcon /><div><b>采购补货已到店</b><p>嫩牛肉新增25kg，可恢复约34份菜品。</p></div><span>17:02</span></div><MockButton busyKey="soldout-restore" onClick={() => { setState((current) => ({ ...current, soldoutStage: 4 })); completeFlow("soldout", workflowPoints.soldout, "菜品已恢复三渠道上架"); }}><ReloadIcon /> 一键恢复上架</MockButton></section> : null}
        {stage >= 4 ? <ResultPanel flow={flow} title="沽清与恢复已闭环" evidence="库存预警 + 三渠道回执 + 员工已读" impact="避免超卖和退单，替代推荐预计保住约 ¥2,400 营业额" reward={10} onRestart={() => setState((current) => ({ ...current, soldoutStage: 0 }))} onHelp={() => openHelp("某个渠道同步失败")} /> : null}
      </main>
    </MobileScroll>
  );
}

function GrowthFlow({ flow }: { flow: FlowControls }) {
  const { state, setState, selectGoal, runMock, completeFlow, openHelp, showToast } = useDemo();
  const goalId = state.activeGoal;
  const goal = goalId ? goalCatalog[goalId] : null;
  const stage = goal ? state.growthStage : 0;
  const packages = [
    { id: "quick", name: "快速动作", time: "15分钟", note: "自己完成1个关键动作" },
    { id: "team", name: "团队行动", time: "30分钟", note: "分发给当班员工共同执行" },
    { id: "full", name: "完整方案", time: "60分钟", note: "含训练、执行、拍照与复盘" },
  ];
  const finishGrowth = () => {
    setState((current) => ({ ...current, growthStage: 4 }));
    completeFlow("growth", goal?.reward ?? workflowPoints.growth, `${goal?.label ?? "经营提升"}任务验收通过`);
  };

  return (
    <MobileScroll className="detail-scroll">
      <main className="detail-content workflow-content" data-testid="growth-flow">
        <StageHeader eyebrow="专属经营教练 · 演示数据" title={goal ? goal.label : "你今天想提升什么？"} summary={goal ? goal.diagnosis : "选一个目标，AI会根据门店数据给出最省力的行动。"} stage={Math.min(stage, 4)} total={4} icon={MagicWandIcon} />
        {!goal ? <section><div className="goal-choice-grid">{(Object.keys(goalCatalog) as GoalId[]).map((id) => { const item = goalCatalog[id]; const Icon = item.icon; return <button key={id} className={`goal-choice ${item.tone}`} type="button" onClick={() => selectGoal(id)}><span><Icon /></span><div><b>{item.label}</b><p>{item.short}</p><small>{item.metric}</small></div><ChevronRightIcon /></button>; })}</div></section> : null}
        {goal && stage === 1 ? <section><div className="diagnosis-detail"><span><ActivityLogIcon /> AI数据判断</span><h2>{goal.metric}</h2><p>{goal.diagnosis}</p><div><b>{goal.impact}</b><small>基于同类门店最佳实践估算</small></div></div><div className="section-heading"><h2>选择行动强度</h2><span>都可以随时求助</span></div><div className="package-list">{packages.map((item) => <button key={item.id} className={state.growthPackage === item.id ? "selected" : ""} type="button" onClick={() => setState((current) => ({ ...current, growthPackage: item.id }))}><span><LightningBoltIcon /></span><div><b>{item.name}</b><p>{item.note}</p></div><em>{item.time}</em>{state.growthPackage === item.id ? <CheckCircledIcon /> : <ChevronRightIcon />}</button>)}</div><MockButton busyKey="growth-claim" onClick={() => { if (!state.growthPackage) { showToast("先选择一个行动强度"); return; } runMock("growth-claim", "行动已领取并加入今日任务", (current) => ({ ...current, growthStage: 2 })); }}><TargetIcon /> 领取这项行动</MockButton></section> : null}
        {goal && stage === 2 ? <section><div className="task-brief"><span><TargetIcon /></span><div><b>{goal.label}行动包</b><p>今天完成 · 自己执行或分发 · AI验收</p></div><em>+{goal.reward}成长值</em></div><div className="execution-steps"><ExecutionStep number="1" icon={ReaderIcon} title="看懂AI建议" meta="1分钟 · 只看最关键做法" done action="已完成" onClick={() => showToast("关键做法已查看")} /><ExecutionStep number="2" icon={PaperPlaneIcon} title="执行或分发" meta="系统已匹配当班员工" done={false} action="一键执行" onClick={() => showToast("已分发给前厅4人")} /><ExecutionStep number="3" icon={CameraIcon} title="拍照或说一段话" meta="不用填表，AI自动识别" done={false} action="去回传" onClick={() => runMock("growth-proof", "现场证据已回传", (current) => ({ ...current, growthStage: 3 }))} /></div><button className="secondary-action" type="button" onClick={() => openHelp(`${goal.label}行动执行困难`)}>我做不了，请求帮助</button><MockButton busyKey="growth-proof" onClick={() => runMock("growth-proof", "现场照片与语音已回传", (current) => ({ ...current, growthStage: 3 }))}><CameraIcon /> 模拟拍照并回传</MockButton></section> : null}
        {goal && stage === 3 ? <section><div className="evidence-card"><img src={`${import.meta.env.BASE_URL}assets/task-evidence.jpg`} alt="经营提升任务回传" draggable={false} /><div><span><MagicWandIcon /> AI正在核验</span><h2>执行证据完整</h2><p>已识别人员、门店环境和推荐动作，符合验收标准。</p></div></div><div className="acceptance-grid"><Signal label="人员到位" value="4/4" tone="good" /><Signal label="动作完成" value="3/3" tone="good" /><Signal label="照片质量" value="清晰" tone="good" /><Signal label="数据复查" value="21:30" tone="warning" /></div><MockButton busyKey="growth-accept" onClick={() => runMock("growth-accept", "AI验收通过，经营影响已估算", (current) => ({ ...current, growthStage: 4 }))}><MagicWandIcon /> AI验收并看结果</MockButton></section> : null}
        {goal && stage >= 4 ? <ResultPanel flow={flow} title={`${goal.label}行动完成`} evidence="任务分发 + 现场照片 + AI识别" impact={goal.impact} reward={goal.reward} onContinue={() => finishGrowth()} onRestart={() => setState((current) => ({ ...current, growthStage: 1, growthPackage: null }))} onHelp={() => openHelp(`${goal.label}结果未达预期`)} extraAction={<button className="secondary-action" type="button" onClick={() => setState((current) => ({ ...current, activeGoal: null, growthStage: 0, growthPackage: null }))}>再领取一个经营目标</button>} /> : null}
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
  const { sheet, setSheet, state, setState, showToast, resetDemo, helpTopic, setActiveTab } = useDemo();
  const titles: Record<Exclude<SheetId, null>, string> = {
    notifications: "提醒事项 · 4",
    "voice-task": "语音下发任务",
    reset: "重置全部演示",
    help: "请求帮助",
    "data-info": "演示数据说明",
  };
  return (
    <BottomSheet open={sheet !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheet ? titles[sheet] : ""} snap={0.7}>
      {sheet === "notifications" ? <div className="sheet-list"><SheetRow icon={ExclamationTriangleIcon} tone="danger" title="客单价出现异常" meta="下降9.4% · AI已生成行动" badge="现在" onClick={() => { setSheet(null); setActiveTab("tasks"); }} /><SheetRow icon={ArchiveIcon} tone="warning" title="晚市库存不足" meta="嫩牛肉仅剩6份" badge="紧急" onClick={() => { setSheet(null); showToast("请从首页进入菜品沽清演示"); }} /><SheetRow icon={IdCardIcon} tone="warning" title="人员考核待确认" meta="王小丽 · 本周表现" badge="今天" onClick={() => { setSheet(null); setActiveTab("tasks"); }} /><SheetRow icon={FileTextIcon} tone="good" title="总部任务已下发" meta="晚市新品主动推荐" badge="新" onClick={() => { setSheet(null); setActiveTab("tasks"); }} /></div> : null}
      {sheet === "voice-task" ? <VoiceTaskSheet /> : null}
      {sheet === "reset" ? <div className="reset-sheet"><div className="reset-icon"><CounterClockwiseClockIcon /></div><h3>恢复到第一次打开的状态？</h3><p>所有流程进度、成长值和反馈记录都会重置，V1和网页文件不会受影响。</p><button className="primary-action" type="button" onClick={resetDemo}>确认重置演示</button><button className="secondary-action" type="button" onClick={() => setSheet(null)}>取消</button></div> : null}
      {sheet === "help" ? <div className="help-sheet"><div className="help-hero"><InfoCircledIcon /><div><span>当前卡点</span><h3>{helpTopic}</h3></div></div><p>AI已整理好问题、数据和已经做过的动作，店长不需要再写说明。</p><div className="help-targets"><button type="button" onClick={() => showToast("已选择区域经理")}>区域经理<span>经营判断</span></button><button type="button" onClick={() => showToast("已选择总部职能")}>总部职能<span>专业支持</span></button><button type="button" onClick={() => showToast("已选择技术中心")}>技术中心<span>系统异常</span></button></div><button className="primary-action" type="button" onClick={() => { setState((current) => ({ ...current, helpRequests: current.helpRequests + 1, activity: [`求助已发出：${helpTopic}`, ...current.activity] })); setSheet(null); showToast("求助已发送，预计10分钟内响应"); }}><PaperPlaneIcon /> 一键发送求助</button></div> : null}
      {sheet === "data-info" ? <div className="data-info-sheet"><div className="data-info-lock"><LockClosedIcon /></div><h3>本页全部为模拟数据</h3><p>营业额、评价、员工、库存、采购、平台回执和AI判断仅用于演示交互，不代表任何真实门店经营结果。</p><div><span>模拟门店</span><b>三盛广场演示店</b></div><div><span>模拟日期</span><b>8月11日</b></div><div><span>更新方式</span><b>本地状态联动</b></div><button className="primary-action" type="button" onClick={() => setSheet(null)}>我知道了</button></div> : null}
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
