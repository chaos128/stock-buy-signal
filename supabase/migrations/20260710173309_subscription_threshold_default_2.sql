-- 0004 — subscriptions.score_threshold 기본값 3 → 2
--
-- v1 은 점수 층이 2개(층2 pullback + 층3 VIX regime)뿐이라 score 최대가 2.
-- 기본값 3 은 도달 불가 → 발송이 안 됨. v1 발송 기준을 "둘 다 정렬(score>=2)"로.
-- (breadth 층4 가 붙는 v2 에서 max 3 이 되면 그때 상향 검토)
alter table public.subscriptions alter column score_threshold set default 2;
