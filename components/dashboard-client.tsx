"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, BellRing, CalendarDays, ChevronDown, CirclePlus, Copy, Menu, Plus, Radio, RefreshCcw, Settings, Share2, Smartphone, UsersRound, WifiOff, X } from "lucide-react";
import { isToday, isTomorrow } from "date-fns";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { ensureGuestSession } from "@/lib/supabase/browser-auth";
import type { EventItem, Group, GroupMember, GroupState } from "@/lib/types";
import { deleteEventClient } from "@/lib/client-operations";
import { enableAlarmAudio, playAlarmPattern, stopAlarmAudio } from "@/lib/alarm";
import { enableDeviceAlerts, pushIsConfigured } from "@/lib/push";
import { friendlySupabaseError, cn } from "@/lib/utils";
import { Button, Pill } from "./primitives";
import { EventCard } from "./event-card";
import { AlarmOverlay } from "./alarm-overlay";
import { EventCreateModal, GroupCreateModal, InviteModal, JoinModal } from "./modals";
import { SettingsDrawer } from "./settings-drawer";

type RealtimePayload = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Record<string, unknown>; old: Record<string, unknown> };

const DISPLAY_KEY = "smaran.displayName";
const firedStorageKey = "smaran.fired";

function useAlarmEngine({ events, onTrigger }: { events: EventItem[]; onTrigger: (event: EventItem) => void }) {
  const firedRef = useRef<Set<string>>(new Set());
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(firedStorageKey);
      if (stored) firedRef.current = new Set(JSON.parse(stored) as string[]);
    } catch {}

    const tick = () => {
      const now = Date.now();
      for (const event of eventsRef.current) {
        if (event.urgency_tier !== "LOUD" || event.status !== "active") continue;
        const due = new Date(event.start_time).getTime();
        if (now >= due && now <= due + 15 * 60_000 && !firedRef.current.has(event.id)) {
          firedRef.current.add(event.id);
          try { sessionStorage.setItem(firedStorageKey, JSON.stringify([...firedRef.current])); } catch {}
          onTrigger(event);
          if ("vibrate" in navigator) navigator.vibrate([250, 100, 250, 100, 500]);
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [onTrigger]);
}

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(searchParams.get("group"));
  const [events, setEvents] = useState<EventItem[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");
  const [online, setOnline] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(searchParams.get("create") === "1");
  const [joinOpen, setJoinOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alarm, setAlarm] = useState<EventItem | null>(null);
  const [audioArmed, setAudioArmed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storedDisplayName, setStoredDisplayName] = useState("");
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [deviceAlerts, setDeviceAlerts] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const loadVersionRef = useRef(0);
  const groupsRef = useRef<GroupState[]>([]);
  const userRef = useRef<User | null>(null);
  groupsRef.current = groups;
  userRef.current = user;

  const selected = groups.find((item) => item.group.id === selectedGroupId) ?? groups[0] ?? null;
  const selectedGroup = selected?.group ?? null;
  const selectedEvents = useMemo(() => selectedGroup ? events.filter((event) => event.group_id === selectedGroup.id) : [], [events, selectedGroup]);
  const displayName = selected?.membership.display_name ?? user?.user_metadata?.display_name ?? storedDisplayName ?? "Guest";

  const loadWorkspace = useCallback(async (userId: string) => {
    const version = ++loadVersionRef.current;
    const { data: ownMemberships, error: ownError } = await supabase.from("group_members").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    if (ownError) throw ownError;
    const groupIds = (ownMemberships ?? []).map((item) => item.group_id);
    if (!groupIds.length) {
      if (version !== loadVersionRef.current) return;
      setGroups([]); setEvents([]); setSelectedGroupId(null); setRealtimeStatus("READY"); return;
    }

    const [{ data: groupRows, error: groupError }, { data: eventRows, error: eventError }] = await Promise.all([
      supabase.from("groups").select("*").in("id", groupIds).order("created_at", { ascending: true }),
      supabase.from("events").select("*").in("group_id", groupIds).order("start_time", { ascending: true }),
    ]);
    if (groupError || eventError) throw groupError ?? eventError;
    if (version !== loadVersionRef.current) return;

    const membershipMap = new Map((ownMemberships ?? []).map((m) => [m.group_id, m]));
    const nextGroups = (groupRows ?? []).map((group) => membershipMap.get(group.id) ? ({ group: group as Group, membership: membershipMap.get(group.id)! } satisfies GroupState) : null).filter(Boolean) as GroupState[];
    setGroups(nextGroups);
    setEvents((eventRows ?? []) as EventItem[]);
    setSelectedGroupId((current) => current && nextGroups.some((item) => item.group.id === current) ? current : nextGroups[0]?.group.id ?? null);
  }, [supabase]);

  useEffect(() => {
    try { setStoredDisplayName(localStorage.getItem(DISPLAY_KEY) ?? ""); } catch {}
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    const beforeInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", beforeInstall as EventListener);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); window.removeEventListener("beforeinstallprompt", beforeInstall as EventListener); };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => registration.update().catch(() => undefined)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof Notification !== "undefined") setDeviceAlerts(Notification.permission === "granted");
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const currentUser = await ensureGuestSession(supabase);
        if (!alive) return;
        setUser(currentUser);
        try { localStorage.setItem(DISPLAY_KEY, currentUser.user_metadata?.display_name ?? localStorage.getItem(DISPLAY_KEY) ?? "Guest"); } catch {}
        await loadWorkspace(currentUser.id);
      } catch (err) {
        if (!alive) return;
        setError(friendlySupabaseError(err instanceof Error ? err.message : "Unable to start Smaran."));
      } finally { if (alive) setBooting(false); }
    };
    void run();
    const { data: subscription } = supabase.auth.onAuthStateChange((_, session) => { setUser(session?.user ?? null); });
    return () => { alive = false; subscription.subscription.unsubscribe(); channelRef.current?.unsubscribe(); };
  }, [loadWorkspace, supabase]);

  useEffect(() => {
    if (!user) return;
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && pushIsConfigured()) {
      void enableDeviceAlerts(supabase).then((result) => { if (result.ok) setDeviceAlerts(true); });
    }
  }, [supabase, user]);

  const announceEvent = useCallback(async (event: EventItem) => {
    if (!userRef.current || event.created_by === userRef.current.id || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (!document.hidden) return;
    const title = event.urgency_tier === "LOUD" ? `LOUD · ${event.title}` : `Smaran · ${event.title}`;
    const body = event.urgency_tier === "LOUD" ? "A shared alarm is due at the scheduled time." : "A shared reminder was added to your group.";
    try {
      const registration = await navigator.serviceWorker?.getRegistration("/");
      if (registration) await registration.showNotification(title, { body, tag: `smaran-event-${event.id}`, requireInteraction: event.urgency_tier === "LOUD", icon: "/smaran-192.png" });
      else new Notification(title, { body, tag: `smaran-event-${event.id}` });
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    channelRef.current?.unsubscribe();
    const channel = supabase.channel(`smaran-workspace-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (payload) => {
        const p = payload as unknown as RealtimePayload;
        if (p.eventType === "INSERT") {
          const row = p.new as unknown as EventItem;
          if (!groupsRef.current.some((g) => g.group.id === row.group_id)) return;
          setEvents((current) => current.some((item) => item.id === row.id) ? current : [...current, row].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
          void announceEvent(row);
          return;
        }
        const id = String(p.old.id ?? p.new.id);
        if (p.eventType === "DELETE") { setEvents((current) => current.filter((item) => item.id !== id)); return; }
        const row = p.new as unknown as EventItem;
        setEvents((current) => current.map((item) => item.id === row.id ? row : item));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => { void loadWorkspace(user.id); })
      .subscribe((status) => setRealtimeStatus(status));
    channelRef.current = channel;
    return () => { channel.unsubscribe(); if (channelRef.current === channel) channelRef.current = null; };
  }, [announceEvent, loadWorkspace, supabase, user]);

  const triggerAlarm = useCallback((event: EventItem) => {
    setSelectedGroupId(event.group_id);
    setAlarm(event);
    if (audioArmed) playAlarmPattern();
  }, [audioArmed]);

  useAlarmEngine({ events, onTrigger: triggerAlarm });

  async function handleCreateGroup(group: Group, name: string) {
    try { localStorage.setItem(DISPLAY_KEY, name); } catch {}
    setStoredDisplayName(name);
    if (user) {
      const optimisticMembership: GroupMember = { id: `local-${group.id}-${user.id}`, group_id: group.id, user_id: user.id, display_name: name, role: "owner", created_at: new Date().toISOString() };
      setGroups((current) => current.some((item) => item.group.id === group.id) ? current : [...current, { group, membership: optimisticMembership }]);
    }
    setSelectedGroupId(group.id);
    setError("");
    if (user) void loadWorkspace(user.id).catch((err) => setError(friendlySupabaseError(err instanceof Error ? err.message : "Group created, but refresh failed.")));
  }

  async function handleJoined(groupId: string, name: string) {
    try { localStorage.setItem(DISPLAY_KEY, name); } catch {}
    setSelectedGroupId(groupId);
    router.replace(`/dashboard?group=${groupId}`);
    if (user) await loadWorkspace(user.id);
  }

  function createAlarmDone(event: EventItem) {
    setEvents((current) => current.some((item) => item.id === event.id) ? current : [...current, event].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    setError("");
  }

  async function armAudio() {
    const ok = await enableAlarmAudio();
    setAudioArmed(ok);
    if (!ok) setError("The browser blocked audio. Use Settings → Arm + test sound after interacting with the page.");
    else { setError(""); playAlarmPattern(); }
  }

  async function removeEvent(event: EventItem) {
    if (!window.confirm(`Delete “${event.title}” for the whole group?`)) return;
    const result = await deleteEventClient(supabase, event.id);
    if (!result.ok) { setError(result.error); return; }
    setEvents((current) => current.filter((item) => item.id !== event.id));
  }

  async function linkGoogle() {
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
    const { data, error: authError } = await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } });
    if (authError) setError(`Google is optional. Enable the Google provider in Supabase Auth first. ${authError.message}`);
    else if (data.url) window.location.assign(data.url);
  }

  async function refresh() {
    if (!user) return;
    try { await loadWorkspace(user.id); setError(""); } catch (err) { setError(friendlySupabaseError(err instanceof Error ? err.message : "Refresh failed.")); }
  }

  async function installApp() {
    if (!installPrompt) { setError("On iPhone/iPad use Share → Add to Home Screen. On Android/desktop, install is shown by the browser when supported."); return; }
    const prompt = installPrompt as Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };
    if (prompt.prompt) { await prompt.prompt(); await prompt.userChoice; setInstallPrompt(null); }
  }

  const groupedEvents = useMemo(() => {
    const today: EventItem[] = [], tomorrow: EventItem[] = [], later: EventItem[] = [];
    const now = Date.now();
    for (const event of selectedEvents.filter((item) => item.status !== "cancelled")) {
      const time = new Date(event.start_time);
      if (isToday(time) || time.getTime() < now) today.push(event); else if (isTomorrow(time)) tomorrow.push(event); else later.push(event);
    }
    return [{ label: "Today / Live", items: today }, { label: "Tomorrow", items: tomorrow }, { label: "Upcoming", items: later }].filter((item) => item.items.length > 0);
  }, [selectedEvents]);

  const upcomingCount = selectedEvents.filter((event) => new Date(event.start_time).getTime() > Date.now()).length;
  const loudCount = selectedEvents.filter((event) => event.urgency_tier === "LOUD").length;

  if (booting) return <div className="min-h-screen p-5 sm:p-8"><div className="mx-auto max-w-7xl"><div className="h-10 w-44 animate-pulse rounded-xl bg-white/[.04]"/><div className="mt-8 grid gap-4 lg:grid-cols-[260px_1fr]"><div className="h-[70vh] animate-pulse rounded-3xl bg-white/[.025]"/><div className="space-y-4"><div className="h-48 animate-pulse rounded-3xl bg-white/[.025]"/><div className="h-72 animate-pulse rounded-3xl bg-white/[.025]"/></div></div></div></div>;

  return <div className="min-h-screen pb-20 lg:pb-0">
    <header className="sticky top-0 z-40 border-b border-white/6 bg-[#050608]/88 backdrop-blur-xl safe-top"><div className="mx-auto flex min-h-16 max-w-[1550px] items-center gap-2 px-3 sm:px-5 lg:px-7">
      <button aria-label="Open groups" onClick={() => setSidebarOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[.025] text-white/45 lg:hidden"><Menu size={17}/></button>
      <div className="flex shrink-0 items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-black"><BellRing size={17}/></div><div className="hidden sm:block"><div className="text-sm font-semibold">Smaran</div><div className="text-[10px] text-white/28">Remember together.</div></div></div>
      <div className="mx-auto hidden min-w-0 items-center gap-2 lg:flex"><span className="text-xs text-white/25">Group</span><ChevronDown size={13} className="text-white/20"/>{selectedGroup ? <span className="max-w-64 truncate rounded-full border border-white/8 bg-white/[.03] px-3 py-1.5 text-xs text-white/65">{selectedGroup.name}</span> : <span className="text-xs text-white/25">None selected</span>}</div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2"><div className={cn("hidden items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-semibold tracking-[.08em] md:flex", online ? "border-emerald-400/15 bg-emerald-400/[.035] text-emerald-300" : "border-rose-400/15 bg-rose-400/[.04] text-rose-300")}><span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-rose-400"}`}/>{online ? "ONLINE" : "OFFLINE"}</div><div className={cn("hidden items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-semibold tracking-[.08em] xl:flex", realtimeStatus === "SUBSCRIBED" ? "border-emerald-400/15 bg-emerald-400/[.035] text-emerald-300" : "border-amber-400/15 bg-amber-400/[.035] text-amber-300")}><Radio size={12}/>{realtimeStatus === "SUBSCRIBED" ? "LIVE" : realtimeStatus}</div><button onClick={() => void armAudio()} title="Arm and test alarm sound" className={cn("hidden h-9 items-center gap-2 rounded-xl border px-3 text-xs sm:inline-flex", audioArmed ? "border-emerald-400/15 bg-emerald-400/[.04] text-emerald-300" : "border-white/8 bg-white/[.025] text-white/45 hover:bg-white/[.07]")}><Bell size={14}/>{audioArmed ? "Sound armed" : "Arm sound"}</button><button onClick={() => setSettingsOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[.025] text-white/40 hover:bg-white/[.07] hover:text-white"><Settings size={15}/></button></div>
    </div></header>

    {!deviceAlerts && <div className="border-b border-amber-400/10 bg-amber-400/[.035] px-4 py-2.5"><div className="mx-auto flex max-w-[1550px] items-center justify-center gap-2 text-center text-xs text-amber-100/75"><Smartphone size={13}/><span>Device alerts are off on this browser.</span><button onClick={async () => { const result = await enableDeviceAlerts(supabase); if (!result.ok) setError(result.error); else setDeviceAlerts(true); }} className="font-semibold underline underline-offset-2">Enable now</button></div></div>}
    {!online && <div className="border-b border-rose-400/15 bg-rose-400/[.05] px-4 py-2.5 text-center text-xs text-rose-200/75"><WifiOff size={13} className="mr-1.5 inline"/> You are offline. Existing alarms can still display locally, but new shared changes need the connection restored.</div>}

    <div className="mx-auto grid max-w-[1550px] lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className={cn("fixed inset-y-0 left-0 z-[60] flex w-[285px] flex-col border-r border-white/8 bg-[#080a0f] p-4 shadow-2xl transition-transform lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:bg-transparent lg:shadow-none", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between lg:hidden"><div className="text-sm font-semibold">Groups</div><button aria-label="Close groups" onClick={() => setSidebarOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[.035] text-white/35"><X size={15}/></button></div>
        <div className="mt-5 flex items-center justify-between lg:mt-0"><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">Your groups</div><button onClick={() => setCreateOpen(true)} title="Create group" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[.04] text-white/45 hover:bg-white/[.08] hover:text-white"><Plus size={14}/></button></div>
        <div className="mt-3 space-y-1 overflow-y-auto">{groups.map((item) => <button key={item.group.id} onClick={() => { setSelectedGroupId(item.group.id); setSidebarOpen(false); router.replace(`/dashboard?group=${item.group.id}`); }} className={cn("w-full rounded-xl px-3 py-2.5 text-left", selectedGroup?.id === item.group.id ? "bg-white/[.07] text-white" : "text-white/45 hover:bg-white/[.035] hover:text-white/80")}><div className="truncate text-sm font-medium">{item.group.name}</div><div className="mt-1 flex items-center gap-2"><span className="font-mono text-[10px] tracking-[.16em] text-white/25">{item.group.code}</span><span className="text-[9px] uppercase tracking-[.12em] text-white/20">{item.membership.role}</span></div></button>)}{groups.length === 0 && <div className="rounded-xl border border-dashed border-white/8 p-4 text-xs leading-5 text-white/25">No groups yet. Create one or join a shared invite.</div>}</div>
        <div className="mt-4 grid gap-2"><Button onClick={() => setCreateOpen(true)} variant="secondary" className="w-full justify-start"><CirclePlus size={15}/> New group</Button><Button onClick={() => setJoinOpen(true)} variant="ghost" className="w-full justify-start"><UsersRound size={15}/> Join group</Button></div>
      </aside>
      {sidebarOpen && <button aria-label="Close groups" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-50 bg-black/50 lg:hidden"/>}

      <main className="min-w-0 px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-8">
        {!selectedGroup ? <div className="flex min-h-[72vh] items-center justify-center"><div className="w-full max-w-2xl rounded-[30px] border border-white/8 bg-[#0b0e14] p-6 text-center shadow-2xl shadow-black/30 sm:p-10"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-white/8 bg-white/[.04]"><BellRing size={22} className="text-white/60"/></div><h1 className="mt-6 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Start remembering together.</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/35">Create a group or join one. Then every reminder you add becomes a shared group event.</p><div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center"><Button onClick={() => setCreateOpen(true)}><Plus size={15}/> Create group</Button><Button onClick={() => setJoinOpen(true)} variant="secondary"><UsersRound size={15}/> Join with code</Button></div><div className="mt-7 grid gap-3 text-left sm:grid-cols-3"><div className="rounded-2xl border border-white/7 bg-white/[.02] p-4"><Bell size={15} className="text-white/60"/><div className="mt-3 text-sm font-medium">Shared reminders</div><p className="mt-1 text-xs leading-5 text-white/28">Create once; connected members see it automatically.</p></div><div className="rounded-2xl border border-white/7 bg-white/[.02] p-4"><Smartphone size={15} className="text-white/60"/><div className="mt-3 text-sm font-medium">Device alerts</div><p className="mt-1 text-xs leading-5 text-white/28">Enable notifications on each phone or browser.</p></div><div className="rounded-2xl border border-white/7 bg-white/[.02] p-4"><Radio size={15} className="text-white/60"/><div className="mt-3 text-sm font-medium">Realtime</div><p className="mt-1 text-xs leading-5 text-white/28">No refresh is required for shared event updates.</p></div></div></div></div> : <div>
          <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]"><div className="relative overflow-hidden rounded-[26px] border border-white/8 bg-[#0b0e14] p-5 sm:p-6"><div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl"/><div className="relative"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Pill>{selected.membership.role.toUpperCase()}</Pill><Pill className={cn(realtimeStatus === "SUBSCRIBED" ? "border-emerald-400/15 bg-emerald-400/[.035] text-emerald-300" : "border-amber-400/15 bg-amber-400/[.035] text-amber-300")}>{realtimeStatus === "SUBSCRIBED" ? "Realtime connected" : realtimeStatus}</Pill></div><h1 className="mt-4 break-words text-2xl font-semibold tracking-[-.035em] sm:text-3xl">{selectedGroup.name}</h1><p className="mt-2 text-sm text-white/35">code <span className="font-mono text-white/60">{selectedGroup.code}</span> · you are <span className="text-white/55">{displayName}</span></p></div><div className="flex flex-wrap gap-2"><Button onClick={() => setInviteOpen(true)} variant="secondary"><Share2 size={14}/> Invite</Button><Button onClick={() => setEventOpen(true)}><Plus size={15}/> Set alarm</Button></div></div></div></div><div className="rounded-[26px] border border-white/8 bg-[#0b0e14] p-5 sm:p-6"><div className="flex items-center justify-between"><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">Group control</div><button onClick={refresh} aria-label="Refresh" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[.025] text-white/30 hover:bg-white/[.07] hover:text-white"><RefreshCcw size={14}/></button></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-2xl border border-white/6 bg-white/[.02] p-3"><div className="text-2xl font-semibold">{upcomingCount}</div><div className="mt-1 text-[10px] uppercase tracking-[.12em] text-white/25">Upcoming</div></div><div className="rounded-2xl border border-white/6 bg-white/[.02] p-3"><div className="text-2xl font-semibold text-rose-300">{loudCount}</div><div className="mt-1 text-[10px] uppercase tracking-[.12em] text-white/25">LOUD</div></div></div></div></section>
          {error && <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-rose-400/15 bg-rose-400/[.045] p-4 text-sm text-rose-300"><span className="min-w-0 break-words">{error}</span><button aria-label="Dismiss error" onClick={() => setError("")} className="shrink-0 text-rose-300/60 hover:text-rose-300"><X size={15}/></button></div>}
          <section className="mt-7">{groupedEvents.length === 0 ? <div className="rounded-[26px] border border-dashed border-white/8 p-8 text-center sm:p-12"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.04]"><CalendarDays size={20} className="text-white/40"/></div><h2 className="mt-4 text-lg font-semibold">Nothing scheduled yet.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/30">Set the first reminder. Every connected member gets the event, and enabled devices can receive background alerts.</p><Button onClick={() => setEventOpen(true)} className="mt-5"><Plus size={15}/> Set first alarm</Button></div> : <div className="space-y-8">{groupedEvents.map((section) => <div key={section.label}><div className="mb-3 flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-[.15em] text-white/25">{section.label}</div><div className="text-[11px] text-white/20">{section.items.length} event{section.items.length === 1 ? "" : "s"}</div></div><div className="space-y-3">{section.items.map((event) => <EventCard key={event.id} event={event} onDelete={removeEvent} canManage={selected.membership.role !== "member" || event.created_by === user?.id}/>)}</div></div>)}</div>}</section>
          <section className="mt-10 rounded-[26px] border border-indigo-400/10 bg-indigo-400/[.025] p-5 sm:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="text-sm font-semibold">Make sure every device can alert.</div><p className="mt-1 max-w-2xl text-xs leading-5 text-white/30">Connected browsers receive shared events automatically. For phone alerts while the app is backgrounded or closed, enable device notifications and use the production Web Push setup.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => setSettingsOpen(true)} variant="secondary"><Settings size={14}/> Device settings</Button>{selectedGroup && <Button onClick={() => setInviteOpen(true)} variant="outline"><Copy size={14}/> Share invite</Button>}</div></div></section>
        </div>}
      </main>
    </div>

    {selectedGroup && <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[#07090d]/94 p-2 backdrop-blur-xl lg:hidden"><div className="mx-auto grid max-w-xl grid-cols-4 gap-1"><button onClick={() => setCreateOpen(true)} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-white/45 hover:bg-white/[.05] hover:text-white"><Plus size={17}/><span className="text-[10px]">Group</span></button><button onClick={() => setEventOpen(true)} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-white/45 hover:bg-white/[.05] hover:text-white"><Bell size={17}/><span className="text-[10px]">Alarm</span></button><button onClick={() => setInviteOpen(true)} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-white/45 hover:bg-white/[.05] hover:text-white"><Share2 size={17}/><span className="text-[10px]">Invite</span></button><button onClick={() => setSettingsOpen(true)} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-white/45 hover:bg-white/[.05] hover:text-white"><Settings size={17}/><span className="text-[10px]">Settings</span></button></div></div>}

    <GroupCreateModal open={createOpen} onClose={() => { setCreateOpen(false); if (searchParams.get("create")) router.replace(`/dashboard${selectedGroupId ? `?group=${selectedGroupId}` : ""}`); }} client={supabase} defaultDisplayName={displayName} onCreated={(group, name) => void handleCreateGroup(group, name)} />
    <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} client={supabase} presetCode={searchParams.get("code") ?? ""} presetDisplayName={displayName} onJoined={(groupId, name) => void handleJoined(groupId, name)} />
    {selectedGroup && <EventCreateModal open={eventOpen} onClose={() => setEventOpen(false)} group={selectedGroup} client={supabase} onCreated={createAlarmDone} />}
    {selectedGroup && <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} group={selectedGroup} events={selectedEvents} />}
    <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} client={supabase} user={user} displayName={displayName} realtimeStatus={realtimeStatus} online={online} install={installApp} onGoogle={linkGoogle} />
    {alarm && <AlarmOverlay event={alarm} groupName={groups.find((item) => item.group.id === alarm.group_id)?.group.name ?? "Smaran group"} soundOn={audioArmed} onClose={() => setAlarm(null)} onStopSound={() => { stopAlarmAudio(); setAudioArmed(false); }} />}
  </div>;
}
