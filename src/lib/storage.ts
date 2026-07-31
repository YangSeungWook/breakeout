import { STORAGE_KEYS } from "@/game/constants";
import type { Difficulty, GameResult } from "@/game/types";
import { getSupabase, isSupabaseEnabled } from "./supabase";

export interface Settings {
  name: string;
  difficulty: Difficulty;
  sound: boolean;
}

/** 리더보드 한 벌 (최고 기록 + TOP N) */
export interface ScoreBoard {
  best: GameResult | null;
  scores: GameResult[];
}

const DEFAULT_SETTINGS: Settings = {
  name: "",
  difficulty: "normal",
  sound: true,
};

const MAX_SCORES = 10;
const TABLE = "scores";

/** Supabase scores 테이블의 행 */
interface ScoreRow {
  name: string;
  difficulty: Difficulty;
  score: number;
  stage: number;
  created_at: string;
}

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

/* ------------------------------------------------------------------ *
 * 설정 (기기별 값이라 항상 localStorage)
 * ------------------------------------------------------------------ */

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(STORAGE_KEYS.settings, {}) };
}

export function saveSettings(settings: Partial<Settings>) {
  write(STORAGE_KEYS.settings, { ...loadSettings(), ...settings });
}

/* ------------------------------------------------------------------ *
 * 점수 기록
 *
 * Supabase 가 설정돼 있으면 전체 유저가 공유하는 리더보드를 쓰고,
 * 설정이 없거나 네트워크가 끊기면 localStorage 기록으로 자동 폴백한다.
 * ------------------------------------------------------------------ */

function sortAndTrim(scores: GameResult[]): GameResult[] {
  return [...scores]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, MAX_SCORES);
}

function toBoard(scores: GameResult[]): ScoreBoard {
  const sorted = sortAndTrim(scores);
  return { best: sorted[0] ?? null, scores: sorted };
}

function loadLocalBoard(): ScoreBoard {
  return toBoard(read<GameResult[]>(STORAGE_KEYS.scores, []));
}

function saveLocalBoard(board: ScoreBoard) {
  write(STORAGE_KEYS.scores, board.scores);
  write(STORAGE_KEYS.best, board.best);
}

/** 원격 조회에 성공하면 리더보드를, 실패하면 null 을 돌려준다 */
async function fetchRemoteBoard(): Promise<ScoreBoard | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("name, difficulty, score, stage, created_at")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(MAX_SCORES);

  if (error || !data) {
    console.warn("[storage] 리더보드를 불러오지 못했습니다:", error?.message);
    return null;
  }

  const scores = (data as ScoreRow[]).map<GameResult>((row) => ({
    name: row.name,
    difficulty: row.difficulty,
    score: row.score,
    stage: row.stage,
    date: row.created_at,
  }));

  return { best: scores[0] ?? null, scores };
}

/** 저장에 성공하면 true */
async function insertRemoteResult(result: GameResult): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from(TABLE).insert({
    name: result.name.slice(0, 12),
    difficulty: result.difficulty,
    score: result.score,
    stage: result.stage,
  });

  if (error) {
    console.warn("[storage] 점수를 저장하지 못했습니다:", error.message);
    return false;
  }
  return true;
}

/**
 * 리더보드를 불러온다.
 * Supabase 조회에 성공하면 그 결과를 localStorage 에도 캐시해 두어
 * 다음에 오프라인이어도 같은 화면을 보여줄 수 있게 한다.
 */
export async function loadBoard(): Promise<ScoreBoard> {
  if (isSupabaseEnabled) {
    const remote = await fetchRemoteBoard();
    if (remote) {
      saveLocalBoard(remote);
      return remote;
    }
  }
  return loadLocalBoard();
}

/** 첫 페인트에 쓰는 캐시된 리더보드 (네트워크 없이 즉시 반환) */
export function loadCachedBoard(): ScoreBoard {
  return loadLocalBoard();
}

/**
 * 기록을 저장하고 갱신된 리더보드를 돌려준다.
 * 원격 저장이 실패해도 로컬 기록은 남기므로 게임 흐름이 끊기지 않는다.
 */
export async function saveResult(result: GameResult): Promise<ScoreBoard> {
  const local = loadLocalBoard();
  const merged = toBoard([...local.scores, result]);
  saveLocalBoard(merged);

  if (isSupabaseEnabled && (await insertRemoteResult(result))) {
    const remote = await fetchRemoteBoard();
    if (remote) {
      saveLocalBoard(remote);
      return remote;
    }
  }

  return merged;
}
