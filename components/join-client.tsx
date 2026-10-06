"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Loader2, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ensureGuestSession } from "@/lib/supabase/browser-auth";
import { enableDeviceAlerts } from "@/lib/push";
import { joinGroupClient } from "@/lib/client-operations";
import { friendlySupabaseError } from "@/lib/utils";
import { Input, Button, Label, Pill } from "./primitives";

const DISPLAY_KEY = "smaran.displayName";

export function JoinClient({ code }: { code: string }) {
  const client = useMemo(() => createClient(), []);
  const [displayName, setDisplayName] = useState("");
  const [starting, setStarting] = useState(true);
  const [joining, setJoining] = useState(false);
  const [enablingAlerts, setEnablingAlerts] = useState(false);
  const [error, setError] = useState("");
  const [alertsMessage, setAlertsMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await ensureGuestSession(client); if (alive) setDisplayName(localStorage.getItem(DISPLAY_KEY) ?? ""); }
      catch (err) { if (alive) setError(friendlySupabaseError(err instanceof Error ? err.message : "Unable to start guest session.")); }
      finally { if (alive) setStarting(false); }
    })();
    return () => { alive = false; };
  }, [client]);

  async function enableAlerts() {
    setEnablingAlerts(true); setAlertsMessage("");
    try {
      const result = await enableDeviceAlerts(client);
      setAlertsMessage(result.ok ? result.push ? "Device alerts are enabled." : "Browser notifications are enabled. Full background push will be available after VAPID is configured in production." : result.error);
    } finally { setEnablingAlerts(false); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setJoining(true); setError("");
    const result = await joinGroupClient(client, code, displayName);
    if (!result.ok) { setError(result.error); setJoining(false); return; }
    localStorage.setItem(DISPLAY_KEY, displayName.trim());
    window.location.assign(`/dashboard?group=${result.data.group_id}`);
  }

  return <main className="min-h-screen px-4 py-5 sm:px-8"><div className="mx-auto flex min-h-[90vh] max-w-xl items-center justify-center"><div className="w-full rounded-[28px] border border-white/8 bg-[#0b0e14] p-6 shadow-2xl shadow-black/40 sm:p-8"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black"><BellRing size={18}/></div><div className="mt-7"><div className="text-xs uppercase tracking-[.15em] text-white/30">Smaran invite</div><div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-3xl font-semibold tracking-[-.04em]">Join group</h1><Pill className="font-mono">{code}</Pill></div><p className="mt-3 text-sm leading-6 text-white/40">Enter your name, join instantly, and the group's reminders will appear on your device.</p></div>{starting ? <div className="mt-8 flex items-center gap-2 text-sm text-white/35"><Loader2 size={15} className="animate-spin"/> Starting secure guest access…</div> : <form onSubmit={submit} className="mt-8 space-y-4"><div><Label>Your display name</Label><Input autoFocus value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 40))} placeholder="Jitesh" maxLength={40}/></div>{error && <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-sm leading-5 text-rose-300">{error}</div>}<Button type="submit" loading={joining} disabled={!displayName.trim()} className="w-full"><ArrowRight size={15}/> Join instantly</Button></form>}<div className="mt-5 rounded-2xl border border-indigo-400/10 bg-indigo-400/[.035] p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-400/10"><Smartphone size={16} className="text-indigo-200"/></div><div><div className="text-sm font-medium">Set up device alerts</div><div className="text-xs text-white/28">Recommended on every phone.</div></div></div><p className="mt-2 text-xs leading-5 text-white/35">Allow notifications once so Smaran can alert this device when a shared alarm fires.</p><Button className="mt-3 w-full" variant="secondary" loading={enablingAlerts} onClick={() => void enableAlerts()}>Enable device alerts</Button>{alertsMessage && <p className="mt-2 text-xs leading-5 text-indigo-200/70">{alertsMessage}</p>}</div><div className="mt-7 flex flex-col gap-3 border-t border-white/7 pt-5 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between"><span>Smaran uses guest access; Google is optional.</span><Link href="/" className="hover:text-white">Back to Smaran</Link></div></div></div></main>;
}
