import type { Suggestion } from "../../../resource/common/chat";
import { useLang } from "../lib/lang";

/** A key name in a small grey cap (tgiann-chat KeyHint). */
export function KeyCap({ children }: { children: string }) {
  return (
    <span className="flex h-[2vh] min-w-[2vh] items-center justify-center rounded-[0.4vh] bg-white/10 px-[0.5vh] text-[1.1vh] leading-none font-medium text-text-3">
      {children}
    </span>
  );
}

/** Commands matching the typed word; the picked row (arrows, pointer) is what Tab completes. */
export function SuggestionList({
  matches,
  picked,
  completing,
  onPick,
}: {
  matches: Suggestion[];
  picked: number;
  /** The command word is still being typed: Tab completes the picked row. */
  completing: boolean;
  onPick: (index: number) => void;
}) {
  const t = useLang();
  if (matches.length === 0) return null;
  return (
    <ul
      aria-label={t("UI_SUGGESTIONS")}
      className="flex flex-col gap-[0.2vh] rounded-[1vh] bg-tgi-dark p-[0.4vh] [box-shadow:0_0_0_0.1vh_rgba(255,255,255,0.08),0_0.8vh_2.4vh_rgba(0,0,0,0.5)]"
    >
      {matches.map((s, i) => {
        const on = i === picked;
        return (
          <li
            key={s.name}
            aria-selected={on}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(i);
            }}
            className={`flex h-[3.2vh] cursor-pointer items-center gap-[0.8vh] rounded-[0.6vh] px-[0.8vh] transition-colors duration-150 ${on ? "bg-tgi-green-15" : "hover:bg-white/5"}`}
          >
            <span
              className={`shrink-0 text-[1.4vh] font-medium whitespace-nowrap ${on ? "text-text" : "text-white/85"}`}
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
            {on && completing && (
              <span className="ml-auto">
                <KeyCap>Tab</KeyCap>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
