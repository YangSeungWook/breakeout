"use client";

import { useState } from "react";

import { DIFFICULTY_ORDER, DIFFICULTY_PRESETS } from "@/game/constants";
import type { Difficulty, GameResult } from "@/game/types";

interface StartScreenProps {
  initialName: string;
  initialDifficulty: Difficulty;
  best: GameResult | null;
  scores: GameResult[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onStart: (name: string, difficulty: Difficulty) => void;
}

const MAX_NAME_LENGTH = 12;

export default function StartScreen({
  initialName,
  initialDifficulty,
  best,
  scores,
  soundEnabled,
  onToggleSound,
  onStart,
}: StartScreenProps) {
  const [name, setName] = useState(initialName);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);

  const trimmed = name.trim();
  const canStart = trimmed.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStart) return;
    onStart(trimmed, difficulty);
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-6 px-4 py-8 sm:gap-8">
      <header className="text-center">
        {/* background 단축 속성은 background-clip 을 되돌리므로 background-image 만 지정한다 */}
        <h1 className="bg-[linear-gradient(180deg,#f8fafc_0%,#7dd3fc_55%,#0ea5e9_100%)] bg-clip-text font-mono text-4xl font-black tracking-[0.18em] text-transparent drop-shadow-[0_0_24px_rgba(56,189,248,0.45)] sm:text-6xl">
          BREAKOUT
        </h1>
        <p className="mt-2 text-xs tracking-[0.35em] text-sky-400/80 sm:text-sm">
          벽 돌 깨 기
        </p>
      </header>

      {best && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">👑</span>
            <div className="leading-tight">
              <p className="text-[10px] font-bold tracking-widest text-amber-300/80">
                BEST SCORE
              </p>
              <p className="truncate text-sm font-bold text-slate-100">{best.name}</p>
            </div>
          </div>
          <p className="font-mono text-2xl font-black tabular-nums text-amber-300">
            {best.score.toLocaleString()}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="player-name"
            className="text-[11px] font-bold tracking-widest text-slate-400"
          >
            PLAYER NAME
          </label>
          <input
            id="player-name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
            placeholder="닉네임을 입력하세요"
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-center font-mono text-lg text-slate-100 outline-none transition-colors placeholder:font-sans placeholder:text-sm placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold tracking-widest text-slate-400">
            DIFFICULTY
          </span>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_ORDER.map((key) => {
              const preset = DIFFICULTY_PRESETS[key];
              const selected = key === difficulty;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDifficulty(key)}
                  aria-pressed={selected}
                  className={[
                    "rounded-xl border px-2 py-3 text-center transition-all active:scale-95",
                    selected
                      ? "border-sky-400 bg-sky-400/10 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
                      : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500",
                  ].join(" ")}
                >
                  <span className="block font-mono text-sm font-black tracking-wider">
                    {preset.label}
                  </span>
                  <span className="mt-1 block text-[10px] leading-tight text-slate-500">
                    ×{preset.scoreMultiplier} 점수
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-center text-[11px] text-slate-500">
            {DIFFICULTY_PRESETS[difficulty].description}
          </p>
        </div>

        <button
          type="submit"
          disabled={!canStart}
          className="w-full rounded-xl bg-sky-500 py-4 font-mono text-base font-black tracking-[0.2em] text-slate-950 transition-all hover:bg-sky-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          {canStart ? "START GAME" : "닉네임을 입력하세요"}
        </button>
      </form>

      {scores.length > 0 && (
        <section className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
          <h2 className="mb-2 text-[11px] font-bold tracking-widest text-slate-400">
            TOP SCORES
          </h2>
          <ol className="flex flex-col gap-1">
            {scores.slice(0, 5).map((entry, index) => (
              <li
                key={`${entry.date}-${index}`}
                className="flex items-center gap-2 text-xs text-slate-300"
              >
                <span className="w-4 font-mono text-slate-500">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {entry.difficulty}
                </span>
                <span className="w-16 text-right font-mono font-bold tabular-nums text-slate-100">
                  {entry.score.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex flex-col items-center gap-3 text-center text-[11px] leading-relaxed text-slate-500">
        <p>
          <span className="text-slate-400">PC</span> · ← → 또는 A / D · 마우스 이동 ·
          Space 발사 · P 일시정지
          <br />
          <span className="text-slate-400">MOBILE</span> · 화면을 터치한 채 좌우로
          드래그
        </p>
        <button
          type="button"
          onClick={onToggleSound}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 transition-colors hover:border-sky-400 hover:text-sky-300"
        >
          SOUND {soundEnabled ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
