/**
 * Simulated AI extraction engine.
 *
 * In production this is a single LLM call (text, or a vision model for screenshots) that
 * returns JSON matching the `Extraction` type. For the prototype we approximate that with
 * a deterministic, rule-based parser so the demo works offline and instantly.
 * Swap `extract()` for a call to `/api/extract` when wiring up a real model.
 */
import type { Category, Channel, Extraction, Task } from "./types";
import { addDays, formatTime, ordinal, startOfDay, toISO } from "./dates";
import { uid } from "./utils";

/* ------------------------------------------------------------------ */
/* Pre-processing                                                       */
/* ------------------------------------------------------------------ */

function header(text: string, name: string): string | null {
  const m = text.match(new RegExp(`^\\s*${name}\\s*:\\s*(.+)$`, "im"));
  return m ? m[1].trim() : null;
}

function stripHeaders(text: string): string {
  return text
    .replace(/^-+\s*forwarded message\s*-+\s*$/gim, "")
    .replace(/^\s*(from|to|cc|bcc|date|sent|subject|reply-to)\s*:.*$/gim, "")
    .replace(/^\s*(chat|group)\s*:.*$/gim, "")
    .replace(/^\s*fwd?\s*:.*$/gim, "")
    .trim();
}

/** Chat OCR: drop sender labels and clock times, and join lines the screenshot wrapped mid-sentence. */
function normaliseChat(text: string): string {
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\d{1,2}:\d{2}$/.test(line))
    .filter((line) => !/^[^:\n]{1,48}:$/.test(line))
    .map((line) => line.replace(/^[^:\n]{1,40}:\s+/, ""))
    .filter(Boolean);

  const merged: string[] = [];
  for (const line of lines) {
    const prev = merged[merged.length - 1];
    const continues =
      !!prev &&
      (/^[a-z£0-9(]/.test(line) || (/^(?:sun|mon|tues|wednes|thurs|fri|satur)day\b/i.test(line) && !/[.!?]"?$/.test(prev)));
    if (continues) merged[merged.length - 1] = `${prev} ${line}`;
    else merged.push(line);
  }
  return merged.join("\n").trim();
}

function sentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const titleCase = (s: string) => s.replace(/(^|[\s-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());

/* ------------------------------------------------------------------ */
/* Dates & times                                                        */
/* ------------------------------------------------------------------ */

const MONTH_RE =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAY_STEMS = ["sun", "mon", "tues", "wednes", "thurs", "fri", "satur"];

interface Hit {
  iso: string;
  index: number;
  end: number;
}

function makeDate(day: number, month: number, year: number | undefined, today: Date): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  let y = year ?? today.getFullYear();
  if (y < 100) y += 2000;
  let dt = new Date(y, month, day);
  if (dt.getMonth() !== month) return null;
  // "3rd January" written in December means next year
  if (year === undefined && dt < addDays(today, -60)) dt = new Date(y + 1, month, day);
  return toISO(dt);
}

export function findDates(text: string, now: Date): Hit[] {
  const today = startOfDay(now);
  const absolute: Hit[] = [];
  const relative: Hit[] = [];
  let m: RegExpExecArray | null;

  const overlapsAbsolute = (i: number) => absolute.some((h) => i >= h.index && i < h.end);
  const push = (arr: Hit[], iso: string | null, match: RegExpExecArray) => {
    if (iso) arr.push({ iso, index: match.index, end: match.index + match[0].length });
  };

  // 23rd October, 23 Oct 2026
  const dm = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}\\b(?:,?\\s+(\\d{4}))?`, "gi");
  while ((m = dm.exec(text))) {
    push(absolute, makeDate(+m[1], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()), m[3] ? +m[3] : undefined, today), m);
  }
  // October 23rd
  const md = new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?![:.]\\d)(?:,?\\s+(\\d{4}))?`, "gi");
  while ((m = md.exec(text))) {
    if (overlapsAbsolute(m.index)) continue;
    push(absolute, makeDate(+m[2], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), m[3] ? +m[3] : undefined, today), m);
  }
  // 23/10 or 23/10/26 (UK order)
  const slash = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
  while ((m = slash.exec(text))) {
    push(absolute, makeDate(+m[1], +m[2] - 1, m[3] ? +m[3] : undefined, today), m);
  }
  // today / tonight / tomorrow
  const rel = /\b(today|tonight|tomorrow)\b/gi;
  while ((m = rel.exec(text))) {
    push(relative, toISO(addDays(today, m[1].toLowerCase() === "tomorrow" ? 1 : 0)), m);
  }
  // (this|next) Friday — skipped when it's just the weekday label of an absolute date
  const wk = /\b(?:(this|next)\s+)?(sun|mon|tues|wednes|thurs|fri|satur)day\b/gi;
  while ((m = wk.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    if (absolute.some((h) => Math.abs(h.index - end) <= 4 || Math.abs(start - h.end) <= 4)) continue;
    const target = WEEKDAY_STEMS.indexOf(m[2].toLowerCase());
    let diff = (target - today.getDay() + 7) % 7;
    if (m[1]?.toLowerCase() === "next" && diff === 0) diff = 7;
    relative.push({ iso: toISO(addDays(today, diff)), index: start, end });
  }

  return [...absolute, ...relative].sort((a, b) => a.index - b.index);
}

const DEADLINE_CUE =
  /\b(by|before|deadline(?:\s+is)?|no later than|until|closes?|closing|due(?:\s+on)?)\s*:?\s+(?:the\s+|this\s+|next\s+|end of\s+)?(?:(?:mon|tues|wednes|thurs|fri|satur|sun)day,?\s+)?$/i;

function isDeadlineContext(text: string, index: number): boolean {
  return DEADLINE_CUE.test(text.slice(Math.max(0, index - 40), index));
}

export function findTimes(text: string): { value: string; index: number }[] {
  const out: { value: string; index: number }[] = [];
  const re = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b|\b(noon|midday)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let h: number;
    let min: number;
    if (m[3]) {
      h = (+m[1] % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0);
      min = m[2] ? +m[2] : 0;
    } else if (m[4]) {
      h = +m[4];
      min = +m[5];
    } else {
      h = 12;
      min = 0;
    }
    if (h > 23 || min > 59) continue;
    out.push({ value: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`, index: m.index });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Category, source, audience, location                                 */
/* ------------------------------------------------------------------ */

const CATEGORY_SIGNALS: Record<Category, [string, number][]> = {
  "Birthday Party": [["birthday", 4], ["party", 2], ["rsvp", 1], ["turning", 1], ["party bag", 1], ["invit", 1], ["soft play", 1], ["trampoline", 1]],
  "School Admin": [
    ["school", 2], ["pupil", 1], ["consent", 2], ["permission", 1], ["parentpay", 2], ["class ", 1], ["teacher", 1], ["year ", 1],
    ["reception", 1], ["uniform", 1], ["term", 1], ["trip", 1], ["inset", 2], ["pta", 2], ["headteacher", 1], ["homework", 1],
    ["reading log", 1], ["parents' evening", 2], ["pe kit", 2], ["book character", 2],
  ],
  "Sports Club": [
    ["club", 2], ["training", 2], ["coach", 1], ["match", 1], ["fixture", 2], ["tournament", 2], ["squad", 2], ["football", 2],
    ["netball", 2], ["rugby", 2], ["swim", 2], ["gala", 1], ["kick-off", 2], ["shin pads", 2], ["subs", 1], ["pitch", 1],
    ["cricket", 2], ["gymnastics", 2], ["dance", 1], ["karate", 2], ["kit", 1],
  ],
  "General Notice": [["notice", 1], ["closure", 1], ["reminder", 1], ["newsletter", 1], ["update", 1]],
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A club message names the club, the coach, or the session. "Swimming is cancelled" in a class chat does not. */
const CLEAR_CLUB =
  /\b(clubs?|coaches?|training|matches|match|fixtures?|tournaments?|squads?|fc|afc|kick-?off|shin pads|football|netball|rugby|cricket|gymnastics|karate|pitch)\b/i;

function classify(text: string): Category {
  const scores = new Map<Category, number>();
  for (const [cat, signals] of Object.entries(CATEGORY_SIGNALS) as [Category, [string, number][]][]) {
    scores.set(
      cat,
      signals.reduce((sum, [k, w]) => sum + (new RegExp(`\\b${escapeRe(k)}`, "i").test(text) ? w : 0), 0),
    );
  }
  if ((scores.get("Sports Club") ?? 0) > 0 && !CLEAR_CLUB.test(text)) scores.set("Sports Club", 0);

  let best: Category = "General Notice";
  let bestScore = 0;
  for (const [cat, score] of scores) {
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return bestScore >= 2 ? best : "General Notice";
}

const ORG_RE =
  /\b((?:St\.?\s)?[A-Z][\w'.]*(?:\s[A-Z][\w'.]*){0,4}\s(?:Primary School|Primary|Academy|School|College|Nursery|FC|AFC|Club|Scouts|Brownies|PTA))\b/;

function findSource(raw: string, channel: Channel): string {
  const from = header(raw, "from");
  if (from) {
    const name = from.replace(/<[^>]*>/g, "").replace(/"/g, "").trim();
    // "Oakwood Primary School via Arbor" → "Oakwood Primary School"
    if (name && !name.includes("@")) return name.replace(/\s+via\s+\S+$/i, "").replace(/\s+(Office|Admin|Team|Committee|Newsletter)$/i, "");
    const domain = from.match(/@([\w-]+)\./)?.[1];
    if (domain) return titleCase(domain.replace(/[-_]/g, " "));
  }
  const chat = raw.match(/^\s*(?:chat|group)\s*:\s*(.+)$/im);
  if (chat) return chat[1].replace(/[^\p{L}\p{N}\s'&-]/gu, "").trim();
  const org = raw.match(ORG_RE);
  if (org) return org[1].trim();
  return channel === "whatsapp" ? "Parent group chat" : "Forwarded email";
}

const AUDIENCE_RE = /\b(Year\s?\d{1,2}|Reception|Nursery|Class\s+\d?[A-Z]\w*|Under[- ]?\d{1,2}s?|U\d{1,2}s?)\b/;

const NOT_A_PLACE = new Set([
  "The", "This", "Next", "Home", "School", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
]);

function findLocation(body: string): string | null {
  const re = /\b(?:at|venue:?|location:?|held at|visiting|visit to)\s+((?:the\s)?[A-Z][\w'&-]*(?:\s(?:[A-Z][\w'&-]*|&))*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const first = m[1].replace(/^the\s/, "").split(" ")[0];
    if (!NOT_A_PLACE.has(first)) return m[1].replace(/^the\s/, "");
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Title                                                                */
/* ------------------------------------------------------------------ */

const EVENT_PHRASES = [
  "swimming gala", "sports day", "non-uniform day", "parents' evening", "parents evening", "school photos", "world book day",
  "inset day", "harvest festival", "christmas fair", "summer fair", "halloween disco", "bake sale", "cake sale", "fun run",
  "nativity", "open evening", "disco",
];

function findTitle(body: string, subject: string | null, audience: string | null): string {
  if (subject && !/newsletter|bulletin|weekly|update|news\b/i.test(subject)) {
    return subject.replace(/^(\s*(fwd?|fw|re)\s*:\s*)+/i, "").trim();
  }
  let m: RegExpMatchArray | null;
  if ((m = body.match(/\b([A-Z][a-z]+) is turning (\d{1,2})\b/))) return `${m[1]}'s ${ordinal(+m[2])} Birthday Party`;
  if ((m = body.match(/\b([A-Z][a-z]+)'s (\d{1,2}(?:st|nd|rd|th) )?birthday/i))) return `${m[1]}'s ${m[2] ?? ""}Birthday Party`;
  if ((m = body.match(/[Tt]rip to (the )?([A-Z][\w']*(?:\s[A-Z][\w']*)*)/))) return `Trip to ${m[1] ?? ""}${m[2]}`;
  if (/\bbook characters?\b/i.test(body) || /\bdress(?:ed)? up as a book\b/i.test(body)) return "Book character day";

  const eventText = sentences(body)
    .filter((s) => !(/£/.test(s) && /\b(please\s+)?(send|pay|bring|chip in|payable|donation)\b/i.test(s)))
    .join(" ");
  const lower = (eventText || body).toLowerCase();
  for (const phrase of EVENT_PHRASES) if (lower.includes(phrase)) return titleCase(phrase);

  const prefix = audience && /^(U\d|Under)/i.test(audience) ? `${audience} ` : "";
  if ((m = body.match(/\b([A-Z][a-z]+\s)?(Training|Match|Tournament|Fixture|Festival|Gala|Trials?)\b/))) {
    const adj = m[1] && !/^(The|A|Our|This|Next) $/.test(m[1]) ? m[1] : "";
    return `${prefix}${adj}${m[2]}`;
  }
  if ((m = body.match(/\b(training|match|fixture|tournament|festival|gala|trials?)\b/i))) {
    const changed = body.match(/\b(moved|cancelled|canceled|rescheduled|postponed)\b/i);
    return `${prefix}${cap(m[1].toLowerCase())}${changed ? ` ${changed[1].toLowerCase()}` : ""}`;
  }
  const first = sentences(body).find((s) => s.length > 12 && !/^(dear|hi|hello)\b/i.test(s)) ?? "Untitled notice";
  return first.length > 60 ? `${first.slice(0, 57).trim()}…` : first.replace(/[.!]+$/, "");
}

/* ------------------------------------------------------------------ */
/* Action items                                                         */
/* ------------------------------------------------------------------ */

const KIT_ITEMS = [
  "swimming costume", "swimming cap", "grip socks", "shin pads", "football boots", "gum shield", "pe kit", "packed lunch",
  "water bottle", "waterproof coat", "sun cream", "sun hat", "goggles", "towel", "swimsuit", "wellies", "trainers",
  "plimsolls", "gloves", "raincoat", "boots", "hat",
].sort((a, b) => b.length - a.length);

const KIT_CUE = /\b(bring|pack|need|needs|will need|wear|remember|don't forget|do not forget|should have|required|must have|please send)\b/i;

interface DraftTask {
  text: string;
  due: string | null;
}

function kitTask(item: string, adj?: string): string {
  if (item === "packed lunch") return "Make a packed lunch";
  if (item === "sun cream") return "Apply sun cream";
  if (item === "pe kit") return "Pack PE kit";
  return `Pack ${adj ? `${adj.toLowerCase()} ` : ""}${item}`;
}

function payVia(sentence: string, body: string): string {
  for (const s of [sentence, body]) {
    if (/parentpay/i.test(s)) return " via ParentPay";
    if (/club portal/i.test(s)) return " via club portal";
    if (/school ?money|scopay|arbor/i.test(s)) return " via school app";
  }
  return "";
}

function findTasks(body: string, now: Date): DraftTask[] {
  const out: DraftTask[] = [];
  const add = (text: string, due: string | null = null) => {
    if (!out.some((o) => o.text.toLowerCase() === text.toLowerCase())) out.push({ text, due });
  };
  const dueOf = (s: string) => findDates(s, now)[0]?.iso ?? null;
  const sents = sentences(body);

  for (const s of sents) {
    const due = dueOf(s);
    if (/\bbook characters?\b/i.test(s) || /\bdress(?:ed)? up as a book\b/i.test(s)) add("Prepare book character costume", due);
    const send = s.match(/\bplease\s+send\s+£\s?(\d+(?:\.\d{2})?)\s+for\s+(?:the\s+)?([a-z][a-z\s]{1,40}?)(?=\s+by\b|[.!?,]|$)/i);
    if (send) add(`Send £${send[1]} for ${send[2].trim().toLowerCase()}`, due);
    if (/\bswimm\w*\b/i.test(s) && /\bcancell?ed\b/i.test(s) && /\bpe\s+kit\b/i.test(s)) add("Pack PE kit instead of swimming", due);
  }

  // Consent / forms
  const consent = sents.find((s) => /\b(consent|permission)\b/i.test(s));
  if (consent) add(/\b(online|portal|link|website)\b/i.test(consent) ? "Complete online consent form" : "Sign & return consent form", dueOf(consent));
  for (const s of sents) {
    const due = dueOf(s);
    const doc = s.match(/\b(reading (?:log|record)|planner|homework diary|reply slip|letter)s?\b/i);
    if (doc && /\bsign/i.test(s)) add(`Sign & return ${doc[1].toLowerCase()}`, due);
    if (/\border form\b/i.test(s)) add("Submit kit order form", due);
  }

  // Money. "Please send £2 for the cake sale" is already its own action.
  for (const s of sents) {
    if (/\bplease\s+send\s+£/i.test(s)) continue;
    const mm = s.match(/£\s?(\d+(?:\.\d{2})?)/);
    if (!mm) continue;
    const due = dueOf(s);
    const amt = `£${mm[1]}`;
    if (/\b(gift|present|chip in|contribut\w*|collection)\b/i.test(s)) {
      add(/chip in|contribut|joint|collection/i.test(s) ? `Chip in ${amt} for the group gift` : `Buy a present (~${amt})`, due);
    } else if (/\b(subs|cash|coins?|donat\w*|bring)\b/i.test(s) && !/parentpay|\bpay(able)? (online|via)\b/i.test(`${s} ${sents[sents.indexOf(s) + 1] ?? ""}`)) {
      add(`Bring ${amt}${/subs/i.test(s) ? " subs" : /donat/i.test(s) ? " donation" : " in cash"}`, due);
    } else if (/\b(pay|payable|payment|costs?|fee|tickets?|charge|price)\b/i.test(s)) {
      add(`Pay ${amt}${payVia(s, body)}`, due);
    }
  }

  // RSVP / confirm attendance
  for (const s of sents) {
    const isRsvp =
      /\brsvp\b/i.test(s) ||
      /confirm (attendance|numbers|your place)/i.test(s) ||
      (/\blet\s.{0,30}?know\b/i.test(s) && /(make it|attend|com(e|ing)|numbers|place|join)/i.test(s));
    if (!isRsvp) continue;
    const who = s.match(/\b[Ll]et ((?:Coach|Mr|Mrs|Miss|Ms)\.?\s[A-Z][a-z]+|[A-Z][a-z]+) know/);
    add(who ? `Confirm attendance with ${who[1]}` : "RSVP", dueOf(s));
  }

  // Kit
  const kit: string[] = [];
  for (const s of sents) {
    if (!KIT_CUE.test(s)) continue;
    let work = s.toLowerCase();
    for (const item of KIT_ITEMS) {
      const re = new RegExp(`\\b(?:(extra|spare|named|labelled)\\s+(?:pair of\\s+)?)?${item.replace(/ /g, "\\s+")}s?\\b`, "i");
      const km = work.match(re);
      if (!km) continue;
      work = work.replace(km[0], " ");
      if (item === "pe kit" && out.some((t) => t.text === "Pack PE kit instead of swimming")) continue;
      const t = kitTask(item, km[1]);
      if (!kit.includes(t)) kit.push(t);
    }
    kit.splice(0, kit.length).slice(0, 5).forEach((t) => add(t, dueOf(s)));
  }

  // Everything else
  for (const s of sents) {
    const noSwim = s.replace(/swimming costume/gi, "");
    const due = dueOf(s);
    if (/non[- ]uniform/i.test(s)) add("Pick out non-uniform outfit", due);
    else if (/\bfull (school )?uniform\b/i.test(s)) add("Lay out full school uniform", due);
    if (
      /\b(dress(?:ed)? up|come dressed|fancy dress|costume)\b/i.test(noSwim) &&
      !out.some((t) => t.text === "Prepare book character costume")
    ) {
      add("Prepare a costume", due);
    }
    if (/\b(medication|inhaler|epi-?pen)\b/i.test(s) && /\b(hand|bring|give|pack)\b/i.test(s)) add("Hand in any medication (e.g. inhaler)", due);

    const arrive = s.match(/\barrives? (?:by|at|for)\s+(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm))/i);
    if (arrive) {
      const t = findTimes(arrive[1])[0];
      if (t) add(`Arrive by ${formatTime(t.value)}`, due);
    }
    if (/\b(collect|pick[- ]?up)\b/i.test(s)) {
      const t = findTimes(s)[0];
      if (t) add(`Pick up at ${formatTime(t.value)}`, due);
    }
    if (/\b(inset|closed to pupils|school (?:is |will be )?closed)\b/i.test(s)) add("Arrange childcare for the day", due);
    if (/\bbook (?:a |your )?(?:[\w-]+ ){0,2}(slot|appointment|place|ticket)/i.test(s)) add(/club/i.test(s) ? "Book a holiday club place" : "Book a slot", due);
    else if (/\b(sign up|register)\b/i.test(s)) add("Register / sign up", due);
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Summary & confidence                                                 */
/* ------------------------------------------------------------------ */

const DATEISH = /\b(\d{1,2}(st|nd|rd|th)?\s+[A-Z][a-z]+|(mon|tues|wednes|thurs|fri|satur|sun)day|tomorrow|today|tonight)\b/i;

function summarise(body: string): string {
  const sents = sentences(body).filter((s) => !/^(dear|hi|hello|good (morning|afternoon|evening)|what a|thanks|thank you|many thanks|kind regards)\b/i.test(s));
  const best = sents.find((s) => DATEISH.test(s) && s.length > 20) ?? sents.find((s) => s.length > 30) ?? sents[0] ?? "";
  const clean = cap(best.replace(/^[^:\n]{1,12}:\s/, ""));
  return clean.length > 160 ? `${clean.slice(0, 157).trim()}…` : clean;
}

/* ------------------------------------------------------------------ */
/* Action links                                                         */
/* ------------------------------------------------------------------ */

const URL_RE = /https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?]/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

/** URLs in the message, each with the sentence it appeared in (so we can tell a form link from a newsletter link). */
function findUrls(body: string): { url: string; context: string }[] {
  const out: { url: string; context: string }[] = [];
  for (const s of sentences(body)) for (const m of s.matchAll(URL_RE)) out.push({ url: m[0], context: s.toLowerCase() });
  return out;
}

/** Amazon UK search tuned to the child's age (from the title) and any budget in the task. */
export function giftSearchUrl(title: string, task = ""): string {
  const age = title.match(/(\d{1,2})(?:st|nd|rd|th)\b/)?.[1];
  const budget = task.match(/£(\d+)/)?.[1];
  const query = [age ? `${age} year old birthday present` : "kids birthday present", budget ? `under £${budget}` : ""].filter(Boolean).join(" ");
  return `https://www.amazon.co.uk/s?k=${encodeURIComponent(query)}`;
}

function attachLinks(drafts: DraftTask[], ctx: { raw: string; body: string; title: string; channel: Channel }): Task[] {
  const urls = findUrls(ctx.body);
  const pick = (re: RegExp) => urls.find((u) => re.test(u.url) || re.test(u.context))?.url;
  const fromAddress = ctx.channel === "email" ? (header(ctx.raw, "from") ?? "").match(EMAIL_RE)?.[0] : undefined;
  const replyTo = ctx.body.match(EMAIL_RE)?.[0] ?? fromAddress;

  return drafts.map<Task>((draft) => {
    const text = draft.text;
    let link: Task["link"];
    if (/consent|form|sign & return|register|sign up/i.test(text)) {
      const url = pick(/consent|permission|form|sign|register/i) ?? (urls.length === 1 ? urls[0].url : undefined);
      if (url) link = { label: "Open form", url };
    } else if (/^book/i.test(text)) {
      const url = pick(/book|slot|appointment|schoolcloud/i);
      if (url) link = { label: "Book", url };
    } else if (/^Pay /.test(text)) {
      const url =
        urls.find((u) => /pay|ticket|shop/i.test(u.url))?.url ??
        urls.find((u) => /\b(pay|payable|tickets?)\b/.test(u.context) && !/consent|form/.test(u.context))?.url;
      if (url) link = { label: "Pay now", url };
      else if (/parentpay/i.test(text)) link = { label: "ParentPay", url: "https://www.parentpay.com/" };
    } else if (/^(RSVP|Confirm attendance)/.test(text) && replyTo) {
      link = { label: "Reply", url: `mailto:${replyTo}?subject=${encodeURIComponent(`Re: ${ctx.title}`)}` };
    } else if (/^Buy a present/i.test(text)) {
      link = { label: "Gift ideas", url: giftSearchUrl(ctx.title, text) };
    }
    return { id: uid(), text, done: false, ...(draft.due ? { due: draft.due } : {}), ...(link ? { link } : {}) };
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export function extract(raw: string, channel: Channel, now: Date = new Date()): Extraction {
  const subject = header(raw, "subject");
  const source = findSource(raw, channel);
  let body = stripHeaders(raw);
  if (channel === "whatsapp") body = normaliseChat(body);

  const category = classify(raw);
  const audience = raw.match(AUDIENCE_RE)?.[1] ?? null;

  const dates = findDates(body, now);
  const deadline = dates.find((d) => isDeadlineContext(body, d.index))?.iso ?? null;
  const eventDate = dates.find((d) => !isDeadlineContext(body, d.index))?.iso ?? null;

  const eventTime =
    findTimes(body).find(
      (t) =>
        !isDeadlineContext(body, t.index) &&
        !/\b(collect|pick[- ]?up|back (?:at|by)|return)\b[^.\n]{0,25}$/i.test(body.slice(Math.max(0, t.index - 30), t.index)),
    )?.value ?? null;

  let title = findTitle(body, subject, audience);
  let tasks = findTasks(body, now);

  const hasConsent = tasks.some((t) => /consent/i.test(t.text));
  if (hasConsent && !/consent|permission|slip|form/i.test(title) && title.length <= 24) title = `${title} permission slip`;

  const host = title.match(/^([A-Z][a-z]+)'s .*Birthday/);
  if (host) tasks = tasks.map((t) => (t.text === "RSVP" ? { ...t, text: `RSVP to ${host[1]}'s parents` } : t));
  // Parties need a present unless the invite says otherwise.
  if (category === "Birthday Party" && !tasks.some((t) => /present|gift/i.test(t.text)) && !/\bno (presents|gifts)\b/i.test(body)) {
    tasks.push({ text: "Buy a present", due: null });
  }
  if (!tasks.length) tasks = [{ text: eventDate ? "Add to the family calendar" : "Read & acknowledge", due: null }];

  const location = findLocation(body);
  const found = [!/Forwarded email|Parent group chat/.test(source), eventDate, eventTime, location, deadline, audience].filter(Boolean).length;
  const confidence = Math.min(0.98, 0.74 + found * 0.04);

  return {
    category,
    title,
    source,
    channel,
    audience,
    eventDate,
    eventTime,
    location,
    deadline,
    tasks: attachLinks(tasks, { raw, body, title, channel }),
    summary: summarise(body),
    confidence: Math.round(confidence * 100) / 100,
    raw: raw.trim().slice(0, 8000),
  };
}
