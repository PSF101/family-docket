"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Moon, Square, Sun, Volume2 } from "lucide-react";
import { buildDispatch, type DispatchLine, type DispatchMode } from "@/lib/briefing";
import { useDocket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Segmented } from "../ui";

const TONE: Record<NonNullable<DispatchLine["tone"]> | "default", string> = {
  alert: "text-rose-700",
  warn: "text-amber-800",
  muted: "text-stone-400",
  default: "text-stone-700",
};

const DOT: Record<NonNullable<DispatchLine["tone"]> | "default", string> = {
  alert: "bg-rose-500",
  warn: "bg-amber-400",
  muted: "bg-stone-200",
  default: "bg-stone-300",
};

export function Briefing({ now }: { now: Date }) {
  const { items } = useDocket();
  const [mode, setMode] = useState<DispatchMode>(now.getHours() < 14 ? "morning" : "evening");
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const dispatch = useMemo(() => buildDispatch(items, mode, now), [items, mode, now]);
  const sourceCount = items.filter((i) => !i.archived).length;

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(dispatch.text);
    } catch {
      /* clipboard blocked */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function toggleSpeech() {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(dispatch.text.replace(/•/g, "").replace(/—/g, ","));
    utter.lang = "en-GB";
    utter.rate = 1.02;
    utter.onend = () => setSpeaking(false);
    synth.speak(utter);
    setSpeaking(true);
  }

  const Icon = mode === "morning" ? Sun : Moon;

  return (
    <div className="space-y-5 px-4 pb-8 pt-2">
      <header className="px-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">Chief of Staff</h1>
        <p className="mt-1 text-[14px] text-stone-500">One crisp read instead of five feeds.</p>
      </header>

      <Segmented<DispatchMode>
        value={mode}
        onChange={(m) => {
          window.speechSynthesis?.cancel();
          setSpeaking(false);
          setMode(m);
        }}
        options={[
          { value: "morning", label: "Morning", icon: Sun },
          { value: "evening", label: "Evening", icon: Moon },
        ]}
      />

      <article key={mode} className="animate-fade-up overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-stone-900/[0.04]">
        <div className={cn("px-5 pb-4 pt-5", mode === "morning" ? "bg-gradient-to-b from-amber-50/80 to-white" : "bg-gradient-to-b from-indigo-50/70 to-white")}>
          <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-stone-400">
            <Icon className="h-3.5 w-3.5" />
            FamilyDocket · {dispatch.label}
          </div>
          <p className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-ink">{dispatch.dateLine}</p>
          <p className="mt-1 text-[14px] text-stone-500">{dispatch.greeting}</p>
        </div>

        <div className="divide-y divide-stone-100 px-5">
          {dispatch.sections.map((s) => (
            <section key={s.heading} className="py-4">
              <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-stone-400">{s.heading}</h2>
              <ul className="mt-2.5 space-y-2">
                {s.lines.map((l, i) => {
                  const tone = l.tone ?? "default";
                  return (
                    <li key={i} className={cn("flex gap-2.5 text-[14px] leading-snug", TONE[tone])}>
                      <span className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone])} />
                      <span className={cn(l.tone === "alert" && "font-medium")}>{l.text}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="border-t border-stone-100 bg-stone-50/70 px-5 py-4">
          <p className="text-[13px] leading-relaxed text-stone-600">{dispatch.footer}</p>
          <p className="mt-1.5 text-[11.5px] text-stone-400">
            Compiled {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} from {sourceCount} item{sourceCount === 1 ? "" : "s"}
          </p>
        </div>
      </article>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={copy}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[14px] font-medium text-white shadow-float"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied as plain text" : "Copy dispatch"}
        </button>
        <button
          type="button"
          onClick={toggleSpeech}
          aria-label={speaking ? "Stop reading" : "Read aloud"}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-[14px] font-medium text-stone-600 shadow-card ring-1 ring-stone-900/[0.04]"
        >
          {speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {speaking ? "Stop" : "Listen"}
        </button>
      </div>
    </div>
  );
}
