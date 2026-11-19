import { Users } from "lucide-react";

const NAME_COLOURS = ["text-rose-600", "text-sky-700", "text-amber-700", "text-violet-700", "text-teal-700"];

/** Renders a chat transcript as a phone screenshot, for the "use a sample" path. */
export function ChatMock({ transcript }: { transcript: string }) {
  const lines = transcript.split("\n");
  const title = lines.find((l) => /^chat:/i.test(l))?.replace(/^chat:\s*/i, "") ?? "Group chat";
  const messages = lines
    .filter((l) => !/^chat:/i.test(l))
    .map((l) => l.match(/^([^:]{1,40}):\s(.*)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({ who: m[1], text: m[2] }));
  const people = [...new Set(messages.map((m) => m.who))];

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-stone-900/10">
      <div className="flex items-center gap-2.5 bg-[#22302B] px-3.5 py-2.5 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium">{title}</p>
          <p className="text-[11px] text-white/55">{people.length + 11} participants</p>
        </div>
      </div>
      <div className="space-y-1.5 bg-[#ECE7DF] p-3">
        {messages.map((m, i) => {
          const continued = i > 0 && messages[i - 1].who === m.who;
          return (
            <div key={i} className={`max-w-[88%] rounded-xl ${continued ? "" : "rounded-tl-sm"} bg-white px-2.5 py-1.5 shadow-sm`}>
              {!continued && <p className={`text-[11.5px] font-semibold ${NAME_COLOURS[people.indexOf(m.who) % NAME_COLOURS.length]}`}>{m.who}</p>}
              <p className="text-[12.5px] leading-snug text-stone-800">
                {m.text}
                <span className="ml-2 align-bottom text-[10px] text-stone-400">{`08:${String(12 + i * 3).padStart(2, "0")}`}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
