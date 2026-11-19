# FamilyDocket — front-end MVP

An AI admin assistant for busy parents: school emails, club newsletters and group-chat screenshots go in; a clean, prioritised docket of actions comes out.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000 (open on your phone via your LAN IP for the mobile feel)
```

Next.js 14 (App Router) · React 18 · Tailwind CSS 3 · Lucide icons. No backend; state persists in `localStorage`. The refresh icon in the top bar restores the demo data.

## What's in the prototype

| Area | Where | What it does |
|---|---|---|
| Universal Intake | `components/intake/IntakeHub.tsx` | Tab A: family forwarding address + paste a raw email. Tab B: screenshot drop-zone with simulated OCR (editable transcript). Sample inputs for both. |
| AI Extraction Engine | `lib/parser.ts` | Turns raw text into the `Extraction` JSON: category, title, source, audience, event date/time/location, deadline, action checklist, summary, confidence. |
| Processing + review | `ProcessingView.tsx`, `ExtractionReview.tsx` | Staged "AI is reading" animation, then a human-in-the-loop review: preview card, edit category/title/actions, inspect raw JSON, add to docket. |
| Master Action Dashboard | `components/docket/` | Timeline grouped Overdue → Today → Tomorrow → This week → Later; filters All / Action Items / Calendar Events / Archived; live checkboxes, progress, urgency badges and stripes, archive/restore/delete. |
| Chief-of-Staff Briefing | `lib/briefing.ts`, `components/briefing/Briefing.tsx` | Morning & Evening Dispatch: schedule, deadlines, permission slips & replies, kit & money (or "Pack tonight"), look-ahead. Copy as plain text or listen via text-to-speech. |

## Using your own data

- **Start fresh:** the settings icon (top right) → *Start fresh* removes the demo family. *Restore demo data* brings it back.
- **Import your calendar:** settings → *Import a calendar*, or the **Calendar** tab on the intake screen. Choose an `.ics` file:
  - Google Calendar (on a computer): Settings → Import & export → Export, then unzip the download.
  - Apple Calendar (Mac): select the calendar → File → Export → Export…
  - Outlook for Windows: File → Save Calendar.

  Events from last week to 8 weeks ahead are shown for you to tick; repeating events show their next date. Importing the same file again skips anything already added.
- **Export to your calendar:** settings → *Export to calendar* downloads `familydocket.ics` with every dated item (deadline and checklist in the notes). Open it to add the events to Google, Apple or Outlook. Re-exporting updates the same events instead of duplicating them.
- **Action links:** tasks get a one-tap button where possible: *Open form* (consent or booking link found in the message), *Pay now* / *ParentPay*, *Reply* (pre-filled email for RSVPs), *Book*, and *Gift ideas* (Amazon UK search matched to the child's age and budget). Every card keeps the full original message, with clickable links, under *Original email*.

Everything stays in the browser on your device; nothing is uploaded.

## Project structure

```
app/            layout, page (client entry), globals.css
components/     AppShell (top bar, views, bottom nav, toast), ui.tsx (tags, badges, segmented control)
  docket/       Dashboard, ActionCard
  intake/       IntakeHub, CalendarImport, ProcessingView, ExtractionReview, ChatMock
  briefing/     Briefing
lib/            types, dates, parser (extraction + action links), ics (calendar import/export), briefing (dispatch), samples, seed, store
```

## Swapping in a real LLM

`extract(raw, channel, now)` in `lib/parser.ts` is the single seam. To go live:

1. Add `app/api/extract/route.ts` that sends the text (or the image, for screenshots) to your model with a JSON schema mirroring the `Extraction` type in `lib/types.ts`.
2. In `IntakeHub.process()`, `await fetch("/api/extract")` instead of calling `extract()` locally. Keep the rule-based parser as an offline fallback.
3. Screenshot OCR is currently simulated (`runOcr` returns a canned transcript); a vision model replaces both OCR and parsing in one call.

The briefing selection logic is deliberately deterministic so nothing important is dropped; an LLM pass can rewrite tone on top of it.

## Notes

- Dates in the seed and sample data are generated relative to today, so urgency states always look right.
- UK conventions: dd/mm dates, £, ParentPay, Year groups, U9s.
- For a custom font, add `next/font/google` (e.g. Inter) in `app/layout.tsx`; the stack already prefers Inter if installed.
