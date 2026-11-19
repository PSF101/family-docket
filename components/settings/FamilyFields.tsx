"use client";

import { Plus, Trash2, X } from "lucide-react";
import { type Away, type Carer, type Child, newChild, WEEKDAYS } from "@/lib/profile";
import { formatRange } from "@/lib/dates";
import { cn, uid } from "@/lib/utils";

export const inputCls =
  "w-full rounded-xl bg-white px-3 py-2.5 text-[14px] text-ink outline-none ring-1 ring-stone-200 placeholder:text-stone-300 focus:ring-2 focus:ring-accent-500";

export function ChildrenEditor({ value, onChange }: { value: Child[]; onChange: (c: Child[]) => void }) {
  const set = (id: string, patch: Partial<Child>) => onChange(value.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-2.5">
      {value.map((c, i) => (
        <div key={c.id} className="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-900/[0.04]">
          <div className="flex items-center gap-2">
            <input value={c.name} onChange={(e) => set(c.id, { name: e.target.value })} placeholder={`Child ${i + 1}'s first name`} aria-label="First name" className={inputCls} />
            {value.length > 1 && (
              <button type="button" onClick={() => onChange(value.filter((x) => x.id !== c.id))} aria-label="Remove child" className="rounded-lg p-2 text-stone-400 hover:bg-stone-200/60 hover:text-stone-600">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-2 grid grid-cols-[1fr_7.5rem] gap-2">
            <input value={c.school} onChange={(e) => set(c.id, { school: e.target.value })} placeholder="School (optional)" aria-label="School" className={inputCls} />
            <input value={c.yearGroup} onChange={(e) => set(c.id, { yearGroup: e.target.value })} placeholder="Year 4" aria-label="Year group" className={inputCls} />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, newChild()])} className="inline-flex items-center gap-1.5 px-1 text-[13px] font-medium text-accent-700">
        <Plus className="h-4 w-4" /> Add another child
      </button>
    </div>
  );
}

export function WorkDayPicker({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="flex gap-1.5">
      {WEEKDAYS.map((d) => {
        const on = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== d.value) : [...value, d.value].sort())}
            className={cn(
              "flex-1 rounded-lg py-2 text-[12.5px] font-medium transition",
              on ? "bg-ink text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:ring-stone-300",
            )}
          >
            {d.short}
          </button>
        );
      })}
    </div>
  );
}

/** Each carer's name and usual working days; `withAway` adds the "dates away" list used in Settings. */
export function CarerEditor({ carer, onChange, label, withAway = false }: { carer: Carer; onChange: (c: Carer) => void; label: string; withAway?: boolean }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-900/[0.04]">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">{label}</p>
      <input value={carer.name} onChange={(e) => onChange({ ...carer, name: e.target.value })} placeholder="First name" aria-label={label === "You" ? "Your name" : `${label} name`} className={inputCls} />
      <p className="mb-1.5 mt-3 text-[12.5px] text-stone-500">Usually working on</p>
      <WorkDayPicker value={carer.workDays} onChange={(workDays) => onChange({ ...carer, workDays })} />
      {withAway && <AwayEditor value={carer.away} onChange={(away) => onChange({ ...carer, away })} />}
    </div>
  );
}

function AwayEditor({ value, onChange }: { value: Away[]; onChange: (a: Away[]) => void }) {
  function add(form: HTMLFormElement) {
    const data = new FormData(form);
    const from = String(data.get("from") || "");
    const to = String(data.get("to") || "") || from;
    if (!from || to < from) return;
    onChange([...value, { id: uid(), from, to, note: String(data.get("note") || "").trim() }].sort((a, b) => a.from.localeCompare(b.from)));
    form.reset();
  }
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[12.5px] text-stone-500">Away or on shift (trips, conferences, nights)</p>
      {value.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {value.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[12.5px] text-stone-700 ring-1 ring-stone-200">
              <span className="tabular-nums">{formatRange(a.from, a.to)}</span>
              {a.note && <span className="truncate text-stone-400">· {a.note}</span>}
              <button type="button" onClick={() => onChange(value.filter((x) => x.id !== a.id))} aria-label="Remove dates" className="ml-auto text-stone-400 hover:text-stone-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(e.currentTarget);
        }}
        className="grid grid-cols-2 gap-2"
      >
        <label className="text-[11.5px] text-stone-400">
          From
          <input name="from" type="date" required lang="en-GB" className={cn(inputCls, "mt-1 py-2 text-[13px]")} />
        </label>
        <label className="text-[11.5px] text-stone-400">
          To
          <input name="to" type="date" lang="en-GB" className={cn(inputCls, "mt-1 py-2 text-[13px]")} />
        </label>
        <input name="note" placeholder="Note, e.g. Conference in Leeds" className={cn(inputCls, "col-span-2 py-2 text-[13px]")} />
        <button type="submit" className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-[13px] font-medium text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300">
          <Plus className="h-4 w-4" /> Add dates away
        </button>
      </form>
    </div>
  );
}
