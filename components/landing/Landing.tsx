"use client";

import { CalendarOff, Layers, ListChecks, Lock, Moon } from "lucide-react";

const BENEFITS = [
  { icon: ListChecks, text: "Paste any school email → get a checklist" },
  { icon: CalendarOff, text: "See days with no school and nobody free" },
  { icon: Moon, text: "One calm briefing each evening" },
] as const;

export function Landing({ onTry, onDemo }: { onTry: () => void; onDemo: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-canvas px-5 pb-8 pt-6 md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem] md:shadow-2xl md:ring-1 md:ring-black/5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-white">
          <Layers className="h-4 w-4" />
        </div>
        <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">FamilyDocket</p>
        <span className="rounded-full bg-accent-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.12em] text-accent-700">Beta</span>
      </div>

      <h1 className="mt-8 text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-ink">
        Never miss a school email, a non-uniform day or a childcare gap again.
      </h1>

      <ul className="mt-8 space-y-4">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="pt-2 text-[14.5px] leading-snug text-stone-700">{text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 flex items-start gap-1.5 text-[13px] leading-snug text-stone-500">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Your family&apos;s data stays on your phone.
      </p>

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={onTry}
          className="flex w-full items-center justify-center rounded-2xl bg-ink py-4 text-[15px] font-medium text-white shadow-float transition active:scale-[0.99]"
        >
          Try it free
        </button>
        <button type="button" onClick={onDemo} className="mt-3 w-full py-2 text-[14px] font-medium text-accent-700">
          See a demo family
        </button>
      </div>
    </div>
  );
}
