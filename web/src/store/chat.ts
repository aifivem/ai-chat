import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type {
  Channel,
  ChatMessage,
  Settings,
  Suggestion,
} from "../../../resource/common/chat";

export interface Line {
  id: number;
  message: ChatMessage;
}

interface ChatState {
  settings: Settings;
  channels: Channel[];
  lines: Line[];
  suggestions: Record<string, Suggestion>;
  inputOpen: boolean;
  /** Screen clock of the last message (the list fades out after `fadeSeconds`). */
  lastAt: number;
}

const initialState: ChatState = {
  settings: { maxLength: 256, fadeSeconds: 8, history: 100, showJoins: false },
  channels: [],
  lines: [],
  suggestions: {},
  inputOpen: false,
  lastAt: 0,
};
let nextId = 0;

/** Messages, suggestions and channels: a setup snapshot, then one message or suggestion delta at a time. */
const chat = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setup(
      state,
      action: PayloadAction<{ settings: Settings; channels: Channel[] }>,
    ) {
      state.settings = action.payload.settings;
      state.channels = action.payload.channels;
    },
    messageAdded: {
      reducer(state, action: PayloadAction<Line>) {
        state.lines.push(action.payload);
        if (state.lines.length > state.settings.history)
          state.lines.splice(0, state.lines.length - state.settings.history);
        state.lastAt = Date.now();
      },
      prepare: (message: ChatMessage) => ({
        payload: { id: ++nextId, message },
      }),
    },
    suggestionsChanged(
      state,
      action: PayloadAction<{ add: Suggestion[]; remove: string[] }>,
    ) {
      for (const name of action.payload.remove) delete state.suggestions[name];
      // ai-chat's own list has no help text: it never replaces a script's described suggestion (lib addCommand).
      for (const s of action.payload.add)
        if (s.help || !state.suggestions[s.name]?.help)
          state.suggestions[s.name] = s;
    },
    cleared(state) {
      state.lines = [];
    },
    inputSet(state, action: PayloadAction<boolean>) {
      state.inputOpen = action.payload;
      if (!action.payload) state.lastAt = Date.now();
    },
  },
});

export const { setup, messageAdded, suggestionsChanged, cleared, inputSet } =
  chat.actions;

export const store = configureStore({ reducer: { chat: chat.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
