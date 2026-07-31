import type { SoundEvent } from "./types";

interface Tone {
  /** 시작 주파수(Hz). noise 인 경우 밴드패스 중심 주파수 */
  freq: number;
  /** 끝 주파수(Hz). 생략하면 freq 유지 */
  to?: number;
  duration: number;
  /** noise 가 아닐 때의 파형 (기본 square) */
  type?: OscillatorType;
  gain: number;
  /** 앞선 음 대비 지연(초) — 아르페지오용 */
  delay?: number;
  /**
   * 오실레이터 대신 화이트노이즈를 밴드패스로 통과시킨다.
   * 음정이 없는 "퍽/쨍" 하는 파열음이라 타격감을 만드는 핵심 재료.
   */
  noise?: boolean;
}

const TONES: Record<SoundEvent, Tone[]> = {
  paddle: [{ freq: 320, to: 420, duration: 0.07, type: "square", gain: 0.16 }],
  // 맞았지만 안 깨짐 — 짧고 단단한 "톡"
  brick: [
    { freq: 540, to: 660, duration: 0.05, type: "square", gain: 0.11 },
    { freq: 3200, to: 1800, duration: 0.03, gain: 0.06, noise: true },
  ],
  // 부서짐 — 저음 충격 + 파열음 + 밝은 액센트를 겹쳐 묵직하게 만든다
  brickBreak: [
    { freq: 240, to: 60, duration: 0.18, type: "sine", gain: 0.3 },
    { freq: 2600, to: 420, duration: 0.14, gain: 0.22, noise: true },
    { freq: 880, to: 1400, duration: 0.05, type: "square", gain: 0.1 },
  ],
  wall: [{ freq: 200, duration: 0.05, type: "triangle", gain: 0.1 }],
  launch: [{ freq: 260, to: 660, duration: 0.16, type: "sawtooth", gain: 0.12 }],
  life: [{ freq: 380, to: 110, duration: 0.4, type: "sawtooth", gain: 0.16 }],
  stage: [
    { freq: 523, duration: 0.1, type: "square", gain: 0.14 },
    { freq: 659, duration: 0.1, type: "square", gain: 0.14, delay: 0.09 },
    { freq: 784, duration: 0.16, type: "square", gain: 0.14, delay: 0.18 },
  ],
  gameover: [
    { freq: 330, duration: 0.16, type: "sawtooth", gain: 0.16 },
    { freq: 247, duration: 0.18, type: "sawtooth", gain: 0.16, delay: 0.15 },
    { freq: 165, duration: 0.5, type: "sawtooth", gain: 0.16, delay: 0.32 },
  ],
};

/**
 * WebAudio 오실레이터로 8비트풍 효과음을 즉석에서 만든다.
 * 오디오 파일이 없어도 되고, AudioContext는 첫 사용자 조작 때 생성한다.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  enabled = true;

  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) return;
    void this.ctx?.resume();
  }

  /** 브라우저 자동재생 정책 때문에 사용자 제스처 안에서 호출해야 한다 */
  unlock() {
    this.ensureContext();
    void this.ctx?.resume();
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;

    // 벽돌이 한꺼번에 깨져도 찢어지지 않게 리미터를 하나 물린다
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;

    this.master.connect(limiter);
    limiter.connect(this.ctx.destination);
    return this.ctx;
  }

  /** 파열음용 화이트노이즈. 한 번 만들어 재사용한다. */
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }

  play(event: SoundEvent) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    for (const tone of TONES[event]) {
      const start = now + (tone.delay ?? 0);
      const gain = ctx.createGain();

      // 클릭 노이즈를 피하려고 짧은 어택/릴리즈를 준다.
      // 파열음은 어택을 더 짧게 잡아야 "탁" 하고 때리는 느낌이 산다.
      const attack = tone.noise ? 0.001 : 0.008;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain, start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
      gain.connect(this.master);

      if (tone.noise) {
        const source = ctx.createBufferSource();
        source.buffer = this.getNoiseBuffer(ctx);

        // 밴드패스를 위에서 아래로 쓸어내리면 파편이 흩어지는 소리가 된다
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 0.8;
        filter.frequency.setValueAtTime(tone.freq, start);
        if (tone.to !== undefined) {
          filter.frequency.exponentialRampToValueAtTime(
            Math.max(1, tone.to),
            start + tone.duration,
          );
        }

        source.connect(filter);
        filter.connect(gain);
        source.start(start);
        source.stop(start + tone.duration + 0.02);
        continue;
      }

      const osc = ctx.createOscillator();
      osc.type = tone.type ?? "square";
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.to !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(1, tone.to),
          start + tone.duration,
        );
      }

      osc.connect(gain);
      osc.start(start);
      osc.stop(start + tone.duration + 0.02);
    }
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
  }
}
