# Brick Breaker Game (벽돌깨기) Specs & Guidelines

이 파일은 Claude Code를 활용하여 Next.js 기반 반응형 웹 벽돌깨기 게임을 구현하기 위한 사양서(CLAUDE.md)입니다.

---

## 1. 프로젝트 개요 (Project Overview)
레트로 아케이드 스타일의 웹 기반 벽돌깨기(Breakout / Brick Breaker) 게임입니다.  
사용자는 닉네임과 초기 난이도를 선택하여 게임을 시작하며, 점수 상승에 따른 공 속도 증가, 상단 컨트롤 바 및 하단 HUD를 포함한 레트로 감성의 UI를 제공합니다.  
**PC(키보드 화살표, 마우스) 및 모바일(터치 드래그) 환경을 모두 지원하는 반응형 웹 게임**입니다.

---

## 2. 기술 스택 (Tech Stack)
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Game Engine / Rendering:** HTML5 Canvas API (custom `requestAnimationFrame` loop)
- **State Management:** React State / Context API 또는 Zustand
- **Database & Persistence:** LocalStorage (기본 하이스코어) + Supabase / PostgreSQL (DB 연동 시 유저 스코어 저장)

---

## 3. 화면별 세부 요구사항 (Screen Specifications)

### 3.1. 메인 화면 (Main / Start Screen)
- **사용자 이름 입력:** 플레이어 닉네임(Name) 입력 필드
- **난이도 선택 (Difficulty Select):** 
  - `Easy` (공 속도 느림, 패들 길음)
  - `Normal` (표준 속도 및 크기)
  - `Hard` (공 속도 빠름, 패들 짧음)
- **스타트 버튼 (Start Game):** 닉네임 입력 후 게임 시작
- **최고 점수 표시 (Best Score Display):** 저장된 최고 점수 및 해당 플레이어 이름 표시

### 3.2. 게임 화면 (Game Play Screen)
- **시각적 스타일 (UI Design):**
  - **상단 헤더 바:** `Sound (온/오프)`, `Restart (재시작)`, `Pause(p) (일시정지)` 버튼
  - **게임 플레이 영역 (Canvas):**
    - **반응형 뷰포트:** 스마트폰 해상도부터 PC 대화면까지 Canvas 비율을 가변 유지하며, `touch-action: none` 적용으로 게임 중 모바일 스크롤/바운스 현상 차단.
    - **벽돌 (Bricks):** 둥근 모서리(Capsule / Rounded Rect) 형태의 아케이드 스타일 벽돌. 색상별(파랑, 초록, 빨강, 보라, 노랑 등) 레이어 구조.
    - **공 (Ball):** 주황색 원형의 물리 이동 공.
    - **패들 (Paddle):** 하단 중앙의 둥근 바 형태.
  - **하단 HUD 바:**
    - `Score: [현재 점수]`
    - `Best score: [최고 점수]`
    - 오른쪽 하단: **남은 목숨(Lives)** 아이콘/바 표시 (기본 3개)

- **조작 방식 (Controls):**
  - **PC (Mouse & Keyboard):**
    - 좌우 방향키(`ArrowLeft`, `ArrowRight`) 및 `A`, `D` 키 이동.
    - 마우스 커서 이동(`mousemove`) 시 패들 위치 동기화.
  - **Mobile (Touch):**
    - 터치 드래그(`touchmove` / `pointermove`)로 패들 이동.
    - 화면 좌/우 터치 영역 반응 보정.

- **게임 난이도 동적 조절 (Dynamic Difficulty Curve):**
  - 점수가 일정 구간(예: 매 100점/200점)에 도달할 때마다 공의 이동 속도가 단계적으로 상승.

- **게임 오버 & 승리 조건:**
  - 공이 하단으로 떨어지면 목숨 1 차감. 목숨 0일 경우 게임 오버.
  - 화면의 모든 벽돌을 깨면 클리어 및 다음 스테이지/속도 증가.

### 3.3. 결과 화면 (Result / Scoreboard Screen)
- **최종 점수 (Final Score) & 도달 난이도/스테이지 표시**
- **최고 점수 갱신 여부 (New High Score Notification)**
- **재도전 버튼 (Play Again):** 동일 유저로 게임 재시작
- **메인으로 버튼 (Main Menu):** 닉네임/난이도 재설정

---

## 4. 개발 규칙 및 컨벤션 (Coding Conventions)

1. **컴포넌트 구조:**
   - App Router 규칙 준수 (`src/app/page.tsx`, `src/components/game/...`)
   - Canvas 렌더링 로직은 커스텀 Hook(`useCanvas`, `useGameLoop`)으로 분리하여 관리.
2. **모바일 반응형 & 입력 이벤트:**
   - Pointer Events (`PointerEvent`) 사용을 권장하여 마우스, 터치, 펜 입력을 일관되게 처리.
   - Canvas 좌표 변환 시 `getBoundingClientRect()`를 적용하여 모바일 화면 확대/축소 시 좌표 어긋남 방지.
   - `touch-action: none` CSS 적용으로 게임 터치 도중 브라우저 새로고침이나 스크롤 동작 차단.
3. **상태 관리 및 Clean-up:**
   - 'P' 키 또는 화면 Pause 버튼으로 일시정지 지원.
   - `requestAnimationFrame` 사용 시 컴포넌트 unmount 및 모달 창 전환 시 `cancelAnimationFrame` 필수 처리.

---

## 5. 단계별 구현 체크리스트 (Implementation Steps)

- [ ] 프로젝트 기본 설정 (Next.js, TypeScript, Tailwind CSS)
- [ ] 게임 데이터 타입 정의 (`Player`, `Brick`, `Ball`, `Paddle`, `GameState`)
- [ ] 메인 화면 Form (닉네임 입력 + 난이도 선택 + Start)
- [ ] 반응형 HTML5 Canvas 렌더링 시스템 및 resize 핸들러 구현
- [ ] 멀티 디바이스 입력 핸들러 구현 (마우스, 키보드 화살표, 터치 드래그)
- [ ] 물리 엔진 & 충돌 검출 (공-벽, 공-패들, 공-벽돌 충돌)
- [ ] 상단 컨트롤 바 (Sound, Restart, Pause) & 하단 HUD (Score, Best Score, Lives) UI 구현
- [ ] 점수에 따른 공 속도 동적 증가 로직 구현
- [ ] 게임 오버 / 클리어 모달 및 결과 화면 구현
- [ ] LocalStorage / DB를 통한 최고 점수 기록 저장 및 불러오기