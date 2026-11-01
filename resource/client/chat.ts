import {
  AdminWorld,
  allows,
  every,
  type Job,
  Keybind,
  loadLocaleTexts,
  onMembershipChange,
} from "@aicore-fivem/lib/client";
import { NUI_LAYER } from "@aicore-fivem/shared";
import { Locale } from "common";
import {
  ChatContent,
  EVENTS,
  type Channel,
  type ChatMessage,
  type NuiMessage,
  type Suggestion,
} from "common/chat";

const content = new ChatContent(new AdminWorld(["settings", "channels"]));

/**
 * The chat screen: messages from every source the FiveM chat resource accepts, command suggestions, channels the
 * character may use, the T key. Messages wait in a queue until the NUI says it is ready.
 */
class Chat {
  private ready = false;
  private queue: NuiMessage[] = [];
  private readonly scriptModes = new Map<string, Channel>();
  private inputOpen = false;
  private focusWatch: Job | null = null;

  send(message: NuiMessage): void {
    if (this.ready) SendNUIMessage(message);
    else if (this.queue.length < 200) this.queue.push(message);
  }

  /** Panel channels the character passes the access rule of (the server checks the same), then script channels. */
  channels(): Channel[] {
    const own = content.channels.filter((c) => allows(c.access));
    return [...own, ...this.scriptModes.values()];
  }

  setup(): void {
    this.ready = true;
    SendNUIMessage({
      action: "setup",
      data: {
        texts: loadLocaleTexts(),
        settings: content.settings,
        channels: this.channels(),
      },
    } satisfies NuiMessage);
    for (const message of this.queue) SendNUIMessage(message);
    this.queue = [];
    emitNet(EVENTS.ready);
  }

  resetup(): void {
    if (this.ready)
      SendNUIMessage({
        action: "setup",
        data: {
          texts: loadLocaleTexts(),
          settings: content.settings,
          channels: this.channels(),
        },
      } satisfies NuiMessage);
  }

  addMessage(message: ChatMessage | null): void {
    if (message) this.send({ action: "message", data: message });
  }

  suggest(add: Suggestion[], remove: string[] = []): void {
    this.send({ action: "suggestions", data: { add, remove } });
  }

  addMode(channel: Channel): void {
    this.scriptModes.set(channel.id, channel);
    this.resetup();
  }

  removeMode(name: string): void {
    if (this.scriptModes.delete(name)) this.resetup();
  }

  openInput(): void {
    if (this.inputOpen || IsPauseMenuActive()) return;
    this.inputOpen = true;
    SetNuiFocus(true, false);
    this.send({ action: "openInput", data: null });
    // Another resource may drop the NUI focus while the input shows: the input closes with it instead of staying
    // on screen without the keyboard.
    this.focusWatch ??= every(250, () => {
      if (IsNuiFocused()) return;
      this.send({ action: "closeInput", data: null });
      this.closeInput();
    });
  }

  closeInput(): void {
    this.inputOpen = false;
    this.focusWatch?.stop();
    this.focusWatch = null;
    SetNuiFocus(false, false);
  }
}

export const chat = new Chat();
content.subscribe(() => chat.resetup());
onMembershipChange(() => chat.resetup());

new Keybind({
  name: "chat_open",
  description: Locale("KEYBIND_OPEN"),
  defaultKey: "T",
  onPressed: () => chat.openInput(),
});

type NuiReply = (r: unknown) => void;
RegisterNuiCallback("ready", (_data: unknown, cb: NuiReply) => {
  chat.setup();
  cb({ ok: true });
});
RegisterNuiCallback("close", (_data: unknown, cb: NuiReply) => {
  chat.closeInput();
  cb({ ok: true });
});
RegisterNuiCallback("send", (data: unknown, cb: NuiReply) => {
  chat.closeInput();
  cb({ ok: true });
  if (
    typeof data !== "object" ||
    data === null ||
    !("text" in data) ||
    typeof data.text !== "string"
  )
    return;
  const text = data.text.trim();
  if (!text) return;
  if (text.startsWith("/")) return ExecuteCommand(text.slice(1));
  const channel =
    "channel" in data && typeof data.channel === "string"
      ? data.channel
      : (chat.channels()[0]?.id ?? "");
  emitNet(EVENTS.send, channel, text);
});

// Stacking among NUI pages (`NUI_LAYER`): set at start, not left to load order.
SetNuiZindex(NUI_LAYER.chat);
