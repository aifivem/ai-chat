import { useEffect, useState } from "react";
import { fetchNui, isEnvBrowser, useNuiEvent } from "fivem-nui-react";
import type { NuiMessage } from "../../resource/common/chat";
import {
  MOCK_INPUT,
  MOCK_MESSAGES,
  MOCK_SETUP,
  MOCK_SUGGESTIONS,
} from "./dev/mock";
import { Input } from "./features/Input";
import { Messages } from "./features/Messages";
import { setTexts } from "./lib/lang";
import {
  cleared,
  inputSet,
  messageAdded,
  setup,
  store,
  suggestionsChanged,
  useAppSelector,
} from "./store/chat";

type Data<A extends NuiMessage["action"]> = Extract<
  NuiMessage,
  { action: A }
>["data"];

// The client is this resource's own code: its messages are trusted in shape (types from common/chat).
const onSetup = (data: Data<"setup">) => {
  setTexts(data.texts);
  store.dispatch(setup(data));
};
const onMessage = (data: Data<"message">) => store.dispatch(messageAdded(data));
const onSuggestions = (data: Data<"suggestions">) =>
  store.dispatch(suggestionsChanged(data));
const onClear = () => store.dispatch(cleared());
const onOpenInput = () => store.dispatch(inputSet(true));
const onCloseInput = () => store.dispatch(inputSet(false));

const SETUP_MOCK = { mockData: MOCK_SETUP };
const SUGGESTIONS_MOCK = { mockData: MOCK_SUGGESTIONS, mockDelay: 50 };

/** The chat: visible while typing and for a few seconds after a new message; otherwise nothing is drawn. */
export function App() {
  const inputOpen = useAppSelector((s) => s.chat.inputOpen);
  const lastAt = useAppSelector((s) => s.chat.lastAt);
  const fade = useAppSelector((s) => s.chat.settings.fadeSeconds);
  const [, tick] = useState(0);

  useNuiEvent("setup", onSetup, SETUP_MOCK);
  useNuiEvent("message", onMessage);
  useNuiEvent("suggestions", onSuggestions, SUGGESTIONS_MOCK);
  useNuiEvent("clear", onClear);
  useNuiEvent("openInput", onOpenInput);
  useNuiEvent("closeInput", onCloseInput);

  useEffect(() => {
    void fetchNui("ready", undefined, { mockData: { ok: true } });
    if (!isEnvBrowser()) return;
    for (const m of MOCK_MESSAGES) store.dispatch(messageAdded(m));
    if (MOCK_INPUT) store.dispatch(inputSet(true));
  }, []);

  // One re-render when the fade time passes (no interval while hidden).
  useEffect(() => {
    if (inputOpen) return;
    const left = lastAt + fade * 1000 - Date.now();
    if (left <= 0) return;
    const timer = setTimeout(() => tick((n) => n + 1), left);
    return () => clearTimeout(timer);
  }, [inputOpen, lastAt, fade]);

  const visible = inputOpen || Date.now() - lastAt < fade * 1000;
  return (
    <div
      className={`fixed top-[4vh] left-[2.4vh] flex w-[56vh] flex-col gap-[0.8vh] transition-opacity duration-300 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {/* Soft dark patch behind the lines (tgiann-chat ChatBg): keeps white text readable over a bright game. */}
      <div className="pointer-events-none absolute -inset-[4vh] bottom-auto h-[44vh] [background:radial-gradient(ellipse_75%_65%_at_25%_40%,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0)_100%)]" />
      <div className="relative">
        <Messages />
      </div>
      {inputOpen && <Input />}
    </div>
  );
}
