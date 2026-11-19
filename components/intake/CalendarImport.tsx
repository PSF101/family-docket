"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, FileUp, ListChecks, Repeat } from "lucide-react";
import type { Extraction } from "@/lib/types";
import { eventToExtraction, parseICS } from "@/lib/ics";
import { sampleCalendar } from "@/lib/samples";
import { daysUntil, formatShort, formatTime, relativeDay } from "@/lib/dates";
import { useDocket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CategoryTag } from "../ui";

const HELP: { app: string; steps: string[] }[] = [
  {
    app: "Google Calendar",
    steps: [
      "On a computer, open calendar.google.com and go to Settings (the gear) → Import & export.",
      "Click Export. A .zip file downloads.",
      "Double-click the .zip to unzip it, then choose the .ics file for your calendar here.",
    ],
  },
  {
    app: "Apple Calendar",
    steps: [
      "On a Mac, open Calendar and click the calendar you want in the sidebar.",
      "Choose File → Export → Export…",
      "Save the .ics file, then choose it here.",
    ],
  },
  {
    app: "Outlook",
    steps: [
      "Outlook for Windows: File → Save Calendar saves an .ics file.",
      "Outlook on the web: Settings → Calendar → Shared calendars → Publish a calendar, then open the ICS link in your browser to download it.",
      "Choose that .ics file here.",
    ],
  },
];

interface Row {
  ext: Extraction;
  recurring: boolean;
}

