# BREAKOUT · 벽돌깨기

PC(키보드 · 마우스)와 모바일(터치 드래그)을 모두 지원하는 반응형 레트로 벽돌깨기 게임입니다.
Next.js App Router + TypeScript + Tailwind CSS + HTML5 Canvas로 구현했습니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 정적 사이트를 out/ 에 생성
npm run typecheck
```

> `output: "export"` 를 쓰므로 `next start` 는 동작하지 않습니다.
> 빌드 결과를 확인하려면 `out/` 을 정적 서버로 서빙하세요. (`npx serve out`)
>
> 배포 시에만 `/breakeout` 하위 경로가 `basePath` 로 붙습니다.
> 로컬에서 배포와 동일한 경로를 재현하려면 `GITHUB_PAGES=true npm run build` 로 빌드하면 됩니다.

## 배포 (GitHub Pages)

`main` 브랜치에 푸시하면 [deploy.yml](.github/workflows/deploy.yml) 워크플로가
타입 검사 → 정적 빌드 → Pages 배포까지 자동으로 처리합니다.

**최초 1회만** 저장소 설정이 필요합니다.
워크플로 토큰(`GITHUB_TOKEN`)으로는 Pages 사이트를 생성할 수 없어서
(`Resource not accessible by integration`) 이 단계는 자동화할 수 없습니다.

1. GitHub 저장소 → **Settings** → **Pages**
2. **Build and deployment** → **Source** 를 `GitHub Actions` 로 변경
3. **Actions** 탭 → 실패한 `Deploy to GitHub Pages` 실행 → **Re-run jobs**

배포 주소: **https://yangseungwook.github.io/breakeout/**

저장소 이름을 바꾸면 [next.config.ts](next.config.ts) 의 `BASE_PATH` 도 함께 바꿔야 합니다.
사용자/조직 사이트(`<username>.github.io` 저장소)로 옮기는 경우에는 `BASE_PATH` 를 `""` 로 비우면 됩니다.

## 조작

| 환경 | 조작 |
| --- | --- |
| PC 키보드 | `←` `→` 또는 `A` `D` 로 패들 이동, `Space`/`Enter` 발사, `P`/`Esc` 일시정지 |
| PC 마우스 | 캔버스 위에서 마우스를 움직이면 패들이 따라옴, 클릭으로 발사 |
| 모바일 | 화면을 터치한 채 좌우 드래그, 탭으로 발사 |

키 입력은 `event.key`가 아니라 `event.code`로 처리해서 한글 IME가 켜져 있어도 A/D/P가 동작합니다.

## 구조

```
src/
├─ app/
│  ├─ layout.tsx          메타데이터 · viewport(확대 차단, viewport-fit=cover)
│  ├─ page.tsx
│  └─ globals.css         Tailwind · 오버스크롤 차단 · CRT 스캔라인
├─ components/game/
│  ├─ BreakoutGame.tsx    메뉴 ↔ 게임 화면 전환, 저장소 연동
│  ├─ StartScreen.tsx     닉네임 · 난이도 선택 · 최고 점수 · TOP 5
│  ├─ GameScreen.tsx      상단바 + 캔버스 + 하단 HUD 레이아웃, 일시정지 오버레이
│  ├─ GameCanvas.tsx      엔진 ↔ DOM 이벤트 연결 (포인터 · 키보드 · 사운드)
│  ├─ ControlBar.tsx      Sound / Restart / Pause / Main
│  ├─ Hud.tsx             Score · Best · Speed · Lives
│  └─ ResultScreen.tsx    결과 모달 (최고 기록 갱신 알림, 재도전)
├─ game/
│  ├─ engine.ts           물리 · 충돌 · 규칙 (DOM 비의존, 단위 테스트 가능)
│  ├─ renderer.ts         Canvas 2D 드로잉
│  ├─ levels.ts           스테이지별 벽돌 배치 생성
│  ├─ audio.ts            WebAudio 오실레이터 효과음 (오디오 파일 없음)
│  ├─ constants.ts        난이도 프리셋 · 속도 곡선 상수
│  └─ types.ts
├─ hooks/
│  ├─ useCanvas.ts        ResizeObserver + devicePixelRatio 캔버스 관리
│  └─ useGameLoop.ts      requestAnimationFrame 루프 (unmount 시 cancel)
├─ lib/
│  ├─ storage.ts          리더보드(Supabase ↔ LocalStorage 폴백) · 설정 저장
│  └─ supabase.ts         브라우저용 Supabase 클라이언트 (env 없으면 null)
└─ ...

