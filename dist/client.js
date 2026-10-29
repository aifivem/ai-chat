/*aicore-client-errors*/(function(){var n=GetCurrentResourceName(),s={},c=0;var r=function(t){t=String(t).replace(/\^\d/g,"");var k=t.slice(0,300);if(s[k]||c>=20)return;s[k]=1;c++;try{TriggerServerEvent("ai-core:clientError",n,t.slice(0,4000))}catch(e){}};globalThis.__aicoreReportError=r;var l=console.log;console.log=function(){var a=arguments[0];if(typeof a==="string"&&a.indexOf("SCRIPT ERROR")!==-1)r(a);return l.apply(console,arguments)}})();
try{
(function() {

// ../../../packages/lib/src/fivem/callbackNames.ts
/**
	* Callback wire format, the same on both sides:
	*   request  `aicore:cb:<name>`              (callerResource, id, ...args)
	*   response `aicore:cbr:<callerResource>`   (id, ok, result)
	* The response goes only to the resource that asked, so two resources never see each other's replies.
	*/
	const requestEvent = (name) => `aicore:cb:${name}`;
	const responseEvent = (resource) => `aicore:cbr:${resource}`;
	/** Default time a caller waits for an answer before the promise rejects. */
	const DEFAULT_CALLBACK_TIMEOUT = 3e4;

// ../../../packages/lib/src/shared/read.ts
/** Small readers for panel content (`data/*.json`): every one returns the fallback when the value is missing or wrong. */
	/** A finite number clamped to `[min, max]`, else the fallback. */
	function num(value, fallback, min = -Infinity, max = Infinity) {
		return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
	}
	/** `num` rounded to an integer. */
	function int(value, fallback, min = -Infinity, max = Infinity) {
		return Math.round(num(value, fallback, min, max));
	}
	/** A boolean, else the fallback. */
	function bool(value, fallback) {
		return typeof value === "boolean" ? value : fallback;
	}
	/** A trimmed non-empty string cut to `max`, else the fallback. */
	function str(value, fallback, max = 64) {
		return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
	}
	/** The value as a plain object, or an empty one. */
	function record(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
	}

// ../../../packages/lib/src/shared/index.ts
	function isRecord(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	/** Fills `{0}`, `{1}`... with the arguments by position (a translation may reorder or repeat them). */
	function formatText(template, args) {
		return template.replace(/\{(\d+)\}/g, (match, index) => {
			const value = args[Number(index)];
			return value === void 0 ? match : String(value);
		});
	}
	/** Console output prefixed with the resource name, so server logs show where a line came from. */
	function createLogger(resource) {
		const prefix = `[${resource}]`;
		return {
			info: (message, ...details) => console.log(`${prefix} ${message}`, ...details),
			warn: (message, ...details) => console.warn(`${prefix} ^3${message}^7`, ...details),
			error: (message, ...details) => console.error(`${prefix} ^1${message}^7`, ...details)
		};
	}

// ../../../packages/lib/src/client/netEvent.ts
	const log$2 = createLogger(GetCurrentResourceName());
	/**
	* Whether the net event being handled came from the server (read it before the first `await`). On a client only
	* events from the server carry a source (65535 in the docs); a local emit by any resource carries none.
	*/
	const fromServer = () => Boolean(globalThis.source);
	function onServerEvent(name, first, second) {
		const [handler, parse] = typeof first === "function" ? [first, null] : [second, first.args];
		onNet(name, (...raw) => {
			if (!fromServer() || !handler) return;
			const args = parse ? parse(raw) : [];
			if (!args) return log$2.warn(`event ${name} from the server had invalid arguments`);
			Promise.resolve().then(() => handler(...args)).catch((error) => log$2.error(`event ${name} failed`, error));
		});
	}

// ../../../packages/lib/src/client/callback.ts
	const resource = GetCurrentResourceName();
	const log$1 = createLogger(resource);
	const pending = /* @__PURE__ */ new Map();
	let nextId = 0;
	onNet(responseEvent(resource), (id, ok, result) => {
		if (!fromServer()) return;
		const entry = typeof id === "number" ? pending.get(id) : void 0;
		if (!entry) return;
		pending.delete(id);
		clearTimeout(entry.timer);
		if (ok === true) entry.resolve(result);
		else entry.reject(/* @__PURE__ */ new Error("server callback failed"));
	});
	/**
	* Asks the server (`onClientCallback(name, ...)` there) and resolves with its answer. The answer is unknown:
	* parse it. Rejects when the server reports an error or does not answer within `timeoutMs`.
	*/
	function triggerServerCallback(name, args = [], timeoutMs = DEFAULT_CALLBACK_TIMEOUT) {
		const id = ++nextId;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(/* @__PURE__ */ new Error(`server callback ${name} timed out`));
			}, timeoutMs);
			pending.set(id, {
				resolve,
				reject,
				timer
			});
			emitNet(requestEvent(name), resource, id, ...args);
		});
	}

