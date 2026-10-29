import { memo, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Channel, ChatMessage } from "../../../resource/common/chat";
import { useAppSelector, type Line } from "../store/chat";

/** GTA colour codes `^0`-`^9`. */
const CODE_COLORS = ["#ffffff", "#f04a4a", "#36ff9f", "#f5b742", "#4a8cff", "#5bc8ff", "#b46cff", "#ffffff", "#a83232", "#9aa5a8"];

/** Text with `^n` colour codes as spans; never HTML. */
function Colored({ text, base }: { text: string; base?: string }) {
  const parts = text.split(/(\^\d)/);
  let color = base;
  const out: Array<{ text: string; color: string | undefined }> = [];
  for (const part of parts) {
    if (/^\^\d$/.test(part)) color = CODE_COLORS[Number(part[1])];
    else if (part) out.push({ text: part, color });
  }
  return (
    <>
      {out.map((p, i) => (
        <span key={i} style={p.color ? { color: p.color } : undefined}>
          {p.text}
        </span>
      ))}
    </>
  );
}

const cssColor = (c: ChatMessage["color"]): string | undefined => (Array.isArray(c) ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : c);

const MessageLine = memo(function MessageLine({ message, channel }: { message: ChatMessage; channel: Channel | undefined }) {
  const [author, ...rest] = message.args.length > 1 ? message.args : ["", ...message.args];
  return (
    <p className={`px-[1.2vh] py-[0.35vh] text-[1.4vh] leading-[1.45] text-text-2 [text-shadow:0_0.1vh_0.3vh_rgba(0,0,0,0.6)] ${message.multiline ? "whitespace-pre-wrap" : ""}`}>
      {channel && (
        <span className="mr-[0.6vh] rounded-[0.4vh] border px-[0.5vh] text-[1.1vh] font-semibold uppercase tracking-[0.08em]" style={{ color: channel.color, borderColor: channel.color }}>
          {channel.label}
        </span>
      )}
      {author && (
        <span className="mr-[0.6vh] font-semibold" style={{ color: cssColor(message.color) ?? "var(--text)" }}>
          <Colored text={author} />:
        </span>
      )}
      <Colored text={rest.join(" ")} />
    </p>
  );
});

/** The message list, kept scrolled to the newest line unless the player scrolled up (virtualized: up to 500 lines). */
export function Messages() {
  "use no memo";
  const lines = useAppSelector((s) => s.chat.lines);
  const channels = useAppSelector((s) => s.chat.channels);
  const ref = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => ref.current,
    estimateSize: () => (window.innerHeight / 100) * 2.6,
    overscan: 6,
    getItemKey: (i) => lines[i]?.id ?? i,
    useAnimationFrameWithResizeObserver: true,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || lines.length === 0) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < (window.innerHeight / 100) * 8;
    if (nearBottom) virtualizer.scrollToIndex(lines.length - 1, { align: "end" });
  }, [lines.length, virtualizer]);

  return (
    <div ref={ref} className="h-[30vh] overflow-y-auto">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => {
          const line: Line | undefined = lines[row.index];
          return line ? (
            <div key={row.key} data-index={row.index} ref={virtualizer.measureElement} className="absolute left-0 top-0 w-full" style={{ transform: `translateY(${Math.round(row.start)}px)` }}>
              <MessageLine message={line.message} channel={channels.find((c) => c.id === line.message.channel)} />
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
