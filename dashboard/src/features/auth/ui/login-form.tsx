"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/shared/api/supabase/client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        router.refresh();
        router.push("/");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        // 이메일 확인 꺼짐 → 즉시 로그인
        router.refresh();
        router.push("/");
      } else {
        setMessage("확인 이메일을 보냈어요. 메일의 링크로 인증한 뒤 로그인하세요.");
      }
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={6}
        />
      </div>

      {message && <p className="text-sm text-destructive">{message}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "처리 중..." : mode === "signin" ? "로그인" : "회원가입"}
      </Button>

      <button
        type="button"
        className="text-sm text-muted-foreground hover:underline"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMessage(null);
        }}
      >
        {mode === "signin" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
      </button>
    </form>
  );
}
