"use client";

import { useState, type ReactNode } from "react";
import { Download, FileText, HardDrive, MessageSquare, ShieldCheck, Trash2, UserRound, Users } from "lucide-react";
import { deleteAllUserData, newCarer, PRIVACY_POLICY_VERSION, useProfile } from "@/lib/profile";
import { useDocket } from "@/lib/store";
import { formatRange, formatUK, toISO } from "@/lib/dates";
import { ACADEMIC_YEAR, TERM_REGION, UK_TERM_DATES } from "@/lib/terms";
import { cn, downloadFile } from "@/lib/utils";
import { Modal, PrivacyPolicyModal } from "../privacy/PrivacyPolicy";
import { SectionLabel } from "../ui";
import { CarerEditor, ChildrenEditor } from "./FamilyFields";

/** Replace with the real short feedback form before launch. */
const FEEDBACK_URL = "https://example.com/familydocket-feedback";

const stamp = (iso: string) => {
  const d = new Date(iso);
  return `${formatUK(toISO(d))} at ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};

export function Settings({ onToast }: { onToast: (m: string) => void }) {
  const { profile, update } = useProfile();
  const { items } = useDocket();
  const [showPolicy, setShowPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!profile) return null;

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), format: "FamilyDocket data export v1", profile, docket: items };
    downloadFile(`familydocket-data-${toISO(new Date())}.json`, JSON.stringify(payload, null, 2), "application/json");
    onToast("Your data was downloaded as JSON");
  }

  return (
    <div className="space-y-6 px-4 pb-10 pt-2">
      <header className="px-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">Settings</h1>
        <p className="mt-1 text-[14px] text-stone-500">Your account, your family&apos;s schedule and your privacy.</p>
      </header>

      <section>
        <SectionLabel>Account</SectionLabel>
        <Card>
          <Row icon={UserRound} title={profile.name} hint={profile.email} />
          <p className="mt-2 pl-8 text-[12px] text-stone-400">Member since {formatUK(toISO(new Date(profile.createdAt)))}</p>
        </Card>
      </section>

      <section>
        <SectionLabel>Family &amp; schedule</SectionLabel>
        <Card className="space-y-4">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-stone-600">
              <Users className="h-4 w-4 text-stone-400" /> Children
            </p>
            <ChildrenEditor value={profile.children} onChange={(children) => update((p) => ({ ...p, children }))} />
          </div>
          <div className="space-y-2.5">
            <p className="text-[13px] font-medium text-stone-600">Carers. A childcare gap means all of them are busy.</p>
            {profile.carers.map((c, i) => (
              <div key={c.id} className="relative">
                <CarerEditor
                  withAway
                  label={i === 0 ? "You" : "Partner / co-parent"}
                  carer={c}
                  onChange={(carer) => update((p) => ({ ...p, carers: p.carers.map((x) => (x.id === carer.id ? carer : x)) }))}
                />
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => update((p) => ({ ...p, carers: p.carers.filter((x) => x.id !== c.id) }))}
                    className="absolute right-3 top-3 text-[12px] font-medium text-stone-400 hover:text-rose-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {profile.carers.length < 2 && (
              <button type="button" onClick={() => update((p) => ({ ...p, carers: [...p.carers, newCarer()] }))} className="px-1 text-[13px] font-medium text-accent-700">
                + Add a partner / co-parent
              </button>
            )}
          </div>
          <button type="button" onClick={() => setShowTerms(true)} className="flex w-full items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5 text-left text-[13px] ring-1 ring-stone-900/[0.04]">
            <span>
              <span className="block font-medium text-ink">School term dates · {ACADEMIC_YEAR}</span>
              <span className="block text-[12px] text-stone-400">{TERM_REGION}</span>
            </span>
            <span className="text-[12.5px] font-medium text-accent-700">View</span>
          </button>
        </Card>
      </section>

      <section>
        <SectionLabel>Privacy &amp; your data</SectionLabel>
        <Card className="space-y-3.5">
          <Row
            icon={ShieldCheck}
            title="Privacy consent"
            hint={`You agreed to Privacy Policy v${profile.consent.policyVersion} on ${stamp(profile.consent.agreedAt)}.${
              profile.consent.policyVersion !== PRIVACY_POLICY_VERSION ? " A newer version is available." : ""
            }`}
          />
          <label className="flex cursor-pointer items-center gap-3 pl-8 text-[13px] text-stone-700">
            <span className="flex-1">
              Product update emails
              <span className="block text-[12px] text-stone-400">Optional. Withdraw consent any time.</span>
            </span>
            <Toggle checked={profile.consent.productEmails} onChange={(v) => update((p) => ({ ...p, consent: { ...p.consent, productEmails: v } }))} />
          </label>
          <Row icon={HardDrive} title="Where your data lives" hint="Only on this device, in this browser. Nothing is sent to FamilyDocket servers." />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={() => setShowPolicy(true)} className={secondaryBtn}>
              <FileText className="h-4 w-4" /> Privacy Policy
            </button>
            <button type="button" onClick={exportData} className={secondaryBtn}>
              <Download className="h-4 w-4" /> Download my data
            </button>
          </div>
        </Card>
      </section>

      <a
        href={FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[14px] font-medium text-ink shadow-card ring-1 ring-stone-900/[0.04] transition hover:ring-stone-300"
      >
        <MessageSquare className="h-4 w-4" /> Send feedback
      </a>

      <section>
        <SectionLabel>Danger zone</SectionLabel>
        <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-rose-200">
          <p className="text-[14px] font-medium text-ink">Delete my account &amp; all data</p>
          <p className="mt-1 text-[12.5px] leading-snug text-stone-500">
            Permanently erases your account, consent record, family details and every docket item and imported message. This can&apos;t be undone.
          </p>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-[14px] font-medium text-white transition hover:bg-rose-700"
          >
            <Trash2 className="h-4 w-4" /> Delete My Account &amp; All Data
          </button>
        </div>
      </section>

      {showPolicy && <PrivacyPolicyModal onClose={() => setShowPolicy(false)} />}
      {showTerms && <TermDatesModal onClose={() => setShowTerms(false)} />}
      {confirmDelete && <DeleteAccountModal itemCount={items.length} onClose={() => setConfirmDelete(false)} />}
    </div>
  );
}

function DeleteAccountModal({ itemCount, onClose }: { itemCount: number; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const ok = typed.trim().toUpperCase() === "DELETE";
  return (
    <Modal title="Delete everything?" onClose={onClose}>
      <p className="text-[13.5px] leading-relaxed text-stone-600">This will permanently erase:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-stone-600">
        <li>your account and consent record</li>
        <li>children&apos;s and carers&apos; details</li>
        <li>
          {itemCount} docket item{itemCount === 1 ? "" : "s"}, including original emails and notes
        </li>
      </ul>
      <p className="mt-3 text-[13px] text-stone-500">Want a copy first? Close this and use &ldquo;Download my data&rdquo;.</p>
      <label className="mt-4 block text-[13px] font-medium text-stone-600">
        Type <span className="font-mono text-rose-600">DELETE</span> to confirm
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus className="mt-1.5 w-full rounded-xl px-3 py-2.5 font-mono text-[14px] outline-none ring-1 ring-stone-200 focus:ring-2 focus:ring-rose-500" />
      </label>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className={secondaryBtn}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!ok}
          onClick={() => {
            deleteAllUserData();
            // Full reload so no in-memory copy survives and can be written back to storage.
            window.location.replace(`${window.location.pathname}?deleted=1`);
          }}
          className="rounded-xl bg-rose-600 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-rose-700 disabled:bg-stone-300"
        >
          Delete forever
        </button>
      </div>
    </Modal>
  );
}

function TermDatesModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title={`School year ${ACADEMIC_YEAR}`} onClose={onClose}>
      <p className="mb-3 text-[12.5px] leading-snug text-stone-500">
        Typical dates for {TERM_REGION}. Schools set their own INSET days, so closures from your school&apos;s emails are added on top.
      </p>
      <ul className="divide-y divide-stone-100">
        {UK_TERM_DATES.map((m) => (
          <li key={m.label + m.from} className="flex items-baseline gap-3 py-2 text-[13px]">
            <span className={cn("flex-1", m.kind === "bank-holiday" ? "text-stone-400" : "text-ink")}>{m.label}</span>
            <span className="text-right tabular-nums text-stone-500">{formatRange(m.from, m.to)}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

const secondaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-[13px] font-medium text-stone-700 ring-1 ring-stone-200 transition hover:ring-stone-300";

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-white p-4 shadow-card ring-1 ring-stone-900/[0.04]", className)}>{children}</div>;
}

function Row({ icon: Icon, title, hint }: { icon: typeof ShieldCheck; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-stone-400" />
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink">{title}</p>
        <p className="text-[12.5px] leading-snug text-stone-500">{hint}</p>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span className="relative inline-flex">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={cn("h-6 w-10 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500", checked ? "bg-accent-600" : "bg-stone-300")} />
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
    </span>
  );
}
