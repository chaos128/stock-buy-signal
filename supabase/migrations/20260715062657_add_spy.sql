-- SPY 큐레이션 종목 추가 (v1: QQQ 에 이어 두 번째 US ETF)
insert into public.curated_symbols (symbol, display_name, market, market_context_symbol)
values ('SPY', 'SPDR S&P 500 ETF Trust', 'US', '^VIX')
on conflict (symbol) do nothing;
