"use client";

import { useState } from "react";
import { ArrowLeft, Braces, ChevronDown, ExternalLink, Plus, Sparkles, X } from "lucide-react";
import { formatShort, formatTime } from "@/lib/dates";
import { CATEGORIES, type DocketItem, type Extraction } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { ActionCard } from "../docket/ActionCard";
import { CATEGORY_STYLE } from "../ui";

interface Props {
  draft: Extraction;
  /** Other events found in the same message. They are saved with the one being edited. */
  also?: Extraction[];
  onChange: (d: Extraction) => void;
  now: Date;
  onConfirm: () => void;
  onBack: () => void;
}

/** Human-in-the-loop step: show the structured result, let the parent tweak it, then save. */
export function ExtractionReview({ draft, also = [], onChange, now, onConfirm, onBack }: Props) {
  const [showJson, setShowJson] = useState(false);
  const [newTask, setNewTask] = useState("");
  const preview: DocketItem = { ...draft, id: "preview", archived: false, createdAt: "" };

  const fieldsFound = [draft.eventDate, draft.eventTime, draft.location, draft.deadline, draft.audience].filter(Boolean).length;

  const json = {
    category: draft.category,
    title: draft.title,
    source: draft.source,
    channel: draft.channel,
    audience: draft.audience,
    event: { date: draft.eventDate, time: draft.eventTime, ...(draft.eventEndTime ? { end: draft.eventEndTime } : {}), location: draft.location },
    deadline: draft.deadline,
    action_items: draft.tasks.map((t) =>
      t.link || t.due ? { text: t.text, ...(t.due ? { due: t.due } : {}), ...(t.link ? { link: t.link.url } : {}) } : t.text,
    ),
    summary: draft.summary,
  };

  const setTaskText = (id: string, text: string) => onChange({ ...draft, tasks: draft.tasks.map((t) => (t.id === id ? { ...t, text } : t)) });
  const removeTask = (id: string) => onChange({ ...draft, tasks: draft.tasks.filter((t) => t.id !== id) });
  const addTask = () => {
    if (!newTask.trim()) return;
    onChange({ ...draft, tasks: [...draft.tasks, { id: uid(), text: newTask.trim(), done: false }] });
    setNewTask("");
  };

  return (
    <div className="animate-fade-up space-y-5 px-4 pb-8 pt-2">
      <header className="px-1">
        <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-accent-700">
          <Sparkles className="h-3.5 w-3.5" />
          Extracted · {fieldsFound} field{fieldsFound === 1 ? "" : "s"} · {draft.tasks.length} action{draft.tasks.length === 1 ? "" : "s"}
        </p>
        <h1 className="mt-1.5 text-[24px] font-semibold tracking-[-0.025em] text-ink">Here&apos;s what I found</h1>
        <p className="mt-1 text-[14px] text-stone-500">
          {also.length
            ? `Check it over, then add these ${also.length + 1} items to your docket.`
            : "Check it over, adjust anything, then add it to your docket."}
        </p>
      </header>

      <ActionCard item={preview} now={now} preview />

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-stone-900/[0.04]">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Category</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const { icon: Icon, className } = CATEGORY_STYLE[c];
              const selected = draft.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ ...draft, category: c })}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 transition",
                    selected ? cn(className, "ring-current") : "bg-white text-stone-500 ring-stone-200 hover:ring-stone-300",
                  )}
                >
                  <Icon className="h-3 w-3" /> {c}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Title</p>
          <input
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            className="w-full rounded-xl bg-stone-50 px-3 py-2 text-[14px] text-ink outline-none ring-1 ring-stone-200 focus:ring-2 focus:ring-accent-500"
          />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Action items</p>
          <ul className="space-y-1.5">
            {draft.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    value={t.text}
                    onChange={(e) => setTaskText(t.id, e.target.value)}
                    className="w-full rounded-lg bg-stone-50 px-3 py-1.5 text-[13.5px] text-ink outline-none ring-1 ring-stone-200 focus:ring-2 focus:ring-accent-500"
                  />
                  {t.due && <p className="mt-1 px-1 text-[11.5px] text-stone-400">Due {formatShort(t.due)}</p>}
                </div>
                {t.link && (
                  <a
                    href={t.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t.link.url}
                    aria-label={t.link.label}
                    className="rounded-lg p-1.5 text-accent-700 hover:bg-accent-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeTask(t.id)}
                  aria-label="Remove action"
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addTask();
            }}
          >
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add an action…"
              className="min-w-0 flex-1 rounded-lg border border-dashed border-stone-300 bg-transparent px-3 py-1.5 text-[13.5px] outline-none placeholder:text-stone-400 focus:border-accent-500"
            />
            <button type="submit" aria-label="Add action" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      {also.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-white p-4 shadow-card ring-1 ring-stone-900/[0.04]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Also in this message</p>
          {also.map((item) => (
            <div key={item.title + (item.eventDate ?? "")} className="rounded-xl bg-stone-50 px-3 py-2.5">
              <p className="text-[14px] font-medium text-ink">{item.title}</p>
              <p className="mt-0.5 text-[12.5px] text-stone-500">
                {[item.eventDate ? formatShort(item.eventDate) : null, item.eventTime ? formatTime(item.eventTime) : null].filter(Boolean).join(" · ") || "No date"}
                {item.tasks.length ? ` · ${item.tasks.map((t) => t.text).join(", ")}` : ""}
              </p>
            </div>
          ))}
        </section>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-900/[0.04]">
        <button
          type="button"
          onClick={() => setShowJson((s) => !s)}
          className="flex w-full items-center gap-2 px-4 py-3 text-[13px] font-medium text-stone-600"
        >
          <Braces className="h-4 w-4 text-stone-400" />
          Structured output (JSON)
          <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", showJson && "rotate-180")} />
        </button>
        {showJson && (
          <pre className="max-h-80 overflow-auto bg-ink p-4 font-mono text-[11.5px] leading-relaxed text-emerald-200">
            {JSON.stringify(json, null, 2)}
          </pre>
        )}
      </section>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white px-4 py-3.5 text-[14px] font-medium text-stone-600 shadow-card ring-1 ring-stone-900/[0.04]"
        >
          <ArrowLeft className="h-4 w-4" /> Edit input
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[15px] font-medium text-white shadow-float transition active:scale-[0.99]"
        >
          {also.length ? `Add ${also.length + 1} items` : "Add to Docket"}
        </button>
      </div>
    </div>
  );
}
