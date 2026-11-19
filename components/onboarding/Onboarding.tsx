"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarPlus, Check, Layers, Lock, Mail, Sparkles, SquareDashed } from "lucide-react";
import { type Country } from "@/lib/dates";
import { type Carer, newCarer, newChild, PRIVACY_POLICY_VERSION, type Profile, useProfile } from "@/lib/profile";
import { ACADEMIC_YEAR, TERM_REGION } from "@/lib/terms";
import { cn } from "@/lib/utils";
import { PrivacyPolicyModal } from "../privacy/PrivacyPolicy";
import { CarerEditor, ChildrenEditor, CountryPicker, inputCls } from "../settings/FamilyFields";

/** Where the new user lands once they're set up. Nothing has to be uploaded to finish. */
export type FirstStep = "email" | "calendar" | "demo" | "empty";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEPS = ["Account", "Family", "First item"];

/**
 * Sign-up in three short screens (about a minute). Required: first name, email, the privacy
 * consent tick and one child's first name. Everything else is optional or can wait for Settings.
 */
export function Onboarding({ onFinish }: { onFinish: (start: FirstStep) => void }) {
  const { save } = useProfile();
  const [step, setStep] = useState(0);
  const [showPolicy, setShowPolicy] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [productEmails, setProductEmails] = useState(false);
  const [agreedAt, setAgreedAt] = useState("");

  const [country, setCountry] = useState<Country>("UK");
  const [children, setChildren] = useState([newChild()]);
  const [solo, setSolo] = useState(false);
  const [me, setMe] = useState<Carer>(() => newCarer());
  const [partner, setPartner] = useState<Carer>(() => newCarer());

  const step1Ok = name.trim().length > 0 && EMAIL_RE.test(email.trim()) && consent;
  const emailInvalid = email.trim().length > 0 && !EMAIL_RE.test(email.trim());
  const step2Ok = children.some((c) => c.name.trim());

  function next() {
    if (step === 0) {
      // Carry the account name into the carers list so the user doesn't type it twice.
      if (!me.name) setMe((m) => ({ ...m, name: name.trim().split(/\s+/)[0] }));
    }
    setStep((s) => s + 1);
  }

  function finish(start: FirstStep) {
    const profile: Profile = {
      name: name.trim(),
      email: email.trim(),
      country,
      createdAt: new Date().toISOString(),
      consent: { privacyPolicy: true, policyVersion: PRIVACY_POLICY_VERSION, agreedAt: agreedAt || new Date().toISOString(), productEmails },
      children: children.filter((c) => c.name.trim()).map((c) => ({ ...c, name: c.name.trim() })),
      carers: (solo ? [me] : [me, partner]).map((c, i) => ({ ...c, name: c.name.trim() || (i === 0 ? name.trim().split(/\s+/)[0] : "Partner") })),
      coveredGaps: [],
    };
    save(profile);
    onFinish(start);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-canvas px-5 pb-8 pt-6 md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem] md:shadow-2xl md:ring-1 md:ring-black/5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-white">
          <Layers className="h-4 w-4" />
        </div>
        <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">FamilyDocket</p>
        <span className="rounded-full bg-accent-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.12em] text-accent-700">Beta</span>
        <p className="ml-auto text-[12px] tabular-nums text-stone-400">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <div key={s} className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-accent-600" : "bg-stone-200")} />
        ))}
      </div>

      <div key={step} className="mt-7 flex-1 animate-fade-up">
        {step === 0 && (
          <>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink">Let&apos;s get your family admin under control.</h1>
            <p className="mt-2 text-[14px] text-stone-500">Three quick steps, about a minute. Nothing to upload yet.</p>

            <div className="mt-6 space-y-3">
              <label className="block text-[13px] font-medium text-stone-600">
                Your name
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Priya Shah" className={cn(inputCls, "mt-1.5")} />
              </label>
              <label className="block text-[13px] font-medium text-stone-600">
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@example.co.uk" className={cn(inputCls, "mt-1.5")} />
              </label>
            </div>

            <div className="mt-5 space-y-2.5 rounded-2xl bg-white p-4 shadow-card ring-1 ring-stone-900/[0.04]">
              <Checkbox
                checked={consent}
                onChange={(v) => {
                  setConsent(v);
                  setAgreedAt(v ? new Date().toISOString() : "");
                }}
              >
                I agree to FamilyDocket storing and processing my family&apos;s information, including my children&apos;s details, as described in the{" "}
                <button type="button" onClick={() => setShowPolicy(true)} className="font-medium text-accent-700 underline decoration-accent-200 underline-offset-2">
                  Privacy Policy
                </button>
                . <span className="text-rose-600">*</span>
              </Checkbox>
              <Checkbox checked={productEmails} onChange={setProductEmails}>
                Email me occasional product updates (optional, unsubscribe any time).
              </Checkbox>
            </div>
            <p className="mt-3 flex items-start gap-1.5 px-1 text-[12px] leading-snug text-stone-400">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" />
              Your data stays on this device. You can download or permanently delete it any time from Settings.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink">Who&apos;s in the family?</h1>
            <p className="mt-2 text-[14px] text-stone-500">So we can spot days with no school and nobody free for pick-up.</p>

            <div className="mt-6">
              <CountryPicker value={country} onChange={setCountry} />
            </div>

            <p className="mb-2 mt-6 text-[13px] font-medium text-stone-600">Children</p>
            <ChildrenEditor value={children} onChange={setChildren} country={country} />

            <div className="mb-2 mt-6 flex items-center">
              <p className="text-[13px] font-medium text-stone-600">Who covers pick-up?</p>
              <div className="ml-auto flex rounded-lg bg-stone-200/60 p-0.5 text-[12px] font-medium">
                {[
                  { v: false, l: "Two of us" },
                  { v: true, l: "Just me" },
                ].map((o) => (
                  <button key={o.l} type="button" onClick={() => setSolo(o.v)} className={cn("rounded-md px-2.5 py-1 transition", solo === o.v ? "bg-white text-ink shadow-sm" : "text-stone-500")}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2.5">
              <CarerEditor label="You" carer={me} onChange={setMe} />
              {!solo && <CarerEditor label="Partner / co-parent" carer={partner} onChange={setPartner} />}
            </div>
            <p className="mt-3 px-1 text-[12px] leading-snug text-stone-400">
              {country === "US"
                ? "US federal holidays are marked as likely no-school days — check with your school. Import your school district calendar (.ics) for the days they actually close. Add trips away later in Settings."
                : `School holidays are pre-loaded for ${TERM_REGION}, ${ACADEMIC_YEAR}. Add trips away later in Settings.`}
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink">Bring in your first item</h1>
            <p className="mt-2 text-[14px] text-stone-500">Pick one, or skip. You can add more at any time with the + button.</p>
            <div className="mt-6 space-y-2.5">
              {country === "US" && (
                <Choice icon={CalendarPlus} title="Import your school district calendar" hint=".ics file from your district" onClick={() => finish("calendar")} />
              )}
              <Choice icon={Mail} title="Paste a school email" hint={country === "US" ? "School emails, club newsletters, party invites" : "ParentPay, Arbor, club newsletters, party invites"} onClick={() => finish("email")} />
              {country !== "US" && <Choice icon={CalendarPlus} title="Import a calendar" hint=".ics file from Google, Apple or Outlook" onClick={() => finish("calendar")} />}
              <Choice icon={Sparkles} title="Explore with a demo family" hint="See a busy week already sorted" onClick={() => finish("demo")} />
              <Choice icon={SquareDashed} title="Start with an empty docket" hint="Add things as they come in" onClick={() => finish("empty")} />
            </div>
          </>
        )}
      </div>

      {step < 2 && (
        <div className="mt-8 flex items-center gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} aria-label="Back" className="rounded-2xl bg-white p-4 text-stone-600 shadow-card ring-1 ring-stone-900/[0.04]">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={next}
            disabled={step === 0 ? !step1Ok : !step2Ok}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-[15px] font-medium text-white shadow-float transition active:scale-[0.99] disabled:bg-stone-300 disabled:shadow-none"
          >
            Continue <ArrowRight className="h-[18px] w-[18px]" />
          </button>
        </div>
      )}
      {step === 0 && emailInvalid && <p className="mt-2 text-center text-[12px] text-rose-600">Please enter a valid email</p>}
      {step === 0 && !emailInvalid && !consent && name.trim() && email.trim() && <p className="mt-2 text-center text-[12px] text-stone-400">Tick the Privacy Policy box to continue.</p>}
      {step === 2 && (
        <button type="button" onClick={() => setStep(1)} className="mt-6 inline-flex items-center gap-1.5 self-start px-1 text-[13px] font-medium text-stone-500">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}

      {showPolicy && <PrivacyPolicyModal onClose={() => setShowPolicy(false)} />}
    </div>
  );
}

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-stone-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500",
          checked ? "border-accent-600 bg-accent-600 text-white" : "border-stone-300 bg-white",
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3.2} />}
      </span>
      <span>{children}</span>
    </label>
  );
}

function Choice({ icon: Icon, title, hint, onClick }: { icon: typeof Mail; title: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-stone-900/[0.04] transition hover:ring-stone-300 active:scale-[0.99]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-medium text-ink">{title}</span>
        <span className="block text-[12.5px] text-stone-500">{hint}</span>
      </span>
      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-stone-300" />
    </button>
  );
}
