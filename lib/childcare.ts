/**
 * Childcare gap detection: weekdays when the children are not in school AND every carer is
 * working or away. These are the only days the Rescue (emergency cover) button is offered.
 */
import type { DocketItem } from "./types";
import { countryOf, type Carer, type Profile } from "./profile";
import { addDays, fromISO, startOfDay, toISO } from "./dates";
import { holidayOn, isBankHoliday } from "./terms";

/** Bubble: UK childcare app for booking vetted local sitters. Swap for a partner deep link when one exists. */
export const BUBBLE_URL = "https://joinbubble.com/";

const CLOSURE_RE = /\b(inset|school (?:is |will be )?closed|closed to (?:pupils|children|students)|staff training day|teacher training day|strike action)\b/i;

/** A docket item announcing a day with no school (INSET, closure, strike). */
export function isClosure(item: DocketItem): boolean {
  return !!item.eventDate && CLOSURE_RE.test(`${item.title}\n${item.summary}\n${item.raw ?? ""}`);
}

export interface Gap {
  /** First and last day of a run of consecutive gap weekdays. */
  from: string;
  to: string;
  days: number;
  /** Why there's no school, e.g. "October half term" or the closure item's title. */
  reason: string;
  /** The closure item behind it, when it came from an email rather than the term calendar. */
  itemId?: string;
  /** Who is unavailable and why, e.g. "Priya working · Sam away (Conference)". */
  busy: string;
}

function carerStatus(c: Carer, iso: string, weekday: number): string | null {
  const away = c.away.find((a) => iso >= a.from && iso <= a.to);
  if (away) return `${c.name || "Carer"} away${away.note ? ` (${away.note})` : ""}`;
  if (c.workDays.includes(weekday)) return `${c.name || "Carer"} working`;
  return null;
}

/** Gaps in the next `horizon` days, merged into runs and skipping ones the family marked as covered. */
export function findGaps(profile: Profile | null, items: DocketItem[], now: Date, horizon = 60): Gap[] {
  if (!profile || !profile.carers.length || !profile.children.length) return [];

  const closures = items.filter((i) => !i.archived && isClosure(i));
  const country = countryOf(profile);
  const today = startOfDay(now);
  const days: (Omit<Gap, "from" | "to" | "days"> & { iso: string })[] = [];

  for (let n = 0; n <= horizon; n++) {
    const date = addDays(today, n);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const iso = toISO(date);
    if (isBankHoliday(iso, country)) continue;

    const closure = closures.find((c) => c.eventDate === iso);
    const holiday = holidayOn(iso, country);
    if (!closure && !holiday) continue;

    const statuses = profile.carers.map((c) => carerStatus(c, iso, weekday));
    if (statuses.some((s) => s === null)) continue; // someone is free

    days.push({ iso, reason: closure?.title ?? holiday!.label, itemId: closure?.id, busy: statuses.join(" · ") });
  }

  // Merge consecutive weekdays (Fri → Mon counts as consecutive) with the same reason.
  const gaps: Gap[] = [];
  for (const d of days) {
    const last = gaps[gaps.length - 1];
    const prevWeekday = (() => {
      const dt = fromISO(d.iso);
      return toISO(addDays(dt, dt.getDay() === 1 ? -3 : -1));
    })();
    if (last && last.to === prevWeekday && last.reason === d.reason) {
      last.to = d.iso;
      last.days += 1;
      if (last.busy !== d.busy) last.busy = "All carers working or away";
    } else {
      gaps.push({ from: d.iso, to: d.iso, days: 1, reason: d.reason, itemId: d.itemId, busy: d.busy });
    }
  }
  return gaps.filter((g) => !profile.coveredGaps.includes(g.from));
}
