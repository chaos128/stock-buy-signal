# 매수 신호 알림 — 아키텍처 & 구현 결정

> 신호 로직·전략 상세는 [buy-signal-alert-spec.md](./buy-signal-alert-spec.md) 참고.
> 이 문서는 그 스펙을 **어떻게 구현할지**(스택·구조·스키마·스케줄·알림)를 확정한다.
>
> **배포 형태:** 멀티테넌트 서비스로 설계한다. 단 **v1은 나 + 지인 비공개**로 운영하고,
> **공개(대중 SaaS)는 아래 [공개 게이트](#8-공개-게이트-external-blockers)의 외부 블로커를
> 해소한 뒤에만** 켠다. "추후 공개 가능"을 가정해 지금부터 멀티유저 구조로 짓되,
> 공개를 막는 건 코드가 아니라 데이터 라이선스·규제라는 점을 전제로 한다.

---

## 1. 확정 결정 요약 (decision log)

| 항목 | 결정 | 이유 |
|---|---|---|
| 배포 형태 | **멀티테넌트, v1 비공개 베타** | 공개는 외부 블로커 게이트 뒤로. 구조는 처음부터 멀티유저 |
| 인증·격리 | **Supabase Auth + RLS** | 유저별 데이터 격리를 DB 레벨에서. 우리가 이미 Supabase 선택 |
| 신호 엔진 언어 | **Python** | 지표 수학은 검증된 `pandas`/`pandas_ta` 사용, 백테스트도 같은 함수 재사용 |
| 대시보드 | **Next.js (App Router) PWA** | SSR로 auth 게이팅·초기 데이터 서버 페치. RSC·Supabase SSR-auth·생태계 성숙. 양쪽 OS 동일 |
| 대시보드 구조 | **Feature-Sliced Design** (§3.1) | 프론트 전용 방법론이라 `dashboard/`에만. Python 엔진엔 미적용 |
| 신호 로직 위치 | **Python에만 존재** | 대시보드는 Supabase 저장값을 **그리기만** 함 → 로직 이중화 없음 |
| 신호 계산 단위 | **고유 종목당 1회 (공유)** | QQQ를 N명이 봐도 계산 1번. "신호 계산(종목별)"과 "알림 발송(유저별)" 분리 |
| 저장소 / 이음새 | **Supabase** | Python 잡이 service-role로 write, 대시보드가 유저 JWT로 RLS read |
| 스케줄링 | **스케줄 워커 (Fly/Railway cron 또는 Supabase pg_cron)** | GitHub Actions는 개인 스크립트엔 OK지만 서비스엔 부적합(CI 인프라) |
| 실행 주기 | **1일 1회, 미장 마감 후 (ET 16:30)** | 모든 지표가 종가 기준 → 마감 후에야 값 확정 |
| 알림 채널 | **이메일 (트랜잭셔널: Resend 등)** | 하루 1회 비긴급. 발송부는 인터페이스로 추상화해 채널 교체 쉽게 |
| 종목 범위 | **큐레이션된 소수 고정** | 유료 데이터 벤더 회피 → yfinance로 버팀. 유저는 이 목록 안에서 구독 |
| breadth (층4) | **v2로 이연** | 데이터 확보가 최대 난관. v1은 층1~3 |

### 기각된 대안과 이유
- **처음부터 공개 SaaS** — 데이터 상업 라이선스·규제(유사투자자문업)가 코드보다 큰 블로커. 비공개 베타로 개발 막힘 없이 진행하고 공개만 게이트.
- **사용자 자유 종목 추가** — 임의 종목은 유료 데이터 벤더 사실상 필수(월 비용). 큐레이션 소수면 yfinance로 버팀.
- **네이티브 앱(Capacitor/RN/Flutter)** — 목표가 "기능(알림+시각)만". iPhone 푸시 제약은 **이메일로 우회**하므로 네이티브 불필요.
- **TS 단일 앱** — 지표 수학·백테스트를 손으로 구현. Python 생태계 이점 포기. 대시보드가 순수 표시라 언어 분리 비용도 낮음.
- **TanStack Start (대시보드 프레임워크)** — FSD+Vite 궁합은 좋으나, 사용자가 Next도 회사에서 쓰고(fluency 중립), SSR/RSC·Supabase SSR-auth 미들웨어·생태계 성숙도가 Next 우위. SSR은 둘 다 되지만 성숙도에서 갈림.
- **장중 N분 감시** — 지표가 종가 기준이라 장중 값은 미확정(마감 때 뒤집힘).
- **GitHub Actions cron (프로덕션)** — 서비스엔 시크릿·스케일·로그가 부적합. 스케줄 워커로 이동.

---

## 2. 시스템 아키텍처

```
                 ┌───────────────────────────────────────┐
  스케줄 워커     │  Python engine (1일 1회, ET16:30)       │
  (cron)          │                                         │
      ────────────▶  1) curated_symbols 로드                │
                 │  2) 고유 종목당 신호 1회 계산 (공유)      │
                 │     fetch → 지표 → 층 판정 → score        │
                 │     → signal_snapshots write             │
                 │  3) 그 종목 구독자별로 fan-out:          │
                 │     유저 임계치/스로틀 판정 → 새 신호면   │
                 │     alerts write + 이메일 발송            │
                 └───────┬───────────────────┬──────────────┘
              service-role│ write             │ 새 신호일 때만
                          ▼                   ▼
                   ┌──────────────┐      ┌──────────────┐
                   │  Supabase    │      │  이메일       │
                   │  (Auth+RLS)  │      │  (Resend)    │
                   │  snapshots,  │      │  + 수신거부   │
                   │  subscriptions,│    └──────────────┘
                   │  alerts, state│
                   └──────┬───────┘
                    유저 JWT│ RLS read-only
                          ▼
                   ┌──────────────────────┐
                   │ Next.js PWA (Vercel)  │
                   │ 로그인, 종목 구독,     │
                   │ lightweight-charts,   │
                   │ score, 알림 이력,     │
                   │ 백테스트 결과         │
                   └──────────────────────┘
```

**핵심 원칙 2개:**
1. 신호 계산은 **고유 종목당 1회** (유저 수와 무관). 계산 결과는 전 구독자 공유.
2. 신호 계산(종목별) ↔ 알림 발송(유저별 임계치·스로틀)을 **분리**. 대시보드는 재계산 없이 저장값 렌더만.

---

## 3. 레포 구조 (monorepo)

```
stock-buy-signal/
  engine/                    # Python(uv) — 신호 소스 오브 트루스 (+ 백테스트)
    fetch.py                 # yfinance 일봉 (인덱스 날짜 정규화로 심볼 간 정렬 보장)
    indicators.py            # SMA, Bollinger(ddof=0), Wilder RSI, ATR
    signals.py               # 층별 boolean + score (순수 함수)
    sanity_check.py          # 실데이터 신호 확인 스크립트
    risk.py                  # 손절/익절/손익비 (예정)
    event_calendar.py        # FOMC/CPI/고용 D-1 게이트 (예정)
    dispatch.py              # 종목 스냅샷 → 구독자 fan-out (예정)
    notify.py                # 발송 인터페이스, Resend (예정)
    store.py                 # Supabase (service-role) read/write (예정)
    main.py                  # 워커 엔트리 (예정)
    backtest/                # engine.signals 재사용 — 과거 리플레이 + 검증
      simulate.py            # 트레이드 시뮬 (ATR 손절, 중심선 목표)
      metrics.py             # 승률/평균R/기대값/MDD
      run.py                 # 전체 이력 실행 (uv run python -m backtest.run)
    tests/                   # 지표·신호 pin/behavioral 테스트
  dashboard/                 # Next.js (App Router) PWA — Vercel — 아래 §3.1 FSD 구조
  supabase/
    migrations/              # 스키마 + RLS 정책
  plans/
    buy-signal-alert-spec.md
    architecture.md          # (이 문서)
```

- `engine/signals.py`의 판정 함수는 **입력이 가격 시계열, 출력이 층별 boolean+score인 순수 함수**. 라이브 잡(`engine/main.py`)과 백테스트(`engine/backtest/`)가 그대로 공유.
- **백테스트는 `engine/` 안의 서브패키지**다. `engine.signals`/`indicators` 를 직접 import 하므로 별도 최상위 디렉토리로 두면 경로 해킹이 필요 → 같은 Python 프로젝트(uv)로 합쳐 import 를 깔끔히 유지.
- **FSD 적용 범위**: Feature-Sliced Design은 **프론트엔드 전용 방법론**이라 `dashboard/`에만 적용한다. `engine/`(Python)·`supabase/`(SQL)는 FSD 대상이 아니며 기능별 모듈 구조를 따른다.

### 3.1 `dashboard/` — Feature-Sliced Design

레이어(위→아래): **app → pages → widgets → features → entities → shared**.
import 규칙: **각 레이어는 자신보다 아래 레이어만 import**. 같은 레이어의 다른 슬라이스끼리는 import 금지.
`processes`는 deprecated라 쓰지 않는다.

```
dashboard/src/
  app/                        # Next App Router (라우팅) + FSD app 레이어 흡수
    layout.tsx                # 루트 레이아웃 = FSD app 레이어 역할 (providers·전역 스타일 마운트)
    providers.tsx             # Supabase, TanStack Query, Theme, PWA(service worker) 등록
    <route>/page.tsx          # 각 라우트 — 얇게, pages 슬라이스만 import
    globals.css               # 전역 스타일 (Tailwind entry)
  pages/                      # FSD pages 레이어 (App Router라 Next Pages Router와 충돌 없음)
    login/
    watchlist/                # 구독 종목 개요
    symbol-detail/            # 단일 종목 신호 상세(차트)
    alerts/                   # 알림 이력
    backtest/                 # 백테스트 결과
    settings/                 # 구독/알림 설정
  widgets/                    # 자족적인 큰 UI 블록
    signal-chart/             # 캔들 + BB + RSI/VIX 서브차트
    score-panel/              # 층별 breakdown + score
    alert-history-table/
    backtest-results/
    watchlist-grid/
  features/                   # 유저 액션(비즈니스 가치)
    auth/                     # 로그인/로그아웃 (Supabase Auth)
    manage-subscription/      # 종목 구독/해지
    edit-alert-settings/      # 임계치(score_threshold)/스로틀(throttle_days) 편집
  entities/                   # 비즈니스 엔티티 — 세그먼트: ui / api / model
    symbol/                   # curated_symbols
    signal/                   # signal_snapshots (지표값·score)
    subscription/
    alert/
    backtest/                 # backtest_results
  shared/                     # 프로젝트 비종속 재사용 (슬라이스 없음, 세그먼트만)
    ui/                       # 프리미티브 (shadcn/ui 등)
    api/                      # supabase 클라이언트, base query
    lib/                      # cn, 숫자·날짜 포맷터, lightweight-charts 어댑터
    config/                   # env, 상수
```

- **슬라이스 안 세그먼트**: `ui`(컴포넌트) / `api`(Supabase 쿼리) / `model`(타입·스토어·쿼리훅) / `lib`(슬라이스 전용 유틸).
- **FSD ↔ Next App Router 정합** (이름 충돌 처리):
  - Next가 `src/app/`을 **라우팅**으로 소유. FSD `app` 레이어 책임(providers·전역 스타일)은 `app/layout.tsx` + `app/providers.tsx`로 **흡수** — 별도 FSD `app` 폴더를 두지 않는다.
  - **App Router 사용**(Pages Router 아님) → `src/pages/`(FSD 레이어)가 Next 라우팅과 충돌하지 않는다.
  - 각 `app/<route>/page.tsx`는 **얇게** — `pages/` 슬라이스 컴포넌트만 import(라우트 정의 ↔ 화면 조립 분리).
- **데이터·인증**: 초기 데이터는 **서버 컴포넌트**에서 Supabase 서버 클라이언트로 페치(첫 페인트에 데이터 존재), 클라 상호작용은 Supabase browser client(+필요시 TanStack Query). **인증 게이팅은 미들웨어**(`@supabase/ssr`)로 authed 셸을 서버 렌더 → 로그인 플래시 제거.
- **읽기 위주 앱**이라 entities·widgets가 무게 중심, features는 가벼움(auth·구독·설정 정도). **레이어를 처음부터 다 채우지 말고** 슬라이스는 필요해질 때 추가 — 빈 레이어 남발 금지.

---

## 4. Supabase 스키마

RLS 관점에서 두 부류로 나뉜다:
- **공유 데이터**(전 인증 유저 read, 엔진만 write): `curated_symbols`, `signal_snapshots`
- **유저 소유 데이터**(본인만 read/write, RLS `user_id = auth.uid()`): `subscriptions`, `alerts`, `alert_state`, `profiles`

엔진은 **service-role 키**로 RLS를 우회해 전체를 read/write. 대시보드는 **anon 키 + 유저 JWT**로 RLS 적용.

### `curated_symbols` — 서비스가 허용한 종목 (공유)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `symbol` | text pk | 예: `QQQ` |
| `display_name` | text | |
| `market` | text | `US` / `KR` (v2) |
| `market_context_symbol` | text | 시장 환경 지표 심볼 (US → `^VIX`) |
| `is_active` | boolean | |

### `signal_snapshots` — 종목별 매 실행 결과 (공유)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid pk | |
| `captured_at` | timestamptz | 잡 실행 시각 |
| `symbol` | text fk → curated_symbols | |
| `close_price` | numeric | |
| `simple_moving_average_200` | numeric | |
| `bollinger_lower` / `bollinger_middle` / `bollinger_upper` | numeric | |
| `relative_strength_index_14` | numeric | |
| `market_context_close` | numeric | 예: VIX 종가 |
| `market_context_moving_average_20` | numeric | 예: VIX SMA20 |
| `trend_gate_passed` | boolean | 층1 게이트 |
| `pullback_signal` | boolean | 층2 |
| `market_regime_signal` | boolean | 층3 |
| `breadth_signal` | boolean | 층4 (v2, null) |
| `score` | int | 층2~4 충족 개수 |
| `indicator_series` | jsonb | 최근 ~250봉 OHLCV+지표 (차트용) |
| — | | unique(`symbol`, `captured_at`) |

### `subscriptions` — 유저별 종목 구독 + 설정 (유저 소유)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid → auth.users | RLS 키 |
| `symbol` | text fk → curated_symbols | |
| `score_threshold` | int | 발송 임계치 (기본 3) |
| `throttle_days` | int | 동일 신호 재알림 억제일 (기본 5) |
| `is_active` | boolean | |
| `created_at` | timestamptz | |
| — | | unique(`user_id`, `symbol`) |

### `alerts` — edge-trigger 발송 이벤트 (유저 소유)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid → auth.users | RLS 키 |
| `subscription_id` | uuid → subscriptions | |
| `symbol` | text | |
| `triggered_at` | timestamptz | |
| `score` | int | |
| `active_signals` | jsonb | 켜진 신호 목록 + 각 지표 현재값 |
| `close_price` | numeric | |
| `stop_price` | numeric | 손절 후보 |
| `target_primary` / `target_secondary` | numeric | 1차/2차 익절 |
| `risk_reward_ratio` | numeric | |
| `risk_reward_sufficient` | boolean | 1:1.5 이상 여부 |
| `event_calendar_warning` | text | FOMC/CPI/고용 D-1 경고 (없으면 null) |
| `macro_check_note` | text | 항상 "매크로 확인 필요" 문구 |
| `email_sent_at` | timestamptz | |

### `alert_state` — 재알림 스로틀 (구독당 1행, 유저 소유)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `subscription_id` | uuid pk → subscriptions | |
| `user_id` | uuid → auth.users | RLS 키 |
| `last_alert_date` | date | 마지막 발송 거래일 |
| `last_signal_fingerprint` | text | 켜진 신호 조합 해시 |

> 스로틀·임계치가 **유저별**이라(같은 QQQ여도 임계치 2 vs 3 유저는 발송 시점이 다름)
> edge-trigger 판정은 **구독 단위**로 한다.

### `backtest_results` — 검증 산출물 (공유, 대시보드 표시용)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid pk | |
| `run_at` | timestamptz | |
| `symbol` | text | |
| `parameters` | jsonb | RSI/BB/SMA 파라미터 세트 |
| `period_start` / `period_end` | date | |
| `is_out_of_sample` | boolean | |
| `win_rate` / `average_r` / `expectancy` / `max_drawdown` | numeric | |
| `trade_count` | int | |
| `equity_curve` | jsonb | 대시보드 차트용 |

---

## 5. 스케줄링

- cron은 UTC 기준 + DST로 ET 오프셋이 바뀜(-4/-5). → 크론 넉넉히 잡고, 잡 시작 시 "지금이 미국 정규장 마감 직후 거래일인가"를 코드로 판정해 아니면 **no-op**.
- 휴장일(주말·미국 공휴일)도 거래일 판정에서 걸러 no-op.
- **인프라**: 비공개 베타 단계에선 워커 하나면 충분(Fly/Railway 컨테이너 cron, 또는 Supabase pg_cron + Edge Function이 Python 워커를 호출/트리거). GitHub Actions는 프로덕션 서비스엔 지양.

---

## 6. 알림 (이메일)

- **edge-trigger**: 신호가 **새로** 켜진 순간에만 1회. `alert_state`로 구독 단위 판정.
- **재알림 스로틀**: 동일 신호 조합이 `throttle_days` 내면 억제. 급락장 BB 하단 연속 터치 폭탄 방지.
- **발송부는 인터페이스로 추상화**(`notify.py`) → Resend 구현. 채널 추가(텔레그램 등) 시 구현만 교체.
- **수신거부 링크 필수**(공개 시 법적). 비공개 베타에도 넣어두면 공개 전환 시 재작업 없음.
- **메시지 필수 포함**(스펙 수용 기준): 켜진 신호 목록 + 각 지표 현재값 / 손절·1·2차 익절 / R:R(부족 시 경고) / 이벤트 D-1 경고 / 항상 "매크로 확인 필요" + "체결 아닌 관심 신호" 명시.

---

## 7. v1 범위 / v2 이연

**v1 (지금 만든다 — 비공개 베타):**
- Supabase Auth 로그인 + RLS
- 큐레이션 종목(QQQ 등 소수) 구독 UI
- 층1~3 신호 계산(종목별 공유) + 유저별 fan-out
- score 기반 이메일 알림 + 손절/익절/RR + 이벤트 게이트 + 스로틀
- React PWA 대시보드 (차트 + 현재 신호 + 알림 이력)
- 백테스트: 승률/평균R/기대값/MDD + 민감도 + out-of-sample

**v2 (이연):**
- 층4 breadth
- 국내 종목(VKOSPI + 코스피 breadth)
- 멀티 타임프레임(주봉 추세 + 일봉 진입)
- 알림 채널 추가(텔레그램 등)

---

## 8. 공개 게이트 (external blockers)

공개(대중 SaaS) 전환은 **코드 완성과 별개로** 아래가 해소돼야 켠다:

1. **⚠️ 규제·법적 책임** — 불특정 다수에게 "매수 신호 + 손절/익절" 제공은 국내 **유사투자자문업** 규제 영역에 닿을 수 있음(무료여도 애매). 최소 **강력한 면책(정보 제공·투자 권유 아님·책임 본인)**, 경우에 따라 **금융위 신고 검토** 필요. → 공개 전 반드시 확인.
2. **💸 시장 데이터 상업 라이선스** — yfinance는 개인/비공개엔 관행상 넘어가나 **상업·공개엔 부적합**(Yahoo ToS, 차단, SLA 없음). 공개 시 유료 벤더(Polygon.io / Twelve Data / Tiingo 등) 계약 → 월 비용.
3. **📧 이메일 딜리버러빌리티** — 규모 시 SPF/DKIM/도메인 인증 + 바운스·수신거부 관리(Resend 등으로 대응).
4. **💰 과금 여부** — 데이터·이메일·컴퓨트 실비용을 무료로 감당할지, freemium/유료로 갈지 결정.

> 설계는 이 게이트들을 **나중에 끼워넣을 수 있게** 되어 있음(데이터 소스 인터페이스, 발송 인터페이스, 수신거부, 멀티테넌트). 공개는 스위치를 켜는 문제가 아니라 위 4개를 푸는 문제.
