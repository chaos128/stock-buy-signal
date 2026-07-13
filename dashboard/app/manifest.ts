import type { MetadataRoute } from "next";

// Next 가 /manifest.webmanifest 로 서빙하고 <link rel="manifest"> 를 자동 주입.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "매수 신호 알림",
    short_name: "매수신호",
    description: "QQQ 등 종목의 매수 관심 신호를 점수제로 알림",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
