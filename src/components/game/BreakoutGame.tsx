"use client";

import { useCallback, useEffect, useState } from "react";

import type { Difficulty, GameResult, Player } from "@/game/types";
import {
  loadBest,
  loadScores,
  loadSettings,
  saveResult,
  saveSettings,
} from "@/lib/storage";

import GameScreen from "./GameScreen";
import ResultScreen from "./ResultScreen";
import StartScreen from "./StartScreen";

interface FinishedRun {
  score: number;
  stage: number;
  isNewBest: boolean;
}

export default function BreakoutGame() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [player, setPlayer] = useState<Player>({ name: "", difficulty: "normal" });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [best, setBest] = useState<GameResult | null>(null);
  const [scores, setScores] = useState<GameResult[]>([]);
  const [result, setResult] = useState<FinishedRun | null>(null);
  /** 값이 바뀌면 GameScreen이 새로 마운트되어 엔진이 초기화된다 */
  const [runKey, setRunKey] = useState(0);

  // localStorage는 클라이언트에서만 읽어 hydration 불일치를 피한다
  useEffect(() => {
    const settings = loadSettings();
    setPlayer({ name: settings.name, difficulty: settings.difficulty });
    setSoundEnabled(settings.sound);
    setBest(loadBest());
    setScores(loadScores());
    setReady(true);
  }, []);

  const handleStart = useCallback((name: string, difficulty: Difficulty) => {
    saveSettings({ name, difficulty });
    setPlayer({ name, difficulty });
    setResult(null);
    setRunKey((key) => key + 1);
    setScreen("game");
  }, []);

  const handleGameOver = useCallback(
    ({ score, stage }: { score: number; stage: number }) => {
      const entry: GameResult = {
        name: player.name,
        difficulty: player.difficulty,
        score,
        stage,
        date: new Date().toISOString(),
      };
      const { best: updatedBest, isNewBest } = saveResult(entry);
      setBest(updatedBest);
      setScores(loadScores());
      setResult({ score, stage, isNewBest });
    },
    [player.name, player.difficulty],
  );

  const handlePlayAgain = useCallback(() => {
    setResult(null);
    setRunKey((key) => key + 1);
  }, []);

  const handleMainMenu = useCallback(() => {
    setResult(null);
    setScreen("menu");
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      saveSettings({ sound: !prev });
      return !prev;
    });
  }, []);

  if (!ready) {
    return (
      <main className="flex h-dvh w-full items-center justify-center">
        <p className="font-mono text-xs tracking-[0.3em] text-slate-600">LOADING…</p>
      </main>
    );
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      {screen === "menu" ? (
        <div className="h-full overflow-y-auto overscroll-contain">
          <StartScreen
            initialName={player.name}
            initialDifficulty={player.difficulty}
            best={best}
            scores={scores}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onStart={handleStart}
          />
        </div>
      ) : (
        <>
          <GameScreen
            key={runKey}
            player={player}
            bestScore={best?.score ?? 0}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onGameOver={handleGameOver}
            onExit={handleMainMenu}
          />

          {result && (
            <ResultScreen
              playerName={player.name}
              difficulty={player.difficulty}
              score={result.score}
              stage={result.stage}
              best={best}
              isNewBest={result.isNewBest}
              onPlayAgain={handlePlayAgain}
              onMainMenu={handleMainMenu}
            />
          )}
        </>
      )}
    </main>
  );
}
