import { addDays, formatSpoken, nextWeekday, startOfDay, toISO } from "./dates";
import { holidayOn, isBankHoliday } from "./terms";

export interface Sample {
  id: string;
  label: string;
  text: string;
}

/** The first given weekday at least `minDays` away that is a normal term-time school day. */
function termDay(now: Date, weekday: number, minDays: number): Date {
  let d = nextWeekday(addDays(now, minDays - 1), weekday);
  while (holidayOn(toISO(d)) || isBankHoliday(toISO(d))) d = addDays(d, 7);
  return d;
}

/**
 * Notifications in the style UK primary schools send through their MIS and payment systems
 * (Arbor for messages and consent, ParentPay for payments). School names are fictional.
 */
function ukSchoolSystemSamples(now: Date): Sample[] {
  const sent = addDays(startOfDay(now), -1).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const trip = termDay(now, 4, 21);
  const tripDeadline = termDay(now, 5, 7);
  const nonUniform = termDay(now, 5, 10);
  const inset = termDay(addDays(nonUniform, 1), 5, 7);
  const reopen = addDays(inset, 3);
  const clubDeadline = addDays(inset, -4);

  return [
    {
      id: "arbor-trip",
      label: "Arbor · School trip",
      text: `From: Oakwood Primary School via Arbor <office@oakwoodprimary.sch.uk>
Date: ${sent}, 15:47
Subject: Year 4 trip to Warwick Castle
To: Parents and carers of Year 4

Dear Parent/Carer,

Year 4 will be visiting Warwick Castle on ${formatSpoken(trip)} as part of our History topic. The coach leaves school at 8:45am, so please make sure your child arrives by 8:30am. We will be back for normal pick-up at 3:15pm.

Please complete the online consent form in the Arbor app by ${formatSpoken(tripDeadline)}. Children without consent will stay in school.

The trip costs £18.50 per child, payable via ParentPay. If cost is a barrier, please speak to the school office in confidence.

Children will need a packed lunch, a water bottle and a waterproof coat.

Many thanks,
Mrs Hughes
Year 4 Team Leader

This message was sent via Arbor.`,
    },
    {
      id: "parentpay-nonuniform",
      label: "ParentPay · Non-uniform day",
      text: `From: St. Mary's Primary via ParentPay <noreply@stmarys-primary.sch.uk>
Date: ${sent}, 09:12
Subject: Non-Uniform Day for Children in Need
To: All parents

Dear Parents/Carers,

On ${formatSpoken(nonUniform)} children may come to school in non-uniform, or wearing something spotty, in support of BBC Children in Need.

A payment item for a £1 donation has been added to your ParentPay account. Please pay via ParentPay by ${formatSpoken(addDays(nonUniform, -1))}.

PE will still go ahead, so please send trainers.

Thank you for your support,
St. Mary's Primary School Office

You are receiving this because you have a ParentPay account linked to St. Mary's Primary School.`,
    },
    {
      id: "arbor-inset",
      label: "Arbor · INSET closure",
      text: `From: Oakwood Primary School via Arbor <office@oakwoodprimary.sch.uk>
Date: ${sent}, 12:30
Subject: INSET day – school closed to pupils
To: All parents and carers

Dear Parent/Carer,

Please note that school will be closed to pupils on ${formatSpoken(inset)} for staff training (INSET). School reopens as normal on ${formatSpoken(reopen)}.

Little Acorns holiday club is running on the day for all year groups. Please book a holiday club place in the Arbor app by ${formatSpoken(clubDeadline)} as spaces are limited.

Kind regards,
Mr Patel
Headteacher

This message was sent via Arbor.`,
    },
  ];
}

/** Sample inputs, written relative to "now" so the demo dates always look current. */
export function emailSamples(now: Date): Sample[] {
  return [...ukSchoolSystemSamples(now), ...otherEmailSamples(now)];
}

function otherEmailSamples(now: Date): Sample[] {
  const today = startOfDay(now);
  const tripDay = addDays(nextWeekday(now, 4), 7);
  const tripDeadline = nextWeekday(now, 1);
  const tournament = addDays(nextWeekday(now, 0), 7);
  const disco = addDays(nextWeekday(now, 5), 14);
  const discoDeadline = addDays(disco, -3);
  const sentDate = addDays(today, -2).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return [
    {
      id: "trip",
      label: "School trip letter",
      text: `---------- Forwarded message ---------
From: Oakwood Primary School <admin@oakwoodprimary.sch.uk>
Date: ${sentDate}, 16:02
Subject: Year 5 trip to the Natural History Museum
To: Year 5 Parents

Dear Parents/Carers,

As part of our Earth & Space topic, Year 5 will be visiting the Natural History Museum on ${formatSpoken(tripDay)}. We will travel by coach, leaving school at 9am sharp — please make sure your child arrives by 8:30am. We will be back at school for normal pick-up at 3:15pm.

The trip costs £12 per child. Please pay via ParentPay and complete the online consent form at https://forms.oakwoodprimary.sch.uk/y5-museum-trip by ${formatSpoken(tripDeadline)}. Children cannot attend without consent.

Your child will need a packed lunch in a disposable bag, a water bottle and a waterproof coat. Please do not send any money or electronic devices.

Please bring any medication your child needs (e.g. an inhaler) and hand it to the class teacher on the morning of the trip.

Kind regards,
Mr Okafor
Year 5 Teacher`,
    },
    {
      id: "club",
      label: "Football club newsletter",
      text: `From: Hollybrook Juniors FC <news@hollybrookjuniors.co.uk>
Subject: Hollybrook Juniors Newsletter – ${today.toLocaleDateString("en-GB", { month: "long" })}

Hi Hollybrook families!

What a month it's been. Huge well done to all our teams for a brilliant start to the season, and a big thank you to the parents who helped at the car wash fundraiser.

U9s: the Autumn Tournament is on ${formatSpoken(tournament)} at Westfield Sports Ground. Players should arrive by 8:45am for a 9:15am kick-off.

Please bring shin pads, football boots, a water bottle and a waterproof coat — it's going to be muddy! The entry fee is £5 per player, payable via the club portal.

Let Coach Dan know (dan@hollybrookjuniors.co.uk) if your child can make it by Wednesday so we can confirm squad numbers.

Reminder: new club socks are available from the clubhouse.

See you on the touchline,
Hollybrook Juniors FC Committee`,
    },
    {
      id: "disco",
      label: "Messy PTA email",
      text: `Fwd: PTA news!!

From: Friends of Oakwood PTA
Sent: Wednesday

Hi everyone 🎃

HALLOWEEN DISCO is back!! ${formatSpoken(disco)} in the school hall, 5:30pm-7pm for Reception to Year 2 (older years 7pm-8:30pm).

Tickets are £4 per child via ParentPay — please buy by ${formatSpoken(discoDeadline)} as we need numbers for the snacks!! Children can come dressed up in costume (nothing too scary please 😅).

Please collect your child from the hall at 7pm sharp.

We're also looking for volunteers to help with set-up, let us know if you can help!

Thanks so much,
Oakwood PTA x`,
    },
  ];
}

