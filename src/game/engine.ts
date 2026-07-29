import {
  BANNER_DURATION,
  DIFFICULTY_PRESETS,
  FIXED_STEP,
  MAX_BOUNCE_ANGLE,
  MAX_SPEED_MULTIPLIER,
  MAX_STEPS_PER_FRAME,
  PADDLE_KEY_SPEED,
  SPEED_STEP_RATIO,
  SPEED_STEP_SCORE,
  STAGE_SPEED_RATIO,
} from "./constants";
import { createBricks } from "./levels";
import type {
  Ball,
  Brick,
  Difficulty,
  GameStatus,
  Paddle,
  PublicState,
  SoundEvent,
} from "./types";

export interface EngineHandlers {
  /** 점수/목숨/상태 등 UI 표시 값이 바뀌었을 때만 호출된다 */
  onState?: (state: PublicState) => void;
  onSound?: (event: SoundEvent) => void;
  onGameOver?: (payload: { score: number; stage: number }) => void;
}

const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v;

/**
 * 벽돌깨기 물리/규칙 엔진.
 *
 * 좌표계는 캔버스의 CSS 픽셀(=화면에 보이는 크기)을 그대로 쓰고,
 * 속도는 캔버스 높이에 비례하도록 정의해서 어떤 해상도에서도
 * 체감 난이도가 같게 유지된다.
 */
export class BreakoutEngine {
  width = 0;
  height = 0;
  time = 0;

  status: GameStatus = "ready";
  score = 0;
  lives: number;
  stage = 1;
  banner: string | null = null;

  ball: Ball;
  paddle: Paddle;
  bricks: Brick[] = [];

  private difficulty: Difficulty;
  private handlers: EngineHandlers;
  private bannerTimer = 0;
  private accumulator = 0;
  private initialized = false;
  private keys = { left: false, right: false };
  private pointerX: number | null = null;
  private lastPublished: PublicState | null = null;

  constructor(difficulty: Difficulty, handlers: EngineHandlers = {}) {
    this.difficulty = difficulty;
    this.handlers = handlers;
    this.lives = DIFFICULTY_PRESETS[difficulty].lives;
    this.ball = { x: 0, y: 0, vx: 0, vy: 0, speed: 0, radius: 6, trail: [] };
    this.paddle = { x: 0, y: 0, width: 80, height: 12, vx: 0 };
  }

  // ---------------------------------------------------------------- 크기/배치

  private get preset() {
    return DIFFICULTY_PRESETS[this.difficulty];
  }

  private paddleHeight() {
    return clamp(this.height * 0.022, 9, 18);
  }

  private paddleY() {
    return this.height - this.height * 0.07 - this.paddleHeight();
  }

  private ballRadius() {
    return clamp(Math.min(this.width, this.height) * 0.016, 4.5, 11);
  }

  /**
   * 캔버스 크기가 바뀌면 진행 중인 오브젝트를 비율에 맞춰 옮긴다.
   * (화면 회전이나 창 크기 변경 중에도 게임이 이어진다)
   */
  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    if (!this.initialized) {
      this.width = width;
      this.height = height;
      this.initialized = true;
      this.reset();
      return;
    }
    if (width === this.width && height === this.height) return;

    const sx = width / this.width;
    const sy = height / this.height;
    this.width = width;
    this.height = height;

    for (const brick of this.bricks) {
      brick.x *= sx;
      brick.y *= sy;
      brick.width *= sx;
      brick.height *= sy;
    }

    this.paddle.width = this.width * this.preset.paddleWidth;
    this.paddle.height = this.paddleHeight();
    this.paddle.y = this.paddleY();
    this.paddle.x = clamp(this.paddle.x * sx, 0, this.width - this.paddle.width);

    this.ball.x = clamp(this.ball.x * sx, 0, this.width);
    this.ball.y = clamp(this.ball.y * sy, 0, this.height);
    this.ball.radius = this.ballRadius();
    this.ball.trail.length = 0;
    this.applySpeed();

