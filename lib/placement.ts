import { daysUntil } from "./dates";

/** Enough of a docket item to decide where it sits and which actions are due soon. */
export interface Placeable {
  archived?: boolean;
  deadline: string | null;
  eventDate?: string | null;
  tasks: { done: boolean; due?: string | null }[];
}

/** The soonest deadline among actions that are still open. */
export function earliestOpenDeadline(item: Placeable): string | null {
  const dues = item.tasks.filter((t) => !t.done && t.due).map((t) => t.due as string);
  dues.sort();
  return dues[0] ?? null;
}

/**
 * Date used for Today / Tomorrow / This week / Later.
 * An open action deadline wins over the event date, so a fair next month
 * with a cake due tomorrow is filed under Tomorrow.
 */
export function placementDate(item: Placeable): string | null {
  const actionDue = earliestOpenDeadline(item);
  if (actionDue) return actionDue;
  const open = item.tasks.some((t) => !t.done);
  if (open && item.deadline) return item.deadline;
  return item.eventDate ?? item.deadline ?? null;
}

export function sectionFor(item: Placeable, now: Date): "Overdue" | "Today" | "Tomorrow" | "This week" | "Later" | "Earlier" | "No date" {
  const k = placementDate(item);
  if (!k) return "No date";
  const n = daysUntil(k, now);
  const open = item.tasks.some((t) => !t.done);
  if (n < 0) return open ? "Overdue" : "Earlier";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n <= 7) return "This week";
  return "Later";
}

/** When an action has no date of its own, it inherits the item deadline only if nothing else is dated. */
function actionDue(item: Placeable, task: { done: boolean; due?: string | null }): string | null {
  if (task.due) return task.due;
  if (item.tasks.some((t) => t.due)) return null;
  return item.deadline;
}

/** Open actions whose own deadline is today or tomorrow. */
export function actionsDueWithin24h(items: Placeable[], now: Date): number {
  return items
    .filter((i) => !i.archived)
    .reduce((n, item) => n + item.tasks.filter((t) => !t.done && dueWithin24h(actionDue(item, t), now)).length, 0);
}

function dueWithin24h(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const n = daysUntil(iso, now);
  return n >= 0 && n <= 1;
}
