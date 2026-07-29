import type { SoundEvent } from "./types";

interface Tone {
  /** 시작 주파수(Hz) */
  freq: number;
  /** 끝 주파수(Hz). 생략하면 freq 유지 */
  to?: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  /** 앞선 음 대비 지연(초) — 아르페지오용 */
  delay?: number;
}

const TONES: Record<SoundEvent, Tone[]> = {
  paddle: [{ freq: 320, to: 420, duration: 0.07, type: "square", gain: 0.16 }],
  brick: [{ freq: 620, to: 780, duration: 0.06, type: "square", gain: 0.13 }],
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
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  play(event: SoundEvent) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    for (const tone of TONES[event]) {
      const start = now + (tone.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.to !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(1, tone.to),
          start + tone.duration,
        );
      }

      // 클릭 노이즈를 피하려고 짧은 어택/릴리즈를 준다
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + tone.duration + 0.02);
    }
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}
