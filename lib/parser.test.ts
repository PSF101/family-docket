import assert from "node:assert/strict";
import test from "node:test";
import { fromISO } from "./dates";
import { extract } from "./parser";
import { chatTranscripts, emailSamples } from "./samples";

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

test("a club email stays a sports club and a school letter stays school admin", () => {
  const emails = Object.fromEntries(emailSamples(NOW).map((sample) => [sample.id, extract(sample.text, "email", NOW)]));

  assert.equal(emails.club.category, "Sports Club");
  assert.match(emails.club.title, /Tournament|Autumn/i);
  assert.equal(emails["arbor-trip"].category, "School Admin");
  assert.equal(emails.trip.category, "School Admin");
  assert.match(emails.trip.title, /Natural History Museum/);
});
