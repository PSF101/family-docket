import type { DocketItem, Task } from "./types";
import { addDays, daysUntil, formatLong, formatShort, formatTime, formatWeekday, startOfDay, toISO } from "./dates";

export type DispatchMode = "morning" | "evening";

export interface DispatchLine {
  text: string;
  tone?: "alert" | "warn" | "muted";
}
export interface DispatchSection {
  heading: string;
  lines: DispatchLine[];
}
export interface Dispatch {
  label: string;
  dateLine: string;
  greeting: string;
  sections: DispatchSection[];
  footer: string;
  /** Plain-text version for copying into a message or reading aloud. */
  text: string;
}

const SLIP_RE = /\b(consent|permission|slip|form|sign|book a slot|register|rsvp|confirm)/i;
const KIT_RE = /\b(pack|bring|kit|wear|costume|uniform|lunch|socks|goggles|boots|pads|present|medication|inhaler|outfit)\b|£/i;

const open = (i: DocketItem): Task[] => i.tasks.filter((t) => !t.done);

/**
 * The "Chief of Staff" brief. Morning focuses on today; evening on what to prepare for tomorrow.
 * In production this is a good candidate for an LLM rewrite pass for tone — the selection
 * logic below stays deterministic so nothing important is ever dropped.
 */
export function buildDispatch(items: DocketItem[], mode: DispatchMode, now: Date): Dispatch {
  const offset = mode === "morning" ? 0 : 1;
  const focusIso = toISO(addDays(startOfDay(now), offset));
  const active = items.filter((i) => !i.archived);
  const sections: DispatchSection[] = [];

  // 1. Schedule for the focus day
  const schedule = active
    .filter((i) => i.eventDate === focusIso)
    .sort((a, b) => (a.eventTime ?? "99").localeCompare(b.eventTime ?? "99"));
  sections.push({
    heading: mode === "morning" ? "On today" : `Tomorrow · ${formatWeekday(focusIso)}`,
    lines: schedule.length
      ? schedule.map((i) => ({ text: `${i.eventTime ? formatTime(i.eventTime) : "All day"} — ${i.title}${i.location ? `, ${i.location}` : ""}` }))
      : [{ text: "Nothing on the calendar.", tone: "muted" }],
  });

  // 2. Deadlines closing in
  const deadlines = active
    .filter((i) => i.deadline && open(i).length && daysUntil(i.deadline, now) <= offset + 2)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  sections.push({
    heading: "Deadlines",
    lines: deadlines.length
      ? deadlines.map((i) => {
          const n = daysUntil(i.deadline!, now);
          const label = n < 0 ? "OVERDUE" : n === 0 ? "Due today" : n === 1 ? "Due tomorrow" : `Due ${formatWeekday(i.deadline!)}`;
          const count = open(i).length;
          return {
            text: `${label} — ${i.title} (${count} open action${count === 1 ? "" : "s"})`,
            tone: n <= 0 ? "alert" : n === 1 ? "warn" : undefined,
          };
        })
      : [{ text: "No deadlines in the next few days.", tone: "muted" }],
  });

  // 3. Paperwork: slips, forms, RSVPs, bookings
  const slips = active.flatMap((i) => open(i).filter((t) => SLIP_RE.test(t.text)).map((t) => ({ i, t })));
  sections.push({
    heading: "Permission slips & replies",
    lines: slips.length
      ? slips.map(({ i, t }) => ({
          text: `${t.text} — ${i.title}${i.deadline ? ` (by ${formatShort(i.deadline)})` : ""}`,
          tone: i.deadline && daysUntil(i.deadline, now) <= 1 ? "warn" : undefined,
        }))
      : [{ text: "All signed and returned.", tone: "muted" }],
  });

  // 4. Kit & money for imminent events (or money due imminently)
  const kit = active.flatMap((i) => {
    const eventSoon = i.eventDate && daysUntil(i.eventDate, now) >= offset && daysUntil(i.eventDate, now) <= offset + 1;
    const moneyDue = i.deadline && daysUntil(i.deadline, now) <= offset + 1;
    return open(i)
      .filter((t) => KIT_RE.test(t.text) && !SLIP_RE.test(t.text) && (eventSoon || (moneyDue && t.text.includes("£"))))
      .map((t) => ({ i, t }));
  });
  sections.push({
    heading: mode === "morning" ? "Kit & money" : "Pack tonight",
    lines: kit.length
      ? kit.map(({ i, t }) => {
          const when = i.eventDate && i.eventDate !== focusIso ? ` (${formatWeekday(i.eventDate)})` : "";
          return { text: `${t.text} — for ${i.title}${when}` };
        })
      : [{ text: mode === "morning" ? "Nothing extra in the bag today." : "Nothing to pack for tomorrow.", tone: "muted" }],
  });

  // 5. Look-ahead
  const ahead = active
    .filter((i) => i.eventDate && daysUntil(i.eventDate, now) > offset + 1 && daysUntil(i.eventDate, now) <= 7)
    .sort((a, b) => a.eventDate!.localeCompare(b.eventDate!));
  if (ahead.length) {
    sections.push({
      heading: "Later this week",
      lines: ahead.map((i) => ({
        text: `${formatWeekday(i.eventDate!)} — ${i.title}${i.eventTime ? `, ${formatTime(i.eventTime)}` : ""}`,
      })),
    });
  }

  const openCount = active.reduce((n, i) => n + open(i).length, 0);
  const label = mode === "morning" ? "Morning Dispatch" : "Evening Dispatch";
  const dateLine = formatLong(now);
  const greeting =
    mode === "morning" ? "Good morning. Here's what matters today." : "Good evening. Here's what to sort before bed.";
  const footer =
    mode === "morning"
      ? `${openCount} open action${openCount === 1 ? "" : "s"} in total. Handle the flagged ones first; everything else can wait.`
      : `${openCount} still open. Anything not listed here can wait until tomorrow.`;

  const text = [
    `FAMILYDOCKET · ${label.toUpperCase()}`,
    dateLine,
    "",
    greeting,
    "",
    ...sections.flatMap((s) => [s.heading.toUpperCase(), ...s.lines.map((l) => `• ${l.text}`), ""]),
    footer,
  ].join("\n");

  return { label, dateLine, greeting, sections, footer, text };
}
