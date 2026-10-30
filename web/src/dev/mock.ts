import en from "../../../locales/en.json";
import settings from "../../../data/settings.json";
import type { Channel, ChatMessage } from "../../../resource/common/chat";

/** Browser preview only (`bun run webdev`): `?input=1` opens the input with `/` typed suggestions. */
const CHANNELS: Channel[] = [
  {
    id: "local",
    label: "Local",
    color: "#ffffff",
    range: 20,
    jobs: [],
    order: 0,
  },
  { id: "ooc", label: "OOC", color: "#f5b742", range: 0, jobs: [], order: 1 },
  {
    id: "police",
    label: "Police",
    color: "#4a8cff",
    range: 0,
    jobs: ["police"],
    order: 2,
  },
];
export const MOCK_SETUP = { texts: en, settings, channels: CHANNELS };
export const MOCK_MESSAGES: ChatMessage[] = [
  {
    args: ["Jamie Cole", "anyone at the 24/7 on Innocence?"],
    color: "#ffffff",
    channel: "local",
  },
  {
    args: ["Ray Ortiz", "on my way ^2(2 min)"],
    color: "#f5b742",
    channel: "ooc",
  },
  {
    args: ["Dispatch", "10-31 at Legion Square, units respond"],
    color: "#4a8cff",
    channel: "police",
  },
  { args: ["^3[Server] ^7Restart in 30 minutes."] },
];
export const MOCK_SUGGESTIONS = {
  add: [
    {
      name: "/me",
      help: "Describe what your character does",
      params: [{ name: "action", help: "" }],
    },
    { name: "/do", help: "Describe the scene" },
    { name: "/ooc", help: "Out of character message" },
    { name: "/report", help: "Send a report to the staff" },
  ],
  remove: [],
};
export const MOCK_INPUT =
  new URLSearchParams(window.location.search).get("input") !== null;