export function CalendarImport({ now, onImported }: { now: Date; onImported: (count: number) => void }) {
  const { items, importMany } = useDocket();
  const [calName, setCalName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const existing = useMemo(() => new Set(items.map((i) => i.externalId).filter(Boolean) as string[]), [items]);

  function load(text: string, fileName?: string) {
    if (!/BEGIN:VCALENDAR/i.test(text)) {
      setError("That doesn't look like a calendar file. Look for a file ending in .ics.");
      return;
    }
    const parsed = parseICS(text, now);
    const name = parsed.name ?? fileName?.replace(/\.ics$/i, "") ?? null;
    const built = parsed.events.map((ev) => ({ ext: eventToExtraction(ev, name, now), recurring: ev.recurring }));
    if (!built.length) {
      setError("No events found between last week and the next 8 weeks.");
      setRows(null);
      return;
    }
    setError(null);
    setCalName(name);
    setRows(built);
    // Pre-select upcoming events that aren't already in the docket.
    setSelected(
      new Set(
        built
          .filter((r) => !existing.has(r.ext.externalId!) && daysUntil(r.ext.eventDate!, now) >= 0)
          .map((r) => r.ext.externalId!),
      ),
    );
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (/\.zip$/i.test(file.name)) {
      setError("That's the .zip from Google. Double-click it to unzip it, then choose the .ics file inside.");
      return;
    }
    load(await file.text(), file.name);
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function importSelected() {
    if (!rows) return;
    const count = importMany(rows.filter((r) => selected.has(r.ext.externalId!)).map((r) => r.ext));
    onImported(count);
  }

  if (rows) {
    const selectable = rows.filter((r) => !existing.has(r.ext.externalId!));
    const allOn = selectable.length > 0 && selectable.every((r) => selected.has(r.ext.externalId!));
    const withActions = rows.filter((r) => selected.has(r.ext.externalId!) && r.ext.tasks.length).length;

    return (
      <div className="animate-fade-up space-y-4">
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-[15px] font-semibold text-ink">{calName ?? "Your calendar"}</p>
            <p className="text-[12.5px] text-stone-500">
              {rows.length} events from last week to the next 8 weeks
              {withActions ? ` · ${withActions} with actions spotted` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelected(allOn ? new Set() : new Set(selectable.map((r) => r.ext.externalId!)))}
            className="text-[12.5px] font-medium text-accent-700"
          >
            {allOn ? "Select none" : "Select all"}
          </button>
        </div>

        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-900/[0.04]">
          {rows.map(({ ext, recurring }) => {
            const id = ext.externalId!;
            const already = existing.has(id);
            const on = selected.has(id);
            const rel = relativeDay(ext.eventDate!, now);
            const short = formatShort(ext.eventDate!);
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => toggle(id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition enabled:hover:bg-stone-50 disabled:opacity-50"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition",
                      on || already ? "border-accent-600 bg-accent-600 text-white" : "border-stone-300 bg-white",
                    )}
                  >
                    {(on || already) && <Check className="h-3 w-3" strokeWidth={3.2} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">{ext.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-stone-500">
                      <span>
                        {rel}
                        {rel !== short && ` · ${short}`}
                        {ext.eventTime ? ` · ${formatTime(ext.eventTime)}` : " · All day"}
                      </span>
                      {recurring && (
                        <span className="inline-flex items-center gap-1">
                          <Repeat className="h-3 w-3" /> repeats
                        </span>
                      )}
                      {ext.tasks.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-accent-700">
                          <ListChecks className="h-3 w-3" /> {ext.tasks.length} action{ext.tasks.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {already && <span>· already added</span>}
                    </span>
                  </span>
                  <CategoryTag category={ext.category} className="hidden shrink-0 min-[380px]:inline-flex" />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setRows(null)}
            className="rounded-2xl bg-white px-4 py-3.5 text-[14px] font-medium text-stone-600 shadow-card ring-1 ring-stone-900/[0.04]"
          >
            Another file
          </button>
          <button
            type="button"
            onClick={importSelected}
            disabled={selected.size === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[15px] font-medium text-white shadow-float transition active:scale-[0.99] disabled:bg-stone-300 disabled:shadow-none"
          >
            <CalendarDays className="h-[18px] w-[18px]" />
            Import {selected.size} event{selected.size === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-9 text-center transition",
          dragging ? "border-accent-500 bg-accent-50" : "border-stone-300 bg-white/60 hover:border-stone-400",
        )}
      >
        <input type="file" accept=".ics,text/calendar,.zip" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-card">
          <FileUp className="h-5 w-5 text-stone-500" />
        </div>
        <p className="mt-4 font-medium text-ink">Import your calendar</p>
        <p className="mt-1 max-w-[17rem] text-[13px] text-stone-500">
          Choose an .ics file exported from Google, Apple or Outlook. It stays on this device.
        </p>
        <span className="mt-4 rounded-full bg-ink px-4 py-1.5 text-[12.5px] font-medium text-white">Choose .ics file</span>
      </label>

      {error && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-900/[0.04]">
        <p className="px-4 pb-1 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">How to get your .ics file</p>
        {HELP.map(({ app, steps }) => (
          <div key={app} className="border-t border-stone-100 first-of-type:border-t-0">
            <button
              type="button"
              onClick={() => setHelp(help === app ? null : app)}
              className="flex w-full items-center px-4 py-3 text-[14px] font-medium text-ink"
            >
              {app}
              <ChevronDown className={cn("ml-auto h-4 w-4 text-stone-400 transition-transform", help === app && "rotate-180")} />
            </button>
            {help === app && (
              <ol className="list-decimal space-y-1.5 px-4 pb-4 pl-9 text-[13px] leading-relaxed text-stone-600">
                {steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        ))}
        <p className="border-t border-stone-100 px-4 py-3 text-[12px] leading-relaxed text-stone-400">
          Exporting needs a computer; the phone apps can&apos;t export calendars. Once you have the file, you can also send it to your phone and import it there.
        </p>
      </div>

      <div className="px-1">
        <p className="mb-2 text-[12px] text-stone-400">No file handy? Try it with a sample:</p>
        <button
          type="button"
          onClick={() => load(sampleCalendar(now), "Family")}
          className="rounded-full bg-white px-3 py-1.5 text-[12.5px] text-stone-600 ring-1 ring-stone-200 transition hover:text-ink hover:ring-stone-300"
        >
          Sample family calendar
        </button>
      </div>
    </div>
  );
}
