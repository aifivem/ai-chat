import { useEffect, useMemo, useRef, useState } from "react";
import { fetchNui } from "fivem-nui-react";
import { useLang } from "../lib/lang";
import { inputSet, store, useAppSelector } from "../store/chat";

const OK = { mockData: { ok: true } };
/** Sent lines for Up / Down, newest last; screen-local. */
const sentHistory: string[] = [];

function close(): void {
  store.dispatch(inputSet(false));
  void fetchNui("close", undefined, OK);
}

/** A key name in a small grey cap (tgiann-chat KeyHint). */
function KeyCap({ children }: { children: string }) {
  return (
    <span className="flex h-[2vh] min-w-[2vh] items-center justify-center rounded-[0.4vh] bg-white/10 px-[0.5vh] text-[1.1vh] leading-none font-medium text-text-3">
      {children}
    </span>
  );
}

/** The input row: channel tag (Tab switches), text, command suggestions under it while typing `/`. */
export function Input() {
  const t = useLang();
  const channels = useAppSelector((s) => s.chat.channels);
  const suggestions = useAppSelector((s) => s.chat.suggestions);
  const maxLength = useAppSelector((s) => s.chat.settings.maxLength);
  const [text, setText] = useState("");
  const [channelIndex, setChannelIndex] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const ref = useRef<HTMLInputElement>(null);
  const channel = channels[channelIndex % Math.max(1, channels.length)];

  useEffect(() => ref.current?.focus(), []);

  const matches = useMemo(() => {
    if (!text.startsWith("/")) return [];
    const word = text.split(" ")[0]?.toLowerCase() ?? "";
    return Object.values(suggestions)
      .filter((s) =>
        text.includes(" ")
          ? s.name.toLowerCase() === word
          : s.name.toLowerCase().startsWith(word),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [text, suggestions]);

  const submit = () => {
    const value = text.trim();
    if (value) sentHistory.push(value);
    if (sentHistory.length > 50) sentHistory.shift();
    store.dispatch(inputSet(false));
    void fetchNui("send", { channel: channel?.id, text: value }, OK);
  };

  return (
    <div className="relative flex flex-col gap-[0.8vh]">
      <div className="flex h-[4.4vh] items-center gap-[1vh] rounded-[1vh] border border-white/10 bg-tgi-dark px-[1.2vh] transition-colors duration-150 focus-within:border-tgi-green-40">
        {channel && (
          <span
            className="flex shrink-0 items-center gap-[0.6vh] text-[1.3vh] font-medium text-text-2"
            title={t("UI_CHANNEL_HINT")}
          >
            <span
              className="size-[0.8vh] rounded-full"
              style={{ backgroundColor: channel.color }}
            />
            {channel.label}
            {channels.length > 1 && <KeyCap>Tab</KeyCap>}
          </span>
        )}
        {channel && <span className="h-[2vh] w-px shrink-0 bg-white/10" />}
        <input
          ref={ref}
          value={text}
          maxLength={maxLength}
          placeholder={t("UI_PLACEHOLDER")}
          aria-label={t("UI_PLACEHOLDER")}
          className="h-full min-w-0 flex-1 bg-transparent text-[1.4vh] text-text outline-none placeholder:text-text-4"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") return submit();
            if (e.key === "Escape") return close();
            if (e.key === "Tab") {
              e.preventDefault();
              const first = matches[0];
              if (first && !text.includes(" ")) setText(`${first.name} `);
              else if (channels.length > 1)
                setChannelIndex((i) => (i + 1) % channels.length);
              return;
            }
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const next =
                e.key === "ArrowUp"
                  ? Math.min(sentHistory.length - 1, historyIndex + 1)
                  : Math.max(-1, historyIndex - 1);
              setHistoryIndex(next);
              setText(
                next === -1
                  ? ""
                  : (sentHistory[sentHistory.length - 1 - next] ?? ""),
              );
            }
          }}
        />
      </div>
      {matches.length > 0 && (
        <ul
          aria-label={t("UI_SUGGESTIONS")}
          className="flex flex-col gap-[0.2vh] rounded-[1vh] bg-tgi-dark p-[0.4vh] [box-shadow:0_0_0_0.1vh_rgba(255,255,255,0.08),0_0.8vh_2.4vh_rgba(0,0,0,0.5)]"
        >
          {matches.map((s, i) => (
            <li
              key={s.name}
              className={`flex h-[3.2vh] items-center gap-[0.8vh] rounded-[0.6vh] px-[0.8vh] ${i === 0 ? "bg-tgi-green-15" : ""}`}
            >
              <span
                className={`shrink-0 text-[1.4vh] font-medium whitespace-nowrap ${i === 0 ? "text-text" : "text-white/85"}`}
              >
                {s.name}
              </span>
              {s.params?.map((p) => (
                <span
                  key={p.name}
                  className="shrink-0 text-[1.2vh] whitespace-nowrap text-tgi-green"
                >
                  [{p.name}]
                </span>
              ))}
              {s.help && (
                <span className="min-w-0 truncate text-[1.2vh] leading-[1.3] text-text-3">
                  {s.help}
                </span>
              )}
              {i === 0 && !text.includes(" ") && (
                <span className="ml-auto">
                  <KeyCap>Tab</KeyCap>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
