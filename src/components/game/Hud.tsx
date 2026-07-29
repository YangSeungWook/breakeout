"use client";

interface HudProps {
  score: number;
  bestScore: number;
  lives: number;
  maxLives: number;
  speedMultiplier: number;
}

export default function Hud({
  score,
  bestScore,
  lives,
  maxLives,
  speedMultiplier,
}: HudProps) {
  return (
    <footer className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 backdrop-blur sm:px-4">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 sm:text-xs">
          SCORE
        </span>
        <span className="font-mono text-lg font-extrabold tabular-nums text-amber-300 sm:text-2xl">
          {score.toLocaleString()}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 sm:text-xs">
          BEST
        </span>
        <span className="font-mono text-sm font-bold tabular-nums text-slate-200 sm:text-lg">
          {bestScore.toLocaleString()}
        </span>
      </div>

      <div className="hidden items-baseline gap-1.5 sm:flex">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 sm:text-xs">
          SPEED
        </span>
        <span className="font-mono text-sm font-bold tabular-nums text-sky-300 sm:text-lg">
          ×{speedMultiplier.toFixed(2)}
        </span>
      </div>

      <div
        className="flex items-center gap-1.5"
        aria-label={`남은 목숨 ${lives}개`}
      >
        <span className="text-[10px] font-bold tracking-widest text-slate-400 sm:text-xs">
          LIVES
        </span>
        <div className="flex items-center gap-1">
          {Array.from({ length: maxLives }).map((_, index) => (
            <span
              key={index}
              className={
                index < lives
                  ? "h-3 w-3 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)] sm:h-3.5 sm:w-3.5"
                  : "h-3 w-3 rounded-full border border-slate-600 bg-slate-800 sm:h-3.5 sm:w-3.5"
              }
            />
          ))}
        </div>
      </div>
    </footer>
  );
}
