"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, CalendarDays, Check, ChevronDown, Clock, ExternalLink, Gift, Mail, MapPin, Trash2 } from "lucide-react";
import type { DocketItem, Task, TaskLink } from "@/lib/types";
import { formatShort, formatTime, relativeDay, urgencyOf } from "@/lib/dates";
import { giftSearchUrl } from "@/lib/parser";
import { cn } from "@/lib/utils";
import { CategoryTag, ChannelIcon, URGENCY_STRIPE, UrgencyBadge } from "../ui";
import { RescueButton } from "./ChildcareGaps";

interface Props {
  item: DocketItem;
  now: Date;
  onToggle?: (taskId: string) => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  /** Read-only rendering used on the extraction review screen. */
  preview?: boolean;
  /** This item is a school closure on a day nobody can cover, so offer emergency childcare. */
  inChildcareGap?: boolean;
}

export function ActionCard({ item, now, onToggle, onArchive, onRestore, onDelete, preview = false, inChildcareGap = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const total = item.tasks.length;
  const done = item.tasks.filter((t) => t.done).length;
  const complete = total > 0 && done === total;
  const urgency = complete || item.archived ? null : urgencyOf(item.deadline, now);
  const rel = item.eventDate ? relativeDay(item.eventDate, now) : null;
  const short = item.eventDate ? formatShort(item.eventDate) : null;

  return (
    <article
      className={cn(
        "relative animate-fade-up overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-900/[0.04]",
        item.archived && "opacity-75",
      )}
    >
      {urgency && <span className={cn("absolute inset-y-0 left-0 w-[3px]", URGENCY_STRIPE[urgency.level])} />}

      <div className="p-4 pl-[18px]">
        <div className="flex items-center gap-1.5">
          <CategoryTag category={item.category} />
          {item.audience && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">{item.audience}</span>
          )}
          <div className="ml-auto">
            {complete ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">
                <Check className="h-3 w-3" strokeWidth={3} /> All done
              </span>
            ) : (
              urgency && <UrgencyBadge urgency={urgency} />
            )}
          </div>
        </div>

        <h3 className="mt-2.5 text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">{item.title}</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-stone-500">
          <ChannelIcon channel={item.channel} />
          <span className="truncate">{item.source}</span>
        </p>

        {(item.eventDate || item.eventTime || item.location) && (
          <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-stone-600">
            {item.eventDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-stone-400" />
                {rel}
                {rel !== short && <span className="text-stone-400">· {short}</span>}
              </span>
            )}
            {item.eventTime && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-stone-400" />
                {formatTime(item.eventTime)}
              </span>
            )}
            {item.location && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                <span className="truncate">{item.location}</span>
              </span>
            )}
          </div>
        )}

        {preview && item.summary && <p className="mt-3 text-[13px] leading-relaxed text-stone-500">{item.summary}</p>}

        {inChildcareGap && !item.archived && (
          <div className="mt-3">
            <p className="mb-1.5 text-[12px] font-medium text-rose-700">No school and nobody free that day.</p>
            <RescueButton />
          </div>
        )}

        {total > 0 && (
          <>
            <div className="mt-4 flex items-center gap-2.5">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-accent-500 transition-all duration-500" style={{ width: `${(done / total) * 100}%` }} />
              </div>
              <span className="text-[11px] tabular-nums text-stone-400">
                {done}/{total}
              </span>
            </div>
            <ul className="-mx-1.5 mt-2">
              {item.tasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-start gap-x-1.5">
                  <button
                    type="button"
                    disabled={preview || !onToggle}
                    onClick={() => onToggle?.(task.id)}
                    aria-pressed={task.done}
                    className="group flex min-w-0 flex-1 items-start gap-3 rounded-lg px-1.5 py-[7px] text-left transition enabled:hover:bg-stone-50 enabled:active:bg-stone-100"
                  >
                    <span
                      className={cn(
                        "mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-all duration-200",
                        task.done ? "scale-100 border-accent-600 bg-accent-600 text-white" : "border-stone-300 bg-white group-enabled:group-hover:border-stone-400",
                      )}
                    >
                      {task.done && <Check className="h-3 w-3" strokeWidth={3.2} />}
                    </span>
                    <span
                      className={cn(
                        "text-[14px] leading-snug transition-colors",
                        task.done ? "text-stone-400 line-through decoration-stone-300" : "text-stone-800",
                      )}
                    >
                      {task.text}
                      {task.due && !task.done && <span className="mt-0.5 block text-[12px] text-stone-400">Due {formatShort(task.due)}</span>}
                    </span>
                  </button>
                  {isGiftTask(task) ? (
                    !task.done && <GiftShops task={task} title={item.title} />
                  ) : (
                    task.link && !task.done && <LinkChip link={task.link} />
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {!preview && (
          <>
            {expanded && (item.raw || item.summary) && (
              <div className="mt-3 max-h-72 overflow-auto rounded-xl bg-stone-50 p-3 text-[12.5px] leading-relaxed text-stone-600">
                {item.raw ? <Linkified text={item.raw} /> : item.summary}
              </div>
            )}
            <div className="mt-3 flex items-center border-t border-stone-100 pt-2.5">
              {(item.raw || item.summary) && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium text-stone-500 hover:text-stone-700"
                >
                  {expanded ? "Hide original" : item.raw ? (item.channel === "whatsapp" ? "Original chat" : item.channel === "calendar" ? "Event notes" : "Original email") : "Note"}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                </button>
              )}
              <div className="ml-auto flex items-center gap-1">
                {item.archived ? (
                  <>
                    <IconAction label="Restore" icon={ArchiveRestore} onClick={onRestore} />
                    <IconAction label="Delete" icon={Trash2} onClick={onDelete} danger />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onArchive}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition",
                      complete ? "bg-accent-600 text-white hover:bg-accent-700" : "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
                    )}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {complete ? "Done — archive" : "Archive"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function IconAction({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: typeof Archive;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition",
        danger ? "text-rose-600 hover:bg-rose-50" : "text-stone-600 hover:bg-stone-100",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function LinkChip({ link }: { link: TaskLink }) {
  const isMail = link.url.startsWith("mailto:");
  const Icon = isMail ? Mail : /amazon\./.test(link.url) ? Gift : ExternalLink;
  return (
    <a
      href={link.url}
      target={isMail ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="mt-[5px] inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-[11.5px] font-medium text-accent-700 ring-1 ring-accent-100 transition hover:bg-accent-100"
    >
      <Icon className="h-3 w-3" />
      {link.label}
    </a>
  );
}

const isGiftTask = (task: Task) => /\b(buy|get|wrap)\b.*\b(present|gift)\b/i.test(task.text);

/** Where a parent can buy the present. */
function GiftShops({ task, title }: { task: Task; title: string }) {
  const amazonUrl = task.link && /amazon\./.test(task.link.url) ? task.link.url : giftSearchUrl(title, task.text);
  return (
    <div className="mb-1.5 flex w-full pl-9 flex-wrap items-center gap-1.5">
      <span className="text-[11.5px] text-stone-400">Shop for a present:</span>
      <a
        href={amazonUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-[11.5px] font-medium text-accent-700 ring-1 ring-accent-100 transition hover:bg-accent-100"
      >
        <Gift className="h-3 w-3" />
        Amazon
      </a>
    </div>
  );
}

const URL_SPLIT =/(https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?])/g;

/** The original message, with any links made clickable. */
function Linkified({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words">
      {text.split(URL_SPLIT).map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent-700 underline decoration-accent-200 underline-offset-2">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}