supabase/migrations/      scores 테이블 · RLS 정책 SQL
```

## 설계 메모

**해상도 독립 물리** — 게임 좌표계는 캔버스의 CSS 픽셀을 그대로 쓰고, 공 속도는
`캔버스 높이 × 비율(초당)`로 정의합니다. 덕분에 320px 폰이든 1200px 데스크톱이든
체감 난이도가 같고, 창 크기가 바뀌면 진행 중인 오브젝트를 비율에 맞춰 옮기므로
플레이 도중 화면을 회전해도 게임이 끊기지 않습니다.

**고정 타임스텝** — 물리는 1/240초 고정 스텝으로 돌리고 렌더링만 프레임에 맞춥니다.
144Hz 모니터와 60Hz 모니터의 결과가 같고, 빠른 공이 벽돌을 뚫고 지나가지 않습니다.
탭을 전환했다 돌아왔을 때 밀린 시간만큼 폭주하지 않도록 프레임당 스텝 수에 상한을 뒀습니다.

**리렌더 최소화** — 엔진은 mutable 객체를 직접 갱신하고, 점수 · 목숨 · 상태처럼
UI에 보이는 값이 **실제로 바뀐 프레임에만** React setState를 호출합니다.
프레임마다 리렌더가 발생하지 않습니다.

**모바일 대응** — 캔버스에 `touch-action: none`, body에 `overscroll-behavior: none`을 적용해
드래그 중 스크롤 · 당겨서 새로고침이 발생하지 않습니다. 포인터 좌표는 항상
`getBoundingClientRect()` 기준으로 환산하므로 확대/축소 상태에서도 어긋나지 않습니다.
마우스는 버튼을 누르지 않아도 추적하고, 터치는 화면에 닿아 있는 동안만 추적합니다.

**난이도 곡선** — 100점마다 공 속도 +5%, 스테이지 클리어마다 +8%, 상한 ×2.2입니다.
스테이지가 오르면 벽돌 배치 패턴이 바뀌고(꽉 찬 벽 → 체커보드 → 피라미드 → 아치 → 줄무늬),
3스테이지부터는 2번 맞아야 깨지는 벽돌이 섞입니다.

## 점수 저장 (Supabase)

환경변수가 설정돼 있으면 **모든 플레이어가 공유하는 리더보드**를 Supabase에서 읽고 씁니다.
설정이 없거나 네트워크가 끊기면 자동으로 `LocalStorage` 기록으로 폴백하므로
키 없이도 게임은 그대로 동작합니다. (닉네임 · 난이도 · 사운드 설정은 기기별 값이라 항상 로컬 저장)

### 설정 순서

1. **Supabase 프로젝트 생성** — [supabase.com/dashboard](https://supabase.com/dashboard) → New project
   (Region은 `Northeast Asia (Seoul)` 권장, DB 비밀번호는 따로 보관)
2. **테이블 생성** — 대시보드 좌측 **SQL Editor** 에서
   [supabase/migrations/20260731000000_create_scores.sql](supabase/migrations/20260731000000_create_scores.sql)
   내용을 붙여넣고 실행
3. **키 복사** — **Project Settings → API** 에서 `Project URL` 과 `anon public` 키 확인
4. **로컬 설정** — `.env.example` 을 `.env.local` 로 복사하고 위 두 값을 채운 뒤 `npm run dev`
5. **배포 설정** — GitHub 저장소 → **Settings → Secrets and variables → Actions → Variables** 탭에서
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 를 등록 (등록 후 재배포 필요)

### 보안 메모

정적 사이트라 서버가 없고, `NEXT_PUBLIC_*` 값은 빌드 시 브라우저 번들에 그대로 들어갑니다.
anon key는 원래 공개를 전제로 한 키라서 노출 자체는 문제가 아니지만,
**실제 권한은 전적으로 RLS 정책이 결정**합니다. 위 SQL은 다음을 보장합니다.

- `select` · `insert` 만 허용 → 남의 기록을 수정하거나 삭제할 수 없음
- `CHECK` 제약으로 닉네임 길이 · 난이도 값 · 점수/스테이지 범위를 DB에서 검증
- `service_role` 키는 절대 클라이언트에 넣지 않음

anon key가 공개된 이상 임의의 점수를 밀어 넣는 것 자체는 막을 수 없습니다.
엄격한 검증이 필요하면 Edge Function으로 삽입을 감싸거나 익명 로그인 + 레이트 리밋을 붙여야 합니다.
