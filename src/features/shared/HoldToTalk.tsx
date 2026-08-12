import { useEffect, useRef, useState } from "react";
import { CheckCircledIcon, Cross2Icon, SpeakerLoudIcon } from "@radix-ui/react-icons";
import type { VoiceResolution, VoiceSession } from "../../domain/types";
import { useOperatingOS } from "./OperatingOSProvider";

type VoiceContext = "today" | "data" | "tasks" | "academy" | "operations" | "mine";

const fallbackPhrases: Record<VoiceContext, string[]> = {
  today: ["帮我开晨会", "今天最重要做什么"],
  data: ["今天为什么少顾客", "生成今日战报"],
  tasks: ["把会员召回交给王小丽", "查看待回传任务"],
  academy: ["最近评分下降怎么办", "新人不会推荐怎么办"],
  operations: ["帮我生成采购申请", "鲜椒鸡库存还够几份"],
  mine: ["生成今日战报", "查看我的晋升条件"],
};

export function HoldToTalk({
  context,
  compact = false,
  onResolved,
}: {
  context: VoiceContext;
  compact?: boolean;
  onResolved: (resolution: VoiceResolution) => void;
}) {
  const { state, dispatch, adapters, run, showToast } = useOperatingOS();
  const [holding, setHolding] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [suggestions, setSuggestions] = useState(false);
  const startedAt = useRef(0);
  const startY = useRef(0);
  const holdingRef = useRef(false);
  const cancelRef = useRef(false);
  const timer = useRef<number | null>(null);
  const holdTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
  }, []);

  const setSession = (session: VoiceSession) => dispatch({ type: "setVoiceSession", session });

  const begin = (clientY: number) => {
    startY.current = clientY;
    cancelRef.current = false;
    setCancelArmed(false);
    holdTimer.current = window.setTimeout(() => {
      startedAt.current = Date.now();
      holdingRef.current = true;
      setHolding(true);
      setElapsed(0);
      timer.current = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 100);
      setSession({ id: `voice-${Date.now()}`, status: "holding", startedAt: Date.now(), durationMs: 0, transcript: fallbackPhrases[context][0], intent: null, confidence: 0, cancelled: false });
    }, 350);
  };

  const resolve = async (transcript: string, durationMs: number) => {
    const pending: VoiceSession = { ...state.voiceSession, status: "processing", transcript, durationMs, cancelled: false };
    setSession(pending);
    const result = await run("正在理解你的经营意图", () => adapters.voice.resolveIntent(pending, context));
    if (!result) return;
    setSession({ ...pending, status: "ready", intent: result.intent, confidence: result.confidence });
    onResolved(result);
  };

  const finish = async () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (!holdingRef.current) {
      setSuggestions((value) => !value);
      return;
    }
    if (timer.current) window.clearInterval(timer.current);
    const durationMs = Date.now() - startedAt.current;
    holdingRef.current = false;
    setHolding(false);
    if (cancelRef.current) {
      cancelRef.current = false;
      setCancelArmed(false);
      setSession({ ...state.voiceSession, status: "cancelled", durationMs, cancelled: true });
      showToast("已取消本次语音，不会产生任何操作");
      return;
    }
    await resolve(fallbackPhrases[context][0], durationMs);
  };

  const move = (clientY: number) => {
    if (holdingRef.current) {
      cancelRef.current = startY.current - clientY > 48;
      setCancelArmed(cancelRef.current);
    }
  };

  const choose = async (phrase: string) => {
    setSuggestions(false);
    await resolve(phrase, 900);
  };

  return (
    <div
      className={`hold-talk hold-talk-${context} ${compact ? "compact" : ""} ${holding ? "is-holding" : ""} ${cancelArmed ? "cancel-armed" : ""}`}
      data-testid={`hold-to-talk-${context}`}
    >
      {holding ? <div className="voice-cancel-hint"><Cross2Icon />{cancelArmed ? "松开取消" : "上滑取消"}</div> : null}
      <button
        type="button"
        data-testid={`hold-to-talk-button-${context}`}
        aria-label={holding ? "松开结束说话" : "按住说话；点击查看常用话术"}
        onPointerDown={(event) => {
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* synthetic keyboard/test pointers do not need capture */ }
          begin(event.clientY);
        }}
        onPointerMove={(event) => move(event.clientY)}
        onPointerUp={finish}
        onPointerCancel={finish}
        onKeyDown={(event) => { if ((event.key === " " || event.key === "Enter") && !event.repeat) begin(0); }}
        onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") finish(); }}
      >
        <span className="voice-mic-disc"><SpeakerLoudIcon /></span>
        <span>{holding ? (cancelArmed ? "松开取消" : "松开发送") : "按住说话"}<small>{holding ? `${(elapsed / 1000).toFixed(1)}秒 · 正在转写` : "按住350毫秒 · 上滑取消"}</small></span>
        {holding ? <i className="voice-wave" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <b key={index} />)}</i> : null}
      </button>
      {suggestions ? <div className="voice-suggestions">{fallbackPhrases[context].map((phrase) => <button type="button" key={phrase} onClick={() => choose(phrase)}><CheckCircledIcon />{phrase}</button>)}</div> : null}
    </div>
  );
}
