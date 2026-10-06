export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function initials(name: string) {
  const value = name.trim();
  if (!value) return "?";
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, "0")).join(":");
}

export function formatCountdown(ms: number) {
  return formatDuration(Math.ceil(Math.abs(ms) / 1000));
}

export function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function localInputToISO(value: string) {
  return new Date(value).toISOString();
}

export function minutesFromNowToLocal(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function tomorrowAtLocal(hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isValidHttpUrl(value: string | null | undefined) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function friendlySupabaseError(message: string) {
  if (/Anonymous Sign-Ins|anonymous/i.test(message)) {
    return "Guest access is disabled in Supabase. Enable Authentication → Providers → Anonymous Sign-Ins.";
  }
  if (/relation .* does not exist|could not find the table|schema cache/i.test(message)) {
    return "The Smaran database is not installed in this Supabase project. Run the latest migration from supabase/migrations.";
  }
  if (/row-level security|RLS|permission denied/i.test(message)) {
    return "Supabase rejected this operation. Check that the latest Smaran RLS migration has been run.";
  }
  if (/invalid input syntax for type uuid/i.test(message)) {
    return "Smaran received an invalid record ID. Refresh the page and retry.";
  }
  return message;
}
