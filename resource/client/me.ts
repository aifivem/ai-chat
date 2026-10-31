import {
  every,
  onServerEvent,
  player,
  playerPed,
} from "@aicore-fivem/lib/client";
import { readId, readText } from "@aicore-fivem/lib/shared";
import { EVENTS } from "common/chat";

const SHOW_MS = 7000;
const DRAW_METRES = 25;

/** /me texts over players' heads: one per player, drawn while any is showing. */
const shown = new Map<number, { text: string; until: number }>();
const frame = every(0, draw, { active: false, name: "me" });

function draw(): void {
  const now = GetGameTimer();
  for (const [serverId, me] of shown) {
    const ped = playerPed(serverId);
    if (now > me.until || !ped) {
      shown.delete(serverId);
      continue;
    }
    const [x = 0, y = 0, z = 0] = GetEntityCoords(ped, false);
    if (player.distanceTo({ x, y, z }) > DRAW_METRES) continue;
    const [visible, sx, sy] = World3dToScreen2d(x, y, z + 1.05);
    if (!visible) continue;
    SetTextScale(0.35, 0.35);
    SetTextFont(4);
    SetTextCentre(true);
    SetTextOutline();
    SetTextColour(255, 255, 255, 230);
    BeginTextCommandDisplayText("STRING");
    AddTextComponentSubstringPlayerName(me.text);
    EndTextCommandDisplayText(sx, sy);
  }
  if (shown.size === 0) frame.set(false);
}

onServerEvent(
  EVENTS.me,
  {
    args: ([id, text]) => {
      const serverId = readId(id);
      const value = readText(text, 120);
      return serverId !== null && value ? [serverId, value] : null;
    },
  },
  (serverId, text) => {
    shown.set(serverId, { text, until: GetGameTimer() + SHOW_MS });
    frame.set(true);
  },
);
