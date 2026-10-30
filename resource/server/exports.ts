import { provideExport, registerExport } from "@aicore-fivem/lib/server";
import { toChatMessage } from "common/chat";
import { addHook, deliver, modes, type MessageHook } from "./router";

/** The chat resource's server exports (`provide 'chat'`) under both names. */
const api: Record<string, (...args: unknown[]) => unknown> = {
  addMessage: (target, message) => {
    const parsed = toChatMessage(message);
    if (parsed && (typeof target === "number" || Array.isArray(target)))
      deliver(target as number | number[], parsed);
  },
  registerMessageHook: (fn) => {
    if (typeof fn === "function")
      addHook(GetInvokingResource() ?? "", fn as MessageHook);
  },
  registerMode: (data) => {
    if (
      typeof data !== "object" ||
      data === null ||
      !("name" in data) ||
      typeof data.name !== "string"
    )
      return;
    const d = data as Record<string, unknown>;
    modes.set(data.name, {
      name: data.name,
      displayName:
        typeof d.displayName === "string" ? d.displayName : data.name,
      color: typeof d.color === "string" ? d.color : "#ffffff",
      resource: GetInvokingResource() ?? "",
      cb: typeof d.cb === "function" ? (d.cb as MessageHook) : null,
    });
    emitNet("chat:addMode", -1, {
      name: data.name,
      displayName: d.displayName ?? data.name,
      color: d.color ?? "#ffffff",
    });
  },
};

for (const [name, fn] of Object.entries(api)) {
  registerExport(name, fn);
  provideExport("chat", name, fn);
}
