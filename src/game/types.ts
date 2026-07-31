export type Difficulty = "easy" | "normal" | "hard";

/** 캔버스 안에서 진행되는 라운드의 상태 */
export type GameStatus = "ready" | "playing" | "paused" | "gameover";

/** 앱 전체의 화면 전환 상태 */
export type Screen = "menu" | "game" | "result";

export interface Player {
  name: string;
  difficulty: Difficulty;
}

export interface Ball {
  x: number;
  y: number;
  /** px/s */
  vx: number;
  vy: number;
  /** 현재 속력(px/s). 반사 후 항상 이 값으로 정규화한다. */
  speed: number;
  radius: number;
  /** 잔상 렌더링용 최근 좌표 */
  trail: Array<{ x: number; y: number }>;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  /** px/s, 공에 스핀을 주기 위해 추적 */
  vx: number;
}

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  /** 남은 내구도 */
  hits: number;
  maxHits: number;
  points: number;
  /** 파괴 연출 타이머(0보다 크면 렌더링만 남은 상태) */
  breaking: number;
  /** 맞았지만 깨지지 않았을 때의 번쩍임 타이머 */
  flash: number;
}

/** 벽돌이 깨질 때 튀는 파편 한 조각 */
export interface Particle {
  x: number;
  y: number;
  /** px/s */
  vx: number;
  vy: number;
  /** 남은 수명(초) */
  life: number;
  maxLife: number;
  size: number;
  color: string;
  /** 회전 각(라디안)과 각속도(rad/s) */
  angle: number;
  spin: number;
}

/** 파괴 지점에서 퍼져 나가는 충격파 링 */
export interface Shockwave {
  x: number;
  y: number;
  /** 시작 반지름 */
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

/** 파괴 지점에서 떠오르는 획득 점수 */
export interface ScorePopup {
  x: number;
  y: number;
  /** px/s, 위로 떠오르며 감속한다 */
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
}

/** 엔진 → React 로 전달되는 UI 표시용 상태 */
export interface PublicState {
  status: GameStatus;
  score: number;
  lives: number;
  stage: number;
  /** 화면 중앙에 잠깐 떠 있는 배너 문구 */
  banner: string | null;
  /** 현재 공 속도 배율 (1 = 기본) */
  speedMultiplier: number;
}

export interface GameResult {
  name: string;
  difficulty: Difficulty;
  score: number;
  stage: number;
  /** ISO 8601 */
  date: string;
}

export type SoundEvent =
  | "paddle"
  /** 맞았지만 깨지지 않음 */
  | "brick"
  /** 벽돌이 부서짐 */
  | "brickBreak"
  | "wall"
  | "launch"
  | "life"
  | "stage"
  | "gameover";
