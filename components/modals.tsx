"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Copy, Link2, QrCode, Share2, X, Zap } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventItem, Group } from "@/lib/types";
import type { Database } from "@/lib/supabase/database";
import { createEventClient, createGroupClient, joinGroupClient } from "@/lib/client-operations";
import { createEventICS, createGroupICS, downloadICS, googleCalendarUrl } from "@/lib/calendar";
import { localInputToISO, minutesFromNowToLocal, tomorrowAtLocal } from "@/lib/utils";
import { Button, Input, Label, Pill, Textarea } from "./primitives";

const DISPLAY_KEY = "smaran.displayName";
type Client = SupabaseClient<Database>;

function ModalFrame({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/70 p-3 backdrop-blur-md sm:p-6">
    <div className="flex min-h-full items-center justify-center py-6">
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-xl"} overflow-hidden rounded-[26px] border border-white/10 bg-[#0b0e14] shadow-2xl shadow-black/60`}>
        <div className="flex items-start justify-between border-b border-white/7 px-5 py-4 sm:px-6">
          <div><h2 className="text-base font-semibold tracking-tight">{title}</h2>{subtitle && <p className="mt-1 text-xs leading-5 text-white/30">{subtitle}</p>}</div>
          <button aria-label="Close" onClick={onClose} className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[.035] text-white/35 hover:bg-white/[.08] hover:text-white"><X size={15} /></button>
        </div>
        <div className="max-h-[82vh] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  </div>;
}

export function GroupCreateModal({ open, onClose, client, defaultDisplayName, onCreated }: { open: boolean; onClose: () => void; client: Client; defaultDisplayName: string; onCreated: (group: Group, displayName: string) => void }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setName(""); setDisplayName(localStorage.getItem(DISPLAY_KEY) ?? defaultDisplayName); setError(""); } }, [open, defaultDisplayName]);
  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const result = await createGroupClient(client, name, displayName);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    localStorage.setItem(DISPLAY_KEY, displayName.trim());
    onCreated(result.data, displayName.trim()); onClose();
  }

  return <ModalFrame title="Create a group" subtitle="No Google account is required. Smaran starts with a guest identity." onClose={onClose}>
    <form onSubmit={submit} className="space-y-5">
      <div><Label>Group name</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="DSAI A — Project War Room" maxLength={70} /></div>
      <div><Label>Your display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 40))} placeholder="Jitesh" maxLength={40} /><p className="mt-1.5 text-xs text-white/25">This is the name attached to your group membership.</p></div>
      {error && <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-sm leading-5 text-rose-300">{error}</div>}
      <div className="flex flex-col-reverse gap-2 border-t border-white/7 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading} disabled={!name.trim() || !displayName.trim()}>Create group</Button></div>
    </form>
  </ModalFrame>;
}

export function JoinModal({ open, onClose, client, presetCode = "", presetDisplayName = "Guest", onJoined }: { open: boolean; onClose: () => void; client: Client; presetCode?: string; presetDisplayName?: string; onJoined: (groupId: string, displayName: string) => void }) {
  const [code, setCode] = useState(presetCode);
  const [displayName, setDisplayName] = useState(presetDisplayName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setCode(presetCode); setDisplayName(localStorage.getItem(DISPLAY_KEY) ?? presetDisplayName); setError(""); } }, [open, presetCode, presetDisplayName]);
  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const result = await joinGroupClient(client, code, displayName);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    localStorage.setItem(DISPLAY_KEY, displayName.trim());
    onJoined(result.data.group_id, displayName.trim()); onClose();
  }

  return <ModalFrame title="Join a group" subtitle="Paste the 6-character code from the invite. Your guest identity is created automatically." onClose={onClose}>
    <form onSubmit={submit} className="space-y-5">
      <div><Label>Group code</Label><Input autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase())} placeholder="AB12CD" className="font-mono tracking-[.35em]" /></div>
      <div><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 40))} placeholder="Jitesh" maxLength={40} /></div>
      {error && <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-sm text-rose-300">{error}</div>}
      <div className="flex flex-col-reverse gap-2 border-t border-white/7 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading} disabled={code.length !== 6 || !displayName.trim()}>Join instantly</Button></div>
    </form>
  </ModalFrame>;
}

function timeForPreset(preset: string) {
  if (preset === "1") return minutesFromNowToLocal(1);
  if (preset === "5") return minutesFromNowToLocal(5);
  if (preset === "15") return minutesFromNowToLocal(15);
  return tomorrowAtLocal(7, 0);
}

