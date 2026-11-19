"use client";

import { useEffect, type ReactNode } from "react";
import { ShieldCheck, X } from "lucide-react";
import { PRIVACY_POLICY_VERSION } from "@/lib/profile";

/** Bottom sheet on phones, centred dialog on wider screens. Closes on Esc or backdrop tap. */
export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-md animate-fade-up flex-col rounded-t-3xl bg-white shadow-float sm:rounded-3xl"
      >
        <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-stone-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function PrivacyPolicyModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Privacy Policy"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-ink py-2.5 text-[14px] font-medium text-white">
          Close
        </button>
      }
    >
      <PrivacyPolicyText />
    </Modal>
  );
}

function H({ children }: { children: ReactNode }) {
  return <h3 className="mb-1.5 mt-5 text-[13.5px] font-semibold text-ink first:mt-0">{children}</h3>;
}

/**
 * Plain-English policy written to UK GDPR / Data Protection Act 2018 requirements.
 * Items in [square brackets] must be completed, and the whole text reviewed by a qualified
 * adviser, before FamilyDocket is offered to the public.
 */
export function PrivacyPolicyText() {
  return (
    <div className="text-[13px] leading-relaxed text-stone-600 [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-4">
      <p className="mb-4 flex items-center gap-1.5 text-[12px] font-medium text-accent-700">
        <ShieldCheck className="h-3.5 w-3.5" /> Version {PRIVACY_POLICY_VERSION} · Last updated 15/10/2026
      </p>

      <H>1. Who we are</H>
      <p>
        FamilyDocket is provided by [FamilyDocket Ltd], [registered address], company number [00000000]. We are the data controller for the
        information you give us. ICO registration: [ZA000000]. Contact our data protection lead at [privacy@familydocket.co.uk].
      </p>

      <H>2. What we collect</H>
      <ul>
        <li>Account details: your name and email address.</li>
        <li>Family details you choose to add: children&apos;s first names, schools and year groups, and carers&apos; usual working days and dates away.</li>
        <li>Content you bring in: emails you forward or paste, screenshots, and calendar files, plus the dates, tasks and notes we extract from them.</li>
        <li>Your consent record: which version of this policy you agreed to and when.</li>
      </ul>
      <p className="mt-2">We do not collect payment card details, precise location, or any data from your contacts.</p>

      <H>3. Why we use it, and our lawful basis</H>
      <ul>
        <li>
          To run the service (turning messages into a checklist, spotting childcare gaps, reminders): <b>performance of a contract</b> with you, and
          your <b>consent</b> for information about your children.
        </li>
        <li>Product update emails: <b>consent</b> only, if you opt in. You can withdraw it at any time in Settings.</li>
        <li>Keeping the service secure and fixing faults: our <b>legitimate interests</b>.</li>
      </ul>

      <H>4. Children&apos;s information</H>
      <p>
        FamilyDocket is for parents and carers aged 18 or over. We only hold the details about your children that you add, use them only to
        organise your family&apos;s admin, and never use them for marketing or profiling.
      </p>

      <H>5. Where your data is kept</H>
      <p>
        In this version, everything is stored only on this device, in your browser&apos;s storage. It is not sent to our servers. If we add cloud
        sync, data will be hosted in the UK or EEA, and we will ask for your agreement to an updated policy first.
      </p>

      <H>6. Sharing</H>
      <p>
        We do not sell your data. Links to services such as ParentPay, Amazon or Bubble open those websites directly. We do not pass them your
        details, and their own privacy policies apply once you are there.
      </p>

      <H>7. How long we keep it</H>
      <p>
        Until you delete it. Archived items stay until you remove them. Choosing &ldquo;Delete My Account &amp; All Data&rdquo; in Settings erases
        everything immediately and permanently.
      </p>

      <H>8. Your rights</H>
      <p>Under UK GDPR you have the right to:</p>
      <ul>
        <li>access your data and get a copy (Settings → Download my data);</li>
        <li>correct anything that is wrong;</li>
        <li>have your data erased (Settings → Delete My Account &amp; All Data);</li>
        <li>restrict or object to how we use it;</li>
        <li>data portability, in a machine-readable format (JSON);</li>
        <li>withdraw consent at any time, without affecting anything done before.</li>
      </ul>

      <H>9. Complaints</H>
      <p>
        Please contact us first at [privacy@familydocket.co.uk]. You can also complain to the Information Commissioner&apos;s Office:
        ico.org.uk or 0303 123 1113.
      </p>
    </div>
  );
}
