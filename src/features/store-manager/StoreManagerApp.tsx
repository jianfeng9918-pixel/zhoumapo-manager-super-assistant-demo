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
  getEvidenceForAction,
  getUnreadCount,
  money,
} from "../../domain/selectors";
import type { ActionInstance, BusinessSignal, OperatingMomentId } from "../../domain/types";
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
  const meeting = getAction(state, "morning-meeting")!;
  const recall = getAction(state, "member-recall")!;
  const closing = getAction(state, "closing-review")!;
  const meetingDone = meeting.status === "closed";
  const recallDone = recall.status === "closed";
  const isClosing = state.operatingMoment === "closing";

  const primary = isClosing
    ? { time: "21:30", title: "完成今日经营复盘", body: "AI已整理哪些动作有效，以及明天第一件事。", label: "查看复盘", screen: closingReviewScreen }
    : !meetingDone
      ? { time: "08:45", title: "开晨会", body: "你说一句，AI整理行动；确认后再下发。", label: "开始晨会", screen: meetingScreen }
      : !recallDone
        ? { time: "16:20", title: "执行会员召回", body: "晨会行动已下发，先触达180位近期会员。", label: "立即执行", screen: memberRecallScreen }
        : { time: "18:00", title: "守住晚市10桌体验", body: "已补回19桌，当前营业额未变化，预计收官升至 ¥98,000。", label: "查看下一步", screen: experienceScreen };

  return (
    <>
      <AppBrandHeader
        subtitle={`${state.brief.storeName} · ${state.brief.date} · ${state.operatingMoment === "preOpen" ? "08:30" : state.operatingMoment === "closing" ? "21:30" : "17:30"}`}
        onNotifications={() => flow.push(notificationsScreen)}
      />
      <div className="store-greeting">
        <h1>
          {isClosing ? "黄店长，今天辛苦了" : "黄店长，早上好"}
          {!isClosing ? <em aria-hidden="true">☀️</em> : null}
        </h1>
        <span>{isClosing ? "收官" : "今日经营已准备"}</span>
      </div>

      <section className="ai-command-card" data-testid="primary-action-card">
        <div className="ai-card-identity">
          <img src="/assets/ai-regional-manager.png" alt="AI区域经理" draggable={false} />
          <span><b>AI区域经理</b><small>基于经营数据 · 需人工确认</small></span>
          <MagicWandIcon />
        </div>
        <h2>{isClosing ? "今天有效补回了晚市顾客。" : state.brief.judgment}</h2>
        {!isClosing ? (
          <button type="button" className="evidence-summary" onClick={() => flow.push(dataAnswerScreen)}>
            <span><ActivityLogIcon /><b>{state.brief.evidence[0]}</b></span>
            <span><CalendarIcon /><b>{state.brief.evidence[1]}</b></span>
            <ChevronRightIcon />
          </button>
        ) : (
          <div className="closing-summary-inline">
            <span><small>今日实际</small><b>¥100,600</b></span>
            <span><small>目标</small><b>100.6%</b></span>
          </div>
        )}
        <div className="command-action-block">
          <span>建议主行动</span>
          <div><h3>{primary.time} {primary.title}</h3><ActivityLogIcon /></div>
          <p>{primary.body}</p>
          <PrimaryButton onClick={() => flow.push(primary.screen)}>{primary.label}</PrimaryButton>
          <HumanConfirmNote text={isClosing ? "确认后生成日报与明日第一件事" : "确认后才会下发到负责人"} />
        </div>
      </section>

      <section className="compact-route-card">
        <SectionHeading title="今天路线" meta={meetingDone ? "晨会已完成" : "下一步"} />
        <div className="compact-route-grid">
          <button type="button" onClick={() => flow.push(memberRecallScreen)}>
            <ClockIcon /><span><small>16:20</small><b>会员召回</b></span>
          </button>
          <button type="button" onClick={() => flow.push(closingReviewScreen)}>
            <ClockIcon /><span><small>21:30</small><b>收官复盘</b></span>
          </button>
        </div>
      </section>

      <button type="button" className="next-recheck-row" onClick={() => flow.push(dataAnswerScreen)}>
        <BellIcon /><span>下次复查</span><b>{state.brief.nextRecheckAt} · AI复查顾客差距</b><ChevronRightIcon />
      </button>

      {recallDone ? (
        <ResultCard
          title="会员召回已通过区域验收"
          body="触达180位会员，新增预约19桌、49位顾客。"
          impact="预计收官由 ¥92,000 提升至 ¥98,000"
          next="18:30复查到店"
        />
      ) : null}
    </>
  );
}

