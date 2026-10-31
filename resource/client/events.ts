import {
  fromServer,
  onServerEvent,
  provideExport,
  registerExport,
} from "@aicore-fivem/lib/client";
import { readAccess } from "@aicore-fivem/lib/shared";
import {
  EVENTS,
  toChatMessage,
  toSuggestion,
  type Suggestion,
} from "common/chat";
import { chat } from "./chat";

// The FiveM chat resource's events, from the server and from other client scripts alike. Once an event name is
// net-safe every `on` handler of it also receives the server's calls, so the local one skips those (no doubles).
const both = (name: string, handler: (...args: unknown[]) => void) => {
  onServerEvent(name, { args: (raw) => raw }, handler);
  on(name, (...args: unknown[]) => {
    if (!fromServer()) handler(...args);
  });
};
both("chat:addMessage", (message) => chat.addMessage(toChatMessage(message)));
both("chatMessage", (author, color, text) =>
  chat.addMessage(
    toChatMessage({
      args: author
        ? [String(author), String(text ?? "")]
        : [String(text ?? "")],
      color,
    }),
  ),
);
both("__cfx_internal:serverPrint", (text) =>
  chat.addMessage(
    toChatMessage({ args: [String(text ?? "")], multiline: true }),
  ),
);
both("chat:addSuggestion", (name, help, params) => {
  const suggestion = toSuggestion({ name, help, params });
  if (suggestion) chat.suggest([suggestion]);
});
both("chat:addSuggestions", (list) =>
  chat.suggest(
    Array.isArray(list)
      ? list.map(toSuggestion).filter((s): s is Suggestion => s !== null)
      : [],
  ),
);
both(
  "chat:removeSuggestion",
  (name) =>
    typeof name === "string" &&
    chat.suggest([], [name.startsWith("/") ? name : `/${name}`]),
);
both("chat:clear", () => chat.send({ action: "clear", data: null }));
both("chat:addMode", (mode) => {
  if (
    typeof mode !== "object" ||
    mode === null ||
    !("name" in mode) ||
    typeof mode.name !== "string"
  )
    return;
  const label =
    "displayName" in mode && typeof mode.displayName === "string"
      ? mode.displayName
      : mode.name;
  const color =
    "color" in mode && typeof mode.color === "string" ? mode.color : "#ffffff";
  chat.addMode({
    id: mode.name,
    label,
    color,
    range: 0,
    access: readAccess({}),
    order: 100,
  });
});
both("chat:removeMode", (mode) => {
  const name =
    typeof mode === "string"
      ? mode
      : typeof mode === "object" && mode !== null && "name" in mode
        ? mode.name
        : null;
  if (typeof name === "string") chat.removeMode(name);
});
// HTML templates are never drawn (scripts' markup could inject anything); messages using one show their args.
both("chat:addTemplate", () => undefined);

onServerEvent(
  EVENTS.suggestions,
  {
    args: ([add, remove]) =>
      Array.isArray(add) && Array.isArray(remove)
        ? [
            add.map(toSuggestion).filter((s): s is Suggestion => s !== null),
            remove.filter((n): n is string => typeof n === "string"),
          ]
        : null,
  },
  (add, remove) => chat.suggest(add, remove),
);

const api: Record<string, (...args: unknown[]) => unknown> = {
  addMessage: (message) => chat.addMessage(toChatMessage(message)),
  addSuggestion: (name, help, params) => {
    const suggestion = toSuggestion({ name, help, params });
    if (suggestion) chat.suggest([suggestion]);
  },
};
for (const [name, fn] of Object.entries(api)) {
  registerExport(name, fn);
  provideExport("chat", name, fn);
}
