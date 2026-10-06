"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Download, LogIn, Monitor, Radio, ShieldCheck, Smartphone, Volume2, X } from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { enableAlarmAudio, playAlarmPattern } from "@/lib/alarm";
import { enableDeviceAlerts, disableBackgroundPush, pushIsConfigured } from "@/lib/push";
import { Button, Pill } from "./primitives";

type Client = SupabaseClient<Database>;

export function SettingsDrawer({ open, onClose, client, user, displayName, realtimeStatus, online, install, onGoogle }: {
  open: boolean; onClose: () => void; client: Client; user: User | null; displayName: string; realtimeStatus: string; online: boolean; install: () => Promise<void>; onGoogle: () => Promise<void>;
}) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [status, setStatus] = useState("");
  const configured = pushIsConfigured();

  useEffect(() => {
    if (!open) return;
    setStatus("");
    setNotificationsEnabled(typeof Notification !== "undefined" && Notification.permission === "granted");
    if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistration("/").then((registration) => registration?.pushManager.getSubscription().then((sub) => setPushEnabled(Boolean(sub)))).catch(() => undefined);
  }, [open]);
  if (!open) return null;

  async function armSound() {
    const ok = await enableAlarmAudio(); setAudioEnabled(ok);
    if (ok) { playAlarmPattern(); setStatus("Alarm sound is armed. You just heard the test pattern."); }
    else setStatus("The browser blocked audio. Interact with the page and try again.");
  }

  async function toggleDeviceAlerts() {
    setStatus("");
    if (!pushEnabled) {
      const result = await enableDeviceAlerts(client);
      if (!result.ok) { setStatus(result.error); return; }
      setNotificationsEnabled(true); setPushEnabled(Boolean(result.push));
      setStatus(result.push ? "Device alerts are enabled. This device can receive scheduled Smaran push alarms." : "Browser notifications are enabled. Full background push will activate after the production VAPID setup is configured.");
    } else {
      const result = await disableBackgroundPush(client);
      setPushEnabled(false);
      if (!result.ok) setStatus(result.error); else setStatus("Background push disabled on this device.");
    }
  }

  async function browserNotifications() {
    if (!("Notification" in window)) { setStatus("This browser does not support notifications."); return; }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    if (permission === "granted") new Notification("Smaran notifications are working", { body: "This device can receive Smaran alerts." });
    else setStatus("Notification permission was not granted.");
  }

  async function installApp() {
    setInstalling(true); setStatus("");
    try { await install(); } finally { setInstalling(false); }
  }

  return <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm"><aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/8 bg-[#090c11] shadow-2xl shadow-black/70 safe-bottom">
    <div className="flex items-center justify-between border-b border-white/7 px-5 py-4"><div><div className="text-sm font-semibold">Smaran settings</div><div className="mt-1 text-xs text-white/30">Device controls for alarms and notifications.</div></div><button aria-label="Close settings" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[.035] text-white/35 hover:bg-white/[.08] hover:text-white"><X size={15}/></button></div>
    <div className="flex-1 space-y-4 overflow-y-auto p-5">
      <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06]"><ShieldCheck size={16}/></div><div><div className="text-sm font-medium">Identity</div><div className="text-xs text-white/28">{displayName} · {user?.is_anonymous ? "Guest session" : "Google linked"}</div></div></div><Pill className={user?.is_anonymous ? "border-amber-400/15 bg-amber-400/[.04] text-amber-300" : "border-emerald-400/15 bg-emerald-400/[.04] text-emerald-300"}>{user?.is_anonymous ? "GUEST" : "LINKED"}</Pill></div><p className="mt-3 text-xs leading-5 text-white/30">Google is optional. Guest mode is the normal Smaran flow. Linking Google only makes returning from another device easier.</p>{user?.is_anonymous && <Button className="mt-3" variant="secondary" onClick={() => void onGoogle()}><LogIn size={14}/> Link Google</Button>}</div>
      <div className="rounded-2xl border border-indigo-400/10 bg-indigo-400/[.035] p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-400/10"><Smartphone size={16}/></div><div><div className="text-sm font-medium">Device alerts</div><div className="text-xs text-white/28">One-time setup for this phone or browser.</div></div></div><p className="mt-3 text-xs leading-5 text-white/35">Every device needs permission once. After that, shared LOUD alarms can be delivered to that device by Web Push in production.</p><Button className="mt-3" variant={pushEnabled ? "secondary" : "default"} onClick={toggleDeviceAlerts}>{pushEnabled ? <><Check size={14}/> Device alerts enabled</> : <><Bell size={14}/> Enable device alerts</>}</Button>{!configured && <p className="mt-2 text-[11px] leading-5 text-amber-200/55">Local browser notifications work now. Background push requires the VAPID keys on the deployed app.</p>}</div>
      <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06]"><Volume2 size={16}/></div><div><div className="text-sm font-medium">Alarm sound</div><div className="text-xs text-white/28">For the strongest in-tab LOUD takeover.</div></div></div><Button className="mt-3" variant={audioEnabled ? "secondary" : "default"} onClick={armSound}>{audioEnabled ? <><Check size={14}/> Sound armed</> : <><Volume2 size={14}/> Arm + test sound</>}</Button></div>
      <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06]"><Bell size={16}/></div><div><div className="text-sm font-medium">Browser notifications</div><div className="text-xs text-white/28">A lightweight fallback for background tabs.</div></div></div><Pill className={notificationsEnabled ? "border-emerald-400/15 bg-emerald-400/[.04] text-emerald-300" : "border-white/8 bg-white/[.025] text-white/28"}>{notificationsEnabled ? "ON" : "OFF"}</Pill></div><Button className="mt-3" variant="secondary" onClick={browserNotifications}>{notificationsEnabled ? "Test notification" : "Enable / test notification"}</Button></div>
      <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06]"><Monitor size={16}/></div><div><div className="text-sm font-medium">Install Smaran</div><div className="text-xs text-white/28">Add it to the home screen / app launcher.</div></div></div><Button className="mt-3" variant="secondary" loading={installing} onClick={() => void installApp()}><Download size={14}/> Install app</Button></div>
      <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><div className="flex items-center gap-3"><div className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400" : "bg-rose-400"}`}/><div><div className="text-sm font-medium">Connection</div><div className="text-xs text-white/28">{online ? "Internet reachable from the browser" : "Offline — realtime updates are paused"}</div></div></div><div className="mt-3 flex items-center gap-2 text-xs text-white/35"><Radio size={13}/> Realtime: <span className={realtimeStatus === "SUBSCRIBED" ? "text-emerald-300" : "text-amber-300"}>{realtimeStatus}</span></div></div>
      {status && <div className="rounded-2xl border border-indigo-400/15 bg-indigo-400/[.04] p-3 text-xs leading-5 text-indigo-200/75">{status}</div>}
    </div>
    <div className="border-t border-white/7 px-5 py-4 text-[11px] leading-5 text-white/25">Smaran does not require Google. The group itself is the source of truth; device notification permission is handled separately on each phone/browser.</div>
  </aside></div>;
}