function DataScreen({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const answers = [
    { question: "今天能不能达标？", answer: `按现在情况，预计还差${state.brief.forecastTableGap}桌、${state.brief.forecastGuestGap}位顾客。`, icon: TargetIcon },
    { question: "差距从哪里来？", answer: "客单价没有下降，主要是晚市预约和自然到店不足。", icon: ActivityLogIcon },
    { question: "现在应该做什么？", answer: "先召回会员，再跟进未确认预约，17:00复查。", icon: LightningBoltIcon },
  ];
  return (
    <>
      <AppBrandHeader subtitle="经营答案 · 08:30更新" onNotifications={() => flow.push(notificationsScreen)} />
      <div className="page-title-block"><span>不用自己分析报表</span><h1>AI直接回答经营问题</h1><p>金额、渠道和公式放在“为什么”里，需要时再看。</p></div>
      <section className="answer-list">
        {answers.map((item) => {
          const Icon = item.icon;
          return (
            <button type="button" key={item.question} onClick={() => flow.push(dataAnswerScreen)}>
              <Icon /><span><small>{item.question}</small><b>{item.answer}</b></span><ChevronRightIcon />
            </button>
          );
        })}
      </section>
      <section className="benchmark-card">
        <span>匿名对标</span>
        <h2>做到区域平均，可多到店约6桌</h2>
        <p>{state.benchmarks[0].regionAverage}；{state.benchmarks[0].anonymousStore}。</p>
        <button type="button" onClick={() => flow.push(dataAnswerScreen)}>查看计算依据 <ChevronRightIcon /></button>
      </section>
      <DecisionSafety title="数据口径" />
    </>
  );
}

function TasksScreen({ flow }: { flow: FlowControls }) {
  const { state } = useOperatingOS();
  const visibleActions = state.actions.filter((item) => item.id !== "regional-support" || item.released);
  return (
    <>
      <AppBrandHeader subtitle="今日经营行动 · 非传统待办" onNotifications={() => flow.push(notificationsScreen)} />
      <div className="page-title-block"><span>当前只做一件</span><h1>晚市顾客追回行动</h1><p>每一步都要有负责人、证据和结果反馈。</p></div>
      <section className="playbook-progress">
        {visibleActions.map((item, index) => (
          <button type="button" key={item.id} onClick={() => flow.push(actionScreen(item.id))} className={item.status === "closed" ? "done" : ""}>
            <time>{item.time}</time>
            <i>{item.status === "closed" ? <CheckCircledIcon /> : index + 1}</i>
            <span><b>{item.title}</b><small>{item.owner} · {item.expectedImpact}</small></span>
            <StatusPill status={item.status} />
            <ChevronRightIcon />
          </button>
        ))}
      </section>
      <button type="button" className="plain-wide-button" onClick={() => flow.push(playbookScreen)}>查看负责人、证据与审批记录 <ChevronRightIcon /></button>
    </>
  );
}

function AcademyScreen({ flow }: { flow: FlowControls }) {
  const { adapters, run, showToast } = useOperatingOS();
  const [topic, setTopic] = useState<KnowledgeTopic>("traffic");
  const [match, setMatch] = useState<Awaited<ReturnType<typeof adapters.knowledge.matchProblem>> | null>(null);

  useEffect(() => {
    let active = true;
    adapters.knowledge.matchProblem(topic).then((result) => active && setMatch(result));
    return () => { active = false; };
  }, [adapters, topic]);

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
      <div className="page-title-block"><span>当前问题已带入</span><h1>今天顾客少，怎么办？</h1><p>AI匹配总部SOP与优秀门店做法，不让店长自己翻课程。</p></div>
      <div className="topic-chips">
        <button type="button" className={topic === "traffic" ? "active" : ""} onClick={() => choose("traffic")}>顾客少</button>
        <button type="button" className={topic === "rating" ? "active" : ""} onClick={() => choose("rating")}>评分下降</button>
        <button type="button" className={topic === "people" ? "active" : ""} onClick={() => choose("people")}>新人不会推荐</button>
      </div>
      {match ? (
        <section className="knowledge-answer-card">
          <div><MagicWandIcon /><span><small>AI判断</small><b>{match.judgment}</b></span></div>
          <h2>{match.caseTitle}</h2>
          <p>{match.caseResult}</p>
          <ol>{match.actions.map((item) => <li key={item}>{item}</li>)}</ol>
          <small>来源：{match.source}</small>
          <PrimaryButton onClick={() => { showToast("已加入今日经营行动"); flow.push(playbookScreen); }}>加入今日行动</PrimaryButton>
        </section>
      ) : null}
      <button type="button" className="voice-question-button" onClick={() => choose(topic)}><SpeakerLoudIcon />按住说出经营问题</button>
    </>
  );
}

