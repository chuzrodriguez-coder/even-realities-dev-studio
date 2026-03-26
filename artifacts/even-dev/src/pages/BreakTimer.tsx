import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Timer, Settings, Bell, Eye, Volume2, Image, Layers, Zap,
  Play, Pause, RotateCcw, Coffee, Briefcase, ChevronDown, ChevronUp,
  Check, X, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetBreakTimerSettings, useUpdateBreakTimerSettings } from "@workspace/api-client-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "work" | "break" | "shiftEnd";
type PatternKey = "pulse" | "flash" | "sweep" | "wave" | "radiate";
type NotificationMode = "visual" | "audio" | "text" | "image" | "transparency" | "colorSequence";

interface TimerState {
  phase: Phase;
  secondsLeft: number;
  cycle: number;
  shiftActive: boolean;
}

// ── Audio: Web Audio API chime ────────────────────────────────────────────────

function playChime(type: "work" | "break" | "end") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = type === "break"
      ? [523.25, 659.25, 783.99]
      : type === "end"
      ? [783.99, 659.25, 523.25, 392.00]
      : [392.00, 523.25];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.25);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.25 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.6);
    });
  } catch (_) {}
}

// ── HUD Display Simulation ────────────────────────────────────────────────────

const PATTERNS: Record<PatternKey, { class: string; label: string }> = {
  pulse: { class: "animate-pulse", label: "Pulse" },
  flash: { class: "animate-ping", label: "Flash" },
  sweep: { class: "animate-pulse", label: "Sweep" },
  wave: { class: "animate-bounce", label: "Wave" },
  radiate: { class: "animate-spin", label: "Radiate" },
};

