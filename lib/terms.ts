/**
 * School-year milestones.
 *
 * UK families get typical England term dates for 2026/27. Schools move training days and
 * sometimes whole holidays, so a closure mentioned in an email is also a no-school day
 * (see childcare.ts). US families do not get those England dates. They get US federal
 * holidays as likely no-school days, and are asked to import their district calendar.
 */
import type { Country } from "./dates";
import { toISO } from "./dates";

export type MilestoneKind = "term-start" | "term-end" | "half-term" | "holiday" | "bank-holiday";

export interface Milestone {
  label: string;
  kind: MilestoneKind;
  /** ISO date; for ranges, the first day. */
  from: string;
  /** ISO date; the last day (same as `from` for single days). */
  to: string;
}

export const TERM_REGION = "England (typical local authority dates)";
export const ACADEMIC_YEAR = "2026/27";

export const UK_TERM_DATES: Milestone[] = [
  { label: "Autumn term starts", kind: "term-start", from: "2026-09-03", to: "2026-09-03" },
  { label: "October half term", kind: "half-term", from: "2026-10-26", to: "2026-10-30" },
  { label: "Autumn term ends", kind: "term-end", from: "2026-12-18", to: "2026-12-18" },
  { label: "Christmas holidays", kind: "holiday", from: "2026-12-21", to: "2027-01-01" },
  { label: "Christmas Day", kind: "bank-holiday", from: "2026-12-25", to: "2026-12-25" },
  { label: "Boxing Day (substitute)", kind: "bank-holiday", from: "2026-12-28", to: "2026-12-28" },
  { label: "New Year's Day", kind: "bank-holiday", from: "2027-01-01", to: "2027-01-01" },
  { label: "Spring term starts", kind: "term-start", from: "2027-01-04", to: "2027-01-04" },
  { label: "February half term", kind: "half-term", from: "2027-02-15", to: "2027-02-19" },
  { label: "Spring term ends", kind: "term-end", from: "2027-03-25", to: "2027-03-25" },
  { label: "Good Friday", kind: "bank-holiday", from: "2027-03-26", to: "2027-03-26" },
  { label: "Easter holidays", kind: "holiday", from: "2027-03-26", to: "2027-04-09" },
  { label: "Easter Monday", kind: "bank-holiday", from: "2027-03-29", to: "2027-03-29" },
  { label: "Summer term starts", kind: "term-start", from: "2027-04-12", to: "2027-04-12" },
  { label: "Early May bank holiday", kind: "bank-holiday", from: "2027-05-03", to: "2027-05-03" },
  { label: "May half term", kind: "half-term", from: "2027-05-31", to: "2027-06-04" },
  { label: "Spring bank holiday", kind: "bank-holiday", from: "2027-05-31", to: "2027-05-31" },
  { label: "Summer term ends", kind: "term-end", from: "2027-07-21", to: "2027-07-21" },
  { label: "Summer holidays", kind: "holiday", from: "2027-07-22", to: "2027-09-01" },
  { label: "Summer bank holiday", kind: "bank-holiday", from: "2027-08-30", to: "2027-08-30" },
];

const inRange = (iso: string, m: Milestone) => iso >= m.from && iso <= m.to;

const CHECK = "check with your school";

function nthWeekday(year: number, monthIndex: number, weekday: number, n: number): string {
  const first = new Date(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return toISO(new Date(year, monthIndex, 1 + offset + (n - 1) * 7));
}

function lastWeekday(year: number, monthIndex: number, weekday: number): string {
  const last = new Date(year, monthIndex + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return toISO(new Date(year, monthIndex, last.getDate() - offset));
}

/** Federal holidays for one year, marked as likely no-school days rather than confirmed closures. */
function usHolidaysForYear(year: number): Milestone[] {
  const thanksgiving = nthWeekday(year, 10, 4, 4);
  const friday = toISO(new Date(year, 10, Number(thanksgiving.slice(8)) + 1));
  const mark = (label: string, from: string, to = from): Milestone => ({
    label: `${label} (${CHECK})`,
    kind: "holiday",
    from,
    to,
  });
  return [
    mark("Labor Day", nthWeekday(year, 8, 1, 1)),
    mark("Thanksgiving", thanksgiving, friday),
    mark("Christmas", `${year}-12-25`),
    mark("New Year", `${year}-01-01`),
    mark("MLK Day", nthWeekday(year, 0, 1, 3)),
    mark("Presidents' Day", nthWeekday(year, 1, 1, 3)),
    mark("Memorial Day", lastWeekday(year, 4, 1)),
  ];
}

/** 2026/27, matching the England list: Labor Day 2026 through Memorial Day 2027, plus the next Labor Day. */
export function usFederalHolidays(): Milestone[] {
  const years = [2026, 2027];
  const all = years.flatMap(usHolidaysForYear);
  const seen = new Set<string>();
  return all
    .filter((m) => m.from >= "2026-09-01" && m.from <= "2027-09-07")
    .filter((m) => (seen.has(m.from + m.label) ? false : seen.add(m.from + m.label)))
    .sort((a, b) => a.from.localeCompare(b.from));
}

export function calendarFor(country: Country): Milestone[] {
  return country === "US" ? usFederalHolidays() : UK_TERM_DATES;
}

export function regionLabel(country: Country): string {
  return country === "US" ? "US federal holidays · check with your school" : TERM_REGION;
}

/** The half term or holiday covering this date, if any. US dates are likely closures, not confirmed. */
export function holidayOn(iso: string, country: Country): Milestone | undefined {
  const list = country === "US" ? usFederalHolidays() : UK_TERM_DATES;
  return list.find((m) => (m.kind === "half-term" || m.kind === "holiday") && inRange(iso, m));
}

/**
 * UK bank holidays: no school, but most employers are closed too, so they are not childcare gaps.
 * US federal holidays are only likely no-school days, so parents may still be at work.
 */
export function isBankHoliday(iso: string, country: Country): boolean {
  if (country === "US") return false;
  return UK_TERM_DATES.some((m) => m.kind === "bank-holiday" && inRange(iso, m));
}