function MineScreen({ openRole, openReset }: { openRole: () => void; openReset: () => void }) {
  const { state, dispatch } = useOperatingOS();
  const moments: Array<{ id: OperatingMomentId; label: string }> = [
    { id: "preOpen", label: "08:30" },
    { id: "lunch", label: "12:00" },
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
      <SectionHeading title="我正在变强的地方" meta="有任务证据才变化" />
      <section className="capability-list">
        {state.capabilities.map((item) => (
          <div key={item.id}>
            <span><b>{item.label}</b><small>{item.evidence}</small></span>
            <strong>{item.value}</strong>
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
              <SpeakerLoudIcon />
              <span>08:45 · 晨会启动</span>
              <h1>只讲清今天的顾客缺口和每个人的动作</h1>
              <p>AI会实时转写、找漏项并预填负责人；你确认后才正式下发。</p>
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
  const { state } = useOperatingOS();
  return (
    <MobileScroll className="final-scroll">
      <main className="final-detail-page">
        <section className="playbook-hero">
          <span>8月11日晚市顾客追回</span>
          <h1>每一步都从经营问题出发</h1>
          <p>晨会确认后才正式进入执行；证据先由AI检查，再由区域经理验收。</p>
        </section>
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
    await run(isRecall ? "正在生成门店召回内容" : "正在准备行动回传", async () => {
      await adapters.workflow.issueActions([item]);
      dispatch({
        type: "setActionStatus",
        actionId,
        status: "pendingEvidence",
        approval: approval("action", actionId, "confirmed", isRecall ? "确认向180位会员发送召回内容" : "确认执行现场行动", `v${item.templateVersion}.0`),
      });
    });
    showToast(isRecall ? "已模拟发送，等待回收预约结果" : "行动已执行，请回传证据");
  };

  const submit = async () => {
    const proof = evidence(
      actionId,
      isRecall ? "systemReceipt" : "photo",
      isRecall ? "已触达180位会员，新增预约19桌、49位顾客" : "晚市现场10桌体验检查已完成",
      isRecall ? undefined : "/assets/task-evidence.jpg",
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
            impact={isRecall ? "预计收官 ¥92,000 → ¥98,000；当前收入未虚增" : item.expectedImpact}
            next={item.recheckAt}
          >
            <ApprovalAudit title="人工验收已记录" approver="林阳区域经理" note="证据完整，确认闭环" />
          </ResultCard>
        ) : null}

        {item.status === "pendingConfirmation" || item.status === "aiSuggested" ? <PrimaryButton onClick={confirmExecution}>人工确认执行</PrimaryButton> : null}
        {item.status === "inProgress" ? <PrimaryButton onClick={execute}>{isRecall ? "确认发送给180位会员" : "确认完成并准备回传"}</PrimaryButton> : null}
        {item.status === "pendingEvidence" ? <PrimaryButton onClick={submit}>{latestEvidence ? "补充一份证据" : isRecall ? "回传系统结果" : "拍照并回传"}</PrimaryButton> : null}
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
      await adapters.business.buildClosingReview();
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
          <div><p><small>目标</small><b>¥100,000</b></p><p><small>实际</small><b>¥100,600</b></p></div>
          <strong>达成 100.6%</strong>
        </section>
        {!ready ? <><p className="detail-lead">AI会对比早上预测、执行动作与真实收官，不把预计影响当成实际收入。</p><PrimaryButton onClick={generate}>生成今日经营复盘</PrimaryButton></> : null}
        {ready ? (
          <>
            <section className="review-conclusions">
              <SectionHeading title="AI复盘三句话" meta="待你确认" />
              {state.dailyReview.conclusions.map((item, index) => <p key={item}><b>{index + 1}</b>{item}</p>)}
            </section>
            <ResultCard title="会员召回真正有效" body="新增预约19桌；区域支持帮助更快补回顾客。" impact="实际收官 ¥100,600" next="明日08:40复盘到店率" />
            <section className="tomorrow-action"><small>明天第一件事</small><b>{state.dailyReview.tomorrowFirstAction}</b></section>
            {!state.dailyReview.generated ? <PrimaryButton onClick={confirm}>人工确认并生成日报</PrimaryButton> : <ApprovalAudit title="今日复盘已确认" approver="黄店长" note="日报和明日行动已生成" />}
          </>
        ) : null}
      </main>
    </MobileScroll>
  );
}
