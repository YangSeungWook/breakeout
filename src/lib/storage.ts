import { STORAGE_KEYS } from "@/game/constants";
import type { Difficulty, GameResult } from "@/game/types";

export interface Settings {
  name: string;
  difficulty: Difficulty;
  sound: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  name: "",
  difficulty: "normal",
  sound: true,
};

const MAX_SCORES = 10;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // 손상된 값이면 기본값으로 넘어간다
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 시크릿 모드 등 저장 실패는 무시 (게임 진행에는 영향 없음)
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(STORAGE_KEYS.settings, {}) };
}

export function saveSettings(settings: Partial<Settings>) {
  write(STORAGE_KEYS.settings, { ...loadSettings(), ...settings });
}

export function loadBest(): GameResult | null {
  return read<GameResult | null>(STORAGE_KEYS.best, null);
}

export function loadScores(): GameResult[] {
  return read<GameResult[]>(STORAGE_KEYS.scores, []);
}

/**
 * 기록을 저장하고 최고 점수를 갱신했는지 알려준다.
 * (추후 Supabase 연동 시 이 함수만 서버 호출로 바꾸면 된다)
 */
export function saveResult(result: GameResult): { best: GameResult; isNewBest: boolean } {
  const previousBest = loadBest();
  const isNewBest = !previousBest || result.score > previousBest.score;

  const scores = [...loadScores(), result]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SCORES);
  write(STORAGE_KEYS.scores, scores);

  const best = isNewBest ? result : previousBest;
  if (isNewBest) write(STORAGE_KEYS.best, result);

  return { best, isNewBest };
}
