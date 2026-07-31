import { MAX_PARTICLES, PARTICLE_GRAVITY, SHAKE_DECAY } from "./constants";
import type { Brick, Particle, ScorePopup, Shockwave } from "./types";

const TAU = Math.PI * 2;

/**
 * 순수 연출 전용 파티클 시스템.
 *
 * 게임 규칙에는 전혀 관여하지 않으므로 여기서 무엇이 몇 개 생기든
 * 점수·충돌·판정은 달라지지 않는다. 좌표와 속도는 엔진과 같은
 * "캔버스 CSS 픽셀" 단위를 쓰고, 세기는 캔버스 높이에 비례시켜
 * 어떤 해상도에서도 같은 크기로 보이게 한다.
 */
export class EffectSystem {
  particles: Particle[] = [];
  shockwaves: Shockwave[] = [];
  popups: ScorePopup[] = [];

  /** 렌더러가 그대로 translate 에 쓰는 화면 흔들림 오프셋(px) */
  shakeX = 0;
  shakeY = 0;

  /** prefers-reduced-motion 이면 화면 흔들림만 끈다 (파편·충격파는 유지) */
  reducedMotion = false;

  private shake = 0;
  private height = 0;

  resize(height: number) {
    this.height = height;
  }

  clear() {
    this.particles.length = 0;
    this.shockwaves.length = 0;
    this.popups.length = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  /** ratio 는 캔버스 높이 대비 비율 */
  addShake(ratio: number) {
    if (this.reducedMotion) return;
    const strength = this.height * ratio;
    // 벽돌을 연달아 깨도 화면이 무한정 요동치지 않도록 상한을 둔다
    this.shake = Math.min(this.shake + strength, strength * 2.4);
  }

  /** 벽돌이 부서졌을 때: 파편 + 충격파 링 + 점수 팝업 */
  brickDestroyed(brick: Brick, impactX: number, impactY: number, points: number) {
    const cx = brick.x + brick.width / 2;
    const cy = brick.y + brick.height / 2;
    // 공이 밀고 들어온 방향 — 파편이 이쪽으로 살짝 쏠린다
    const push = Math.atan2(cy - impactY, cx - impactX);
    const speed = this.height * 0.4;
    const count = 14;

    for (let i = 0; i < count; i++) {
      // 고르게 원형으로 흩뿌리되 약간의 난수로 규칙성을 깬다
      const angle = (i / count) * TAU + (Math.random() - 0.5) * 0.5;
      const power = speed * (0.45 + Math.random() * 0.8);
      this.push({
        x: cx + (Math.random() - 0.5) * brick.width * 0.8,
        y: cy + (Math.random() - 0.5) * brick.height * 0.8,
        vx: Math.cos(angle) * power + Math.cos(push) * speed * 0.3,
        vy: Math.sin(angle) * power + Math.sin(push) * speed * 0.3,
        life: 0.36 + Math.random() * 0.36,
        maxLife: 0,
        size: Math.max(2, brick.height * (0.16 + Math.random() * 0.22)),
        // 몇 조각은 흰색으로 섞어 번쩍이는 느낌을 준다
        color: i % 5 === 0 ? "#ffffff" : brick.color,
        angle: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 16,
      });
    }

    this.shockwaves.push({
      x: cx,
      y: cy,
      radius: Math.max(brick.width, brick.height) * 0.45,
      life: 0.24,
      maxLife: 0.24,
      color: brick.color,
    });

    this.popups.push({
      x: cx,
      y: cy,
      vy: -this.height * 0.13,
      life: 0.6,
      maxLife: 0.6,
      text: `+${points}`,
      color: brick.color,
    });
  }

  /** 맞았지만 아직 안 깨졌을 때: 충돌 지점에서 조각 몇 개만 튄다 */
  brickDamaged(brick: Brick, impactX: number, impactY: number) {
    const away = Math.atan2(
      impactY - (brick.y + brick.height / 2),
      impactX - (brick.x + brick.width / 2),
    );
    for (let i = 0; i < 5; i++) {
      const angle = away + (Math.random() - 0.5) * 1.7;
      const power = this.height * (0.1 + Math.random() * 0.16);
      this.push({
        x: impactX,
        y: impactY,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power,
        life: 0.18 + Math.random() * 0.16,
        maxLife: 0,
        size: Math.max(1.5, brick.height * 0.11),
        color: brick.color,
        angle: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 10,
      });
    }
  }

  update(dt: number) {
    if (dt <= 0) return;

    const gravity = this.height * PARTICLE_GRAVITY;
    // 공기 저항: 처음엔 빠르게 튀고 금세 느려진다
    const drag = Math.exp(-dt * 1.8);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += gravity * dt;
      p.vx *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      this.shockwaves[i].life -= dt;
      if (this.shockwaves[i].life <= 0) this.shockwaves.splice(i, 1);
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.popups.splice(i, 1);
        continue;
      }
      p.y += p.vy * dt;
      p.vy *= Math.exp(-dt * 3.2);
    }

    // 흔들림은 매 프레임 방향을 바꾸며 지수적으로 잦아든다
    if (this.shake > 0.05) {
      this.shake *= Math.exp(-dt * SHAKE_DECAY);
      const angle = Math.random() * TAU;
      this.shakeX = Math.cos(angle) * this.shake;
      this.shakeY = Math.sin(angle) * this.shake;
    } else if (this.shake !== 0) {
      this.shake = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  private push(particle: Particle) {
    particle.maxLife = particle.life;
    this.particles.push(particle);
    // 상한을 넘으면 가장 오래된 것부터 버린다
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }
}
