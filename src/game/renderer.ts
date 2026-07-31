import { BRICK_BREAK_DURATION, BRICK_FLASH_DURATION } from "./constants";
import type { BreakoutEngine } from "./engine";
import type { Brick } from "./types";

/** roundRect 미지원 브라우저까지 커버하는 둥근 사각형 경로 */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0b1026");
  bg.addColorStop(0.55, "#0a0f1f");
  bg.addColorStop(1, "#070a16");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 레트로 그리드
  const cell = Math.max(28, Math.round(w / 16));
  ctx.strokeStyle = "rgba(99, 179, 237, 0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = cell; x < w; x += cell) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, h);
  }
  for (let y = cell; y < h; y += cell) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(w, Math.round(y) + 0.5);
  }
  ctx.stroke();

  // 하단 데드존 표시
  ctx.fillStyle = "rgba(244, 63, 94, 0.06)";
  ctx.fillRect(0, h - Math.max(4, h * 0.012), w, Math.max(4, h * 0.012));
}

function drawBrick(ctx: CanvasRenderingContext2D, brick: Brick) {
  const destroyed = brick.hits <= 0;
  const radius = Math.min(brick.height / 2, 9);

  ctx.save();

  // 깨지는 순간: 벽돌 색 잔광을 남기며 흰 코어가 부풀어 사라진다
  if (destroyed) {
    const progress = 1 - Math.max(0, brick.breaking) / BRICK_BREAK_DURATION;
    const fade = Math.max(0, 1 - progress);
    const grow = progress * brick.height * 1.1;

    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = fade * 0.55;
    roundedRectPath(
      ctx,
      brick.x - grow,
      brick.y - grow,
      brick.width + grow * 2,
      brick.height + grow * 2,
      radius + grow,
    );
    ctx.fillStyle = brick.color;
    ctx.fill();

    ctx.globalAlpha = fade;
    roundedRectPath(
      ctx,
      brick.x - grow * 0.35,
      brick.y - grow * 0.35,
      brick.width + grow * 0.7,
      brick.height + grow * 0.7,
      radius,
    );
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    return;
  }

  // 2회 타격 벽돌은 한 번 맞으면 어두워진다
  const damaged = brick.maxHits > 1 && brick.hits < brick.maxHits;
  // 맞은 직후엔 살짝 눌렸다 돌아온다
  const flash = Math.max(0, brick.flash) / BRICK_FLASH_DURATION;
  const squash = flash * brick.height * 0.18;

  const x = brick.x + squash * 0.5;
  const y = brick.y + squash;
  const w = brick.width - squash;
  const h = brick.height - squash;

  ctx.globalAlpha = damaged ? 0.55 : 1;
  ctx.shadowColor = brick.color;
  ctx.shadowBlur = 12 + flash * 20;
  roundedRectPath(ctx, x, y, w, h, radius);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, brick.color);
  grad.addColorStop(1, shade(brick.color, -0.35));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 상단 하이라이트
  ctx.globalAlpha = damaged ? 0.25 : 0.45;
  roundedRectPath(
    ctx,
    x + w * 0.12,
    y + h * 0.18,
    w * 0.76,
    h * 0.22,
    h * 0.11,
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // 맞은 순간 하얗게 번쩍 (아직 안 깨진 벽돌)
  if (flash > 0) {
    ctx.globalAlpha = flash * 0.8;
    roundedRectPath(ctx, x, y, w, h, radius);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  ctx.restore();
}

/** 파괴 지점에서 퍼지는 링 */
function drawShockwaves(ctx: CanvasRenderingContext2D, engine: BreakoutEngine) {
  if (!engine.effects.shockwaves.length) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const wave of engine.effects.shockwaves) {
    const t = 1 - wave.life / wave.maxLife;
    const radius = wave.radius * (1 + t * 3.4);
    ctx.globalAlpha = (1 - t) * 0.7;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = Math.max(1, wave.radius * 0.35 * (1 - t));
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** 벽돌 파편 (회전하는 사각 조각) */
function drawParticles(ctx: CanvasRenderingContext2D, engine: BreakoutEngine) {
  for (const p of engine.effects.particles) {
    const t = p.life / p.maxLife;
    ctx.save();
    // 수명 끝자락에서만 흐려지도록 알파를 늦게 떨어뜨린다
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    const size = p.size * (0.45 + t * 0.55);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

/** 깨진 자리에서 떠오르는 획득 점수 */
function drawPopups(ctx: CanvasRenderingContext2D, engine: BreakoutEngine) {
  if (!engine.effects.popups.length) return;

  const size = Math.max(10, Math.min(18, engine.width * 0.028));
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${size}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
  for (const popup of engine.effects.popups) {
    const t = popup.life / popup.maxLife;
    ctx.globalAlpha = Math.min(1, t * 1.8);
    ctx.fillStyle = popup.color;
    ctx.shadowColor = popup.color;
    ctx.shadowBlur = 10;
    ctx.fillText(popup.text, popup.x, popup.y);
  }
  ctx.restore();
}

function drawPaddle(ctx: CanvasRenderingContext2D, engine: BreakoutEngine) {
  const { paddle } = engine;
  const radius = paddle.height / 2;

  ctx.save();
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 18;
  roundedRectPath(ctx, paddle.x, paddle.y, paddle.width, paddle.height, radius);
  const grad = ctx.createLinearGradient(0, paddle.y, 0, paddle.y + paddle.height);
  grad.addColorStop(0, "#e0f2fe");
  grad.addColorStop(0.5, "#38bdf8");
  grad.addColorStop(1, "#0284c7");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, engine: BreakoutEngine) {
  const { ball } = engine;

  // 잔상
  ctx.save();
  for (let i = 0; i < ball.trail.length; i++) {
    const point = ball.trail[i];
    const t = (i + 1) / ball.trail.length;
    ctx.globalAlpha = t * 0.28;
    ctx.beginPath();
    ctx.arc(point.x, point.y, ball.radius * (0.35 + t * 0.6), 0, Math.PI * 2);
    ctx.fillStyle = "#fb923c";
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "#f97316";
  ctx.shadowBlur = 22;
  const grad = ctx.createRadialGradient(
    ball.x - ball.radius * 0.3,
    ball.y - ball.radius * 0.35,
    ball.radius * 0.1,
    ball.x,
    ball.y,
    ball.radius,
  );
  grad.addColorStop(0, "#fff7ed");
  grad.addColorStop(0.45, "#fb923c");
  grad.addColorStop(1, "#ea580c");
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

/** 대기 상태에서 조작 안내 + 발사 방향 가이드 */
function drawReadyHint(ctx: CanvasRenderingContext2D, engine: BreakoutEngine) {
  const { ball, width, height, time } = engine;
  const pulse = 0.5 + Math.sin(time * 4) * 0.5;

  ctx.save();
  ctx.globalAlpha = 0.25 + pulse * 0.35;
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y - ball.radius);
  ctx.lineTo(ball.x, ball.y - ball.radius - height * 0.1);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55 + pulse * 0.45;
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = Math.max(11, Math.min(16, width * 0.032));
  ctx.font = `600 ${size}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
  ctx.fillText("TAP  /  CLICK  /  SPACE  TO  LAUNCH", width / 2, height * 0.62);
  ctx.restore();
}

/** 스테이지 전환·목숨 차감 시 잠깐 뜨는 큰 문구 */
function drawBanner(ctx: CanvasRenderingContext2D, engine: BreakoutEngine) {
  if (!engine.banner) return;
  const { width, height } = engine;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = Math.max(22, Math.min(48, width * 0.085));
  ctx.font = `800 ${size}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(engine.banner, width / 2, height * 0.42);
  ctx.restore();
}

export function drawScene(ctx: CanvasRenderingContext2D, engine: BreakoutEngine) {
  const { width, height, effects } = engine;

  // 배경은 흔들지 않는다. 같이 밀리면 가장자리에 빈 띠가 드러난다.
  drawBackground(ctx, width, height);

  ctx.save();
  ctx.translate(effects.shakeX, effects.shakeY);

  for (const brick of engine.bricks) drawBrick(ctx, brick);
  drawShockwaves(ctx, engine);
  drawParticles(ctx, engine);
  drawPaddle(ctx, engine);
  drawBall(ctx, engine);
  drawPopups(ctx, engine);

  ctx.restore();

  // 안내 문구와 배너는 흔들림과 무관하게 읽히도록 고정한다
  if (engine.status === "ready") drawReadyHint(ctx, engine);
  drawBanner(ctx, engine);
}

/** hex 색을 밝게(+)/어둡게(-) 조정 */
function shade(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const adjust = (c: number) =>
    Math.round(Math.max(0, Math.min(255, amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
}
