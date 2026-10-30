# ai-chat

Chat: channels from the admin panel (everyone, players nearby, a job), command suggestions, GTA colour codes, and FiveM's `chat` resource API (`provide 'chat'`) so every script's chat output works. Depends on ai-core (character names, jobs, admin panel).

## Decisions

- Channels are panel records (`data/channels.json`, `sync: "all"`): range 0 = everyone (`-1`), a range = players within it, jobs = members only. The client shows only the channels its jobs allow; the server checks again.
- Commands never reach the server as messages: a line starting with `/` runs `ExecuteCommand` on the client.
- Panel setting "Commands without /" (`noSlash`): the input opens in a Command mode where the bare command is typed; Tab cycles Command and the channels (tgiann-chat style). Up / Down walk the sent lines while the input is empty (or showing one), otherwise the suggestion rows; Tab completes the picked row while the command word is typed.
- HTML templates are never drawn; colour codes `^0`-`^9` are spans. Author = character name.
- Suggestions are a per-player delta of the server commands the player's ACE allows (`server/suggestions.ts`), refreshed when the screen loads and after resources start or stop. Lib `addCommand` sends its own described suggestions (`chat:addSuggestions`); the store never lets ai-chat's help-less entry replace a described one.
- No database: messages are routed and forgotten; logs go through ai-core (channel `messages`).
- The NUI draws nothing while hidden: it fades out `fadeSeconds` after the last message (one timeout, no interval).

## Contracts

- Events and shapes: `resource/common/chat.ts` (`ai-chat:send`, `ai-chat:ready`, `ai-chat:client:suggestions`); chat API events and exports: `docs/compat/chat.md`.
- Server event `chatMessage (source, author, text)` before delivery (cancel to drop the message).

## Pitfalls

- NUI focus is global: another resource can drop it while the input shows. The client checks `IsNuiFocused()` every 250 ms only while the input is open and closes the input with it; the NUI also closes on Escape when the text field lost the DOM focus and takes the focus back on blur.

- The chat events come from the server and from other client scripts: each is registered with `onServerEvent` (net, server only) and `on` (local) in `client/events.ts`.
- Messages arriving before the NUI is ready are queued (`client/chat.ts`), up to 200.

## Entry points

- Routing, hooks, script modes: `resource/server/router.ts`; exports `server/exports.ts`; suggestions `server/suggestions.ts`.
- Client: screen and keybind `resource/client/chat.ts`, chat API events `client/events.ts`.
- NUI: `web/src/App.tsx`, list `web/src/features/Messages.tsx`, input and suggestions `web/src/features/Input.tsx`; browser preview `bun run webdev` (`?input=1`).
