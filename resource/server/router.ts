import {
  aiLog,
  onClientEvent,
  online,
  playersNear,
} from "@aicore-fivem/lib/server";
import { EVENTS, type Channel, type ChatMessage } from "common/chat";
import { content } from "./content";

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
  resource: string;
  cb: MessageHook | null;
}

const hooks: Array<{ resource: string; fn: MessageHook }> = [];
export const modes = new Map<string, ScriptMode>();

export function addHook(resource: string, fn: MessageHook): void {
  hooks.push({ resource, fn });
}

on("onResourceStop", (resource: string) => {
  for (let i = hooks.length - 1; i >= 0; i--)
    if (hooks[i]?.resource === resource) hooks.splice(i, 1);
  for (const [name, mode] of modes)
    if (mode.resource === resource) modes.delete(name);
});

const inJobs = (source: number, jobs: string[]): boolean =>
  jobs.length === 0 || online.jobs(source).some((job) => jobs.includes(job));

function authorOf(source: number): string {
  const character = online.character(source);
  return character
    ? `${character.firstname} ${character.lastname}`
    : GetPlayerName(String(source));
}

/** Who reads a panel channel: everyone, the players within its range of the sender, or its jobs. */
function recipients(source: number, channel: Channel): number | number[] {
  if (channel.range === 0 && channel.jobs.length === 0) return -1;
  // A ranged channel measures only the players in the sender's scope, not everyone online.
  if (channel.range > 0)
    return playersNear(source, channel.range).filter((target) =>
      inJobs(target, channel.jobs),
    );
  // A job channel: the members of its jobs from lib `online`'s member sets (O(members), a set drops doubles).
  const out = new Set<number>();
  for (const job of channel.jobs)
    for (const target of online.jobMembers(job)) out.add(target);
  return [...out];
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
    if (channel && !inJobs(source, channel.jobs)) return;
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
    for (const hook of hooks) hook.fn(source, message, ref);
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
