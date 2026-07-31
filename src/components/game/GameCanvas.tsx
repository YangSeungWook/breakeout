"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { SoundManager } from "@/game/audio";
import { BreakoutEngine } from "@/game/engine";
import { drawScene } from "@/game/renderer";
import type { Difficulty, PublicState } from "@/game/types";
import { useCanvas } from "@/hooks/useCanvas";
import { useGameLoop } from "@/hooks/useGameLoop";

export interface GameController {
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  restart: () => void;
  launch: () => void;
}

interface GameCanvasProps {
  difficulty: Difficulty;
  soundEnabled: boolean;
  onState: (state: PublicState) => void;
  onGameOver: (payload: { score: number; stage: number }) => void;
  controlRef: RefObject<GameController | null>;
}

export default function GameCanvas({
  difficulty,
  soundEnabled,
  onState,
  onGameOver,
  controlRef,
}: GameCanvasProps) {
  const { canvasRef, containerRef, size, getContext } = useCanvas();

  // 매 프레임 바뀌는 콜백 때문에 엔진을 다시 만들지 않도록 ref로 고정한다
  const onStateRef = useRef(onState);
  onStateRef.current = onState;
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const soundRef = useRef<SoundManager | null>(null);
  const activePointerId = useRef<number | null>(null);

  const [engine] = useState(
    () =>
      new BreakoutEngine(difficulty, {
        onState: (state) => onStateRef.current(state),
        onSound: (event) => soundRef.current?.play(event),
        onGameOver: (payload) => onGameOverRef.current(payload),
      }),
  );

  // ------------------------------------------------------------------ 사운드
  useEffect(() => {
    const manager = new SoundManager();
    soundRef.current = manager;
    return () => {
      manager.dispose();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    soundRef.current?.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // ------------------------------------------------------------- 접근성 설정
  // OS의 "동작 줄이기"가 켜져 있으면 화면 흔들림만 끈다 (파편·연출은 유지)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => engine.setReducedMotion(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [engine]);

  // ------------------------------------------------------- 외부 조작 인터페이스
  useEffect(() => {
    controlRef.current = {
      pause: () => engine.pause(),
      resume: () => {
        soundRef.current?.unlock();
        engine.resume();
      },
      togglePause: () => engine.togglePause(),
      restart: () => engine.reset(),
      launch: () => {
        soundRef.current?.unlock();
        engine.launch();
      },
    };
    return () => {
      controlRef.current = null;
    };
  }, [engine, controlRef]);

  // -------------------------------------------------------------- 크기 동기화
  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    engine.resize(size.width, size.height);
  }, [engine, size.width, size.height]);

  // ------------------------------------------------------------------ 메인 루프
  useGameLoop(
    useCallback(
      (dt: number) => {
        if (size.width <= 0 || size.height <= 0) return;
        engine.update(dt);
        const ctx = getContext();
        if (ctx) drawScene(ctx, engine);
      },
      [engine, getContext, size.width, size.height],
    ),
  );

  // -------------------------------------------------------------------- 키보드
  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    // e.key 대신 e.code를 쓰면 한글 IME 상태에서도 A/D/P 키가 동작한다
    const handleDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.repeat) return;
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          engine.setKey("left", true);
          e.preventDefault();
          break;
        case "ArrowRight":
        case "KeyD":
          engine.setKey("right", true);
          e.preventDefault();
          break;
        case "Space":
        case "Enter":
          // 결과 모달의 버튼 조작을 가로채지 않도록 대기 상태에서만 반응한다
          if (engine.status === "ready") {
            soundRef.current?.unlock();
            engine.launch();
            e.preventDefault();
          }
          break;
        case "KeyP":
        case "Escape":
          engine.togglePause();
          e.preventDefault();
          break;
      }
    };

    const handleUp = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          engine.setKey("left", false);
          break;
        case "ArrowRight":
        case "KeyD":
          engine.setKey("right", false);
          break;
      }
    };

    // 키를 누른 채 창을 벗어나면 패들이 계속 움직이는 것을 막는다
    const releaseKeys = () => {
      engine.setKey("left", false);
      engine.setKey("right", false);
    };

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("blur", releaseKeys);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", releaseKeys);
    };
  }, [engine]);

  // ------------------------------------------------- 탭 전환 시 자동 일시정지
  useEffect(() => {
    const handleHidden = () => {
      if (document.hidden) engine.pause();
    };
    const handleBlur = () => engine.pause();
    document.addEventListener("visibilitychange", handleHidden);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleHidden);
      window.removeEventListener("blur", handleBlur);
    };
  }, [engine]);

  // -------------------------------------------------------------------- 포인터
  /** 화면 좌표 → 캔버스 로컬 좌표. 확대/스크롤 상태에서도 어긋나지 않는다. */
  const toLocalX = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return null;
      return ((clientX - rect.left) / rect.width) * size.width;
    },
    [canvasRef, size.width],
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const x = toLocalX(e.clientX);
    if (x !== null) engine.setPointer(x);
    soundRef.current?.unlock();
    engine.launch();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    // 마우스는 항상 추적, 터치/펜은 화면에 닿아 있는 동안만 추적
    const tracking =
      e.pointerType === "mouse" || activePointerId.current === e.pointerId;
    if (!tracking) return;
    const x = toLocalX(e.clientX);
    if (x !== null) engine.setPointer(x);
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    // 손가락을 떼면 추적을 멈춘다 (패들은 마지막 위치에 남는다)
    if (e.pointerType !== "mouse") engine.setPointer(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-[#070a16] shadow-[0_0_40px_rgba(56,189,248,0.12)]"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none select-none"
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") engine.setPointer(null);
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
