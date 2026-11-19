import assert from "node:assert/strict";
import test from "node:test";
import { buildDispatch } from "./briefing";
import { formatDayMonth, formatShort, fromISO } from "./dates";
import { eventToExtraction, type CalendarEvent } from "./ics";
import { extract } from "./parser";
import { chatTranscripts, emailSamples } from "./samples";
import { holidayOn, isBankHoliday } from "./terms";
import type { DocketItem } from "./types";

const NOW = new Date(2026, 10, 19, 16, 0, 0); // Thursday 19 November 2026

const BOOK_CHARACTER_CHAT = `Lucy (class rep):
Reminder - Year 2 dress up as a book
character on Thursday 3rd December!
Also please send £2 for the cake sale
by Friday. Swimming is cancelled this
Tuesday, kids need PE kit instead.
14:32`;

test("book character class chat becomes a school event with three dated actions", () => {
  assert.equal(NOW.getDay(), 4, "fixture date must be a Thursday");

  const item = extract(BOOK_CHARACTER_CHAT, "whatsapp", NOW);

  assert.equal(item.category, "School Admin");
  assert.equal(item.title, "Book character day");
  assert.equal(item.eventDate, "2026-12-03");
  assert.equal(fromISO(item.eventDate!).getDay(), 4);
  assert.equal(item.eventTime, null);
  assert.deepEqual(
    item.tasks.map((task) => ({ text: task.text, due: task.due ?? null })),
    [
      { text: "Prepare book character costume", due: "2026-12-03" },
      { text: "Send £2 for cake sale", due: "2026-11-20" },
      { text: "Pack PE kit instead of swimming", due: "2026-11-24" },
    ],
  );
  assert.equal(fromISO("2026-11-20").getDay(), 5);
  assert.equal(fromISO("2026-11-24").getDay(), 2);
});

test("built-in chats still read as a party, a club and a school reminder", () => {
  const chats = Object.fromEntries(chatTranscripts(NOW).map((sample) => [sample.id, extract(sample.text, "whatsapp", NOW)]));

  assert.equal(chats.party.category, "Birthday Party");
  assert.match(chats.party.title, /Birthday Party$/);
  assert.equal(chats.party.eventTime, "14:00");
  assert.ok(chats.party.tasks.some((task) => task.text.startsWith("RSVP")));
  assert.ok(chats.party.tasks.some((task) => /grip socks/i.test(task.text)));

  assert.equal(chats.training.category, "Sports Club");
  assert.equal(chats.training.eventTime, "17:30");
  assert.ok(chats.training.tasks.some((task) => /shin pads/i.test(task.text)));

  assert.equal(chats.photos.category, "School Admin");
  assert.equal(chats.photos.title, "School Photos");
  assert.equal(chats.photos.eventTime, null);
});

const PTA_EMAIL =
  "Hi all! Quick reminder from the PTA - Christmas fair is next Saturday 5 Dec 11am-2pm in the hall. Could each family please send in a bottle for the tombola by Wednesday 2nd? Also Mia's class need a cardboard tube for crafts on Monday. Cake donations welcome, drop at the office Friday morning. Thanks, Lucy x";

test("a PTA email becomes a Christmas fair with a dated action for each request", () => {
  const item = extract(PTA_EMAIL, "email", NOW);

  assert.equal(item.category, "School Admin");
  assert.equal(item.title, "Christmas Fair");
  assert.equal(item.eventDate, "2026-12-05");
  assert.equal(fromISO(item.eventDate!).getDay(), 6);
  assert.equal(item.eventTime, "11:00");
  assert.equal(item.eventEndTime, "14:00");
  assert.deepEqual(
    item.tasks.map((task) => ({ text: task.text, due: task.due ?? null })),
    [
      { text: "Send a bottle for the tombola", due: "2026-12-02" },
      { text: "Bring a cardboard tube for crafts", due: "2026-11-23" },
      { text: "Drop a cake at the office (optional)", due: "2026-11-20" },
    ],
  );
  assert.equal(fromISO("2026-12-02").getDay(), 3);
  assert.equal(fromISO("2026-11-23").getDay(), 1);
  assert.equal(fromISO("2026-11-20").getDay(), 5);
});

