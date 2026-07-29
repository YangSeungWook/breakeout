"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CanvasSize {
  /** CSS 픽셀 기준 크기 = 게임 월드 좌표 */
  width: number;
  height: number;
  dpr: number;
}

/**
 * 컨테이너 크기에 맞춰 캔버스 해상도를 관리한다.
 *
 * - ResizeObserver로 CSS 크기를 추적 (창 크기 변경 / 화면 회전 / 주소창 접힘)
 * - 실제 backing store는 devicePixelRatio를 곱해 잡고 ctx를 scale → 레티나에서도 선명
 * - 게임 로직은 CSS 픽셀 좌표만 다루면 된다
 */
export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0, dpr: 1 });

  const applySize = useCallback((width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    // 고해상도 기기에서 메모리가 과해지지 않도록 상한을 둔다
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const backingWidth = Math.round(width * dpr);
    const backingHeight = Math.round(height * dpr);

    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }

    setSize((prev) =>
      prev.width === width && prev.height === height && prev.dpr === dpr
        ? prev
        : { width, height, dpr },
    );
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const rect = container.getBoundingClientRect();
      applySize(Math.round(rect.width), Math.round(rect.height));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    // 모바일 주소창 접힘·화면 회전은 ResizeObserver가 놓칠 때가 있어 보조로 붙인다
    window.addEventListener("orientationchange", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, [applySize]);

  /** 렌더 직전에 호출: 변환행렬을 dpr 기준으로 초기화한 2D 컨텍스트를 준다 */
  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    return ctx;
  }, [size.dpr]);

  return { canvasRef, containerRef, size, getContext };
}
