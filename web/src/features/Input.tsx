import { useEffect, useMemo, useRef, useState } from "react";
import { fetchNui } from "fivem-nui-react";
import { useLang } from "../lib/lang";
import { inputSet, store, useAppSelector } from "../store/chat";
import { KeyCap, SuggestionList } from "./Suggestions";

const OK = { mockData: { ok: true } };
/** Sent lines for Up / Down, newest last; screen-local. */
const sentHistory: string[] = [];
/** The Tab cycle's command entry (panel setting "Commands without /"). */
const COMMAND = { id: "__command", label: "", color: "#ffffff" };

function close(): void {
  store.dispatch(inputSet(false));
  void fetchNui("close", undefined, OK);
}

/**
 * The input row: mode tag (Tab cycles Command, when on, and the channels), text, command suggestions under it.
 * Up / Down pick a suggestion while the list shows, else walk the sent lines; Tab completes the picked command.
 */
export function Input() {
  const t = useLang();
  const channels = useAppSelector((s) => s.chat.channels);
  const suggestions = useAppSelector((s) => s.chat.suggestions);
  const { maxLength, noSlash } = useAppSelector((s) => s.chat.settings);
  const [text, setText] = useState("");
  const [modeIndex, setModeIndex] = useState(0);
  const [picked, setPicked] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const ref = useRef<HTMLInputElement>(null);
  const modes = noSlash ? [COMMAND, ...channels] : channels;
  const mode = modes[modeIndex % Math.max(1, modes.length)];
  const commandMode = mode?.id === COMMAND.id;
  /** The line as a command (`/name args`), or null when it is a message. */
  const command = commandMode
    ? `/${text.replace(/^\//, "")}`
    : text.startsWith("/")
      ? text
      : null;

  useEffect(() => ref.current?.focus(), []);

  const matches = useMemo(() => {
    if (command === null || (commandMode && text === "")) return [];
    const word = command.split(" ")[0]?.toLowerCase() ?? "";
    return Object.values(suggestions)
      .filter((s) =>
        command.includes(" ")
          ? s.name.toLowerCase() === word
          : s.name.toLowerCase().startsWith(word),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [command, commandMode, text, suggestions]);
  useEffect(() => setPicked(0), [matches.length, command?.split(" ")[0]]);
  const completing =
    matches.length > 0 && command !== null && !command.includes(" ");

  const submit = () => {
    const value = text.trim();
    const line = commandMode && value ? `/${value.replace(/^\//, "")}` : value;
    if (line) sentHistory.push(line);
    if (sentHistory.length > 50) sentHistory.shift();
    store.dispatch(inputSet(false));
    void fetchNui(
      "send",
      { channel: commandMode ? undefined : mode?.id, text: line },
      OK,
    );
  };

  const complete = () => {
    const name = matches[picked]?.name;
    if (name) setText(`${commandMode ? name.slice(1) : name} `);
  };

  const recall = (up: boolean) => {
    const next = up
      ? Math.min(sentHistory.length - 1, historyIndex + 1)
      : Math.max(-1, historyIndex - 1);
    setHistoryIndex(next);
    const line =
      next === -1 ? "" : (sentHistory[sentHistory.length - 1 - next] ?? "");
    setText(commandMode ? line.replace(/^\//, "") : line);
  };

  return (
    <div className="relative flex flex-col gap-[0.8vh]">
      <div className="flex h-[4.4vh] items-center gap-[1vh] rounded-[1vh] border border-white/10 bg-tgi-dark px-[1.2vh] transition-colors duration-150 focus-within:border-tgi-green-40">
        {mode && (
          <span
            className="flex shrink-0 items-center gap-[0.6vh] text-[1.3vh] font-medium text-text-2"
            title={t("UI_CHANNEL_HINT")}
          >
            {commandMode ? (
              <span className="text-[1.4vh] leading-none font-semibold text-tgi-green">
                /
              </span>
            ) : (
              <span
                className="size-[0.8vh] rounded-full"
                style={{ backgroundColor: mode.color }}
              />
            )}
            {commandMode ? t("UI_COMMAND") : mode.label}
            {modes.length > 1 && <KeyCap>Tab</KeyCap>}
          </span>
        )}
        {mode && <span className="h-[2vh] w-px shrink-0 bg-white/10" />}
        <input
          ref={ref}
          value={text}
          maxLength={maxLength}
          placeholder={t(
            commandMode ? "UI_PLACEHOLDER_COMMAND" : "UI_PLACEHOLDER",
          )}
          aria-label={t("UI_PLACEHOLDER")}
          className="h-full min-w-0 flex-1 bg-transparent text-[1.4vh] text-text outline-none placeholder:text-text-4"
          onChange={(e) => {
            setText(e.target.value);
            setHistoryIndex(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") return submit();
            if (e.key === "Escape") return close();
            if (e.key === "Tab") {
              e.preventDefault();
              if (completing) complete();
              else if (modes.length > 1)
                setModeIndex((i) => (i + 1) % modes.length);
              return;
            }
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();
            const up = e.key === "ArrowUp";
            // Sent lines while the input is empty or already showing one; otherwise the suggestion rows.
            if (text === "" || historyIndex !== -1) recall(up);
            else if (matches.length > 1)
              setPicked(
                (i) => (i + (up ? -1 : 1) + matches.length) % matches.length,
              );
          }}
        />
      </div>
      <SuggestionList
        matches={matches}
        picked={picked}
        completing={completing}
        onPick={(i) => {
          setPicked(i);
          const name = matches[i]?.name;
          if (name) setText(`${commandMode ? name.slice(1) : name} `);
          ref.current?.focus();
        }}
      />
    </div>
  );
}
