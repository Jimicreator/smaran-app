// components/event-card.tsx
"use client";

import { CalendarDays, ExternalLink, MapPin, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { EventItem } from "@/lib/types";
import { createEventICS, downloadICS, googleCalendarUrl } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { Countdown, useNow } from "./countdown";
import { Button, Pill } from "./primitives";

const tierMeta = {
  INFO: { dot: "bg-sky-400", text: "text-sky-300", border: "border-sky-400/20", panel: "bg-sky-400/[.05]" },
  WARNING: { dot: "bg-amber-400", text: "text-amber-300", border: "border-amber-400/20", panel: "bg-amber-400/[.05]" },
  LOUD: { dot: "bg-rose-400", text: "text-rose-300", border: "border-rose-400/20", panel: "bg-rose-400/[.05]" },
} as const;

function warningWindow(event: EventItem, now: number) {
  const diff = new Date(event.start_time).getTime() - now;
  if (diff <= 0) return null;
  if (event.warning_minutes.includes(60) && diff <= 60 * 60_000) return "1-hour warning";
  if (event.warning_minutes.includes(180) && diff <= 3 * 60 * 60_000) return "3-hour warning";
  return null;
}

export function EventCard({ event, onDelete, canManage }: { event: EventItem; onDelete: (event: EventItem) => void; canManage: boolean; }) {
  const now = useNow();
  const meta = tierMeta[event.urgency_tier];
  const warning = warningWindow(event, now);
  const isPast = new Date(event.start_time).getTime() < now;

  return (
    <article className={cn("relative overflow-hidden rounded-[24px] border bg-white/[.02] p-5 backdrop-blur-md transition hover:bg-white/[.04] sm:p-6", meta.border, event.urgency_tier === "LOUD" && !isPast && "alarm-pulse")}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_8px_currentColor]", meta.dot, event.urgency_tier === "LOUD" && !isPast && "soft-pulse")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Pill className={cn(meta.text, meta.border, meta.panel)}>{event.urgency_tier}</Pill>
                {warning && <Pill className="border-amber-400/20 bg-amber-400/[.06] text-amber-300">{warning}</Pill>}
                {event.status !== "active" && <Pill>{event.status}</Pill>}
              </div>
              <h3 className="mt-3 break-words text-lg font-bold tracking-tight text-white/95">{event.title}</h3>
            </div>
            
            <div className="w-full sm:w-fit shrink-0 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-left sm:text-right backdrop-blur-sm">
              <div className="text-[10px] font-bold uppercase tracking-[.15em] text-white/40">{isPast ? "Started" : "Countdown"}</div>
              <div className={cn("mt-1.5", meta.text)}>
                <Countdown startTime={event.start_time} />
              </div>
            </div>
          </div>

          {event.description && <p className="mt-4 max-w-4xl whitespace-pre-wrap text-sm leading-relaxed text-white/60">{event.description}</p>}
          
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-white/50">
            <span className="inline-flex items-center gap-2"><CalendarDays size={14} className="text-white/40" /> {format(new Date(event.start_time), "EEE, d MMM • h:mm a")}</span>
            {event.location && <span className="inline-flex items-center gap-2"><MapPin size={14} className="text-white/40" /> {event.location}</span>}
            {event.resource_url && <a href={event.resource_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"><ExternalLink size={14} className="text-white/40" /> Open link</a>}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/5 pt-4">
            <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-semibold text-white/70 transition-all hover:bg-white/[.08] hover:text-white">
              <CalendarDays size={14}/> Google
            </a>
            <button type="button" onClick={() => downloadICS(`smaran-${event.id}.ics`, createEventICS(event))} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-semibold text-white/70 transition-all hover:bg-white/[.08] hover:text-white">
              <CalendarDays size={14}/> .ics
            </button>
            {canManage && (
              <button type="button" onClick={() => onDelete(event)} title="Delete event" className="inline-flex min-h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.03] text-white/40 transition-all hover:border-rose-400/30 hover:bg-rose-400/[.1] hover:text-rose-400 ml-auto sm:ml-0">
                <Trash2 size={16}/>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}