"use client";

import { useEffect, useRef } from "react";

/**
 * requestAnimationFrame 루프.
 * 콜백은 ref에 담아두어 매 프레임 새 콜백이 들어와도 루프를 재시작하지 않는다.
 * unmount / running=false 시 반드시 cancelAnimationFrame 한다.
 */
export function useGameLoop(callback: (dt: number) => void, running = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!running) return;

    let frameId = 0;
    let previous = 0;

    const tick = (now: number) => {
      // 첫 프레임은 dt를 0으로 두고 기준 시각만 잡는다
      const dt = previous === 0 ? 0 : (now - previous) / 1000;
      previous = now;
      callbackRef.current(dt);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [running]);
}