// ../../../packages/shared/src/core.ts
/** Names owned by ai-core that other resources, the bridges and the build step use. */
	const CORE = {
		resource: "ai-core",
		/** Client -> server: (resource: string, text: string). Sent by the reporter every client bundle carries. */
		clientErrorEvent: "ai-core:clientError",
		/** (src, character: CharacterInfo) after a character is loaded and spawned. */
		playerLoadedEvent: "ai-core:playerLoaded",
		/** (src, charId, reason: UnloadReason) before a character's state is dropped. */
		playerUnloadedEvent: "ai-core:playerUnloaded",
		/** (src, account: string, balance: number, delta: number, reason: string) */
		moneyChangedEvent: "ai-core:moneyChanged",
		/** (src, jobs: JobMembership[]) */
		jobsChangedEvent: "ai-core:jobsChanged",
		/** (src, job: string | null) */
		dutyChangedEvent: "ai-core:dutyChanged",
		/** (src, gangs: GangMembership[]) */
		gangsChangedEvent: "ai-core:gangsChanged",
		/** (src, gang: string | null) */
		activeGangChangedEvent: "ai-core:activeGangChanged",
		/** (src, charIds: number[]) each time a player's character screen loads; an appearance resource answers with portraits. */
		characterScreenEvent: "ai-core:characterScreen",
		clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
		clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
		/** (charId: number, url: string) a portrait image of a character on the character screen (e.g. `https://nui-img/<txd>/<txd>`). */
		clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
		/** (resource: string, id: string) the interaction key was pressed while that resource's prompt was on top. */
		clientPromptPressedEvent: "ai-core:client:promptPressed",
		/** (key: keyof PlayerCache, value) a cached value of the local player changed (one watcher in ai-core for every resource). */
		clientCacheEvent: "ai-core:client:cache",
		charactersCallback: "ai-core:characters",
		createCharacterCallback: "ai-core:createCharacter",
		deleteCharacterCallback: "ai-core:deleteCharacter",
		selectCharacterCallback: "ai-core:selectCharacter",
		/** Server -> client: (spawn: SpawnPoint) puts the loaded character into the world. */
		spawnEvent: "ai-core:client:spawn",
		/** Server -> client: () the character was let go (switch); show the character screen again. */
		openCharactersEvent: "ai-core:client:openCharacters"
	};

// ../../../packages/shared/src/admin.ts
/** Event names of the admin panel (owned by ai-core). */
	const ADMIN = {
		/** ACE every panel action checks: `add_ace group.admin ai.admin allow`. */
		ace: "ai.admin",
		openCallback: "ai-core:admin:open",
		applyCallback: "ai-core:admin:apply",
		closeEvent: "ai-core:admin:close",
		/** Server -> admins with the panel open: (delta: AdminDelta). */
		deltaEvent: "ai-core:admin:delta",
		/** Server -> client of a world (`sync: "all"`) file: (file, key | null, value). Prefixed with the resource name. */
		worldEvent: (resource) => `${resource}:admin:world`,
		/** Callback: () -> { [file]: { key: value } } world records changed since the resource started. */
		worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
	};

