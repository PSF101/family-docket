"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Reading the message",
  "Identifying sender & category",
  "Extracting dates, times & deadlines",
  "Building your action checklist",
];

/** The fake "LLM is thinking" sequence shown between submit and review. */
export function ProcessingView({ onDone, label = "Reading your email…" }: { onDone: () => void; label?: string }) {
  const [step, setStep] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => (step >= STEPS.length ? done.current() : setStep((s) => s + 1)), step >= STEPS.length ? 300 : 620);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="animate-fade-up space-y-5 px-4 pt-6">
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-card ring-1 ring-stone-900/[0.04]">
        <div className="space-y-2.5" aria-hidden>
          {[92, 78, 85, 40, 88, 70, 60].map((w, i) => (
            <div key={i} className="skeleton h-2.5 rounded-full" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 animate-scan bg-gradient-to-b from-transparent via-accent-200/50 to-transparent" />
      </div>

      <div className="flex items-center gap-2 px-1 text-[13px] font-medium text-accent-700">
        <Sparkles className="h-4 w-4" /> {label}
      </div>

      <ol className="space-y-3 px-1">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition",
                  state === "done" && "bg-accent-600 text-white",
                  state === "active" && "bg-accent-50 text-accent-700",
                  state === "todo" && "bg-stone-100 text-stone-300",
                )}
              >
                {state === "done" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : state === "active" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <span className={cn("text-[14px] transition", state === "todo" ? "text-stone-400" : "text-ink")}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
