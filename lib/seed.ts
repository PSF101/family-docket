import type { DocketItem, Task } from "./types";
import { addDays, nextWeekday, startOfDay, toISO } from "./dates";
import { uid } from "./utils";
import { giftSearchUrl } from "./parser";

/** Demo data, positioned relative to today so urgency states always show. */
export function createSeed(now: Date): DocketItem[] {
  const today = startOfDay(now);
  const d = (n: number) => toISO(addDays(today, n));
  const t = (text: string, done = false): Task => ({ id: uid(), text, done });
  const created = now.toISOString();

  const base = { archived: false, createdAt: created, location: null, audience: null, eventTime: null, confidence: 0.94 };

  return [
    {
      ...base,
      id: uid(),
      category: "School Admin",
      title: "Swimming Gala permission slip",
      source: "St. Mary's Primary",
      channel: "email",
      audience: "Year 4",
      eventDate: d(5),
      eventTime: "09:15",
      location: "Ashford Leisure Centre",
      deadline: d(1),
      tasks: [t("Sign & return consent form"), t("Bring £10 for coach travel"), t("Pack swimming costume & towel"), t("Pack extra goggles")],
      summary: "Year 4 inter-schools gala. Coach leaves at 9:15am and returns by 2:30pm. No consent form, no swim.",
      confidence: 0.97,
    },
    {
      ...base,
      id: uid(),
      category: "School Admin",
      title: "Non-Uniform Day",
      source: "St. Mary's PTA",
      channel: "email",
      eventDate: d(0),
      deadline: d(0),
      tasks: [t("Pick out non-uniform outfit", true), t("Bring £1 donation")],
      summary: "Wear your own clothes in exchange for a £1 donation to the PTA playground fund.",
    },
    {
      ...base,
      id: uid(),
      category: "Sports Club",
      title: "U9s Match vs Oakfield",
      source: "Hollybrook Juniors FC",
      channel: "portal",
      audience: "U9s",
      eventDate: toISO(nextWeekday(now, 6)),
      eventTime: "09:30",
      location: "Oakfield Rec, Pitch 3",
      deadline: null,
      tasks: [t("Wash & pack match kit", true), t("Pack shin pads"), t("Bring £4 match subs")],
      summary: "Away fixture. Meet at the pitch 20 minutes before kick-off.",
    },
    {
      ...base,
      id: uid(),
      category: "Birthday Party",
      title: "Maya's 8th Birthday Party",
      source: "Year 3 Parents",
      channel: "whatsapp",
      eventDate: d(9),
      eventTime: "14:00",
      location: "Little Owls Soft Play",
      deadline: d(2),
      tasks: [
        t("RSVP to Maya's parents"),
        { ...t("Buy a present (~£10)"), link: { label: "Gift ideas", url: giftSearchUrl("Maya's 8th Birthday Party", "£10") } },
      ],
      summary: "Soft play party, 2pm–4pm. Parents of under-6s asked to stay.",
      confidence: 0.91,
    },
    {
      ...base,
      id: uid(),
      category: "School Admin",
      title: "Parents' Evening booking",
      source: "St. Mary's Primary",
      channel: "portal",
      eventDate: d(13),
      deadline: d(-1),
      tasks: [{ ...t("Book a slot on SchoolCloud"), link: { label: "Book", url: "https://www.schoolcloud.co.uk/" } }],
      summary: "10-minute appointments with the class teacher. Booking closed yesterday for priority slots.",
    },
    {
      ...base,
      id: uid(),
      category: "General Notice",
      title: "INSET Day — school closed",
      source: "St. Mary's Primary",
      channel: "email",
      eventDate: d(18),
      deadline: null,
      tasks: [],
      summary: "Staff training day. School closed to pupils; holiday club available.",
    },
    {
      ...base,
      id: uid(),
      category: "School Admin",
      title: "Harvest Festival donations",
      source: "St. Mary's Primary",
      channel: "email",
      eventDate: d(-3),
      deadline: d(-4),
      tasks: [t("Send in 2 tins for the food bank", true)],
      summary: "Tins and dried goods for the local food bank.",
      archived: true,
    },
  ];
}
