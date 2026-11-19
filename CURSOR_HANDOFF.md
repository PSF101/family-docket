# FamilyDocket: project context for Cursor

Mobile-first web app: an AI admin assistant for busy UK parents. It turns school emails (ParentPay, Arbor),
club newsletters, group-chat screenshots and calendar files into a prioritised checklist, and flags
childcare gaps (no school + every carer busy) with an emergency "Rescue" link to Bubble.

## Stack & running
- Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 3, lucide-react. No backend.
- All state is in browser localStorage. Keys all start with `familydocket` (see `deleteAllUserData`).
  - `familydocket:v1`: docket items (DocketItem[])
  - `familydocket:profile:v1`: Profile (account, consent record, children, carers, covered gaps)
- `npm install`, `npm run dev` → http://localhost:3000. Type-check: `npx tsc --noEmit`.
- Windows. The project folder is `Family Docket\familydocket\familydocket` (the zip extracts one level deep).
  It sits inside OneDrive, and moving it outside OneDrive is recommended for npm.

## Structure
```
app/            layout.tsx (lang en-GB), page.tsx (ProfileProvider > DocketProvider > AppShell), globals.css
components/
  AppShell.tsx  Gates on profile: no profile → <Onboarding/>. Otherwise top bar (date, gear menu:
                Import calendar / Export to calendar / Start fresh / Restore demo / Settings & privacy;
                initials avatar → Settings), views docket | intake | briefing | settings, toast, bottom nav.
  ui.tsx        CategoryTag, UrgencyBadge, ChannelIcon, SectionLabel, Segmented
  onboarding/Onboarding.tsx   3-step sign-up (Account+consent → Family → First item)
  settings/Settings.tsx       Account, Family & schedule, Privacy & your data, Danger zone (delete)
  settings/FamilyFields.tsx   ChildrenEditor, CarerEditor (work days + "away" dates), WorkDayPicker, inputCls
  privacy/PrivacyPolicy.tsx   Modal primitive, PrivacyPolicyModal, PrivacyPolicyText (UK GDPR)
  docket/       Dashboard.tsx (stats, gap alerts, filters, timeline groups)
                ActionCard.tsx (tasks, link chips, Amazon gift row, Rescue button when inChildcareGap)
                ChildcareGaps.tsx (RescueButton, GapAlerts)
  intake/       IntakeHub (Email / Screenshot / Calendar tabs), CalendarImport, ProcessingView,
                ExtractionReview, ChatMock
  briefing/     Briefing.tsx (Morning/Evening Dispatch)
lib/
  types.ts      Category, Channel, Task {id,text,done,link?}, DocketItem, Extraction
  profile.tsx   Profile/Child/Carer/Away/Consent types, ProfileProvider/useProfile, PRIVACY_POLICY_VERSION,
                deleteAllUserData(), initials(), newCarer(), newChild()
  store.tsx     Docket context + reducer. New users start EMPTY. Nothing persists until a profile exists.
  childcare.ts  findGaps(profile, items, now, horizon=60), isClosure(item), BUBBLE_URL
  terms.ts      UK_TERM_DATES (England 2026/27 typical LA dates), holidayOn(), isBankHoliday()
  parser.ts     extract(raw, channel, now): rule-based stand-in for an LLM; attachLinks(); giftSearchUrl()
  ics.ts        parseICS / eventToExtraction / exportICS
  samples.ts    Sample emails (Arbor trip, ParentPay non-uniform, Arbor INSET, plus others), chats, sample .ics
  seed.ts       Demo family (used only when the user picks "Explore with a demo family")
  dates.ts      formatUK "23/10/2026", formatShort "Fri 23/10/2026", formatRange, formatLong, relativeDay…
  briefing.ts, utils.ts (cn, uid, downloadFile)
```

## Conventions
- UK formats: dates shown as DD/MM/YYYY (always via `formatUK`/`formatShort`/`formatRange`), £, ParentPay,
  Arbor, Year groups, U9s. Stored dates are ISO "YYYY-MM-DD", times "HH:MM".
- Calm neutral palette: canvas #F7F6F3, ink #1C1917, sage accent (accent-50…700 in tailwind.config.ts),
  rounded-2xl white cards, shadow-card. Rose is reserved for urgency/emergency (Rescue, overdue, delete).
- Tailwind `content` only scans app/ and components/, so don't put class names in lib/.
- useEffect bodies must use braces. Never write `useEffect(() => window.scrollTo(...))`: newer Chromium
  returns a Promise from scrollTo, and React crashes with "destroy is not a function".
- Keep the Docket uncluttered. Term dates are NOT shown on the Docket; they're in Settings → School term dates.

## Feature rules
- **Onboarding:** 3 screens, ~1 minute, nothing to upload. Required: name, valid email, the privacy consent
  checkbox (unticked by default; Continue is disabled until it's ticked) and one child's first name.
  Product-email opt-in is separate and optional. Step 3 choices: paste email / import calendar / demo / empty.
- **Childcare gap** = weekday, not a bank holiday, no school (half term or holiday from terms.ts, or a docket
  item matching INSET/closure), AND every carer is working that weekday or has an "away" range covering it.
  Consecutive days are merged. "We've got this covered" adds gap.from to profile.coveredGaps.
- **Rescue button (Bubble)** is shown ONLY for detected gaps: on the gap alert card, and on the closure item's
  ActionCard. Never on gifts or elsewhere. Gift tasks show an Amazon link only.
- **GDPR:** consent record stores policyVersion + agreedAt. Settings has the Privacy Policy modal, a product-email
  toggle (withdraw consent), "Download my data" (JSON) and "Delete My Account & All Data" (type DELETE to confirm →
  deleteAllUserData() → full page reload to ?deleted=1 → onboarding).

## Known limitations / TODO
- Privacy Policy has [bracketed] placeholders (company, address, ICO number, contact email) and needs legal review.
- Term dates are typical England LA dates for 2026/27; schools vary. INSET days from emails are added on top.
- Screenshot OCR is simulated (it returns a canned transcript). The parser is rule-based, not an LLM.
- Calendar import is a one-off .ics snapshot: re-import skips matching UID|date (changed events aren't updated,
  moved events duplicate, cancelled ones remain). Imported calendars don't affect carer availability.
- With no backend, "delete from the database" = clear localStorage. When a server is added, delete must call an
  authenticated deletion endpoint first (see the comment on deleteAllUserData).
- BUBBLE_URL is https://joinbubble.com/ (to be confirmed / swapped for a partner deep link).
- `next build` has not been run yet.

## Possible next steps
1. Run `npm run build` and fix anything it flags.
2. Smarter calendar re-import: update changed events, remove cancelled ones, and let a carer's imported busy
   events count as "away" for gap detection.
3. Real LLM extraction: add app/api/extract/route.ts returning JSON matching `Extraction`; keep parser.ts as fallback.
4. Backend (Supabase/Firebase) + auth for a shared family docket; then calendar subscription URLs or
   Google/Microsoft OAuth free/busy sync (requires a Privacy Policy update and re-consent: bump PRIVACY_POLICY_VERSION).
5. Deploy to Vercel.
