import type { Difficulty } from "./types";

export interface DifficultyPreset {
  label: string;
  description: string;
  /** 공 속력: 캔버스 높이 대비 초당 이동 비율 (해상도 독립) */
  ballSpeed: number;
  /** 패들 너비: 캔버스 너비 대비 비율 */
  paddleWidth: number;
  lives: number;
  /** 1스테이지 벽돌 줄 수 */
  rows: number;
  /** 점수 배율 */
  scoreMultiplier: number;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
  easy: {
    label: "EASY",
    description: "느린 공 · 긴 패들 · 목숨 4",
    ballSpeed: 0.5,
    paddleWidth: 0.26,
    lives: 4,
    rows: 4,
    scoreMultiplier: 1,
  },
  normal: {
    label: "NORMAL",
    description: "표준 속도 · 표준 패들 · 목숨 3",
    ballSpeed: 0.62,
    paddleWidth: 0.2,
    lives: 3,
    rows: 5,
    scoreMultiplier: 1.5,
  },
  hard: {
    label: "HARD",
    description: "빠른 공 · 짧은 패들 · 목숨 3",
    ballSpeed: 0.78,
    paddleWidth: 0.14,
    lives: 3,
    rows: 6,
    scoreMultiplier: 2,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "normal", "hard"];

/** 벽돌 줄 색상 (위 → 아래) */
export const BRICK_COLORS = [
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#facc15", // yellow
  "#22c55e", // green
  "#38bdf8", // sky
  "#a855f7", // purple
  "#ec4899", // pink
];

/** 이 점수마다 공 속도가 한 단계 상승한다 */
export const SPEED_STEP_SCORE = 100;
/** 한 단계당 상승률 */
export const SPEED_STEP_RATIO = 0.05;
/** 스테이지 클리어 시 추가 상승률 */
export const STAGE_SPEED_RATIO = 0.08;
/** 속도 배율 상한 */
export const MAX_SPEED_MULTIPLIER = 2.2;

/** 패들 끝에 맞았을 때 최대 반사각(라디안, 수직 기준) */
export const MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180;
/** 키보드 조작 시 패들 속도 (캔버스 너비 대비 초당 비율) */
export const PADDLE_KEY_SPEED = 1.15;

/** 물리 고정 타임스텝 (초) */
export const FIXED_STEP = 1 / 240;
/** 한 프레임에 허용하는 최대 물리 스텝 수 (탭 전환 후 폭주 방지) */
export const MAX_STEPS_PER_FRAME = 8;

export const BANNER_DURATION = 1.4;

/* ---------------------------------------------------------------- 타격감 연출 */

/** 벽돌이 부서지며 번쩍하는 시간(초) */
export const BRICK_BREAK_DURATION = 0.14;
/** 맞았지만 깨지지 않은 벽돌이 번쩍하는 시간(초) */
export const BRICK_FLASH_DURATION = 0.12;

/**
 * 파괴 순간 공의 물리만 아주 잠깐 멈춘다(히트스톱).
 * 파편은 계속 날아가므로 "공이 벽돌에 박혔다 튕긴다"는 느낌이 난다.
 * 길어지면 조작이 끊긴 것처럼 느껴지므로 수십 ms 를 넘기지 않는다.
 */
export const HIT_STOP_BREAK = 0.035;
export const HIT_STOP_TOUGH = 0.055;

/** 화면 흔들림 세기 (캔버스 높이 대비 비율) */
export const SHAKE_BREAK = 0.006;
export const SHAKE_TOUGH = 0.0095;
export const SHAKE_LIFE_LOST = 0.02;
/** 흔들림 감쇠 계수 (클수록 빨리 잦아든다) */
export const SHAKE_DECAY = 11;

/** 파편에 걸리는 중력 (캔버스 높이 대비 초당 가속) */
export const PARTICLE_GRAVITY = 1.9;
/** 동시에 살아 있을 수 있는 파편 수 상한 (저사양 기기 보호) */
export const MAX_PARTICLES = 240;

export const STORAGE_KEYS = {
  best: "breakout:best",
  scores: "breakout:scores",
  settings: "breakout:settings",
} as const;
