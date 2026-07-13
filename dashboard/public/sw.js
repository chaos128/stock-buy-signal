// 최소 서비스워커 — PWA 설치 가능성(installability) 확보용.
// fetch 핸들러의 "존재"가 Chrome 설치 조건을 충족시킴. 캐싱/오프라인 전략은 v2.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // 패스스루 (respondWith 안 함 → 브라우저 기본 네트워크 동작)
});
