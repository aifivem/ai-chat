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

/** The input row: channel tag (Tab switches), text, command suggestions above it while typing `/`. */
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
      .filter((s) => (text.includes(" ") ? s.name.toLowerCase() === word : s.name.toLowerCase().startsWith(word)))
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
    <div className="flex flex-col gap-[0.6vh]">
      {matches.length > 0 && (
        <ul aria-label={t("UI_SUGGESTIONS")} className="flex flex-col rounded-[0.8vh] border border-line bg-panel py-[0.4vh]">
          {matches.map((s) => (
            <li key={s.name} className="px-[1.2vh] py-[0.4vh] text-[1.3vh]">
              <span className="font-semibold text-text">{s.name}</span>
              {s.params?.map((p) => (
                <span key={p.name} className="ml-[0.6vh] text-text-3">
                  [{p.name}]
                </span>
              ))}
              {s.help && <span className="ml-[1vh] text-text-3">{s.help}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="flex h-[4.2vh] items-center gap-[1vh] rounded-[0.8vh] border border-line bg-panel px-[1vh] focus-within:border-accent">
        {channel && (
          <span className="shrink-0 rounded-[0.4vh] border px-[0.6vh] text-[1.15vh] font-semibold uppercase tracking-[0.08em]" style={{ color: channel.color, borderColor: channel.color }} title={t("UI_CHANNEL_HINT")}>
            {channel.label}
          </span>
        )}
        <input
          ref={ref}
          value={text}
          maxLength={maxLength}
          placeholder={t("UI_PLACEHOLDER")}
          aria-label={t("UI_PLACEHOLDER")}
          className="h-full min-w-0 flex-1 bg-transparent text-[1.4vh] text-text outline-none placeholder:text-text-3"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") return submit();
            if (e.key === "Escape") return close();
            if (e.key === "Tab") {
              e.preventDefault();
              const first = matches[0];
              if (first && !text.includes(" ")) setText(`${first.name} `);
              else if (channels.length > 1) setChannelIndex((i) => (i + 1) % channels.length);
              return;
            }
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const next = e.key === "ArrowUp" ? Math.min(sentHistory.length - 1, historyIndex + 1) : Math.max(-1, historyIndex - 1);
              setHistoryIndex(next);
              setText(next === -1 ? "" : (sentHistory[sentHistory.length - 1 - next] ?? ""));
            }
          }}
        />
      </div>
    </div>
  );
}