export function EventCreateModal({ open, onClose, group, client, onCreated }: { open: boolean; onClose: () => void; group: Group; client: Client; onCreated: (event: EventItem) => void }) {
  const defaultLocal = useMemo(() => timeForPreset("15"), [open]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [startLocal, setStartLocal] = useState(defaultLocal);
  const [urgencyTier, setUrgencyTier] = useState<"INFO" | "WARNING" | "LOUD">("WARNING");
  const [warnings, setWarnings] = useState<number[]>([180, 60]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setTitle(""); setDescription(""); setLocation(""); setResourceUrl(""); setStartLocal(timeForPreset("15")); setUrgencyTier("WARNING"); setWarnings([180, 60]); setError(""); } }, [open]);
  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const result = await createEventClient(client, { groupId: group.id, title, description, location, resourceUrl, startTime: localInputToISO(startLocal), urgencyTier, warningMinutes: warnings });
    setLoading(false); if (!result.ok) { setError(result.error); return; }
    onCreated(result.data); onClose();
  }
  const setPreset = (preset: string) => setStartLocal(timeForPreset(preset));
  const toggleWarning = (value: number) => setWarnings((items) => items.includes(value) ? items.filter((x) => x !== value) : [...items, value].sort((a, b) => b - a));

  return <ModalFrame title="Set shared alarm" subtitle={`Everyone in ${group.name} receives the event automatically.`} onClose={onClose} wide>
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-4">
          <div><Label>Title</Label><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="7 AM lab attendance" maxLength={140} /></div>
          <div><Label>Details</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bring ID card. Main gate closes at 7:10." maxLength={1200} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Block C · Lab 3" maxLength={180} /></div><div><Label>Optional link</Label><Input value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="https://..." maxLength={400} /></div></div>
        </div>
        <div className="space-y-4">
          <div><Label>Starts</Label><Input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} /><div className="mt-2 flex flex-wrap gap-2">{[["1", "1 min"], ["5", "5 min"], ["15", "15 min"], ["tomorrow", "Tomorrow 7 AM"]].map(([value, label]) => <button type="button" key={value} onClick={() => setPreset(value)} className="rounded-lg border border-white/8 bg-white/[.025] px-2.5 py-1.5 text-[11px] text-white/45 hover:bg-white/[.06] hover:text-white">{label}</button>)}</div></div>
          <div><Label>Urgency</Label><div className="grid grid-cols-3 gap-2">{(["INFO", "WARNING", "LOUD"] as const).map((tier) => <button key={tier} type="button" onClick={() => setUrgencyTier(tier)} className={`rounded-xl border px-3 py-3 text-left transition ${urgencyTier === tier ? tier === "LOUD" ? "border-rose-400/30 bg-rose-400/[.08] text-rose-300" : tier === "WARNING" ? "border-amber-400/30 bg-amber-400/[.08] text-amber-300" : "border-sky-400/30 bg-sky-400/[.08] text-sky-300" : "border-white/8 bg-white/[.02] text-white/35 hover:bg-white/[.05]"}`}><div className="text-xs font-semibold">{tier}</div><div className="mt-1 text-[10px] leading-4 opacity-60">{tier === "LOUD" ? "Takeover + alarm" : tier === "WARNING" ? "Countdown attention" : "Quiet reminder"}</div></button>)}</div></div>
          <div><Label>Warnings</Label><div className="flex flex-wrap gap-2">{[[180, "3 hours"], [60, "1 hour"]].map(([value, label]) => <button type="button" key={String(value)} onClick={() => toggleWarning(Number(value))} className={`rounded-xl border px-3 py-2 text-xs ${warnings.includes(Number(value)) ? "border-amber-400/25 bg-amber-400/[.05] text-amber-300" : "border-white/8 bg-white/[.02] text-white/30"}`}>{warnings.includes(Number(value)) ? "✓ " : ""}{label}</button>)}</div></div>
        </div>
      </div>
      <div className="rounded-2xl border border-indigo-400/10 bg-indigo-400/[.035] p-4"><div className="flex gap-3"><Zap size={16} className="mt-0.5 shrink-0 text-indigo-300" /><div><div className="text-sm font-medium">Shared alarm behavior</div><p className="mt-1 text-xs leading-5 text-white/35">The database event is shared once. Every connected member browser automatically receives it through realtime and starts its own countdown. LOUD alarms take over each open browser independently.</p></div></div></div>
      {error && <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-sm text-rose-300">{error}</div>}
      <div className="flex flex-col-reverse gap-2 border-t border-white/7 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading} disabled={!title.trim() || !startLocal}>Set shared alarm</Button></div>
    </form>
  </ModalFrame>;
}

