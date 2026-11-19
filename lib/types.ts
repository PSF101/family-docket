export type Category = "School Admin" | "Sports Club" | "Birthday Party" | "General Notice";

export const CATEGORIES: Category[] = ["School Admin", "Sports Club", "Birthday Party", "General Notice"];

/** Where the item came in from. */
export type Channel = "email" | "whatsapp" | "portal" | "calendar";

export interface TaskLink {
  /** Short button label, e.g. "Open form", "Reply", "Gift ideas" */
  label: string;
  /** https:// or mailto: */
  url: string;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  /** ISO date this action should be done by, when the message gives it one. */
  due?: string | null;
  /** One-tap shortcut to get the task done (form link, reply email, shop search…) */
  link?: TaskLink;
}

export interface DocketItem {
  id: string;
  category: Category;
  title: string;
  source: string;
  channel: Channel;
  /** e.g. "Year 4", "U9s", "Class 2B" */
  audience: string | null;
  /** ISO date (YYYY-MM-DD) of the event itself */
  eventDate: string | null;
  /** 24h "HH:MM" */
  eventTime: string | null;
  /** 24h "HH:MM" when the message gives a finish time, e.g. 11am–2pm. */
  eventEndTime?: string | null;
  location: string | null;
  /** ISO date by which the action items must be done */
  deadline: string | null;
  tasks: Task[];
  summary: string;
  /** 0–1, how sure the extraction engine is */
  confidence: number;
  archived: boolean;
  createdAt: string;
  /** Stable id from an imported calendar (UID|date), used to skip duplicates on re-import. */
  externalId?: string;
  /** The full original message, kept so the parent can always go back to the source. */
  raw?: string;
}

/** What the extraction engine returns — a DocketItem before it is saved. */
export type Extraction = Omit<DocketItem, "id" | "archived" | "createdAt">;