// ../../../packages/lib/src/client/adminWorld.ts
/**
	* The client copy of a resource's world panel files (`sync: "all"`): the file FiveM cached at start, then the
	* records changed since start (asked once), then live changes. Never polls.
	*/
	var AdminWorld = class {
		data = /* @__PURE__ */ new Map();
		handlers = /* @__PURE__ */ new Map();
		resource = GetCurrentResourceName();
		/** `files`: the world files this client mirrors (each must be in the resource's `files`). */
		constructor(files) {
			const log = createLogger(this.resource);
			for (const file of files) {
				const raw = LoadResourceFile(this.resource, `data/${file}.json`);
				try {
					const parsed = raw ? JSON.parse(raw) : {};
					this.data.set(file, isRecord(parsed) ? parsed : {});
				} catch (error) {
					log.error(`data/${file}.json is not valid JSON`, error);
					this.data.set(file, {});
				}
			}
			onServerEvent(ADMIN.worldEvent(this.resource), { args: ([file, key, value]) => typeof file === "string" ? [
				file,
				typeof key === "string" && key !== "" ? key : void 0,
				value
			] : null }, (file, key, value) => this.put(file, key, value));
			triggerServerCallback(ADMIN.worldChangesCallback(this.resource)).then((changes) => {
				if (!isRecord(changes)) return;
				for (const [file, records] of Object.entries(changes)) {
					if (!isRecord(records)) continue;
					for (const [key, value] of Object.entries(records)) this.put(file, key === "" ? void 0 : key, value);
				}
			}, (error) => log.error("loading the panel changes since start failed", error));
		}
		/** The current content of a file: the settings object, or `{ key: record }`. Read only; parse what you use. */
		get(file) {
			return this.data.get(file) ?? {};
		}
		onChange(file, handler) {
			this.handlers.set(file, [...this.handlers.get(file) ?? [], handler]);
		}
		put(file, key, value) {
			const data = this.data.get(file);
			if (!data) return;
			if (key === void 0) {
				if (isRecord(value)) this.data.set(file, value);
			} else if (value === null) delete data[key];
			else data[key] = value;
			for (const handler of this.handlers.get(file) ?? []) handler(key, value);
		}
	};

// ../../../packages/lib/src/client/cache.ts
/** The unarmed "weapon" hash: cached as `false`. */
	const UNARMED = GetHashKey("WEAPON_UNARMED") | 0;
	/** The vehicle, seat and weapon of a ped right now (also ai-core's watcher). */
	function readPlayerState(ped) {
		const vehicle = GetVehiclePedIsIn(ped, false);
		let seat = false;
		if (vehicle) for (let i = -1; i < GetVehicleMaxNumberOfPassengers(vehicle); i++) {
			if (GetPedInVehicleSeat(vehicle, i) !== ped) continue;
			seat = i;
			break;
		}
		const weapon = GetSelectedPedWeapon(ped) | 0;
		return {
			vehicle: vehicle || false,
			seat,
			weapon: weapon === UNARMED ? false : weapon
		};
	}
	/**
	* The local player's often read values (ped, player id, server id, vehicle, seat, weapon), like ox_lib's `cache`:
	* read `cache.ped` instead of calling PlayerPedId() in loops. One watcher in ai-core updates every resource through
	* a local event, so no resource polls for these itself. Read only.
	*/
	const ped = PlayerPedId();
	const cache = {
		ped,
		playerId: PlayerId(),
		serverId: GetPlayerServerId(PlayerId()),
		...readPlayerState(ped)
	};
	const handlers$1 = /* @__PURE__ */ new Map();
	const valid = (key, value) => key === "ped" || key === "playerId" || key === "serverId" ? typeof value === "number" : typeof value === "number" || value === false;
	on(CORE.clientCacheEvent, (key, value) => {
		if (typeof key !== "string" || !(key in cache)) return;
		const name = key;
		if (!valid(name, value) || cache[name] === value) return;
		const old = cache[name];
		cache[name] = value;
		for (const handler of handlers$1.get(name) ?? []) handler(value, old);
	});

