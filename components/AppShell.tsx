"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, CheckCircle2, Download, Eraser, Layers, ListChecks, Newspaper, Plus, RotateCcw, Settings2, ShieldCheck } from "lucide-react";
import { exportICS } from "@/lib/ics";
import { formatLong } from "@/lib/dates";
import { initials, newCarer, newChild, PRIVACY_POLICY_VERSION, type Profile, useProfile } from "@/lib/profile";
import { useDocket } from "@/lib/store";
import { cn, downloadFile } from "@/lib/utils";
import { Dashboard } from "./docket/Dashboard";
import { IntakeHub, type IntakeTab } from "./intake/IntakeHub";
import { Briefing } from "./briefing/Briefing";
import { Landing } from "./landing/Landing";
import { Onboarding, type FirstStep } from "./onboarding/Onboarding";
import { Settings } from "./settings/Settings";

type View = "docket" | "intake" | "briefing" | "settings";

export function AppShell() {
  const { ready: docketReady, items, reset, clearAll } = useDocket();
  const { profile, ready: profileReady, save } = useProfile();
  const ready = docketReady && profileReady;
  const [view, setView] = useState<View>("docket");
  const [signingUp, setSigningUp] = useState(false);
  const [intake, setIntake] = useState<{ tab: IntakeTab; key: number }>({ tab: "email", key: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Client-only clock avoids SSR/CSR date mismatches.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Confirmation after "Delete My Account & All Data" reloads the page.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("deleted") !== "1") return;
    setToast("Your account and all data have been deleted");
    url.searchParams.delete("deleted");
    window.history.replaceState(null, "", url.pathname);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  // Close the data menu on any click outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  function openIntake(tab: IntakeTab) {
    setIntake((s) => ({ tab, key: s.key + 1 }));
    setView("intake");
  }

  const run = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  const menuActions = {
    export() {
      const { ics, count } = exportICS(items);
      if (!count) {
        setToast("No dated items to export yet");
        return;
      }
      downloadFile("familydocket.ics", ics, "text/calendar");
      setToast(`Exported ${count} event${count === 1 ? "" : "s"}. Open the file to add them`);
    },
    import() {
      openIntake("calendar");
    },
    startFresh() {
      if (!window.confirm("Remove everything from your docket, including the demo data? This can't be undone.")) return;
      clearAll();
      setView("docket");
      setToast("Docket cleared. Ready for your own data");
    },
    restoreDemo() {
      if (!window.confirm("Replace your docket with the demo family's data?")) return;
      reset();
      setView("docket");
      setToast("Demo data restored");
    },
  };

  function startDemo() {
    const agreedAt = new Date().toISOString();
    const demo: Profile = {
      name: "Alex Morgan",
      email: "alex@example.co.uk",
      createdAt: agreedAt,
      consent: { privacyPolicy: true, policyVersion: PRIVACY_POLICY_VERSION, agreedAt, productEmails: false },
      children: [{ ...newChild("Sam"), school: "St. Mary's Primary", yearGroup: "Year 4" }],
      carers: [newCarer("Alex"), newCarer("Jordan")],
      coveredGaps: [],
    };
    save(demo);
    reset();
    setView("docket");
    setToast("Here's a demo family to explore");
  }

  function finishOnboarding(start: FirstStep) {
    if (start === "demo") reset();
    else clearAll();
    if (start === "email" || start === "calendar") openIntake(start);
    else setView("docket");
    setToast(start === "demo" ? "Welcome! Here's a demo family to explore" : "Welcome to FamilyDocket");
  }

  const openCount = items.filter((i) => !i.archived).reduce((n, i) => n + i.tasks.filter((t) => !t.done).length, 0);

  if (ready && !profile) {
    return (
      <>
        {signingUp ? <Onboarding onFinish={finishOnboarding} /> : <Landing onTry={() => setSigningUp(true)} onDemo={startDemo} />}
        <Toast message={toast} />
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-canvas md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem] md:shadow-2xl md:ring-1 md:ring-black/5">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-2.5 bg-canvas/85 px-5 pb-2 pt-4 backdrop-blur-md md:rounded-t-[2rem]">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-white">
          <Layers className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">FamilyDocket</p>
            <span className="rounded-full bg-accent-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.12em] text-accent-700">Beta</span>
          </div>
          <p className="text-[11.5px] text-stone-400">{now ? formatLong(now) : " "}</p>
        </div>
        <div ref={menuRef} className="relative ml-auto">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Your data"
            aria-expanded={menuOpen}
            className={cn(
              "rounded-full p-2 transition hover:bg-stone-200/60 hover:text-stone-600",
              menuOpen ? "bg-stone-200/60 text-stone-700" : "text-stone-400",
            )}
          >
            <Settings2 className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-40 w-[17rem] animate-fade-up rounded-2xl bg-white p-1.5 shadow-float ring-1 ring-stone-900/5">
              <MenuItem icon={CalendarPlus} title="Import a calendar" hint="Bring in events from Google, Apple or Outlook" onClick={run(menuActions.import)} />
              <MenuItem icon={Download} title="Export to calendar" hint="Download an .ics file of your docket's events" onClick={run(menuActions.export)} />
              <div className="mx-2 my-1 h-px bg-stone-100" />
              <MenuItem icon={Eraser} title="Start fresh" hint="Remove all items, including the demo data" onClick={run(menuActions.startFresh)} danger />
              <MenuItem icon={RotateCcw} title="Restore demo data" hint="Replace everything with the sample family" onClick={run(menuActions.restoreDemo)} />
              <div className="mx-2 my-1 h-px bg-stone-100" />
              <MenuItem icon={ShieldCheck} title="Settings & privacy" hint="Family schedule, consent, download or delete your data" onClick={run(() => setView("settings"))} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setView("settings")}
          aria-label="Settings & privacy"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold transition",
            view === "settings" ? "bg-accent-600 text-white" : "bg-accent-100 text-accent-700 hover:bg-accent-200",
          )}
        >
          {profile ? initials(profile.name) : ""}
        </button>
      </div>

      {/* View */}
      <main className="flex-1">
        {!ready || !now ? (
          <div className="space-y-3 px-4 pt-4">
            <div className="skeleton h-8 w-48 rounded-lg" />
            <div className="skeleton h-4 w-64 rounded" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-40 rounded-2xl" />
            ))}
          </div>
        ) : view === "docket" ? (
          <Dashboard now={now} onAdd={() => openIntake("calendar")} />
        ) : view === "intake" ? (
          <IntakeHub
            key={intake.key}
            initialTab={intake.tab}
            now={now}
            onAdded={(message) => {
              setToast(message);
              setView("docket");
            }}
          />
        ) : view === "settings" ? (
          <Settings onToast={setToast} />
        ) : (
          <Briefing now={now} />
        )}
      </main>

      <Toast message={toast} />


      {/* Bottom nav */}
      <nav className="sticky bottom-0 z-20 border-t border-stone-200/70 bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:rounded-b-[2rem]">
        <div className="grid grid-cols-3 items-center px-6 pb-3 pt-2">
          <NavButton active={view === "docket"} onClick={() => setView("docket")} icon={ListChecks} label="Docket" badge={openCount} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => openIntake("email")}
              aria-label="Universal intake"
              className={cn(
                "-mt-7 flex h-14 w-14 items-center justify-center rounded-[20px] text-white shadow-float transition active:scale-95",
                view === "intake" ? "bg-accent-600" : "bg-ink",
              )}
            >
              <Plus className="h-6 w-6" strokeWidth={2.4} />
            </button>
          </div>
          <NavButton active={view === "briefing"} onClick={() => setView("briefing")} icon={Newspaper} label="Briefing" />
        </div>
      </nav>
    </div>
  );
}

function Toast({ message }: { message: string | null }) {
  return (
    <div className="pointer-events-none sticky bottom-24 z-30 flex justify-center px-4">
      {message && (
        <div className="animate-fade-up flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-float">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <span className="max-w-[17rem] truncate">{message}</span>
        </div>
      )}
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ListChecks;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("relative flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition", active ? "text-ink" : "text-stone-400")}
    >
      <span className="relative">
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
        {!!badge && (
          <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[10px] font-semibold leading-[18px] text-white ring-2 ring-canvas">
            {badge}
          </span>
        )}
      </span>
      {label}
    </button>
  );
}

function MenuItem({
  icon: Icon,
  title,
  hint,
  onClick,
  danger,
}: {
  icon: typeof Download;
  title: string;
  hint: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-stone-50">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", danger ? "text-rose-500" : "text-stone-500")} />
      <span>
        <span className={cn("block text-[13.5px] font-medium", danger ? "text-rose-600" : "text-ink")}>{title}</span>
        <span className="block text-[12px] leading-snug text-stone-400">{hint}</span>
      </span>
    </button>
  );
}
