import { BRICK_COLORS, DIFFICULTY_PRESETS } from "./constants";
import type { Brick, Difficulty } from "./types";

/**
 * 스테이지별 벽돌 배치 패턴.
 * (col, row, cols, rows) → 해당 칸에 벽돌을 둘지 여부.
 */
const PATTERNS: Array<(c: number, r: number, cols: number, rows: number) => boolean> = [
  // 0. 꽉 찬 벽
  () => true,
  // 1. 체커보드
  (c, r) => (c + r) % 2 === 0 || r === 0,
  // 2. 피라미드
  (c, r, cols) => {
    const half = (cols - 1) / 2;
    return Math.abs(c - half) <= half - r * 0.9;
  },
  // 3. 양 끝을 비운 아치
  (c, r, cols, rows) => !(r >= rows - 2 && (c === 0 || c === cols - 1)),
  // 4. 세로 줄무늬
  (c, r, cols) => c % 3 !== 1 || r === 0 || c === cols - 1,
];

/** 캔버스 폭에 맞춰 열 개수를 정한다 (모바일 5열 ~ 데스크톱 12열) */
function columnsFor(width: number): number {
  return Math.max(5, Math.min(12, Math.round(width / 74)));
}

/**
 * 현재 캔버스 크기와 스테이지에 맞는 벽돌 배열을 만든다.
 * 좌표는 모두 캔버스 CSS 픽셀 기준(=월드 좌표).
 */
export function createBricks(
  width: number,
  height: number,
  difficulty: Difficulty,
  stage: number,
): Brick[] {
  const preset = DIFFICULTY_PRESETS[difficulty];
  const cols = columnsFor(width);
  const aspect = height / width;

  // 세로로 긴 화면(모바일)일수록 줄을 더 얹어 상단이 허전해지지 않게 한다
  const extraRows = Math.round(Math.max(0, Math.min(3, (aspect - 0.95) * 2.4)));
  // 스테이지가 오를수록 한 줄씩 늘어난다
  const rows = Math.min(9, preset.rows + extraRows + Math.floor((stage - 1) / 2));

  const gap = Math.max(4, Math.round(width * 0.012));
  const sidePadding = Math.max(10, Math.round(width * 0.035));
  const topPadding = Math.round(height * 0.075);

  const brickWidth = (width - sidePadding * 2 - gap * (cols - 1)) / cols;
  // 세로 화면에서는 벽돌을 조금 더 두껍게 해서 빈 공간을 줄인다
  const thickness = Math.max(0.4, Math.min(0.56, 0.4 + (aspect - 0.9) * 0.12));
  // 벽돌 영역은 화면 상단 52% 안에 들어오도록 높이를 제한한다
  const maxRowHeight = (height * 0.52 - topPadding) / rows - gap;
  const brickHeight = Math.max(11, Math.min(brickWidth * thickness, maxRowHeight));

  const pattern = PATTERNS[(stage - 1) % PATTERNS.length];
  // 3스테이지부터 일부 벽돌은 2번 맞아야 깨진다
  const toughRows = stage >= 3 ? Math.min(2, Math.floor((stage - 1) / 2)) : 0;

  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!pattern(c, r, cols, rows)) continue;

      const maxHits = r < toughRows ? 2 : 1;
      bricks.push({
        x: sidePadding + c * (brickWidth + gap),
        y: topPadding + r * (brickHeight + gap),
        width: brickWidth,
        height: brickHeight,
        color: BRICK_COLORS[r % BRICK_COLORS.length],
        hits: maxHits,
        maxHits,
        // 위쪽 줄일수록 고득점
        points: Math.round((rows - r) * 10 * preset.scoreMultiplier),
        breaking: 0,
        flash: 0,
      });
    }
  }
  return bricks;
}