// ../../../packages/lib/src/client/zones.ts
/**
	* Zones on this client: inside / outside checks at each zone's own interval, never per frame. Built for any count
	* (measured with 1,000,000 zones): zones sit in a grid of 64 m cells and a check looks only at the player's cell and
	* the zones the player is in.
	*/
	const log = createLogger(GetCurrentResourceName());

// ../../../packages/lib/src/fivem/exports.ts
	function registerExport(name, handler) {
		globalThis.exports(name, handler);
	}
	/** Answers `exports["<resource>"].<name>` for a resource name this one `provide`s: provide makes the name exist but does not alias its exports, so each export of the stood-in resource is answered through FiveM's export event. */
	function provideExport(resource, name, fn) {
		on(`__cfx_export_${resource}_${name}`, (setCallback) => setCallback(fn));
	}

// ../../../packages/lib/src/fivem/playerData.ts
/**
	* ai-core's per-player channel: the server pushes `(key, value)` of `AiPlayerData` to the owner's client. One net
	* event carries every key, and every resource on that client receives it, so client code subscribes per key
	* instead of wiring its own `onNet` for each value.
	*/
	const PLAYER_DATA_EVENT = "ai-core:client:playerData";
	/** Same channel for map values (money): only the changed entries travel and the client merges them. */
	const PLAYER_DATA_PATCH_EVENT = "ai-core:client:playerDataPatch";

// ../../../packages/lib/src/client/playerData.ts
	const values = /* @__PURE__ */ new Map();
	const handlers = /* @__PURE__ */ new Map();
	let listening = false;
	function deliver(key, value) {
		values.set(key, value);
		for (const handler of handlers.get(key) ?? []) handler(value);
	}
	function listen() {
		if (listening) return;
		listening = true;
		onServerEvent(PLAYER_DATA_EVENT, { args: ([key, value]) => typeof key === "string" ? [key, value] : null }, (key, value) => deliver(key, value));
		onServerEvent(PLAYER_DATA_PATCH_EVENT, { args: ([key, patch]) => typeof key === "string" && isRecord(patch) ? [key, patch] : null }, (key, patch) => {
			const current = values.get(key);
			deliver(key, {
				...isRecord(current) ? current : {},
				...patch
			});
		});
	}
	/**
	* Calls `handler` every time ai-core pushes `key` for this player. Returns an unsubscribe function. Values pushed
	* before this resource started are not replayed: read the current state once from ai-core's `GetPlayerData` export.
	*/
	function onPlayerData(key, handler) {
		listen();
		const set = handlers.get(key) ?? /* @__PURE__ */ new Set();
		set.add(handler);
		handlers.set(key, set);
		return () => set.delete(handler);
	}
	/** The last value pushed since this resource started, or undefined. */
	function getPlayerData(key) {
		listen();
		return values.get(key);
	}

// ../../../packages/lib/src/client/keybind.ts
/** A key the player can rebind in GTA's settings (RegisterKeyMapping); no per-frame key polling. */
	var Keybind = class {
		options;
		name;
		disabled;
		pressed = false;
		hash;
		constructor(options) {
			this.options = options;
			this.name = options.name;
			this.disabled = options.disabled ?? false;
			this.hash = GetHashKey(`+${options.name}`) | 2147483648;
			RegisterCommand(`+${options.name}`, () => this.press(true), false);
			RegisterCommand(`-${options.name}`, () => this.press(false), false);
			RegisterKeyMapping(`+${options.name}`, options.description, options.defaultMapper ?? "keyboard", options.defaultKey ?? "");
			setTimeout(() => {
				emit("chat:removeSuggestion", `/+${options.name}`);
				emit("chat:removeSuggestion", `/-${options.name}`);
			}, 500);
		}
		press(down) {
			if (this.disabled || !this.options.allowInPauseMenu && IsPauseMenuActive()) return;
			this.pressed = down;
			if (down) this.options.onPressed?.();
			else this.options.onReleased?.();
		}
		/** Whether the key is held now. */
		get isPressed() {
			return this.pressed;
		}
		/** The key the player has bound right now, for HUD hints. */
		get currentKey() {
			return GetControlInstructionalButton(0, this.hash, true).substring(2);
		}
		disable(disabled) {
			this.disabled = disabled;
			this.pressed = false;
		}
	};

