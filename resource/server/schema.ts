import type { PanelSchema } from "@aicore-fivem/shared";

/** ai-chat's panel: message rules and the channels players write in. */
export const chatSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "comments",
  files: {
    settings: {
      kind: "settings",
      sync: "all",
      sections: {
        maxLength: { type: "number", min: 16, max: 1000, integer: true },
        fadeSeconds: { type: "number", min: 2, max: 60, integer: true },
        history: { type: "number", min: 20, max: 500, integer: true },
        showJoins: { type: "bool" },
      },
    },
    channels: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: { label: "", color: "#36ff9f", range: 0, jobs: [], order: 10 },
      sections: {
        label: { type: "text", min: 1, max: 24 },
        color: { type: "text", min: 7, max: 7, pattern: "^#[0-9a-fA-F]{6}$" },
        range: { type: "number", min: 0, max: 1000, integer: true },
        jobs: { type: "names", max: 20, itemMax: 32, pattern: "^[a-z0-9_]{2,32}$" },
        order: { type: "number", min: 0, max: 100, integer: true },
      },
    },
  },
  tabs: [
    {
      id: "channels",
      file: "channels",
      icon: "comments",
      label: "ADMIN_TAB_CHANNELS",
      desc: "ADMIN_TAB_CHANNELS_DESC",
      createLabel: "ADMIN_NEW_CHANNEL",
      deleteLabel: "ADMIN_DELETE_CHANNEL",
      cards: [
        {
          icon: "comments",
          title: "ADMIN_C_CHANNEL",
          desc: "ADMIN_C_CHANNEL_DESC",
          fields: [
            { widget: "text", path: "label", label: "ADMIN_F_LABEL", placeholder: "ADMIN_P_LABEL" },
            { widget: "text", path: "color", label: "ADMIN_F_COLOR", hint: "ADMIN_H_COLOR", placeholder: "ADMIN_P_COLOR" },
            { widget: "number", path: "range", label: "ADMIN_F_RANGE", hint: "ADMIN_H_RANGE", min: 0, max: 1000, step: 5, unit: "m" },
            { widget: "tags", path: "jobs", label: "ADMIN_F_JOBS", hint: "ADMIN_H_JOBS", placeholder: "ADMIN_P_JOBS" },
            { widget: "number", path: "order", label: "ADMIN_F_ORDER", hint: "ADMIN_H_ORDER", min: 0, max: 100 },
          ],
        },
      ],
    },
    {
      id: "settings",
      file: "settings",
      icon: "sliders",
      label: "ADMIN_TAB_SETTINGS",
      desc: "ADMIN_TAB_SETTINGS_DESC",
      cards: [
        {
          icon: "sliders",
          title: "ADMIN_C_MESSAGES",
          desc: "ADMIN_C_MESSAGES_DESC",
          fields: [
            { widget: "number", path: "maxLength", label: "ADMIN_F_MAX_LENGTH", hint: "ADMIN_H_MAX_LENGTH", min: 16, max: 1000, unit: "ADMIN_U_CHARS" },
            { widget: "number", path: "fadeSeconds", label: "ADMIN_F_FADE", hint: "ADMIN_H_FADE", min: 2, max: 60, unit: "s" },
            { widget: "number", path: "history", label: "ADMIN_F_HISTORY", hint: "ADMIN_H_HISTORY", min: 20, max: 500 },
            { widget: "switch", path: "showJoins", label: "ADMIN_F_JOINS", hint: "ADMIN_H_JOINS" },
          ],
        },
      ],
    },
  ],
};
