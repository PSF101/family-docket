export const DAY_MS = 86_400_000;

/** Where the family lives. Dates, money, grades and the school calendar follow this. */
export type Country = "UK" | "US";

let currentCountry: Country = "UK";

/** Display helpers read this so every screen follows the profile without an extra argument. */
export function setActiveCountry(country: Country) {
  currentCountry = country === "US" ? "US" : "UK";
}

export function activeCountry(): Country {
  return currentCountry;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Shared by the Docket and Briefing so both greetings change at the same hours. */
export function timeGreeting(now: Date): "Good morning" | "Good afternoon" | "Good evening" {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

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

/** "23/10/2026" in the UK, "10/23/2026" in the US. */
export function formatUK(iso: string, country: Country = activeCountry()): string {
  const [y, m, d] = iso.split("-");
  return country === "US" ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}

const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Thu 3 Dec" in the UK, "Thu Dec 3" in the US. */
export function formatDayMonth(iso: string, country: Country = activeCountry()): string {
  const d = fromISO(iso);
  const weekday = SHORT_WEEKDAYS[d.getDay()];
  const month = SHORT_MONTHS[d.getMonth()];
  return country === "US" ? `${weekday} ${month} ${d.getDate()}` : `${weekday} ${d.getDate()} ${month}`;
}

/** The date shown on cards and in the briefing. */
export function formatShort(iso: string, country: Country = activeCountry()): string {
  return formatDayMonth(iso, country);
}

/** "Mon 26 Oct – Fri 30 Oct", or a single day when from === to. */
export function formatRange(from: string, to: string, country: Country = activeCountry()): string {
  return from === to ? formatShort(from, country) : `${formatShort(from, country)} – ${formatShort(to, country)}`;
}

/** "Friday" */
export function formatWeekday(iso: string): string {
  return fromISO(iso).toLocaleDateString("en-GB", { weekday: "long" });
}

/** "Tuesday" within the next six days, otherwise "Tue 1 Dec" or "Tue Dec 1". */
export function formatWhen(iso: string, now: Date, country: Country = activeCountry()): string {
  return daysUntil(iso, now) > 6 ? formatDayMonth(iso, country) : formatWeekday(iso);
}

/** "Thursday 19 Nov 2026" or "Thursday Nov 19, 2026". */
export function formatLong(d: Date, country: Country = activeCountry()): string {
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const dayMonth = formatDayMonth(toISO(d), country).replace(/^\S+\s/, "");
  return country === "US" ? `${weekday}, ${dayMonth}, ${d.getFullYear()}` : `${weekday} ${dayMonth} ${d.getFullYear()}`;
}

/** "Friday 23rd October" — how schools write dates in letters */
export function formatSpoken(d: Date): string {
  return `${d.toLocaleDateString("en-GB", { weekday: "long" })} ${ordinal(d.getDate())} ${d.toLocaleDateString("en-GB", { month: "long" })}`;
}

export function relativeDay(iso: string, now: Date, country: Country = activeCountry()): string {
  const n = daysUntil(iso, now);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n > 1 && n < 7) return formatWeekday(iso);
  return formatShort(iso, country);
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

export function urgencyOf(deadline: string | null, now: Date, country: Country = activeCountry()): Urgency | null {
  if (!deadline) return null;
  const n = daysUntil(deadline, now);
  if (n < 0) return { level: "overdue", label: n === -1 ? "Overdue · yesterday" : `Overdue · ${-n} days` };
  if (n === 0) return { level: "today", label: "Due today" };
  if (n === 1) return { level: "soon", label: "Due tomorrow" };
  if (n <= 3) return { level: "soon", label: `Due ${formatWeekday(deadline)}` };
  return { level: "later", label: `Due ${formatShort(deadline, country)}` };
}