// ../../../packages/lib/src/fivem/locale.ts
/** Convar holding the language (`setr ai:locale "en"` in misc.cfg); replicated so clients read it too. */
	const LOCALE_CONVAR = "ai:locale";
	function readLocaleFile(resource, lang) {
		const raw = LoadResourceFile(resource, `locales/${lang}.json`);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (!isRecord(parsed)) return {};
		const texts = {};
		for (const [key, value] of Object.entries(parsed)) if (typeof value === "string") texts[key] = value;
		return texts;
	}
	/**
	* The resource's lang texts: `locales/en.json` (complete base) overlaid with `locales/<ai:locale>.json`.
	* `${OTHER_KEY}` inside a text is replaced by that text once at load. Returns `t(key, ...args)` filling
	* `{0}`, `{1}`...; a missing key returns the key itself so it is visible in game.
	*
	*   const t = createLocale<typeof import("../../locales/en.json")>();
	*   t("NOTIFY_NO_MONEY", price);
	*/
	function createLocale() {
		const texts = loadLocaleTexts();
		return (key, ...args) => formatText(texts[key] ?? key, args);
	}
	/**
	* The resource's merged lang table (`en.json` overlaid with the `ai:locale` language, `${KEY}` references
	* resolved). A NUI gets this once and fills `{0}` placeholders itself.
	*/
	function loadLocaleTexts(resource = GetCurrentResourceName()) {
		const lang = GetConvar(LOCALE_CONVAR, "en");
		const texts = {
			...readLocaleFile(resource, "en"),
			...lang === "en" ? {} : readLocaleFile(resource, lang)
		};
		for (const key of Object.keys(texts)) texts[key] = (texts[key] ?? "").replace(/\$\{([A-Z0-9_]+)\}/g, (match, ref) => texts[ref] ?? match);
		return texts;
	}

// resource/common/locale.ts
/** This resource's lang texts: `Locale("NOTIFY_NO_MONEY", price)`; keys typed from locales/en.json. */
	const Locale = createLocale();

// resource/common/resource.ts
	const ResourceName = GetCurrentResourceName();
	const ResourceContext = IsDuplicityVersion() ? "server" : "client";

