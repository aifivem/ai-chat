import { memo, useEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Channel, ChatMessage } from "../../../resource/common/chat";
import { useAppSelector, type Line } from "../store/chat";

/** GTA colour codes `^0`-`^9`. */
const CODE_COLORS = [
  "#ffffff",
  "#f04a4a",
  "#36ff9f",
  "#f5b742",
  "#4a8cff",
  "#5bc8ff",
  "#b46cff",
  "#ffffff",
  "#a83232",
  "#9aa5a8",
];

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

const cssColor = (c: ChatMessage["color"]): string | undefined =>
  Array.isArray(c) ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : c;

/** A filled tag (tgiann-chat `.tag`): the colour as background, dark text. */
function Tag({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="mr-[0.4vh] inline rounded-[0.3vh] px-[0.6vh] py-[0.1vh] text-[1.2vh] font-bold text-tgi-green-text [text-shadow:none]"
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  );
}

const MessageLine = memo(function MessageLine({
  message,
  channel,
}: {
  message: ChatMessage;
  channel: Channel | undefined;
}) {
  const [author, ...rest] =
    message.args.length > 1 ? message.args : ["", ...message.args];
  const color = cssColor(message.color) ?? channel?.color;
  return (
    <p
      className={`py-[0.4vh] text-[1.4vh] leading-[1.4] break-words text-text [text-shadow:0_0.1vh_0_rgb(0,0,0)] ${message.multiline ? "whitespace-pre-wrap" : ""}`}
    >
      {channel && <Tag color={channel.color}>{channel.label}</Tag>}
      {author && (
        <Tag color={color ?? "var(--green)"}>
          <Colored text={author} />
        </Tag>
      )}
      <Colored text={rest.join(" ")} base={color} />
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
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <
      (window.innerHeight / 100) * 8;
    if (nearBottom)
      virtualizer.scrollToIndex(lines.length - 1, { align: "end" });
  }, [lines.length, virtualizer]);

  return (
    <div
      ref={ref}
      className="h-[30vh] overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:w-[0.3vh] [&::-webkit-scrollbar-thumb]:bg-tgi-green"
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          const line: Line | undefined = lines[row.index];
          return line ? (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${Math.round(row.start)}px)` }}
            >
              <MessageLine
                message={line.message}
                channel={channels.find((c) => c.id === line.message.channel)}
              />
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
