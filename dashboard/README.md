# dashboard (Next.js App Router, PWA)

매수 신호 시각 대시보드. Supabase read-only(유저 JWT + RLS). Vercel 배포.

**스택**: Next.js 16 (App Router, RSC) · React 19 · Tailwind v4 · shadcn/ui(new-york 계열 `base-nova`, base-ui) · lucide · `@supabase/ssr`

## 구조 — Feature-Sliced Design

레이어(위→아래, import 는 아래로만): `app → views → widgets → features → entities → shared`

- **`app/`** — Next App Router(라우팅) + FSD app 레이어 흡수(`layout.tsx`=providers/스타일). 라우트 `page.tsx`는 얇게 두고 `views` 슬라이스를 import.
- **`views/`** — 라우트별 조립 화면. ⚠️ FSD 표준의 `pages` 레이어를 **`views`로 rename** — `src/pages/`는 Next가 Pages Router로 오인하기 때문.
- **`widgets/`** — signal-chart, score-panel, alert-history-table, backtest-results, watchlist-grid
- **`features/`** — auth, manage-subscription, edit-alert-settings
- **`entities/`** — symbol, signal, subscription, alert, backtest
- **`shared/`** — `ui/`(shadcn 프리미티브), `lib/`(cn 등 유틸), `api/`(supabase client/server + `database.types.ts`), `config/`

## shadcn/ui

`components.json` aliases 를 FSD 에 맞춰 매핑: `ui → @/shared/ui`, `utils → @/shared/lib/utils`, `lib → @/shared/lib`, `hooks → @/shared/lib/hooks`.
컴포넌트 추가: `pnpm dlx shadcn@latest add <name>` → `src/shared/ui/` 에 생성됨.
컨벤션(monorepo 참고): named export, kebab-case 파일, `data-slot`, `cva`, `cn`(clsx+tailwind-merge), 클래스 기반 다크모드(OKLCH 토큰).

## 개발

- 환경변수: `.env.local` (`cp .env.example .env.local`) — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (공개 안전, RLS 보호)
- `pnpm dev` / `pnpm build` / `pnpm exec tsc --noEmit`

상세 결정: [../plans/architecture.md](../plans/architecture.md) §3.1
