"use client";

import { useCallback, useRef, useState } from "react";

import { DIFFICULTY_PRESETS } from "@/game/constants";
import type { Player, PublicState } from "@/game/types";

import ControlBar from "./ControlBar";
import GameCanvas, { type GameController } from "./GameCanvas";
import Hud from "./Hud";

interface GameScreenProps {
  player: Player;
  bestScore: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onGameOver: (payload: { score: number; stage: number }) => void;
  onExit: () => void;
}

const INITIAL_STATE: PublicState = {
  status: "ready",
  score: 0,
  lives: 0,
  stage: 1,
  banner: null,
  speedMultiplier: 1,
};

export default function GameScreen({
  player,
  bestScore,
  soundEnabled,
  onToggleSound,
  onGameOver,
  onExit,
}: GameScreenProps) {
  const preset = DIFFICULTY_PRESETS[player.difficulty];
  const controlRef = useRef<GameController | null>(null);
  const [state, setState] = useState<PublicState>({
    ...INITIAL_STATE,
    lives: preset.lives,
  });

  const handleState = useCallback((next: PublicState) => setState(next), []);

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-2 p-2 sm:gap-3 sm:p-4">
      <ControlBar
        playerName={player.name}
        difficultyLabel={preset.label}
        stage={state.stage}
        status={state.status}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        onRestart={() => controlRef.current?.restart()}
        onTogglePause={() => controlRef.current?.togglePause()}
        onExit={onExit}
      />

      {/* min-h-0 이 있어야 flex 자식이 남은 높이만 차지하고 캔버스가 넘치지 않는다 */}
      <div className="relative min-h-0 w-full flex-1">
        <GameCanvas
          difficulty={player.difficulty}
          soundEnabled={soundEnabled}
          onState={handleState}
          onGameOver={onGameOver}
          controlRef={controlRef}
        />

        {state.status === "paused" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 rounded-2xl bg-slate-950/80 backdrop-blur-sm">
            <p className="font-mono text-2xl font-extrabold tracking-[0.3em] text-sky-300 sm:text-4xl">
              PAUSED
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={() => controlRef.current?.resume()}
                className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-bold tracking-wider text-slate-950 transition-colors hover:bg-sky-400 active:scale-95"
              >
                RESUME
              </button>
              <button
                type="button"
                onClick={() => controlRef.current?.restart()}
                className="rounded-xl border border-slate-600 bg-slate-800/80 px-6 py-2.5 text-sm font-bold tracking-wider text-slate-200 transition-colors hover:border-sky-400 hover:text-white active:scale-95"
              >
                RESTART
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded-xl border border-slate-600 bg-slate-800/80 px-6 py-2.5 text-sm font-bold tracking-wider text-slate-200 transition-colors hover:border-sky-400 hover:text-white active:scale-95"
              >
                MAIN
              </button>
            </div>
            <p className="text-[11px] tracking-wider text-slate-400">
              P 키로도 계속할 수 있어요
            </p>
          </div>
        )}
      </div>

      <Hud
        score={state.score}
        bestScore={Math.max(bestScore, state.score)}
        lives={state.lives}
        maxLives={preset.lives}
        speedMultiplier={state.speedMultiplier}
      />
    </div>
  );
}
