"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ImagePlus, Loader2, Mail, MessageCircle, ScanText, Sparkles, X } from "lucide-react";
import type { Extraction } from "@/lib/types";
import { recognizeScreenshot } from "@/lib/ocr";
import { extract } from "@/lib/parser";
import { countryOf, useProfile } from "@/lib/profile";
import { chatTranscripts, emailSamples } from "@/lib/samples";
import { useDocket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Segmented } from "../ui";
import { CalendarImport } from "./CalendarImport";
import { ChatMock } from "./ChatMock";
import { ExtractionReview } from "./ExtractionReview";
import { ProcessingView } from "./ProcessingView";

export type IntakeTab = "email" | "screenshot" | "calendar";
type Phase = "input" | "processing" | "review";
type Shot = { kind: "file"; url: string; name: string } | { kind: "sample"; index: number };

export function IntakeHub({
  now,
  onAdded,
  initialTab = "email",
}: {
  now: Date;
  /** Called with a short confirmation message after something is added. */
  onAdded: (message: string) => void;
  initialTab?: IntakeTab;
}) {
  const { add } = useDocket();
  const { profile } = useProfile();
  const country = countryOf(profile);
  // Built once per mount so sample dates stay stable while editing.
  const [samples] = useState(() => emailSamples(now, country));
  const [transcripts] = useState(() => chatTranscripts(now, country));

  const [tab, setTab] = useState<IntakeTab>(initialTab);
  const [emailText, setEmailText] = useState("");
  const [shot, setShot] = useState<Shot | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrUnclear, setOcrUnclear] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [draft, setDraft] = useState<Extraction | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const ocrRun = useRef(0);

  useEffect(() => () => (shot?.kind === "file" ? URL.revokeObjectURL(shot.url) : undefined), [shot]);

  const input = tab === "email" ? emailText : ocrText;
  const canProcess = input.trim().length > 20 && !ocrBusy;

  const sampleChips = useMemo(() => (tab === "email" ? samples : transcripts), [tab, samples, transcripts]);
  const header =
    tab === "calendar"
      ? country === "US"
        ? "Import your school district calendar (.ics). Federal holidays are already marked as likely no-school days — check with your school."
        : "Bring in the events you already have. I\u2019ll spot any actions in their notes."
      : "Throw anything at it. I\u2019ll turn the chaos into a checklist.";

  function loadFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (fileInput.current) fileInput.current.value = "";
    const run = ++ocrRun.current;
    setShot({ kind: "file", url: URL.createObjectURL(file), name: file.name });
    setOcrBusy(true);
    setOcrText("");
    setOcrUnclear(false);
    setOcrProgress(0.02);
    void recognizeScreenshot(file, (fraction) => {
      if (ocrRun.current === run) setOcrProgress(fraction);
    }).then(
      (result) => {
        if (ocrRun.current !== run) return;
        setOcrText(result.text);
        setOcrUnclear(result.unclear);
        setOcrProgress(1);
        setOcrBusy(false);
      },
      () => {
        if (ocrRun.current !== run) return;
        setOcrText("");
        setOcrUnclear(true);
        setOcrBusy(false);
      },
    );
  }

  function loadSampleChat(index: number) {
    ocrRun.current += 1;
    setShot({ kind: "sample", index });
    setOcrBusy(false);
    setOcrUnclear(false);
    setOcrProgress(0);
    setOcrText(transcripts[index].text);
  }

  function clearShot() {
    ocrRun.current += 1;
    setShot(null);
    setOcrText("");
    setOcrBusy(false);
    setOcrUnclear(false);
    setOcrProgress(0);
  }

  function process() {
    setDraft(extract(input, tab === "email" ? "email" : "whatsapp", new Date(), country));
    setPhase("processing");
  }

  if (phase === "processing") return <ProcessingView label={tab === "screenshot" ? "Reading your screenshot…" : "Reading your email…"} onDone={() => setPhase("review")} />;

  if (phase === "review" && draft) {
    return (
      <ExtractionReview
        draft={draft}
        onChange={setDraft}
        now={now}
        onBack={() => setPhase("input")}
        onConfirm={() => {
          add(draft);
          onAdded(`Added “${draft.title}”`);
          setDraft(null);
          setEmailText("");
          clearShot();
          setPhase("input");
        }}
      />
    );
  }

  return (
    <div className="space-y-5 px-4 pb-8 pt-2">
      <header className="px-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">Universal Intake</h1>
        <p className="mt-1 text-[14px] text-stone-500">{header}</p>
      </header>

      <Segmented<IntakeTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "email", label: "Email", icon: Mail },
          { value: "screenshot", label: "Screenshot", icon: MessageCircle },
          { value: "calendar", label: "Calendar", icon: CalendarDays },
        ]}
      />

      {tab === "calendar" ? (
        <CalendarImport
          now={now}
          onImported={(n) => onAdded(n ? `Imported ${n} event${n === 1 ? "" : "s"} from your calendar` : "Those events were already in your docket")}
        />
      ) : tab === "email" ? (
        <div className="animate-fade-up space-y-4">
          <p className="rounded-xl bg-white px-3.5 py-2.5 text-[12.5px] text-stone-500 ring-1 ring-stone-900/[0.06]">
            Email forwarding – coming soon
          </p>

          <div>
            <label htmlFor="raw-email" className="mb-2 block px-1 text-[13px] font-medium text-stone-600">
              Paste a forwarded email
            </label>
            <textarea
              id="raw-email"
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              rows={10}
              placeholder={
                country === "US"
                  ? "---------- Forwarded message ---------\nFrom: Maple Elementary\nSubject: 2nd grade field trip…"
                  : "---------- Forwarded message ---------\nFrom: St. Mary's Primary\nSubject: Year 4 Swimming Gala…"
              }
              className="w-full resize-y rounded-2xl bg-white p-4 font-mono text-[12.5px] leading-relaxed text-stone-800 shadow-card outline-none ring-1 ring-stone-900/[0.06] placeholder:text-stone-300 focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>
      ) : (
        <div className="animate-fade-up space-y-4">
          {!shot ? (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                loadFile(e.dataTransfer.files[0]);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition",
                dragging ? "border-accent-500 bg-accent-50" : "border-stone-300 bg-white/60 hover:border-stone-400",
              )}
            >
              <input ref={fileInput} type="file" accept="image/*" className="sr-only" onChange={(e) => loadFile(e.target.files?.[0])} />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-card">
                <ImagePlus className="h-5 w-5 text-stone-500" />
              </div>
              <p className="mt-4 font-medium text-ink">Drop a chat screenshot</p>
              <p className="mt-1 text-[13px] text-stone-500">WhatsApp, class apps, club portals · PNG or JPG</p>
              <span className="mt-4 rounded-full bg-ink px-4 py-1.5 text-[12.5px] font-medium text-white">Choose image</span>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                {shot.kind === "file" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot.url} alt={shot.name} className="max-h-72 w-full rounded-2xl bg-white object-contain ring-1 ring-stone-900/10" />
                ) : (
                  <ChatMock transcript={transcripts[shot.index].text} />
                )}
                <button
                  type="button"
                  onClick={clearShot}
                  aria-label="Remove screenshot"
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur transition hover:bg-black/70"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-stone-900/[0.04]">
                <p className="flex items-center gap-1.5 text-[12px] font-medium text-stone-500">
                  {ocrBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanText className="h-3.5 w-3.5" />}
                  {ocrBusy ? "Reading screenshot…" : "Detected text"}
                </p>
                {ocrBusy ? (
                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100"
                    role="progressbar"
                    aria-label="Reading screenshot"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(ocrProgress * 100)}
                  >
                    <div
                      className="h-full rounded-full bg-accent-600 transition-[width] duration-200"
                      style={{ width: `${Math.max(4, Math.round(ocrProgress * 100))}%` }}
                    />
                  </div>
                ) : (
                  <>
                    <textarea
                      value={ocrText}
                      onChange={(e) => setOcrText(e.target.value)}
                      rows={7}
                      aria-label="Detected text"
                      className="mt-2 w-full resize-y rounded-xl bg-stone-50 p-3 font-mono text-[12px] leading-relaxed text-stone-700 outline-none ring-1 ring-stone-200 focus:ring-2 focus:ring-accent-500"
                    />
                    {ocrUnclear && shot.kind === "file" && (
                      <p className="mt-2 text-[12.5px] leading-snug text-amber-800">
                        Couldn&apos;t read this clearly – please check or type the text
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab !== "calendar" && (
      <>
      <div className="px-1">
        <p className="mb-2 text-[12px] text-stone-400">{tab === "email" ? "No email handy? Try a sample:" : "No screenshot handy? Try a sample:"}</p>
        <div className="flex flex-wrap gap-1.5">
          {sampleChips.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => (tab === "email" ? setEmailText(s.text) : loadSampleChat(i))}
              className="rounded-full bg-white px-3 py-1.5 text-[12.5px] text-stone-600 ring-1 ring-stone-200 transition hover:text-ink hover:ring-stone-300"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={process}
        disabled={!canProcess}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-[15px] font-medium text-white shadow-float transition active:scale-[0.99] disabled:bg-stone-300 disabled:shadow-none"
      >
        <Sparkles className="h-[18px] w-[18px]" />
        {tab === "email" ? "Read email" : "Read screenshot"}
      </button>
      </>
      )}
    </div>
  );
}
