// app/page.tsx
import Link from "next/link";
import { ArrowRight, BellRing, CalendarDays, CheckCircle2, Smartphone, UsersRound, Zap } from "lucide-react";

const pillars = [
  { icon: BellRing, title: "One shared alarm", body: "Create one reminder for the group. Every connected device gets the same event and countdown." },
  { icon: UsersRound, title: "Join in seconds", body: "Share a six-character group code or a phone-ready invite link. No Google account is required." },
  { icon: Smartphone, title: "Alerts on their devices", body: "Enable device notifications once. Production Web Push can deliver scheduled alarms when the app is closed." },
  { icon: CalendarDays, title: "Keep the schedule", body: "Export individual reminders or the whole group calendar to Google Calendar or an .ics file." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden px-4 py-5 sm:px-7 lg:px-10">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed -top-[20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="pointer-events-none fixed right-[-10%] top-[10%] h-[40%] w-[40%] rounded-full bg-rose-500/10 blur-[120px]" />

      <div className="mx-auto max-w-[1500px] relative z-10">
        <nav className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-white/80 shadow-[0_0_15px_rgba(255,255,255,0.1)] text-black">
              <BellRing size={20} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">Smaran</div>
              <div className="text-[11px] font-medium text-white/40">Remember together.</div>
            </div>
          </div>
          <Link href="/dashboard" className="rounded-xl border border-white/10 bg-white/[.04] px-5 py-2.5 text-sm font-medium text-white/90 backdrop-blur-md transition-all hover:bg-white/[.08] hover:border-white/20">
            Open app
          </Link>
        </nav>

        <section className="grid gap-12 py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-medium text-indigo-300 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" /> 
              Shared reminders for real groups
            </div>
            <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Remind everyone.<br />
              <span className="bg-gradient-to-r from-rose-200 to-indigo-300 bg-clip-text text-transparent">Automatically.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/50 sm:text-lg">
              Smaran turns a normal reminder into a group alarm for exams, labs, submissions, meetings, trips, and anything else your whole group needs to remember.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:scale-[1.02] hover:bg-white/90">
                Launch Smaran <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/dashboard?create=1" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[.035] px-6 py-4 text-sm font-medium text-white/70 backdrop-blur-md transition-all hover:bg-white/[.07] hover:text-white">
                Create a group
              </Link>
            </div>
            <p className="mt-6 text-xs font-medium text-white/30">Guest-first. Google is optional, not required.</p>
          </div>

          {/* Hero Graphic */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -inset-12 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0e14]/80 p-4 shadow-2xl backdrop-blur-xl">
              <div className="rounded-2xl border border-white/5 bg-[#050608]/90 p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-white/30">NEXT SHARED ALARM</div>
                    <div className="mt-1.5 text-lg font-bold text-white/90">7 AM Lab Attendance</div>
                  </div>
                  <div className="rounded-full border border-rose-400/30 bg-rose-400/15 px-3 py-1.5 text-[10px] font-black tracking-widest text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                    LOUD
                  </div>
                </div>
                <div className="mt-7 rounded-2xl border border-rose-500/20 bg-rose-500/[.06] p-6 text-center">
                  <div className="font-mono text-4xl font-bold tracking-tight text-rose-300 sm:text-5xl">T 00:17:42</div>
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-rose-200/50">
                    <Zap size={13} className="text-rose-400" /> The event is shared once; each device alerts.
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-white/[.02] p-4 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Group</div>
                    <div className="mt-1.5 text-sm font-semibold text-white/80">DSAI A</div>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[.02] p-4 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Devices</div>
                    <div className="mt-1.5 text-sm font-semibold text-emerald-300/80">Alerts ready</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-t border-white/10 pt-16 pb-10 sm:grid-cols-2 xl:grid-cols-4">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-white/5 bg-white/[.02] p-6 transition-colors hover:bg-white/[.04]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[.05] text-white/70">
                <Icon size={20} />
              </div>
              <h2 className="text-base font-bold text-white/90">{title}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-white/40">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}