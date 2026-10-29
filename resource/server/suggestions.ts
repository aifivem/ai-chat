import { onClientEvent } from "@aicore-fivem/lib/server";
import { EVENTS, type Suggestion } from "common/chat";

/**
 * Command suggestions per player: the server commands the player's ACE allows, sent as a delta (what is new, what is
 * gone) when the screen loads and again after resources start or stop (debounced).
 */
class Suggestions {
  private readonly sent = new Map<number, Set<string>>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  refresh(player: number): void {
    const allowed = new Set<string>();
    for (const command of GetRegisteredCommands() as Array<{ name: string }>) {
      if (command.name.startsWith("+") || command.name.startsWith("-")) continue;
      if (IsPlayerAceAllowed(String(player), `command.${command.name}`)) allowed.add(command.name);
    }
    const before = this.sent.get(player) ?? new Set<string>();
    const add: Suggestion[] = [...allowed].filter((n) => !before.has(n)).map((n) => ({ name: `/${n}`, help: "" }));
    const remove = [...before].filter((n) => !allowed.has(n)).map((n) => `/${n}`);
    this.sent.set(player, allowed);
    if (add.length || remove.length) emitNet(EVENTS.suggestions, player, add, remove);
  }

  refreshAll(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      for (const player of this.sent.keys()) this.refresh(player);
    }, 1000);
  }

  forget(player: number): void {
    this.sent.delete(player);
  }
}

export const suggestions = new Suggestions();

onClientEvent(EVENTS.ready, (source) => suggestions.refresh(source), { rate: { count: 2, windowMs: 10_000 } });
on("onServerResourceStart", () => suggestions.refreshAll());
on("onResourceStop", () => suggestions.refreshAll());
on("playerDropped", () => suggestions.forget(Number(globalThis.source)));
