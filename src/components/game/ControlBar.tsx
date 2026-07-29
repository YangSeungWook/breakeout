"use client";

import type { GameStatus } from "@/game/types";

interface ControlBarProps {
  playerName: string;
  difficultyLabel: string;
  stage: number;
  status: GameStatus;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRestart: () => void;
  onTogglePause: () => void;
  onExit: () => void;
}

const buttonClass =
  "flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 text-[11px] font-bold tracking-wider text-slate-200 transition-colors hover:border-sky-400/70 hover:bg-slate-700/70 hover:text-white active:scale-95 sm:text-xs";

export default function ControlBar({
  playerName,
  difficultyLabel,
  stage,
  status,
  soundEnabled,
  onToggleSound,
  onRestart,
  onTogglePause,
  onExit,
}: ControlBarProps) {
  return (
    <header className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/70 px-2.5 py-2 backdrop-blur sm:px-4">
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-xs font-bold text-slate-100 sm:text-sm">
          {playerName}
        </span>
        <span className="text-[10px] font-medium tracking-widest text-sky-400/80 sm:text-[11px]">
          {difficultyLabel} · STAGE {stage}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onToggleSound}
          className={buttonClass}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? "소리 끄기" : "소리 켜기"}
          title="Sound"
        >
          {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          <span className="hidden sm:inline">{soundEnabled ? "ON" : "OFF"}</span>
        </button>

        <button
          type="button"
          onClick={onRestart}
          className={buttonClass}
          aria-label="재시작"
          title="Restart"
        >
          <RestartIcon />
          <span className="hidden sm:inline">RESTART</span>
        </button>

        <button
          type="button"
          onClick={onTogglePause}
          className={buttonClass}
          aria-label={status === "paused" ? "계속하기" : "일시정지"}
          title="Pause (P)"
        >
          {status === "paused" ? <PlayIcon /> : <PauseIcon />}
          <span className="hidden sm:inline">
            {status === "paused" ? "RESUME" : "PAUSE(P)"}
          </span>
        </button>

        <button
          type="button"
          onClick={onExit}
          className={buttonClass}
          aria-label="메인으로"
          title="Main menu"
        >
          <HomeIcon />
        </button>
      </div>
    </header>
  );
}

const iconProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SoundOnIcon() {
  return (
    <svg {...iconProps}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="m17 9 5 6M22 9l-5 6" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg {...iconProps}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
