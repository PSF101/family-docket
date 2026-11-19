"use client";

import { Check, LifeBuoy, TriangleAlert } from "lucide-react";
import { BUBBLE_URL, type Gap } from "@/lib/childcare";
import { daysUntil, formatRange } from "@/lib/dates";
import { countryOf, useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { SectionLabel } from "../ui";

/** The emergency childcare link. Only rendered for a detected gap, never as a general shortcut. */
export function RescueButton({ className }: { className?: string }) {
  const { profile } = useProfile();
  if (countryOf(profile) === "US") return null;
  return (
    <a
      href={BUBBLE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-3 rounded-xl bg-rose-600 px-3.5 py-2.5 text-white shadow-[0_6px_16px_-6px_rgba(225,29,72,0.55)] ring-1 ring-rose-700/40 transition hover:bg-rose-700 active:scale-[0.99]",
        className,
      )}
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
        <span className="absolute inset-0 animate-ping rounded-full bg-white/20 [animation-duration:2.2s]" />
        <LifeBuoy className="relative h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100">Rescue</span>
        <span className="block text-[14px] font-semibold">Book emergency cover</span>
        <span className="block text-[11.5px] text-rose-100">Vetted local sitters via Bubble</span>
      </span>
      <span className="ml-auto text-[18px] leading-none text-rose-100 transition group-hover:translate-x-0.5">→</span>
    </a>
  );
}

export function GapAlerts({ gaps, now }: { gaps: Gap[]; now: Date }) {
  const { update } = useProfile();
  if (!gaps.length) return null;
  return (
    <section>
      <SectionLabel count={gaps.length}>Childcare gaps</SectionLabel>
      <div className="space-y-3">
        {gaps.map((g) => {
          const n = daysUntil(g.from, now);
          return (
            <article key={g.from} className="animate-fade-up overflow-hidden rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                <TriangleAlert className="h-3.5 w-3.5" />
                No school · nobody free
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10.5px] normal-case tracking-normal text-rose-700 ring-1 ring-rose-200">
                  {n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`}
                </span>
              </div>
              <h3 className="mt-2 text-[15.5px] font-semibold leading-snug text-ink">{g.reason}</h3>
              <p className="mt-0.5 text-[13px] tabular-nums text-stone-600">
                {formatRange(g.from, g.to)}
                {g.days > 1 && <span className="text-stone-400"> · {g.days} weekdays</span>}
              </p>
              <p className="mt-1 text-[12.5px] text-stone-500">{g.busy}</p>
              <RescueButton className="mt-3" />
              <button
                type="button"
                onClick={() => update((p) => ({ ...p, coveredGaps: [...p.coveredGaps, g.from] }))}
                className="mt-2 inline-flex items-center gap-1.5 px-1 text-[12.5px] font-medium text-stone-500 hover:text-stone-700"
              >
                <Check className="h-3.5 w-3.5" /> We&apos;ve got this covered
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
