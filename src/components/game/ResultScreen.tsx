"use client";

import { useEffect, useRef } from "react";

import { DIFFICULTY_PRESETS } from "@/game/constants";
import type { Difficulty, GameResult } from "@/game/types";

interface ResultScreenProps {
  playerName: string;
  difficulty: Difficulty;
  score: number;
  stage: number;
  best: GameResult | null;
  isNewBest: boolean;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export default function ResultScreen({
  playerName,
  difficulty,
  score,
  stage,
  best,
  isNewBest,
  onPlayAgain,
  onMainMenu,
}: ResultScreenProps) {
  const playAgainRef = useRef<HTMLButtonElement | null>(null);

  // 모달이 뜨면 바로 Enter/Space로 재도전할 수 있게 포커스를 옮긴다
  useEffect(() => {
    playAgainRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="게임 결과"
      className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900/95 p-6 text-center shadow-[0_0_60px_rgba(56,189,248,0.15)]">
        <p className="font-mono text-2xl font-black tracking-[0.2em] text-rose-400 sm:text-3xl">
          GAME OVER
        </p>

        {isNewBest && (
          <p className="mt-3 animate-pulse rounded-lg border border-amber-400/40 bg-amber-400/10 py-2 font-mono text-xs font-bold tracking-widest text-amber-300">
            🎉 NEW HIGH SCORE!
          </p>
        )}

        <div className="mt-5">
          <p className="text-[10px] font-bold tracking-widest text-slate-400">
            FINAL SCORE
          </p>
          <p className="font-mono text-5xl font-black tabular-nums text-amber-300 [text-shadow:0_0_24px_rgba(251,191,36,0.35)]">
            {score.toLocaleString()}
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="PLAYER" value={playerName} />
          <Stat label="DIFFICULTY" value={DIFFICULTY_PRESETS[difficulty].label} />
          <Stat label="STAGE" value={String(stage)} />
        </dl>

        {best && !isNewBest && (
          <p className="mt-4 text-[11px] text-slate-400">
            최고 기록{" "}
            <span className="font-mono font-bold text-slate-200">
              {best.score.toLocaleString()}
            </span>{" "}
            ({best.name}) 까지{" "}
            <span className="font-mono font-bold text-sky-300">
              {(best.score - score).toLocaleString()}
            </span>{" "}
            점
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={playAgainRef}
            type="button"
            onClick={onPlayAgain}
            className="w-full rounded-xl bg-sky-500 py-3 font-mono text-sm font-black tracking-[0.2em] text-slate-950 transition-colors hover:bg-sky-400 active:scale-[0.98]"
          >
            PLAY AGAIN
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full rounded-xl border border-slate-600 bg-slate-800/80 py-3 font-mono text-sm font-bold tracking-[0.2em] text-slate-200 transition-colors hover:border-sky-400 hover:text-white active:scale-[0.98]"
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-800/50 px-1 py-2">
      <dt className="text-[9px] font-bold tracking-widest text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-sm font-bold text-slate-100">
        {value}
      </dd>
    </div>
  );
}