test("Friday 27th is that Friday, not this Friday", () => {
  const note = "Please send in a shepherd costume by Friday 27th";
  const item = extract(note, "email", NOW);
  const costume = item.tasks.find((task) => /shepherd costume/i.test(task.text));

  assert.ok(costume);
  assert.equal(costume.due, "2026-11-27");
  assert.equal(fromISO(costume.due!).getDay(), 5);
  assert.notEqual(costume.due, "2026-11-20");

  const event: CalendarEvent = {
    uid: "nativity",
    summary: "Nativity",
    description: note,
    location: null,
    date: "2026-12-10",
    time: null,
    recurring: false,
  };
  const imported = eventToExtraction(event, "School", NOW);
  assert.equal(imported.tasks.find((task) => /shepherd costume/i.test(task.text))?.due, "2026-11-27");
});

test("a briefing names the date once an item is more than six days away", () => {
  const far = "2026-12-01";
  assert.equal(fromISO(far).getDay(), 2);
  const item = {
    id: "fair",
    category: "School Admin",
    title: "Christmas Fair",
    source: "PTA",
    channel: "email",
    audience: null,
    eventDate: far,
    eventTime: "11:00",
    location: null,
    deadline: null,
    tasks: [],
    summary: "",
    confidence: 1,
    archived: false,
    createdAt: "",
  } satisfies DocketItem;
  const dispatch = buildDispatch([item], "morning", NOW);
  const ahead = dispatch.sections.find((section) => section.heading === "Coming up");
  assert.ok(ahead);
  assert.match(ahead.lines[0].text, /^Tue 1 Dec — Christmas Fair/);
});

test("12/3 is 3 December in the US and 12 March in the UK", () => {
  const us = extract("The 2nd grade fair is on 12/3. Please send $5 for the bus by 11/25.", "email", NOW, "US");
  assert.equal(us.eventDate, "2026-12-03");
  assert.equal(fromISO(us.eventDate!).getMonth(), 11);
  assert.equal(fromISO(us.eventDate!).getDate(), 3);
  assert.equal(formatDayMonth(us.eventDate!, "US"), "Thu Dec 3");
  assert.equal(formatShort(us.eventDate!, "US"), "Thu Dec 3");
  assert.equal(us.audience, "2nd grade");
  const fare = us.tasks.find((task) => task.text === "Send $5 for bus");
  assert.ok(fare);
  assert.equal(fare.due, "2026-11-25");
  assert.equal(us.tasks.some((task) => /ParentPay|Arbor|INSET/.test(task.text)), false);

  const uk = extract("The fair is on 12/3.", "email", NOW, "UK");
  assert.equal(uk.eventDate, "2027-03-12");
  assert.equal(fromISO(uk.eventDate!).getMonth(), 2);
  assert.equal(fromISO(uk.eventDate!).getDate(), 12);
  assert.equal(formatDayMonth(uk.eventDate!, "UK"), "Fri 12 Mar");
  assert.equal(formatShort(uk.eventDate!, "UK"), "Fri 12 Mar");
});

test("US federal holidays are likely no-school days, and England holidays stay on the UK calendar", () => {
  const thanksgiving = holidayOn("2026-11-26", "US");
  assert.ok(thanksgiving);
  assert.match(thanksgiving.label, /Thanksgiving/);
  assert.match(thanksgiving.label, /check with your school/);
  assert.equal(holidayOn("2026-11-27", "US")?.from, thanksgiving.from);
  assert.equal(isBankHoliday("2026-11-26", "US"), false);
  assert.match(holidayOn("2026-12-25", "US")?.label ?? "", /Christmas/);
  assert.match(holidayOn("2027-01-01", "US")?.label ?? "", /New Year/);
  assert.match(holidayOn("2027-01-18", "US")?.label ?? "", /MLK Day/);
  assert.match(holidayOn("2027-02-15", "US")?.label ?? "", /Presidents' Day/);
  assert.match(holidayOn("2027-05-31", "US")?.label ?? "", /Memorial Day/);
  assert.match(holidayOn("2026-09-07", "US")?.label ?? "", /Labor Day/);
  assert.equal(holidayOn("2026-11-26", "UK"), undefined);
  assert.match(holidayOn("2026-12-21", "UK")?.label ?? "", /Christmas holidays/);
  assert.equal(holidayOn("2026-10-26", "US"), undefined);
});

test("a club email stays a sports club and a school letter stays school admin", () => {
  const emails = Object.fromEntries(emailSamples(NOW).map((sample) => [sample.id, extract(sample.text, "email", NOW)]));

  assert.equal(emails.club.category, "Sports Club");
  assert.match(emails.club.title, /Tournament|Autumn/i);
  assert.equal(emails["arbor-trip"].category, "School Admin");
  assert.equal(emails.trip.category, "School Admin");
  assert.match(emails.trip.title, /Natural History Museum/);
});
