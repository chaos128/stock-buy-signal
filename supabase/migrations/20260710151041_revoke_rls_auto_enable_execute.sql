-- 0003 — rls_auto_enable 의 RPC 노출 제거
--
-- rls_auto_enable 는 이벤트 트리거(ensure_rls, ddl_command_end)에 연결된 SECURITY DEFINER 함수로,
-- 새 테이블 생성 시 RLS 를 자동 활성화하는 안전장치다(이 프로젝트에 사전 설치되어 있었음).
-- 이벤트 트리거 실행은 EXECUTE grant 와 무관하므로 revoke 해도 자동-RLS 기능은 유지되고,
-- REST(/rest/v1/rpc/...) 직접 호출 노출만 제거된다.
-- (security advisor: anon/authenticated_security_definer_function_executable 해소)
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