export function InviteModal({ open, onClose, group, events }: { open: boolean; onClose: () => void; group: Group; events: EventItem[] }) {
  const [copied, setCopied] = useState("");
  const [lanUrl, setLanUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(true);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setCopied(""); setLoadingUrl(true);
    (async () => {
      try {
        const current = window.location.origin;
        if (!/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(window.location.hostname)) {
          if (alive) setLanUrl(current);
          return;
        }
        const response = await fetch("/api/network-info", { cache: "no-store" });
        const data = await response.json() as { lanUrls?: string[] };
        if (alive) setLanUrl(data.lanUrls?.[0] ?? current);
      } catch {
        if (alive) setLanUrl(window.location.origin);
      } finally {
        if (alive) setLoadingUrl(false);
      }
    })();
    return () => { alive = false; };
  }, [open]);

  if (!open) return null;
  const configuredAppUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const configuredUsable = configuredAppUrl && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(configuredAppUrl) ? configuredAppUrl : "";
  const currentOrigin = typeof window === "undefined" ? "" : window.location.origin;
  const currentUsable = currentOrigin && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(currentOrigin) ? currentOrigin : "";
  const base = lanUrl || currentUsable || configuredUsable || currentOrigin;
  const link = base ? `${base}/join/${group.code}` : `/join/${group.code}`;
  const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(link);
  const productionLink = configuredUsable ? `${configuredUsable}/join/${group.code}` : "";

  async function copy(label: string, value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(""), 1600); }
    catch { setCopied("failed"); }
  }

  async function share() {
    if (navigator.share) await navigator.share({ title: `Join ${group.name} on Smaran`, text: `Join our Smaran group with code ${group.code}`, url: link }).catch(() => undefined);
    else await copy("link", link);
  }

  return <ModalFrame title={`Invite · ${group.name}`} subtitle="Use the phone-ready link or QR. Anyone can join in seconds." onClose={onClose} wide>
    <div className="grid gap-6 lg:grid-cols-[190px_1fr] lg:items-center">
      <div className="mx-auto rounded-3xl bg-white p-3"><QRCodeSVG value={link} size={164} includeMargin /></div>
      <div>
        <div className="flex flex-wrap items-center gap-2"><Pill>CODE {group.code}</Pill><Pill className="border-emerald-400/15 bg-emerald-400/[.04] text-emerald-300">{events.length} scheduled</Pill></div>
        <h3 className="mt-3 text-xl font-semibold tracking-tight">Invite from PC → phone</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">On this PC, Smaran prefers the LAN address instead of localhost. Scan the QR or copy the phone link below.</p>
        <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-3"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-white/25">Phone / other device link</div><div className="mt-2 break-all font-mono text-xs leading-5 text-white/75">{loadingUrl ? "Detecting this PC's network address…" : link}</div>{isLocal && <p className="mt-2 text-[11px] leading-5 text-amber-200/60">This machine is still reporting localhost. Use the LAN address printed by `npm run dev`, or deploy Smaran to Vercel for a universal HTTPS link.</p>}</div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button onClick={() => copy("link", link)} variant="secondary" className="flex-1">{copied === "link" ? <><Check size={14}/> Copied</> : <><Copy size={14}/> Copy phone link</>}</Button><Button onClick={share} variant="outline" className="flex-1"><Share2 size={14}/> Share</Button></div>{productionLink && productionLink !== link && <div className="mt-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[.025] p-3"><div className="text-[10px] font-semibold uppercase tracking-[.13em] text-emerald-300/60">Production / universal link</div><div className="mt-1 break-all font-mono text-xs text-white/55">{productionLink}</div><button onClick={() => copy("production", productionLink)} className="mt-2 text-xs font-medium text-emerald-300/80 underline underline-offset-2">{copied === "production" ? "Copied" : "Copy universal link"}</button></div> }
        <div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => copy("code", group.code)} variant="outline"><Copy size={14}/>{copied === "code" ? "Code copied" : "Copy code"}</Button><button onClick={() => downloadICS(`${group.code.toLowerCase()}-smaran.ics`, createGroupICS(group, events))} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-transparent px-3.5 py-2 text-sm text-white/65 hover:bg-white/[.06] hover:text-white"><CalendarDays size={14}/> Group .ics</button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/7 bg-white/[.025] p-3"><div className="text-[10px] uppercase tracking-[.13em] text-white/25">Access</div><div className="mt-1 text-sm text-white/70">Guest first</div></div><div className="rounded-2xl border border-white/7 bg-white/[.025] p-3"><div className="text-[10px] uppercase tracking-[.13em] text-white/25">Alerts</div><div className="mt-1 text-sm text-white/70">Per-device</div></div><div className="rounded-2xl border border-white/7 bg-white/[.025] p-3"><div className="text-[10px] uppercase tracking-[.13em] text-white/25">Calendar</div><div className="mt-1 text-sm text-white/70">ICS + Google</div></div></div>
      </div>
    </div>
  </ModalFrame>;
}
