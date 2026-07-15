import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";

import { getCurrentUser } from "@/api-client/supabase/server";
import { Navigation } from "@/components/navigation";
import { PwaRegister } from "@/components/pwa-register";
import { ReactQueryClientProvider } from "@/components/react-query-client-provider";

import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "매수 신호 알림",
  description: "QQQ 등 종목의 매수 관심 신호를 점수제로 알림",
  appleWebApp: { capable: true, title: "매수신호", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="ko" className="dark">
      <body className={poppins.className}>
        <ReactQueryClientProvider>
          <Navigation userEmail={user?.email ?? null} />
          {children}
          <PwaRegister />
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