    if (this.status === "ready") this.placeBallOnPaddle();
  }

  // ------------------------------------------------------------------- 초기화

  /** 스테이지 1부터 완전히 새로 시작 */
  reset() {
    this.score = 0;
    this.lives = this.preset.lives;
    this.stage = 1;
    this.time = 0;
    this.accumulator = 0;
    this.paddle.width = this.width * this.preset.paddleWidth;
    this.paddle.height = this.paddleHeight();
    this.paddle.y = this.paddleY();
    this.paddle.x = (this.width - this.paddle.width) / 2;
    this.paddle.vx = 0;
    this.bricks = createBricks(this.width, this.height, this.difficulty, 1);
    this.resetBall();
    this.setBanner(null);
    this.status = "ready";
    this.publish();
  }

  private resetBall() {
    this.ball.radius = this.ballRadius();
    this.ball.trail.length = 0;
    this.placeBallOnPaddle();
    this.ball.vx = 0;
    this.ball.vy = -1;
    this.applySpeed();
    this.ball.vx = 0;
    this.ball.vy = 0;
  }

  private placeBallOnPaddle() {
    this.ball.x = this.paddle.x + this.paddle.width / 2;
    this.ball.y = this.paddle.y - this.ball.radius - 2;
  }

  // ------------------------------------------------------------------- 입력

  setPointer(x: number | null) {
    this.pointerX = x;
  }

  setKey(dir: "left" | "right", pressed: boolean) {
    this.keys[dir] = pressed;
    // 키보드를 쓰기 시작하면 마우스 위치 고정을 푼다
    if (pressed) this.pointerX = null;
  }

  /** 대기 상태에서 공을 쏘아 올린다 */
  launch() {
    if (this.status !== "ready") return;
    const angle = (Math.random() * 2 - 1) * (MAX_BOUNCE_ANGLE * 0.5);
    this.ball.vx = Math.sin(angle);
    this.ball.vy = -Math.cos(angle);
    this.applySpeed();
    this.status = "playing";
    this.handlers.onSound?.("launch");
    this.publish();
  }

  pause() {
    if (this.status !== "playing") return;
    this.status = "paused";
    this.publish();
  }

  resume() {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.accumulator = 0;
    this.publish();
  }

  togglePause() {
    if (this.status === "playing") this.pause();
    else if (this.status === "paused") this.resume();
  }

  // ------------------------------------------------------------------- 속도

  get speedMultiplier() {
    const fromScore =
      Math.floor(this.score / SPEED_STEP_SCORE) * SPEED_STEP_RATIO;
    const fromStage = (this.stage - 1) * STAGE_SPEED_RATIO;
    return Math.min(MAX_SPEED_MULTIPLIER, 1 + fromScore + fromStage);
  }

  /** 현재 방향은 유지한 채 속력만 현재 배율에 맞춘다 */
  private applySpeed() {
    const speed = this.preset.ballSpeed * this.height * this.speedMultiplier;
    this.ball.speed = speed;
    const len = Math.hypot(this.ball.vx, this.ball.vy);
    if (len > 0) {
      this.ball.vx = (this.ball.vx / len) * speed;
      this.ball.vy = (this.ball.vy / len) * speed;
    }
  }

  /** 공이 수평에 가깝게 갇히지 않도록 최소 세로 속도를 보장한다 */
  private enforceMinVertical() {
    const minVy = this.ball.speed * 0.25;
    if (Math.abs(this.ball.vy) < minVy) {
      this.ball.vy = (this.ball.vy < 0 ? -1 : 1) * minVy;
      const len = Math.hypot(this.ball.vx, this.ball.vy) || 1;
      this.ball.vx = (this.ball.vx / len) * this.ball.speed;
      this.ball.vy = (this.ball.vy / len) * this.ball.speed;
    }
  }

  // ------------------------------------------------------------------- 루프

  update(dt: number) {
    // 탭 전환 등으로 큰 dt가 들어오면 잘라낸다
    const frame = Math.min(dt, 0.1);
    this.time += frame;

    if (this.bannerTimer > 0) {
      this.bannerTimer -= frame;
      if (this.bannerTimer <= 0) this.setBanner(null);
    }

    this.accumulator += frame;
    let steps = 0;
    while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
      this.step(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (steps >= MAX_STEPS_PER_FRAME) this.accumulator = 0;

    if (this.status === "playing") {
      this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
      if (this.ball.trail.length > 12) this.ball.trail.shift();
    } else if (this.ball.trail.length) {
      this.ball.trail.shift();
    }

    let finished = false;
    for (const brick of this.bricks) {
      if (brick.breaking > 0) {
        brick.breaking -= frame;
        if (brick.breaking <= 0) finished = true;
      }
    }
    if (finished) {
      this.bricks = this.bricks.filter((b) => b.hits > 0 || b.breaking > 0);
    }

    this.publish();
  }

  private step(dt: number) {
    this.updatePaddle(dt);

    if (this.status === "ready") {
      this.placeBallOnPaddle();
      return;
    }
    if (this.status !== "playing") return;

    this.updateBall(dt);
  }

  private updatePaddle(dt: number) {
    if (this.status === "paused" || this.status === "gameover") return;

    const prevX = this.paddle.x;
    const maxX = this.width - this.paddle.width;

    if (this.pointerX !== null) {
      this.paddle.x = clamp(this.pointerX - this.paddle.width / 2, 0, maxX);
    }

    const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    if (dir !== 0) {
      this.paddle.x = clamp(
        this.paddle.x + dir * PADDLE_KEY_SPEED * this.width * dt,
        0,
        maxX,
      );
    }

    this.paddle.vx = (this.paddle.x - prevX) / dt;
  }

  private updateBall(dt: number) {
    const ball = this.ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    let hitWall = false;

    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
      hitWall = true;
    } else if (ball.x + ball.radius > this.width) {
      ball.x = this.width - ball.radius;
      ball.vx = -Math.abs(ball.vx);
      hitWall = true;
    }

    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
      hitWall = true;
    }

    if (hitWall) this.handlers.onSound?.("wall");

    this.collidePaddle();
    this.collideBricks();

    // 바닥으로 빠지면 목숨 차감
    if (ball.y - ball.radius > this.height) this.loseLife();
  }

  private collidePaddle() {
    const { ball, paddle } = this;
    if (ball.vy <= 0) return;
    if (!circleIntersectsRect(ball, paddle)) return;

    const center = paddle.x + paddle.width / 2;
    const rel = clamp((ball.x - center) / (paddle.width / 2), -1, 1);
    // 패들이 움직이던 방향으로 살짝 더 꺾인다
    const spin = clamp(this.paddle.vx / (this.width * PADDLE_KEY_SPEED), -1, 1);
    const angle = clamp(
      rel * MAX_BOUNCE_ANGLE + spin * 0.18 * MAX_BOUNCE_ANGLE,
      -MAX_BOUNCE_ANGLE * 1.15,
      MAX_BOUNCE_ANGLE * 1.15,
    );

    ball.vx = Math.sin(angle);
    ball.vy = -Math.cos(angle);
    this.applySpeed();
    ball.y = paddle.y - ball.radius - 0.5;
    this.handlers.onSound?.("paddle");
  }

  private collideBricks() {
    const ball = this.ball;

    for (const brick of this.bricks) {
      if (brick.hits <= 0) continue;
      if (!circleIntersectsRect(ball, brick)) continue;

      // 파고든 깊이가 얕은 축으로 반사시킨다
      const overlapX =
        brick.width / 2 + ball.radius - Math.abs(ball.x - (brick.x + brick.width / 2));
      const overlapY =
        brick.height / 2 + ball.radius - Math.abs(ball.y - (brick.y + brick.height / 2));

      if (overlapX < overlapY) {
        ball.vx *= -1;
        ball.x += Math.sign(ball.vx) * overlapX;
      } else {
        ball.vy *= -1;
        ball.y += Math.sign(ball.vy) * overlapY;
      }
      this.enforceMinVertical();

      brick.hits -= 1;
      if (brick.hits <= 0) {
        brick.breaking = 0.18;
        this.score += brick.points;
        // 점수 구간을 넘기면 공이 빨라진다
        this.applySpeed();
      }
      this.handlers.onSound?.("brick");

      if (this.bricks.every((b) => b.hits <= 0)) this.clearStage();
      // 한 스텝에 벽돌 하나만 처리해서 반사 방향이 꼬이지 않게 한다
      break;
    }
  }

  // ------------------------------------------------------------- 라운드 진행

  private loseLife() {
    this.lives -= 1;
    this.ball.trail.length = 0;

    if (this.lives <= 0) {
      this.lives = 0;
      this.status = "gameover";
      this.handlers.onSound?.("gameover");
      this.publish();
      this.handlers.onGameOver?.({ score: this.score, stage: this.stage });
      return;
    }

    this.handlers.onSound?.("life");
    this.resetBall();
    this.status = "ready";
    this.setBanner(`LIFE  ${this.lives}`);
    this.publish();
  }

  private clearStage() {
    this.stage += 1;
    this.bricks = createBricks(this.width, this.height, this.difficulty, this.stage);
    this.resetBall();
    this.status = "ready";
    this.handlers.onSound?.("stage");
    this.setBanner(`STAGE  ${this.stage}`);
    this.publish();
  }

  private setBanner(text: string | null) {
    this.banner = text;
    this.bannerTimer = text ? BANNER_DURATION : 0;
  }

  // ------------------------------------------------------------- 상태 전파

  private snapshot(): PublicState {
    return {
      status: this.status,
      score: this.score,
      lives: this.lives,
      stage: this.stage,
      banner: this.banner,
      speedMultiplier: Math.round(this.speedMultiplier * 100) / 100,
    };
  }

  /** 값이 실제로 바뀐 프레임에만 React 상태를 갱신한다 */
  private publish() {
    const next = this.snapshot();
    const prev = this.lastPublished;
    if (
      prev &&
      prev.status === next.status &&
      prev.score === next.score &&
      prev.lives === next.lives &&
      prev.stage === next.stage &&
      prev.banner === next.banner &&
      prev.speedMultiplier === next.speedMultiplier
    ) {
      return;
    }
    this.lastPublished = next;
    this.handlers.onState?.(next);
  }
}

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 원-사각형 교차 판정 (사각형에서 원 중심에 가장 가까운 점과의 거리 비교) */
function circleIntersectsRect(
  circle: { x: number; y: number; radius: number },
  rect: RectLike,
): boolean {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}
