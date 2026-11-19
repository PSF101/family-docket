/**
 * Calendar import/export using the iCalendar (.ics) format, which Google Calendar,
 * Apple Calendar and Outlook all read and write.
 *
 * Import is a one-off snapshot of a file the parent exports from their calendar app.
 * Live two-way sync (Google/Microsoft APIs + OAuth) would replace this later.
 */
import type { DocketItem, Extraction } from "./types";
import { extract } from "./parser";
import { addDays, DAY_MS, formatShort, fromISO, startOfDay, toISO } from "./dates";

export interface CalendarEvent {
  uid: string;
  summary: string;
  description: string;
  location: string | null;
  /** ISO date of this occurrence (next upcoming one for repeating events) */
  date: string;
  time: string | null;
  recurring: boolean;
}

export interface ParsedCalendar {
  name: string | null;
  events: CalendarEvent[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/* ------------------------------------------------------------------ */
/* Reading                                                              */
/* ------------------------------------------------------------------ */

/** Long lines in .ics files are wrapped onto continuation lines that start with a space or tab. */
function unfold(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "");
}

function unescapeText(v: string): string {
  return v
    .replace(/\\[nN]/g, "\n")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
}

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseLine(line: string): Prop | null {
  const i = line.indexOf(":");
  if (i < 0) return null;
  const [name, ...params] = line.slice(0, i).split(";");
  const p: Record<string, string> = {};
  for (const kv of params) {
    const [k, v] = kv.split("=");
    if (k) p[k.toUpperCase()] = v ?? "";
  }
  return { name: name.toUpperCase(), params: p, value: line.slice(i + 1) };
}

/**
 * "20261020" → all-day; "20261020T173000Z" → UTC converted to local;
 * "20261020T173000" (floating or TZID) → treated as local wall-clock time.
 */
function parseDateValue(value: string): { date: Date; hasTime: boolean } | null {
  let m = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return { date: new Date(+m[1], +m[2] - 1, +m[3]), hasTime: false };
  m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const [y, mo, d, h, mi] = [+m[1], +m[2] - 1, +m[3], +m[4], +m[5]];
  return { date: m[7] ? new Date(Date.UTC(y, mo, d, h, mi)) : new Date(y, mo, d, h, mi), hasTime: true };
}

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Next occurrence of a repeating event on or after `from`. Covers the common DAILY/WEEKLY/MONTHLY/YEARLY rules. */
function nextOccurrence(start: Date, rule: string, from: Date): Date | null {
  const r: Record<string, string> = Object.fromEntries(rule.split(";").map((kv) => kv.split("=") as [string, string]));
  const interval = Math.max(1, Number(r.INTERVAL ?? 1));
  const until = r.UNTIL ? parseDateValue(r.UNTIL)?.date ?? null : null;
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const [h, mi] = [start.getHours(), start.getMinutes()];
  const at = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi);
  const fromDay = startOfDay(from);

  if (r.FREQ === "WEEKLY" && r.BYDAY) {
    const days = r.BYDAY.split(",").map((s) => BYDAY.indexOf(s.slice(-2))).filter((i) => i >= 0);
    let d = startOfDay(start < fromDay ? fromDay : start);
    for (let i = 0; i < 400; i++, d = addDays(d, 1)) {
      if (!days.includes(d.getDay())) continue;
      const weeks = Math.floor((d.getTime() - startOfDay(start).getTime()) / (7 * DAY_MS));
      if (interval > 1 && weeks % interval !== 0) continue;
      const occ = at(d);
      return until && occ > until ? null : occ;
    }
    return null;
  }

  const step = (d: Date): Date | null => {
    switch (r.FREQ) {
      case "DAILY":
        return at(addDays(d, interval));
      case "WEEKLY":
        return at(addDays(d, 7 * interval));
      case "MONTHLY":
        return new Date(d.getFullYear(), d.getMonth() + interval, d.getDate(), h, mi);
      case "YEARLY":
        return new Date(d.getFullYear() + interval, d.getMonth(), d.getDate(), h, mi);
      default:
        return null;
    }
  };

  let cur = new Date(start);
  for (let n = 1; startOfDay(cur) < fromDay; n++) {
    const next = step(cur);
    if (!next || n + 1 > count || n > 5000) return null;
    cur = next;
  }
  return until && cur > until ? null : cur;
}

function toEvent(props: Record<string, Prop>, today: Date): CalendarEvent | null {
  if (props.STATUS?.value.toUpperCase() === "CANCELLED") return null;
  const parsed = props.DTSTART && parseDateValue(props.DTSTART.value);
  if (!parsed) return null;

  let start = parsed.date;
  const rrule = props.RRULE?.value;
  if (rrule) {
    const next = nextOccurrence(start, rrule, today);
    if (!next) return null;
    start = next;
  }
  const summary = unescapeText(props.SUMMARY?.value ?? "") || "Untitled event";
  return {
    uid: props.UID?.value ?? `${summary}-${toISO(start)}`,
    summary,
    description: unescapeText(props.DESCRIPTION?.value ?? ""),
    location: props.LOCATION ? unescapeText(props.LOCATION.value) || null : null,
    date: toISO(start),
    time: parsed.hasTime ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : null,
    recurring: Boolean(rrule),
  };
}