// resource/common/chat.ts
/** ai-chat's contracts: events, messages, suggestions, panel content. No natives. */
	const EVENTS = {
		/** Client -> server: (channel, text) a message typed in a channel. */
		send: "ai-chat:send",
		/** Client -> server: () the screen loaded; send the command suggestions. */
		ready: "ai-chat:ready",
		/** Server -> client: (add: Suggestion[], remove: string[]) commands the player may use, as a delta. */
		suggestions: "ai-chat:client:suggestions"
	};
	function readSettings(raw) {
		const s = record(raw);
		return {
			maxLength: int(s.maxLength, 256, 16, 1e3),
			fadeSeconds: int(s.fadeSeconds, 8, 2, 60),
			history: int(s.history, 100, 20, 500),
			showJoins: bool(s.showJoins, false)
		};
	}
	function readChannels(raw) {
		return Object.entries(record(raw)).map(([id, value]) => {
			const v = record(value);
			return {
				id,
				label: str(v.label, id, 24),
				color: /^#[0-9a-fA-F]{6}$/.test(str(v.color, "")) ? str(v.color, "") : "#36ff9f",
				range: int(v.range, 0, 0, 1e3),
				jobs: Array.isArray(v.jobs) ? v.jobs.filter((j) => typeof j === "string") : [],
				order: int(v.order, 0, 0, 100)
			};
		}).sort((a, b) => a.order - b.order);
	}
	var ChatContent = class {
		settings;
		channels;
		listeners = [];
		constructor(source) {
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
		subscribe(listener) {
			this.listeners.push(listener);
		}
		notify() {
			for (const listener of this.listeners) listener();
		}
	};
	const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	/** A message from any script (cfx shape, a plain string, or garbage): only the parts the screen draws survive. */
	function toChatMessage(v) {
		if (typeof v === "string") return { args: [v.slice(0, 2e3)] };
		if (!isObj(v)) return null;
		const args = Array.isArray(v.args) ? v.args.map((a) => String(a ?? "").slice(0, 2e3)) : [];
		if (args.length === 0) return null;
		const c = v.color;
		return {
			args,
			color: Array.isArray(c) && c.length >= 3 && c.every((n) => typeof n === "number") ? [
				c[0],
				c[1],
				c[2]
			] : typeof c === "string" && /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\))$/.test(c) ? c : void 0,
			multiline: v.multiline === true,
			channel: typeof v.channel === "string" ? v.channel : void 0
		};
	}
	function toSuggestion(v) {
		if (!isObj(v) || typeof v.name !== "string") return null;
		const params = Array.isArray(v.params) ? v.params.flatMap((p) => isObj(p) && typeof p.name === "string" ? [{
			name: p.name,
			help: typeof p.help === "string" ? p.help : ""
		}] : []) : void 0;
		return {
			name: v.name.startsWith("/") ? v.name : `/${v.name}`,
			help: typeof v.help === "string" ? v.help : "",
			params
		};
	}

// resource/client/chat.ts
	const content = new ChatContent(new AdminWorld(["settings", "channels"]));
	/**
	* The chat screen: messages from every source the FiveM chat resource accepts, command suggestions, channels the
	* character may use, the T key. Messages wait in a queue until the NUI says it is ready.
	*/
	var Chat = class {
		ready = false;
		queue = [];
		scriptModes = /* @__PURE__ */ new Map();
		inputOpen = false;
		send(message) {
			if (this.ready) SendNUIMessage(message);
			else if (this.queue.length < 200) this.queue.push(message);
		}
		/** Panel channels the character's jobs allow, then channels scripts registered. */
		channels() {
			const jobs = (getPlayerData("jobs") ?? []).map((m) => m.job);
			return [...content.channels.filter((c) => c.jobs.length === 0 || c.jobs.some((j) => jobs.includes(j))), ...this.scriptModes.values()];
		}
		setup() {
			this.ready = true;
			SendNUIMessage({
				action: "setup",
				data: {
					texts: loadLocaleTexts(),
					settings: content.settings,
					channels: this.channels()
				}
			});
			for (const message of this.queue) SendNUIMessage(message);
			this.queue = [];
			emitNet(EVENTS.ready);
		}
		resetup() {
			if (this.ready) SendNUIMessage({
				action: "setup",
				data: {
					texts: loadLocaleTexts(),
					settings: content.settings,
					channels: this.channels()
				}
			});
		}
		addMessage(message) {
			if (message) this.send({
				action: "message",
				data: message
			});
		}
		suggest(add, remove = []) {
			this.send({
				action: "suggestions",
				data: {
					add,
					remove
				}
			});
		}
		addMode(channel) {
			this.scriptModes.set(channel.id, channel);
			this.resetup();
		}
		removeMode(name) {
			if (this.scriptModes.delete(name)) this.resetup();
		}
		openInput() {
			if (this.inputOpen || IsPauseMenuActive()) return;
			this.inputOpen = true;
			SetNuiFocus(true, false);
			this.send({
				action: "openInput",
				data: null
			});
		}
		closeInput() {
			this.inputOpen = false;
			SetNuiFocus(false, false);
		}
	};
	const chat = new Chat();
	content.subscribe(() => chat.resetup());
	onPlayerData("jobs", () => chat.resetup());
	new Keybind({
		name: "chat_open_T",
		description: Locale("KEYBIND_OPEN"),
		defaultKey: "T",
		onPressed: () => chat.openInput()
	});
	RegisterNuiCallback("ready", (_data, cb) => {
		chat.setup();
		cb({ ok: true });
	});
	RegisterNuiCallback("close", (_data, cb) => {
		chat.closeInput();
		cb({ ok: true });
	});
	RegisterNuiCallback("send", (data, cb) => {
		chat.closeInput();
		cb({ ok: true });
		if (typeof data !== "object" || data === null || !("text" in data) || typeof data.text !== "string") return;
		const text = data.text.trim();
		if (!text) return;
		if (text.startsWith("/")) return ExecuteCommand(text.slice(1));
		const channel = "channel" in data && typeof data.channel === "string" ? data.channel : chat.channels()[0]?.id ?? "";
		emitNet(EVENTS.send, channel, text);
	});

