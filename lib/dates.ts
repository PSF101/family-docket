export const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Next occurrence of a weekday (0 = Sunday), strictly after today. */
export function nextWeekday(now: Date, weekday: number): Date {
  const today = startOfDay(now);
  const diff = (weekday - today.getDay() + 7) % 7 || 7;
  return addDays(today, diff);
}

export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.round((fromISO(iso).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** "23/10/2026": the UK default everywhere a date is shown as numbers. */
export function formatUK(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "Fri 23/10/2026" */
export function formatShort(iso: string): string {
  return `${fromISO(iso).toLocaleDateString("en-GB", { weekday: "short" })} ${formatUK(iso)}`;
}

/** "Mon 26/10/2026 – Fri 30/10/2026", or a single day when from === to. */
export function formatRange(from: string, to: string): string {
  return from === to ? formatShort(from) : `${formatShort(from)} – ${formatShort(to)}`;
}

/** "Friday" */
export function formatWeekday(iso: string): string {
  return fromISO(iso).toLocaleDateString("en-GB", { weekday: "long" });
}

/** "Thursday 15/10/2026" */
export function formatLong(d: Date): string {
  return `${d.toLocaleDateString("en-GB", { weekday: "long" })} ${formatUK(toISO(d))}`;
}

/** "Friday 23rd October" — how schools write dates in letters */
export function formatSpoken(d: Date): string {
  return `${d.toLocaleDateString("en-GB", { weekday: "long" })} ${ordinal(d.getDate())} ${d.toLocaleDateString("en-GB", { month: "long" })}`;
}

export function relativeDay(iso: string, now: Date): string {
  const n = daysUntil(iso, now);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n > 1 && n < 7) return formatWeekday(iso);
  return formatShort(iso);
}

/** "14:00" → "2pm", "09:30" → "9:30am" */
export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${pad(m)}${suffix}` : `${h12}${suffix}`;
}

export type UrgencyLevel = "overdue" | "today" | "soon" | "later";
export interface Urgency {
  level: UrgencyLevel;
  label: string;
}

export function urgencyOf(deadline: string | null, now: Date): Urgency | null {
  if (!deadline) return null;
  const n = daysUntil(deadline, now);
  if (n < 0) return { level: "overdue", label: n === -1 ? "Overdue · yesterday" : `Overdue · ${-n} days` };
  if (n === 0) return { level: "today", label: "Due today" };
  if (n === 1) return { level: "soon", label: "Due tomorrow" };
  if (n <= 3) return { level: "soon", label: `Due ${formatWeekday(deadline)}` };
  return { level: "later", label: `Due ${formatShort(deadline)}` };
}
