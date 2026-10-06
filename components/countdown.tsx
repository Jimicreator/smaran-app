"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/utils";

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), interval); return () => window.clearInterval(id); }, [interval]);
  return now;
}

export function Countdown({ startTime, compact = false }: { startTime: string; compact?: boolean }) {
  const now = useNow();
  const diff = new Date(startTime).getTime() - now;
  const overdue = diff <= 0;
  return <span className={compact ? "font-mono text-xs" : "font-mono text-lg font-semibold tracking-tight"}>{overdue ? "LIVE" : `T−${formatCountdown(diff)}`}</span>;
}