// resource/client/events.ts
	const both = (name, handler) => {
		onServerEvent(name, { args: (raw) => raw }, handler);
		on(name, handler);
	};
	both("chat:addMessage", (message) => chat.addMessage(toChatMessage(message)));
	both("chatMessage", (author, color, text) => chat.addMessage(toChatMessage({
		args: author ? [String(author), String(text ?? "")] : [String(text ?? "")],
		color
	})));
	both("__cfx_internal:serverPrint", (text) => chat.addMessage(toChatMessage({
		args: [String(text ?? "")],
		multiline: true
	})));
	both("chat:addSuggestion", (name, help, params) => {
		const suggestion = toSuggestion({
			name,
			help,
			params
		});
		if (suggestion) chat.suggest([suggestion]);
	});
	both("chat:addSuggestions", (list) => chat.suggest(Array.isArray(list) ? list.map(toSuggestion).filter((s) => s !== null) : []));
	both("chat:removeSuggestion", (name) => typeof name === "string" && chat.suggest([], [name.startsWith("/") ? name : `/${name}`]));
	both("chat:clear", () => chat.send({
		action: "clear",
		data: null
	}));
	both("chat:addMode", (mode) => {
		if (typeof mode !== "object" || mode === null || !("name" in mode) || typeof mode.name !== "string") return;
		const label = "displayName" in mode && typeof mode.displayName === "string" ? mode.displayName : mode.name;
		const color = "color" in mode && typeof mode.color === "string" ? mode.color : "#ffffff";
		chat.addMode({
			id: mode.name,
			label,
			color,
			range: 0,
			jobs: [],
			order: 100
		});
	});
	both("chat:removeMode", (mode) => {
		const name = typeof mode === "string" ? mode : typeof mode === "object" && mode !== null && "name" in mode ? mode.name : null;
		if (typeof name === "string") chat.removeMode(name);
	});
	both("chat:addTemplate", () => void 0);
	onServerEvent(EVENTS.suggestions, { args: ([add, remove]) => Array.isArray(add) && Array.isArray(remove) ? [add.map(toSuggestion).filter((s) => s !== null), remove.filter((n) => typeof n === "string")] : null }, (add, remove) => chat.suggest(add, remove));
	const api = {
		addMessage: (message) => chat.addMessage(toChatMessage(message)),
		addSuggestion: (name, help, params) => {
			const suggestion = toSuggestion({
				name,
				help,
				params
			});
			if (suggestion) chat.suggest([suggestion]);
		}
	};
	for (const [name, fn] of Object.entries(api)) {
		registerExport(name, fn);
		provideExport("chat", name, fn);
	}

})();
}catch(e){globalThis.__aicoreReportError&&globalThis.__aicoreReportError("load: "+(e&&e.stack||e));throw e}