/** Events from a week ago up to `daysAhead` days from now, soonest first. */
export function parseICS(text: string, now: Date, daysAhead = 60): ParsedCalendar {
  const today = startOfDay(now);
  const min = toISO(addDays(today, -7));
  const max = toISO(addDays(today, daysAhead));

  let name: string | null = null;
  let current: Record<string, Prop> | null = null;
  let nested = 0; // VALARM etc. inside a VEVENT
  const seen = new Set<string>();
  const events: CalendarEvent[] = [];

  for (const raw of unfold(text).split("\n")) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (line === "BEGIN:VEVENT") {
      current = {};
      nested = 0;
      continue;
    }
    if (line === "END:VEVENT") {
      const ev = current && toEvent(current, today);
      const key = ev ? `${ev.uid}|${ev.date}` : "";
      if (ev && ev.date >= min && ev.date <= max && !seen.has(key)) {
        seen.add(key);
        events.push(ev);
      }
      current = null;
      continue;
    }
    if (current && line.startsWith("BEGIN:")) nested++;
    else if (current && line.startsWith("END:")) nested = Math.max(0, nested - 1);
    else {
      const p = parseLine(line);
      if (!p) continue;
      if (current && nested === 0 && !(p.name in current)) current[p.name] = p;
      else if (!current && p.name === "X-WR-CALNAME") name = unescapeText(p.value);
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
  return { name, events };
}

const FALLBACK_TASKS = new Set(["Add to the family calendar", "Read & acknowledge"]);

/** Turn a calendar event into a docket item, using the extraction engine to spot actions in its notes. */
export function eventToExtraction(ev: CalendarEvent, calendarName: string | null, now: Date): Extraction {
  const ext = extract(`${ev.summary}.\n${ev.description}`, "email", now);
  const desc = ev.description.replace(/\s+/g, " ").trim();
  return {
    ...ext,
    channel: "calendar",
    title: ev.summary,
    source: calendarName || "Your calendar",
    eventDate: ev.date,
    eventTime: ev.time,
    location: ev.location,
    deadline: ext.deadline && ext.deadline <= ev.date ? ext.deadline : null,
    tasks: ext.tasks
      .filter((t) => !FALLBACK_TASKS.has(t.text))
      .map((t) => (/^RSVP to .+ parents$/.test(t.text) ? { ...t, text: "RSVP" } : t)),
    summary: desc.length > 160 ? `${desc.slice(0, 157)}…` : desc,
    confidence: 0.99,
    externalId: `${ev.uid}|${ev.date}`,
    raw: ev.description || undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Writing                                                              */
/* ------------------------------------------------------------------ */

function escapeText(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function fold(line: string): string {
  const out: string[] = [];
  let s = line;
  while (s.length > 74) {
    out.push(s.slice(0, 74));
    s = ` ${s.slice(74)}`;
  }
  out.push(s);
  return out.join("\r\n");
}

const ymd = (iso: string) => iso.replace(/-/g, "");

/**
 * Builds an .ics file of upcoming docket items with a date. Items that came from a calendar
 * import are left out (they're already in that calendar). UIDs are stable, so re-importing
 * the file updates events instead of duplicating them.
 */
export function exportICS(items: DocketItem[], now: Date = new Date()): { ics: string; count: number } {
  const events = items.filter((i) => !i.archived && i.eventDate && i.channel !== "calendar");
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FamilyDocket//Prototype//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:FamilyDocket",
  ];

  for (const i of events) {
    const date = i.eventDate!;
    const open = i.tasks
      .filter((t) => !t.done)
      .map((t) => `☐ ${t.text}${t.due ? ` (due ${formatShort(t.due)})` : ""}${t.link && !t.link.url.startsWith("mailto:") ? ` — ${t.link.url}` : ""}`);
    const description = [
      i.summary,
      i.deadline ? `Deadline: ${formatShort(i.deadline)}` : "",
      open.length ? `To do:\n${open.join("\n")}` : "",
      `From: ${i.source}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    lines.push("BEGIN:VEVENT", `UID:${i.id}@familydocket.io`, `DTSTAMP:${stamp}`);
    if (i.eventTime) {
      const [h, m] = i.eventTime.split(":").map(Number);
      const end = fromISO(date);
      end.setHours(h + 1, m);
      lines.push(
        `DTSTART:${ymd(date)}T${pad(h)}${pad(m)}00`,
        `DTEND:${ymd(toISO(end))}T${pad(end.getHours())}${pad(end.getMinutes())}00`,
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${ymd(date)}`, `DTEND;VALUE=DATE:${ymd(toISO(addDays(fromISO(date), 1)))}`);
    }
    lines.push(`SUMMARY:${escapeText(i.title)}`);
    if (i.location) lines.push(`LOCATION:${escapeText(i.location)}`);
    lines.push(`DESCRIPTION:${escapeText(description)}`, "END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return { ics: `${lines.map(fold).join("\r\n")}\r\n`, count: events.length };
}
