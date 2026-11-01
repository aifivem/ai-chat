import { addCommand, aiLog, playersNear } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { EVENTS } from "common/chat";
import { deliver } from "./router";

/** QB's /ooc and /me reach the players within this many metres. */
const RANGE = 20;
const message = {
  name: "message",
  type: "longString",
  help: Locale("COMMAND_P_MESSAGE"),
} as const;
// playersNear includes the speaker (when their ped is placed); the Set keeps them in without a second copy.
const near = (source: number) => [
  ...new Set([source, ...playersNear(source, RANGE)]),
];
// oxlint-disable-next-line no-control-regex
const clean = (text: string) =>
  text.replace(/[\u0000-\u001f\u007f]/g, "").trim();

addCommand(
  "ooc",
  { help: Locale("COMMAND_OOC"), params: [message] },
  (source, args) => {
    const text = clean(args.message).slice(0, 300);
    if (source <= 0 || !text) return;
    deliver(near(source), {
      args: [Locale("MSG_OOC", GetPlayerName(String(source))), text],
      color: "#a0a0a0",
      multiline: true,
    });
    aiLog("messages", `[ooc] ${text}`, {
      source,
      metadata: { channel: "ooc" },
    });
  },
);

// The text floats over the player's head for the players around (client `me.ts`).
addCommand(
  "me",
  { help: Locale("COMMAND_ME"), params: [message] },
  (source, args) => {
    const text = clean(args.message).slice(0, 120);
    if (source <= 0 || !text) return;
    for (const target of near(source)) emitNet(EVENTS.me, target, source, text);
    aiLog("messages", `[me] ${text}`, { source, metadata: { channel: "me" } });
  },
);