/** Sample chats. These are inserted only when a sample button is clicked, never for an uploaded image. */
export function chatTranscripts(now: Date): Sample[] {
  const party = addDays(nextWeekday(now, 6), 14);
  return [
    {
      id: "party",
      label: "Party invite chat",
      text: `Chat: Year 3 Parents 🎒
Sophie (Ava's mum): Hi all! Ava is turning 7 🎉 We're having her party at Jump Zone on ${formatSpoken(party)}, 2pm–4pm
Sophie (Ava's mum): Please RSVP by Wednesday so I can confirm numbers with the venue 🙏
Priya: Amazing, Leo would love to come!
Sophie (Ava's mum): Kids need grip socks (they sell them there for £2 if not). No presents needed, we're doing a joint gift, £5 each if you'd like to chip in
Tom: 👍 count us in`,
    },
    {
      id: "training",
      label: "Training change",
      text: `Chat: Hollybrook U9s Parents ⚽
Coach Dan: Evening all, training this week is moved to Tuesday at Riverside Park, 5:30pm–6:30pm (pitch 2)
Coach Dan: Please bring shin pads, football boots and a water bottle. Subs are £3 cash on the night
Mel: Thanks Dan 👍
Coach Dan: Also the kit order form closes Friday. £18 for the new training top, pay via the club portal`,
    },
    {
      id: "photos",
      label: "Class reminder",
      text: `Chat: Class 2B Parents
Jess: Did everyone see the letter? School photos are tomorrow!! 📸
Jess: Full school uniform please, and hair brushed lol
Amir: Thank you, I totally forgot 😅 Is it also the deadline for the reading log?
Jess: Yes, reading logs need to be signed and back in book bags by tomorrow`,
    },
  ];
}

/** A small sample calendar (.ics) so the import can be tried without exporting a real one. */
export function sampleCalendar(now: Date): string {
  const today = startOfDay(now);
  const ymd = (d: Date) => toISO(d).replace(/-/g, "");
  const swimStart = addDays(nextWeekday(now, 3), -21); // repeating weekly, started weeks ago
  const dentist = addDays(today, 6);
  const halfTerm = addDays(nextWeekday(now, 1), 7);
  const lunch = addDays(today, 11);
  const exam = addDays(today, 20);
  const old = addDays(today, -40);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sample//EN",
    "X-WR-CALNAME:Family",
    "BEGIN:VEVENT",
    "UID:swim-001@sample",
    `DTSTART;TZID=Europe/London:${ymd(swimStart)}T170000`,
    `DTEND;TZID=Europe/London:${ymd(swimStart)}T174500`,
    "RRULE:FREQ=WEEKLY;BYDAY=WE",
    "SUMMARY:Swimming lessons – Leo",
    "LOCATION:Kings Leisure Centre\\, Ashford",
    "DESCRIPTION:Bring goggles and a towel.",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:dentist-002@sample",
    `DTSTART:${ymd(dentist)}T093000Z`,
    `DTEND:${ymd(dentist)}T100000Z`,
    "SUMMARY:Dentist – Maya",
    "LOCATION:Bright Smiles Dental",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:halfterm-003@sample",
    `DTSTART;VALUE=DATE:${ymd(halfTerm)}`,
    `DTEND;VALUE=DATE:${ymd(addDays(halfTerm, 5))}`,
    "SUMMARY:Half term – no school",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:lunch-004@sample",
    `DTSTART;TZID=Europe/London:${ymd(lunch)}T130000`,
    "SUMMARY:Grandma's 80th birthday lunch",
    "LOCATION:The Riverside Inn",
    "DESCRIPTION:Please RSVP to Auntie Sara by Friday. Bring a present (we're doing a",
    "  joint card).",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:exam-005@sample",
    `DTSTART;TZID=Europe/London:${ymd(exam)}T094500`,
    "SUMMARY:Piano exam – Leo",
    "DESCRIPTION:Arrive by 9:15am and bring sheet music.",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:old-006@sample",
    `DTSTART;VALUE=DATE:${ymd(old)}`,
    "SUMMARY:Old event (should be skipped)",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
