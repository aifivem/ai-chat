import {
  aiLog,
  aiLogChannels,
  ByResource,
  onClientEvent,
  online,
  playersNear,
} from "@aicore-fivem/lib/server";
import { isPublic } from "@aicore-fivem/lib/shared";
import { EVENTS, type Channel, type ChatMessage } from "common/chat";
import { content } from "./content";

aiLogChannels({ messages: {} });

/** What a message hook (cfx `registerMessageHook`) may do to a message before it goes out. */
export interface HookRef {
  updateMessage(change: Partial<ChatMessage>): void;
  cancel(): void;
  setRouting(target: number | number[]): void;
}
export type MessageHook = (
  source: number,
  message: ChatMessage,
  ref: HookRef,
) => void;

/** A channel a script registered (cfx `registerMode`): its callback decides the routing. */
export interface ScriptMode {
  name: string;
  displayName: string;
  color: string;
  cb: MessageHook | null;
}

/** Hooks and modes belong to the resource that registered them (lib `ByResource`: gone when it stops). */
const hooks = new ByResource<number, MessageHook>();
let nextHook = 0;
export const modes = new ByResource<string, ScriptMode>();

/** Registers a message hook for the calling resource. */
export function addHook(fn: MessageHook): void {
  hooks.set(++nextHook, fn);
}

const authorOf = (source: number): string => online.name(source);

/** Who reads a panel channel: everyone, the players within its range of the sender, or who passes its access rule. */
function recipients(source: number, channel: Channel): number | number[] {
  const rule = channel.access;
  if (channel.range === 0 && isPublic(rule)) return -1;
  // A ranged channel measures only the players in the sender's scope, not everyone online.
  if (channel.range > 0)
    return playersNear(source, channel.range).filter((target) =>
      online.allows(target, rule),
    );
  // A locked channel: the members of its jobs and gangs from lib `online`'s member sets (O(members), a set drops
  // doubles), each checked against the rule (grades, on duty).
  const out = new Set<number>();
  for (const job of rule.jobs)
    for (const target of online.jobMembers(job)) out.add(target);
  for (const gang of rule.gangs)
    for (const target of online.gangMembers(gang)) out.add(target);
  return [...out].filter((target) => online.allows(target, rule));
}

/** Removes control characters and colour-code abuse is left to the screen (it draws `^n` safely). */
const clean = (text: string, max: number): string =>
  text
    // oxlint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

export function deliver(target: number | number[], message: ChatMessage): void {
  if (Array.isArray(target))
    for (const id of target) emitNet("chat:addMessage", id, message);
  else emitNet("chat:addMessage", target, message);
}

onClientEvent(
  EVENTS.send,
  {
    args: ([channel, text]) =>
      typeof channel === "string" &&
      typeof text === "string" &&
      channel.length <= 32
        ? [channel, text]
        : null,
    rate: { count: 4, windowMs: 3000 },
  },
  (source, channelId, raw) => {
    const text = clean(raw, content.settings.maxLength);
    if (!text || text.startsWith("/")) return;
    const channel = content.channels.find((c) => c.id === channelId);
    const mode = channel ? undefined : modes.get(channelId);
    if (!channel && !mode) return;
    if (channel && !online.allows(source, channel.access)) return;
    const author = authorOf(source);
    let message: ChatMessage = {
      args: [author, text],
      color: channel?.color ?? mode?.color,
      channel: channelId,
    };
    let routing: number | number[] = channel ? recipients(source, channel) : -1;
    let canceled = false;
    const ref: HookRef = {
      updateMessage: (change) => void (message = { ...message, ...change }),
      cancel: () => void (canceled = true),
      setRouting: (target) => void (routing = target),
    };
    for (const hook of hooks.values()) hook(source, message, ref);
    mode?.cb?.(source, message, ref);
    if (canceled) return;
    // Scripts listening to the classic event may cancel it too.
    emit("chatMessage", source, author, text);
    if (WasEventCanceled()) return;
    deliver(routing, message);
    aiLog("messages", `[${channelId}] ${text}`, {
      source,
      metadata: { channel: channelId },
    });
  },
);
