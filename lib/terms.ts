/**
 * UK school year milestones.
 *
 * These are the typical England dates most local authorities publish for 2026/27. Individual
 * schools and academies move INSET days and sometimes whole holidays, so every family should
 * check their own school's calendar. When a school email mentions a closure, that item is also
 * treated as a no-school day (see childcare.ts).
 */
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

/** The half term or holiday covering this date, if any. */
export function holidayOn(iso: string): Milestone | undefined {
  return UK_TERM_DATES.find((m) => (m.kind === "half-term" || m.kind === "holiday") && inRange(iso, m));
}

/** Bank holidays: no school, but most employers are closed too, so they are not childcare gaps. */
export function isBankHoliday(iso: string): boolean {
  return UK_TERM_DATES.some((m) => m.kind === "bank-holiday" && inRange(iso, m));
}
