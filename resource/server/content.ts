import { AdminPanel } from "@aicore-fivem/lib/server";
import { ChatContent } from "common/chat";
import { chatSchema } from "./schema";

/** The panel store (it owns `data/*.json`) and the parsed settings and channels. */
export const panel = new AdminPanel(chatSchema);
export const content = new ChatContent(panel);
