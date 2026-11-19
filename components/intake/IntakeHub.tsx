"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, CalendarDays, Check, Copy, ImagePlus, Loader2, Mail, MessageCircle, ScanText, Sparkles, X } from "lucide-react";
import type { Extraction } from "@/lib/types";
import { extract } from "@/lib/parser";
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

const FAMILY_ADDRESS = "household@familydocket.io";

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
  // Built once per mount so sample dates stay stable while editing.
  const [samples] = useState(() => emailSamples(now));
  const [transcripts] = useState(() => chatTranscripts(now));

  const [tab, setTab] = useState<IntakeTab>(initialTab);
  const [emailText, setEmailText] = useState("");
  const [shot, setShot] = useState<Shot | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [draft, setDraft] = useState<Extraction | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const ocrTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(ocrTimer.current), []);
  useEffect(() => () => (shot?.kind === "file" ? URL.revokeObjectURL(shot.url) : undefined), [shot]);

  const input = tab === "email" ? emailText : ocrText;
  const canProcess = input.trim().length > 20 && !ocrBusy;

  const sampleChips = useMemo(() => (tab === "email" ? samples : transcripts), [tab, samples, transcripts]);
  const header =
    tab === "calendar"
      ? "Bring in the events you already have. I\u2019ll spot any actions in their notes."
      : "Throw anything at it. I\u2019ll turn the chaos into a checklist.";

  function runOcr(text: string) {
    clearTimeout(ocrTimer.current);
    setOcrBusy(true);
    setOcrText("");
    ocrTimer.current = setTimeout(() => {
      setOcrText(text);
      setOcrBusy(false);
    }, 1300);
  }

  function loadFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setShot({ kind: "file", url: URL.createObjectURL(file), name: file.name });
    // Simulated OCR: a vision model would transcribe the image here.
    runOcr(transcripts[(file.size + file.name.length) % transcripts.length].text);
  }

  function loadSampleChat(index: number) {
    setShot({ kind: "sample", index });
    runOcr(transcripts[index].text);
  }

  function clearShot() {
    clearTimeout(ocrTimer.current);
    setShot(null);
    setOcrText("");
    setOcrBusy(false);
  }

  function process() {
    setDraft(extract(input, tab === "email" ? "email" : "whatsapp", new Date()));
    setPhase("processing");
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(FAMILY_ADDRESS);
    } catch {
      /* clipboard blocked; still show feedback */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (phase === "processing") return <ProcessingView onDone={() => setPhase("review")} />;

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
          <div className="rounded-2xl bg-ink p-4 text-white shadow-float">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <AtSign className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/45">Your family inbox</p>
                <p className="truncate text-[15px] font-medium">{FAMILY_ADDRESS}</p>
              </div>
              <button
                type="button"
                onClick={copyAddress}
                aria-label="Copy address"
                className="ml-auto rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">
              Forward school emails, club newsletters and party invites here. Each one is parsed into actions automatically.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11.5px] text-white/50">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Listening · 3 auto-forward rules active
            </div>
          </div>

          <div>
            <label htmlFor="raw-email" className="mb-2 block px-1 text-[13px] font-medium text-stone-600">
              Or paste a forwarded email
            </label>
            <textarea
              id="raw-email"
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              rows={10}
              placeholder={"---------- Forwarded message ---------\nFrom: St. Mary's Primary\nSubject: Year 4 Swimming Gala…"}
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
                  {ocrBusy ? "Reading text from image…" : "Detected text · simulated OCR, edit if needed"}
                </p>
                {ocrBusy ? (
                  <div className="mt-3 space-y-2">
                    {[90, 70, 82, 55].map((w, i) => (
                      <div key={i} className="skeleton h-2.5 rounded-full" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    rows={7}
                    className="mt-2 w-full resize-y rounded-xl bg-stone-50 p-3 font-mono text-[12px] leading-relaxed text-stone-700 outline-none ring-1 ring-stone-200 focus:ring-2 focus:ring-accent-500"
                  />
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
        Process with AI
      </button>
      </>
      )}
    </div>
  );
}
