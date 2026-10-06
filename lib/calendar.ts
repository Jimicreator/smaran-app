import type { EventItem, Group } from "./types";

function escapeICal(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function icsUTC(date: Date) {
  const iso = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return iso;
}
function eventLines(event: EventItem, category: string) {
  const start = new Date(event.start_time);
  const end = new Date(start.getTime() + 30 * 60_000);
  const description = [event.description, event.location ? `Location: ${event.location}` : "", event.resource_url ? `Link: ${event.resource_url}` : ""].filter(Boolean).join("\n");
  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@smaran`,
    `DTSTAMP:${icsUTC(new Date())}`,
    `DTSTART:${icsUTC(start)}`,
    `DTEND:${icsUTC(end)}`,
    `SUMMARY:${escapeICal(`${event.urgency_tier === "LOUD" ? "[LOUD] " : ""}${event.title}`)}`,
    `DESCRIPTION:${escapeICal(description)}`,
    event.location ? `LOCATION:${escapeICal(event.location)}` : "",
    `CATEGORIES:${escapeICal(event.urgency_tier)},${escapeICal(category)}`,
    "END:VEVENT",
  ].filter(Boolean);
}
export function createEventICS(event: EventItem, groupName = "Smaran") {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Smaran//Collaborative Alarms//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...eventLines(event, groupName), "END:VCALENDAR", ""].join("\r\n");
}
export function createGroupICS(group: Group, events: EventItem[]) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Smaran//Group Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...events.flatMap((e) => eventLines(e, group.name)), "END:VCALENDAR", ""].join("\r\n");
}
export function googleCalendarUrl(event: EventItem) {
  const start = new Date(event.start_time);
  const end = new Date(start.getTime() + 30 * 60_000);
  const dates = `${icsUTC(start)}/${icsUTC(end)}`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates, details: [event.description, event.resource_url].filter(Boolean).join("\n\n"), location: event.location ?? "" });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
export function downloadICS(filename: string, content: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
