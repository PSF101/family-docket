"use client";

import { useMemo, useState } from "react";
import { Archive, CalendarDays, Inbox, ListChecks, Plus } from "lucide-react";
import type { DocketItem } from "@/lib/types";
import { daysUntil, formatShort, relativeDay, timeGreeting } from "@/lib/dates";
import { findGaps } from "@/lib/childcare";
import { useProfile } from "@/lib/profile";
import { useDocket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ActionCard } from "./ActionCard";
import { GapAlerts } from "./ChildcareGaps";
import { SectionLabel } from "../ui";

const FILTERS = ["All", "Action Items", "Calendar Events", "Archived"] as const;
type Filter = (typeof FILTERS)[number];

const hasOpen = (i: DocketItem) => i.tasks.some((t) => !t.done);

/** The date that matters most for sorting: an open deadline, otherwise the event. */
function keyDate(i: DocketItem): string | null {
  const candidates = [hasOpen(i) ? i.deadline : null, i.eventDate].filter(Boolean) as string[];
  return candidates.sort()[0] ?? null;
}

const BUCKET_ORDER = ["Overdue", "Today", "Tomorrow", "This week", "Later", "Earlier", "No date"];

function bucketFor(i: DocketItem, now: Date): string {
  const k = keyDate(i);
  if (!k) return "No date";
  const n = daysUntil(k, now);
  if (n < 0) return hasOpen(i) ? "Overdue" : "Earlier";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n <= 7) return "This week";
  return "Later";
}

interface Group {
  label: string;
  items: DocketItem[];
}

export function Dashboard({ now, onAdd }: { now: Date; onAdd: () => void }) {
  const { items, toggleTask, archive, restore, remove } = useDocket();
  const { profile } = useProfile();
  const [filter, setFilter] = useState<Filter>("All");
  const gaps = useMemo(() => findGaps(profile, items, now), [profile, items, now]);

  const active = items.filter((i) => !i.archived);
  const openTasks = active.reduce((n, i) => n + i.tasks.filter((t) => !t.done).length, 0);
  const dueSoon = active.filter((i) => i.deadline && hasOpen(i) && daysUntil(i.deadline, now) <= 1).length;
  const eventsThisWeek = active.filter((i) => i.eventDate && daysUntil(i.eventDate, now) >= 0 && daysUntil(i.eventDate, now) <= 7).length;

  const counts: Record<Filter, number> = {
    All: active.length,
    "Action Items": active.filter(hasOpen).length,
    "Calendar Events": active.filter((i) => i.eventDate).length,
    Archived: items.length - active.length,
  };

  const groups = useMemo<Group[]>(() => {
    if (filter === "Calendar Events") {
      const events = active.filter((i) => i.eventDate).sort((a, b) => a.eventDate!.localeCompare(b.eventDate!) || (a.eventTime ?? "").localeCompare(b.eventTime ?? ""));
      const byDay = new Map<string, DocketItem[]>();
      for (const e of events) {
        const rel = relativeDay(e.eventDate!, now);
        const short = formatShort(e.eventDate!);
        const label = rel === short ? short : `${rel} · ${short}`;
        byDay.set(label, [...(byDay.get(label) ?? []), e]);
      }
      return [...byDay.entries()].map(([label, items]) => ({ label, items }));
    }

    const pool =
      filter === "Archived" ? items.filter((i) => i.archived) : filter === "Action Items" ? active.filter(hasOpen) : active;

    if (filter === "Archived") return pool.length ? [{ label: "Archived", items: pool }] : [];

    const map = new Map<string, DocketItem[]>();
    for (const i of pool) {
      const b = bucketFor(i, now);
      map.set(b, [...(map.get(b) ?? []), i]);
    }
    return BUCKET_ORDER.filter((b) => map.has(b)).map((label) => ({
      label,
      items: map.get(label)!.sort((a, b) => (keyDate(a) ?? "9999").localeCompare(keyDate(b) ?? "9999")),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, items, now]);

  const greeting = timeGreeting(now);
  const actionItems = counts["Action Items"];

  return (
    <div className="space-y-5 px-4 pb-8 pt-2">
      <header className="px-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">{greeting}.</h1>
        <p className="mt-1 text-[14px] text-stone-500">
          {openTasks === 0
            ? "Nothing outstanding. Enjoy it."
            : `${openTasks} open action${openTasks === 1 ? "" : "s"} across ${actionItems} item${actionItems === 1 ? "" : "s"}.`}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Open actions" value={openTasks} />
        <Stat label="Due ≤ 24h" value={dueSoon} tone={dueSoon ? "alert" : undefined} />
        <Stat label="Events · 7 days" value={eventsThisWeek} />
      </div>

      {filter !== "Archived" && <GapAlerts gaps={gaps} now={now} />}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition",
              filter === f ? "bg-ink text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300",
            )}
          >
            {f}
            <span className={cn("text-[11px] tabular-nums", filter === f ? "text-white/60" : "text-stone-400")}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState filter={filter} onAdd={onAdd} />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <SectionLabel count={g.items.length}>{g.label}</SectionLabel>
              <div className="space-y-3">
                {g.items.map((item) => (
                  <ActionCard
                    key={item.id}
                    item={item}
                    now={now}
                    inChildcareGap={gaps.some((g) => g.itemId === item.id)}
                    onToggle={(taskId) => toggleTask(item.id, taskId)}
                    onArchive={() => archive(item.id)}
                    onRestore={() => restore(item.id)}
                    onDelete={() => remove(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "alert" }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-stone-900/[0.04]">
      <p className={cn("text-[22px] font-semibold tabular-nums tracking-tight", tone === "alert" ? "text-rose-600" : "text-ink")}>{value}</p>
      <p className="mt-0.5 text-[11.5px] leading-tight text-stone-500">{label}</p>
    </div>
  );
}

function EmptyState({ filter, onAdd }: { filter: Filter; onAdd: () => void }) {
  const copy: Record<Filter, { icon: typeof Inbox; title: string; body: string }> = {
    All: { icon: Inbox, title: "Your docket is clear", body: "Import your calendar, paste an email or drop in a screenshot to get started." },
    "Action Items": { icon: ListChecks, title: "No open actions", body: "Every slip signed, every kit packed. Nicely done." },
    "Calendar Events": { icon: CalendarDays, title: "No upcoming events", body: "Events appear here as soon as they're extracted." },
    Archived: { icon: Archive, title: "Nothing archived yet", body: "Finished items you archive will live here." },
  };
  const { icon: Icon, title, body } = copy[filter];
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-stone-300 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-card">
        <Icon className="h-5 w-5 text-stone-400" />
      </div>
      <p className="mt-4 font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-[16rem] text-[13px] text-stone-500">{body}</p>
      {filter !== "Archived" && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Add something
        </button>
      )}
    </div>
  );
}
