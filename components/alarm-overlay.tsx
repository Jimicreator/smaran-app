"use client";

import { useEffect } from "react";
import { AlertTriangle, ExternalLink, Volume2, VolumeX, X } from "lucide-react";
import { format } from "date-fns";
import type { EventItem } from "@/lib/types";
import { playAlarmPattern } from "@/lib/alarm";
import { Button, Pill } from "./primitives";

export function AlarmOverlay({ event, groupName, soundOn, onClose, onStopSound }: {
  event: EventItem;
  groupName: string;
  soundOn: boolean;
  onClose: () => void;
  onStopSound: () => void;
}) {
  useEffect(() => {
    if (!soundOn) return;
    playAlarmPattern();
    const id = window.setInterval(playAlarmPattern, 7_500);
    return () => window.clearInterval(id);
  }, [soundOn, event.id]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#170609]/96 backdrop-blur-2xl alarm-flash">
    <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center p-3 sm:p-8">
      <div className="w-full rounded-[30px] border border-rose-400/20 bg-[#11070a] p-5 shadow-[0_0_120px_rgba(244,63,94,.16)] sm:p-8">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[11px] font-bold tracking-[.18em] text-rose-300"><AlertTriangle size={15}/> LOUD · SHARED ALARM</div><div className="flex gap-2"><button aria-label={soundOn ? "Stop alarm sound" : "Sound is off"} onClick={onStopSound} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[.035] text-white/60 hover:bg-white/[.08]">{soundOn ? <Volume2 size={15}/> : <VolumeX size={15}/>}</button><button aria-label="Close alarm" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[.035] text-white/35 hover:bg-white/[.08] hover:text-white"><X size={15}/></button></div></div>
        <div className="mt-7">
          <div className="flex flex-wrap gap-2"><Pill className="border-rose-400/20 bg-rose-400/[.06] text-rose-300">{groupName}</Pill><Pill className="border-rose-400/20 bg-rose-400/[.06] text-rose-300">{format(new Date(event.start_time), "EEE, d MMM · h:mm a")}</Pill></div>
          <h1 className="mt-5 break-words text-4xl font-semibold tracking-[-.045em] text-white sm:text-6xl">{event.title}</h1>
          {event.description && <p className="mt-4 max-w-2xl whitespace-pre-wrap text-base leading-7 text-white/45">{event.description}</p>}
          {event.location && <div className="mt-5 text-sm text-white/45">Location: <span className="text-white/70">{event.location}</span></div>}
          {event.resource_url && <a href={event.resource_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ExternalLink size={14}/> Open attached link</a>}
          <div className="mt-8 rounded-2xl border border-rose-400/10 bg-rose-400/[.035] p-5"><div className="text-[10px] font-semibold uppercase tracking-[.15em] text-rose-300/65">Device alarm</div><div className="mt-2 text-xl font-semibold text-white">This alarm was triggered for your device.</div><p className="mt-2 max-w-2xl text-sm leading-6 text-white/32">Closing this screen only closes your local takeover. Other group members receive and control the same shared alarm independently.</p></div>
        </div>
        <div className="mt-7 flex flex-col gap-3 border-t border-white/7 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm leading-6 text-white/32">Stop the sound when you have seen the alarm, then continue with the task.</p><Button onClick={onClose} className="min-h-12 rounded-2xl px-6 text-sm">Dismiss alarm</Button></div>
      </div>
    </div>
  </div>;
}
