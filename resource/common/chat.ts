import {
  type AccessRule,
  bool,
  int,
  isRecord,
  readAccess,
  record,
  str,
} from "@aicore-fivem/lib/shared";

/** ai-chat's contracts: events, messages, suggestions, panel content. No natives. */

export const EVENTS = {
  /** Client -> server: (channel, text) a message typed in a channel. */
  send: "ai-chat:send",
  /** Client -> server: () the screen loaded; send the command suggestions. */
  ready: "ai-chat:ready",
  /** Server -> client: (add: Suggestion[], remove: string[]) commands the player may use, as a delta. */
  suggestions: "ai-chat:client:suggestions",
  /** Server -> client: (serverId, text) a /me text over that player's head. */
  me: "ai-chat:client:me",
} as const;

/** The FiveM chat resource's message shape, kept so every script's `chat:addMessage` works. */
export interface ChatMessage {
  /** Author colour as `[r, g, b]` (cfx) or a css colour. */
  color?: [number, number, number] | string;
  /** `[author, text]` or `[text]`; `^0`-`^9` colour codes are drawn, HTML never. */
  args: string[];
  multiline?: boolean;
  /** Channel id when it came from one (its label is shown before the author). */
  channel?: string;
}

export interface Suggestion {
  name: string;
  help: string;
  params?: Array<{ name: string; help: string }>;
}

export interface Settings {
  maxLength: number;
  /** Seconds the message list stays visible after a new message while the input is closed. */
  fadeSeconds: number;
  /** Messages kept on the client. */
  history: number;
  showJoins: boolean;
  /** Commands without "/": a Command mode comes first in the Tab cycle and takes the bare command. */
  noSlash: boolean;
}

export interface Channel {
  id: string;
  label: string;
  /** Css colour of the channel tag. */
  color: string;
  /** Metres around the sender who see it; 0 = everyone. */
  range: number;
  /** Who may write and read (lib access fields; public = everyone). */
  access: AccessRule;
  order: number;
}

export function readSettings(raw: unknown): Settings {
  const s = record(raw);
  return {
    maxLength: int(s.maxLength, 256, 16, 1000),
    fadeSeconds: int(s.fadeSeconds, 8, 2, 60),
    history: int(s.history, 100, 20, 500),
    showJoins: bool(s.showJoins, false),
    noSlash: bool(s.noSlash, false),
  };
}

export function readChannels(raw: unknown): Channel[] {
  return Object.entries(record(raw))
    .map(([id, value]) => {
      const v = record(value);
      return {
        id,
        label: str(v.label, id, 24),
        color: /^#[0-9a-fA-F]{6}$/.test(str(v.color, ""))
          ? str(v.color, "")
          : "#36ff9f",
        range: int(v.range, 0, 0, 1000),
        access: readAccess(v),
        order: int(v.order, 0, 0, 100),
      };
    })
    .sort((a, b) => a.order - b.order);
}

interface ContentSource {
  get(file: string): unknown;
  onChange(file: string, handler: () => void): void;
}

export class ChatContent {
  settings: Settings;
  channels: Channel[];
  private readonly listeners: Array<() => void> = [];

  constructor(source: ContentSource) {
    this.settings = readSettings(source.get("settings"));
    this.channels = readChannels(source.get("channels"));
    source.onChange("settings", () => {
      this.settings = readSettings(source.get("settings"));
      this.notify();
    });
    source.onChange("channels", () => {
      this.channels = readChannels(source.get("channels"));
      this.notify();
    });
  }

  subscribe(listener: () => void): void {
    this.listeners.push(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

/** A message from any script (cfx shape, a plain string, or garbage): only the parts the screen draws survive. */
export function toChatMessage(v: unknown): ChatMessage | null {
  if (typeof v === "string") return { args: [v.slice(0, 2000)] };
  if (!isRecord(v)) return null;
  const args = Array.isArray(v.args)
    ? v.args.map((a) => String(a ?? "").slice(0, 2000))
    : [];
  if (args.length === 0) return null;
  const c = v.color;
  const color =
    Array.isArray(c) && c.length >= 3 && c.every((n) => typeof n === "number")
      ? ([c[0], c[1], c[2]] as [number, number, number])
      : typeof c === "string" &&
          /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\))$/.test(c)
        ? c
        : undefined;
  return {
    args,
    color,
    multiline: v.multiline === true,
    channel: typeof v.channel === "string" ? v.channel : undefined,
  };
}

export function toSuggestion(v: unknown): Suggestion | null {
  if (!isRecord(v) || typeof v.name !== "string") return null;
  const params = Array.isArray(v.params)
    ? v.params.flatMap((p) =>
        isRecord(p) && typeof p.name === "string"
          ? [{ name: p.name, help: typeof p.help === "string" ? p.help : "" }]
          : [],
      )
    : undefined;
  return {
    name: v.name.startsWith("/") ? v.name : `/${v.name}`,
    help: typeof v.help === "string" ? v.help : "",
    params,
  };
}

/** Client -> NUI messages. */
export type NuiMessage =
  | {
      action: "setup";
      data: {
        texts: Record<string, string>;
        settings: Settings;
        channels: Channel[];
      };
    }
  | { action: "message"; data: ChatMessage }
  | { action: "suggestions"; data: { add: Suggestion[]; remove: string[] } }
  | { action: "clear"; data: null }
  | { action: "openInput"; data: null }
  /** Another screen took the focus away: the input closes. */
  | { action: "closeInput"; data: null }
  | { action: "closeInput"; data: null };