function GlassesHUD({
  phase,
  message,
  cycle,
  modes,
  transparencyLevel,
  colorPattern,
  isAnimating,
  model,
}: {
  phase: Phase;
  message: string;
  cycle: number;
  modes: NotificationMode[];
  transparencyLevel: number;
  colorPattern: PatternKey;
  isAnimating: boolean;
  model: string;
}) {
  const { width, height } = model === "G2"
    ? { width: 640, height: 350 }
    : { width: 576, height: 136 };

  const showTransparency = modes.includes("transparency");
  const showColorSeq = modes.includes("colorSequence");
  const showImage = modes.includes("image");

  const hudOpacity = showTransparency ? transparencyLevel : 1;
  const patternCls = PATTERNS[colorPattern]?.class ?? "animate-pulse";

  const phaseColor = phase === "work" ? "#00ff41" : phase === "break" ? "#00e5ff" : "#ffaa00";
  const bgStyle = showTransparency
    ? { background: `rgba(0,0,0,${transparencyLevel * 0.85})` }
    : { background: "#000" };

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-2 text-xs font-mono text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: phaseColor }}></span>
          lens_preview.render
        </span>
        <span>{width} × {height} px</span>
      </div>

      <div
        className="relative w-full rounded-lg border overflow-hidden font-mono"
        style={{
          aspectRatio: `${width}/${height}`,
          borderColor: phaseColor + "40",
          ...bgStyle,
          boxShadow: isAnimating ? `0 0 30px ${phaseColor}50, inset 0 0 20px ${phaseColor}10` : "none",
          transition: "box-shadow 0.4s ease",
        }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)",
            zIndex: 10,
          }}
        />

        {/* Transparency grid (shows "real world" passthrough) */}
        {showTransparency && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, #1a1a2e 25%, transparent 25%, transparent 75%, #1a1a2e 75%), repeating-linear-gradient(45deg, #1a1a2e 25%, #12122a 25%, #12122a 75%, #1a1a2e 75%)`,
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 10px 10px",
              opacity: 1 - transparencyLevel,
            }}
          />
        )}

        {/* Color sequence animation layer */}
        {showColorSeq && isAnimating && (
          <div
            className={cn("absolute inset-0 z-1 pointer-events-none", patternCls)}
            style={{
              background: `radial-gradient(circle at center, ${phaseColor}30 0%, transparent 70%)`,
              opacity: 0.7,
            }}
          />
        )}

        {/* Image layer — break icon */}
        {showImage && phase === "break" && isAnimating && (
          <div className="absolute top-2 right-4 z-5 text-2xl opacity-70">
            <Coffee style={{ color: phaseColor, width: 24, height: 24 }} />
          </div>
        )}
        {showImage && phase === "work" && isAnimating && (
          <div className="absolute top-2 right-4 z-5 text-2xl opacity-70">
            <Briefcase style={{ color: phaseColor, width: 24, height: 24 }} />
          </div>
        )}

        {/* HUD Text */}
        <div
          className="absolute inset-0 flex flex-col items-start justify-center px-4 gap-1 z-20"
          style={{ opacity: hudOpacity }}
        >
          {(modes.includes("visual") || modes.includes("text")) && isAnimating ? (
            <>
              <div
                className="text-xs tracking-widest uppercase font-bold"
                style={{ color: phaseColor, fontSize: "clamp(8px,1.5vw,13px)", letterSpacing: "0.2em" }}
              >
                {phase === "work" ? "▶ FOCUS MODE" : phase === "break" ? "☕ BREAK TIME" : "✓ SHIFT COMPLETE"}
              </div>
              <div
                className="leading-snug"
                style={{ color: phaseColor, fontSize: "clamp(9px,2vw,16px)", maxWidth: "80%", opacity: 0.9 }}
              >
                {message}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: phaseColor + "80", fontSize: "clamp(7px,1vw,10px)" }}
              >
                Cycle #{cycle} • Even Dev Studio
              </div>
            </>
          ) : (
            <div
              className="text-center w-full"
              style={{ color: "#00ff4140", fontSize: "clamp(8px,1.5vw,12px)", letterSpacing: "0.15em" }}
            >
              {phase === "idle" ? "NO SIGNAL — START TIMER" : "STANDBY"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Countdown Ring ────────────────────────────────────────────────────────────

function CountdownRing({
  secondsLeft,
  totalSeconds,
  phase,
}: {
  secondsLeft: number;
  totalSeconds: number;
  phase: Phase;
}) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashOffset = circ * (1 - progress);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const color = phase === "work" ? "#00ff41" : phase === "break" ? "#00e5ff" : "#ffaa00";

  return (
    <div className="relative flex items-center justify-center">
      <svg width={128} height={128} className="-rotate-90">
        <circle cx={64} cy={64} r={r} fill="none" stroke="#ffffff0d" strokeWidth={8} />
        <circle
          cx={64} cy={64} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease", filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono font-bold text-white" style={{ fontSize: 28 }}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
        <span className="text-xs font-mono mt-0.5" style={{ color }}>
          {phase === "idle" ? "READY" : phase === "work" ? "FOCUS" : phase === "break" ? "BREAK" : "DONE"}
        </span>
      </div>
    </div>
  );
}

// ── Mode Toggle Button ────────────────────────────────────────────────────────

const MODE_META: Record<NotificationMode, { icon: React.ReactNode; label: string; desc: string }> = {
  visual:        { icon: <Eye className="w-4 h-4" />,        label: "Visual",       desc: "HUD overlay on lenses" },
  audio:         { icon: <Volume2 className="w-4 h-4" />,    label: "Audio",        desc: "Chime through phone speaker" },
  text:          { icon: <Bell className="w-4 h-4" />,       label: "Text",         desc: "Message on glasses display" },
  image:         { icon: <Image className="w-4 h-4" />,      label: "Image",        desc: "BMP icon on HUD" },
  transparency:  { icon: <Layers className="w-4 h-4" />,     label: "Opacity",      desc: "Adjust lens transparency" },
  colorSequence: { icon: <Zap className="w-4 h-4" />,        label: "Animation",    desc: "Dynamic colour pattern" },
};

function ModeToggle({
  mode,
  active,
  onChange,
}: {
  mode: NotificationMode;
  active: boolean;
  onChange: (m: NotificationMode) => void;
}) {
  const meta = MODE_META[mode];
  return (
    <button
      onClick={() => onChange(mode)}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center w-full",
        active
          ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_10px_hsla(var(--primary)/0.2)]"
          : "border-white/5 bg-black/30 text-muted-foreground hover:border-white/15 hover:text-white"
      )}
      title={meta.desc}
    >
      {meta.icon}
      <span className="text-[10px] font-semibold leading-tight">{meta.label}</span>
    </button>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({
  settings,
  localModes,
  localWork,
  localBreak,
  localWorkMsg,
  localBreakMsg,
  localEndMsg,
  localPattern,
  localTransparency,
  localAudio,
  onSave,
  onModeChange,
  onChange,
  isSaving,
}: {
  settings: any;
  localModes: NotificationMode[];
  localWork: number;
  localBreak: number;
  localWorkMsg: string;
  localBreakMsg: string;
  localEndMsg: string;
  localPattern: PatternKey;
  localTransparency: number;
  localAudio: boolean;
  onSave: () => void;
  onModeChange: (m: NotificationMode) => void;
  onChange: (field: string, value: any) => void;
  isSaving: boolean;
}) {
  const patterns: PatternKey[] = ["pulse", "flash", "sweep", "wave", "radiate"];

  return (
    <div className="space-y-6">
      {/* Timing */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Timing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Work period (minutes)</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min={5} max={120} step={5}
                value={localWork}
                onChange={e => onChange("workDurationMinutes", Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-mono text-white w-8 text-right">{localWork}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Break duration (minutes)</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min={1} max={30} step={1}
                value={localBreak}
                onChange={e => onChange("breakDurationMinutes", Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-mono text-white w-8 text-right">{localBreak}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">HUD Messages</h3>
        <div className="space-y-3">
          {([
            ["workMessage", "Work period starts", localWorkMsg],
            ["breakMessage", "Break starts", localBreakMsg],
            ["endShiftMessage", "Shift ends", localEndMsg],
          ] as [string, string, string][]).map(([field, label, value]) => (
            <div key={field} className="space-y-1">
              <label className="text-xs text-muted-foreground">{label}</label>
              <input
                type="text"
                value={value}
                onChange={e => onChange(field, e.target.value)}
                className="w-full h-9 rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notification Modes */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Notification Modes</h3>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(MODE_META) as NotificationMode[]).map(m => (
            <ModeToggle key={m} mode={m} active={localModes.includes(m)} onChange={onModeChange} />
          ))}
        </div>
      </div>

      {/* Audio */}
      <div className="flex items-center justify-between py-2 border-t border-white/5">
        <div>
          <p className="text-sm text-white">Audio chime</p>
          <p className="text-xs text-muted-foreground">Play tone on phase change</p>
        </div>
        <button
          onClick={() => onChange("audioEnabled", !localAudio)}
          className={cn(
            "w-10 h-5 rounded-full transition-colors relative",
            localAudio ? "bg-primary" : "bg-white/10"
          )}
        >
          <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform", localAudio ? "translate-x-5" : "translate-x-0.5")} />
        </button>
      </div>

      {/* Transparency */}
      {localModes.includes("transparency") && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Lens transparency level</label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={1} step={0.05}
              value={localTransparency}
              onChange={e => onChange("transparencyLevel", Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-sm font-mono text-white w-10 text-right">{Math.round(localTransparency * 100)}%</span>
          </div>
        </div>
      )}

      {/* Color pattern */}
      {localModes.includes("colorSequence") && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Animation pattern</label>
          <div className="flex gap-2 flex-wrap">
            {patterns.map(p => (
              <button
                key={p}
                onClick={() => onChange("colorSequencePattern", p)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-mono border transition-all",
                  localPattern === p
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-white/10 bg-black/20 text-muted-foreground hover:border-white/20"
                )}
              >
                {PATTERNS[p].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onSave}
        disabled={isSaving}
        className="w-full py-2.5 rounded-xl bg-primary text-black font-semibold text-sm transition-all hover:brightness-110 disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BreakTimer() {
  const { data: settings, isLoading } = useGetBreakTimerSettings();
  const updateMut = useUpdateBreakTimerSettings();

  // Local editable state (mirrors server)
  const [localWork, setLocalWork] = useState(45);
  const [localBreak, setLocalBreak] = useState(5);
  const [localModes, setLocalModes] = useState<NotificationMode[]>(["visual", "text"]);
  const [localWorkMsg, setLocalWorkMsg] = useState("Focus time! Stay in the zone.");
  const [localBreakMsg, setLocalBreakMsg] = useState("Time for a break! Rest your eyes.");
  const [localEndMsg, setLocalEndMsg] = useState("Great work today! Shift complete.");
  const [localPattern, setLocalPattern] = useState<PatternKey>("pulse");
  const [localTransparency, setLocalTransparency] = useState(0.3);
  const [localAudio, setLocalAudio] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sync from server on load
  useEffect(() => {
    if (!settings) return;
    setLocalWork(settings.workDurationMinutes);
    setLocalBreak(settings.breakDurationMinutes);
    setLocalModes((settings.notificationModes ?? []) as NotificationMode[]);
    setLocalWorkMsg(settings.workMessage);
    setLocalBreakMsg(settings.breakMessage);
    setLocalEndMsg(settings.endShiftMessage);
    setLocalPattern((settings.colorSequencePattern as PatternKey) ?? "pulse");
    setLocalTransparency(settings.transparencyLevel ?? 0.3);
    setLocalAudio(settings.audioEnabled ?? true);
  }, [settings]);

  // Timer state
  const [timerState, setTimerState] = useState<TimerState>({
    phase: "idle",
    secondsLeft: 0,
    cycle: 0,
    shiftActive: false,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [hudAnimating, setHudAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getCurrentPhaseSeconds = useCallback(
    (phase: Phase) => {
      if (phase === "work") return localWork * 60;
      if (phase === "break") return localBreak * 60;
      return 0;
    },
    [localWork, localBreak]
  );

  const triggerNotification = useCallback(
    (phase: Phase) => {
      setHudAnimating(true);
      setTimeout(() => setHudAnimating(false), 3500);
      if (localAudio && localModes.includes("audio")) {
        playChime(phase === "work" ? "work" : phase === "break" ? "break" : "end");
      }
    },
    [localAudio, localModes]
  );

  const start = useCallback(() => {
    setTimerState({
      phase: "work",
      secondsLeft: localWork * 60,
      cycle: 1,
      shiftActive: true,
    });
    setIsRunning(true);
    triggerNotification("work");
  }, [localWork, triggerNotification]);

  const pause = useCallback(() => setIsRunning(r => !r), []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimerState({ phase: "idle", secondsLeft: 0, cycle: 0, shiftActive: false });
    setHudAnimating(false);
  }, []);

  // Tick
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (prev.secondsLeft > 1) {
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        }

        // Phase transition
        if (prev.phase === "work") {
          triggerNotification("break");
          return {
            ...prev,
            phase: "break",
            secondsLeft: localBreak * 60,
          };
        } else if (prev.phase === "break") {
          const nextCycle = prev.cycle + 1;
          triggerNotification("work");
          return {
            ...prev,
            phase: "work",
            secondsLeft: localWork * 60,
            cycle: nextCycle,
          };
        }
        return prev;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, localWork, localBreak, triggerNotification]);

  const handleFieldChange = (field: string, value: any) => {
    if (field === "workDurationMinutes") setLocalWork(value);
    else if (field === "breakDurationMinutes") setLocalBreak(value);
    else if (field === "workMessage") setLocalWorkMsg(value);
    else if (field === "breakMessage") setLocalBreakMsg(value);
    else if (field === "endShiftMessage") setLocalEndMsg(value);
    else if (field === "colorSequencePattern") setLocalPattern(value as PatternKey);
    else if (field === "transparencyLevel") setLocalTransparency(value);
    else if (field === "audioEnabled") setLocalAudio(value);
  };

  const handleModeChange = (mode: NotificationMode) => {
    setLocalModes(prev =>
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  const handleSave = async () => {
    await updateMut.mutateAsync({
      workDurationMinutes: localWork,
      breakDurationMinutes: localBreak,
      notificationModes: localModes,
      workMessage: localWorkMsg,
      breakMessage: localBreakMsg,
      endShiftMessage: localEndMsg,
      colorSequencePattern: localPattern,
      transparencyLevel: localTransparency,
      audioEnabled: localAudio,
    });
  };

  const currentMessage =
    timerState.phase === "work" ? localWorkMsg
    : timerState.phase === "break" ? localBreakMsg
    : timerState.phase === "shiftEnd" ? localEndMsg
    : "";

  const totalSeconds = getCurrentPhaseSeconds(timerState.phase);
  const model = "G2";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-primary font-mono animate-pulse">
        Loading timer settings…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Timer className="w-8 h-8 text-primary" />
          Work Break Timer
        </h1>
        <p className="text-muted-foreground mt-1">
          Stay focused in {localWork}-minute blocks with {localBreak}-minute breaks. Notifications via your glasses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Timer Controls ── */}
        <div className="space-y-4">

          {/* Cycle Progress Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: Math.max(timerState.cycle, 1) }).map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className={cn(
                    "w-6 h-2 rounded-full transition-all",
                    i < timerState.cycle
                      ? "bg-primary shadow-[0_0_6px_hsla(var(--primary)/0.7)]"
                      : "bg-white/10"
                  )}
                />
              </div>
            ))}
            {timerState.cycle > 0 && (
              <span className="text-xs font-mono text-muted-foreground ml-1">
                Cycle {timerState.cycle}
              </span>
            )}
          </div>

          {/* Timer Card */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 flex flex-col items-center gap-6 backdrop-blur-sm">
            <CountdownRing
              secondsLeft={timerState.secondsLeft}
              totalSeconds={totalSeconds || localWork * 60}
              phase={timerState.phase}
            />

            {/* Phase label */}
            <div className="text-center space-y-1">
              {timerState.phase !== "idle" && (
                <>
                  <div className={cn(
                    "text-xs font-mono tracking-widest uppercase px-3 py-1 rounded-full inline-block",
                    timerState.phase === "work" ? "bg-primary/15 text-primary" : "bg-cyan-500/15 text-cyan-400"
                  )}>
                    {timerState.phase === "work" ? "● FOCUS" : "☕ BREAK"}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{currentMessage}</p>
                </>
              )}
              {timerState.phase === "idle" && (
                <p className="text-sm text-muted-foreground">Press Start to begin your session</p>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              {timerState.phase === "idle" ? (
                <button
                  onClick={start}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-black font-semibold text-sm transition-all hover:brightness-110 shadow-[0_0_15px_hsla(var(--primary)/0.4)]"
                >
                  <Play className="w-4 h-4" /> Start Session
                </button>
              ) : (
                <>
                  <button
                    onClick={pause}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white font-semibold text-sm hover:bg-white/10 transition-all"
                  >
                    {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isRunning ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-muted-foreground font-semibold text-sm hover:bg-white/10 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Active modes bar */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODE_META) as NotificationMode[]).map(m => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                  localModes.includes(m)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-white/10 bg-transparent text-muted-foreground hover:border-white/20"
                )}
              >
                {MODE_META[m].icon}
                {MODE_META[m].label}
                {localModes.includes(m) ? <Check className="w-3 h-3 ml-0.5" /> : <X className="w-3 h-3 ml-0.5 opacity-40" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: HUD Preview + Settings ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> HUD Preview — {model}
              </span>
              {hudAnimating && (
                <span className="text-xs font-mono text-primary animate-pulse">● SENDING</span>
              )}
            </div>
            <GlassesHUD
              phase={timerState.phase}
              message={currentMessage}
              cycle={timerState.cycle}
              modes={localModes}
              transparencyLevel={localTransparency}
              colorPattern={localPattern}
              isAnimating={hudAnimating}
              model={model}
            />
          </div>

          {/* Settings toggle */}
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
            <button
              onClick={() => setSettingsOpen(o => !o)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                <Settings className="w-4 h-4 text-muted-foreground" />
                Timer Settings
              </span>
              {settingsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {settingsOpen && (
              <div className="px-4 pb-5 border-t border-white/5">
                <div className="pt-4">
                  <SettingsPanel
                    settings={settings}
                    localModes={localModes}
                    localWork={localWork}
                    localBreak={localBreak}
                    localWorkMsg={localWorkMsg}
                    localBreakMsg={localBreakMsg}
                    localEndMsg={localEndMsg}
                    localPattern={localPattern}
                    localTransparency={localTransparency}
                    localAudio={localAudio}
                    onSave={handleSave}
                    onModeChange={handleModeChange}
                    onChange={handleFieldChange}
                    isSaving={updateMut.isPending}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
