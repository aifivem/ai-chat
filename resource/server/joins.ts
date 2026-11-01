import { Locale } from "common";
import { content } from "./content";
import { deliver } from "./router";

on("playerJoining", () => {
  if (content.settings.showJoins)
    deliver(-1, {
      args: [Locale("MSG_JOINED", GetPlayerName(String(globalThis.source)))],
      color: "#7d8a8e",
    });
});
on("playerDropped", (reason: string) => {
  if (content.settings.showJoins)
    deliver(-1, {
      args: [
        Locale("MSG_LEFT", GetPlayerName(String(globalThis.source)), reason),
      ],
      color: "#7d8a8e",
    });
});
