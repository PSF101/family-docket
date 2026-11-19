import { CalendarDays, GraduationCap, Globe, Mail, Megaphone, MessageCircle, PartyPopper, Trophy, type LucideIcon } from "lucide-react";
import type { Category, Channel } from "@/lib/types";
import type { Urgency, UrgencyLevel } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const CATEGORY_STYLE: Record<Category, { icon: LucideIcon; className: string }> = {
  "School Admin": { icon: GraduationCap, className: "bg-[#EEF0FA] text-[#4A55A2]" },
  "Sports Club": { icon: Trophy, className: "bg-[#E7F2EC] text-[#2F7356]" },
  "Birthday Party": { icon: PartyPopper, className: "bg-[#FBEEF2] text-[#B0466C]" },
  "General Notice": { icon: Megaphone, className: "bg-stone-100 text-stone-600" },
};

export function CategoryTag({ category, className }: { category: Category; className?: string }) {
  const { icon: Icon, className: tone } = CATEGORY_STYLE[category];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", tone, className)}>
      <Icon className="h-3 w-3" strokeWidth={2.2} />
      {category}
    </span>
  );
}

const URGENCY_BADGE: Record<UrgencyLevel, string> = {
  overdue: "bg-rose-50 text-rose-700 ring-rose-200",
  today: "bg-rose-50 text-rose-600 ring-rose-100",
  soon: "bg-amber-50 text-amber-700 ring-amber-200/70",
  later: "bg-stone-100 text-stone-500 ring-transparent",
};

export const URGENCY_STRIPE: Record<UrgencyLevel, string> = {
  overdue: "bg-rose-500",
  today: "bg-rose-400",
  soon: "bg-amber-400",
  later: "bg-transparent",
};

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", URGENCY_BADGE[urgency.level])}>
      {(urgency.level === "overdue" || urgency.level === "today") && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {urgency.label}
    </span>
  );
}

export function ChannelIcon({ channel, className }: { channel: Channel; className?: string }) {
  const Icon = channel === "email" ? Mail : channel === "whatsapp" ? MessageCircle : channel === "calendar" ? CalendarDays : Globe;
  return <Icon className={cn("h-3.5 w-3.5 shrink-0 text-stone-400", className)} aria-label={channel} />;
}

export function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
      {children}
      {count !== undefined && <span className="rounded-full bg-stone-200/70 px-1.5 py-px text-[10px] tracking-normal text-stone-500">{count}</span>}
    </h2>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid rounded-xl bg-stone-200/60 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium transition",
            value === v ? "bg-white text-ink shadow-sm" : "text-stone-500 hover:text-stone-700",
          )}
        >
          {Icon && <Icon className="h-4 w-4" />}
          {label}
        </button>
      ))}
    </div>
  );
}
