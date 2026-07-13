"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateSubscriptionSettings, type SubscriptionSetting } from "../_actions/settings-actions";

export function SubscriptionSettingsRow({ setting }: { setting: SubscriptionSetting }) {
  const [threshold, setThreshold] = useState(setting.scoreThreshold);
  const [throttle, setThrottle] = useState(setting.throttleDays);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      const result = await updateSubscriptionSettings(setting.id, threshold, throttle);
      if (result.success) {
        setSaved(true);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4">
      <div className="min-w-20">
        <div className="text-base font-semibold text-foreground">{setting.symbol}</div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`threshold-${setting.id}`}>발송 임계 점수</Label>
        <select
          id={`threshold-${setting.id}`}
          value={threshold}
          onChange={(event) => {
            setThreshold(Number(event.target.value));
            setSaved(false);
          }}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value={1}>1 · 관심 (층 하나 정렬)</option>
          <option value={2}>2 · 강한 정렬 (눌림 + VIX)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`throttle-${setting.id}`}>재알림 억제 (일)</Label>
        <Input
          id={`throttle-${setting.id}`}
          type="number"
          min={1}
          max={60}
          value={throttle}
          onChange={(event) => {
            setThrottle(Number(event.target.value));
            setSaved(false);
          }}
          className="w-24"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={pending} size="sm">
          {pending ? "저장 중..." : "저장"}
        </Button>
        {saved && <span className="text-xs text-primary">저장됨 ✓</span>}
      </div>
    </div>
  );
}
