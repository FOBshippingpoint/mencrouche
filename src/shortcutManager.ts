import { createKikey, parseBinding, type KeyBinding } from "kikey";
import { dataset } from "./dataWizard";

interface Action {
	default: string;
	custom?: string;
}

interface ShortcutRegisterOption {
	el?: Document | HTMLElement;
	shouldPreventDefault?: boolean;
}

interface ShortcutManager {
	on(
		actionName: string,
		keySequence: string,
		callback: (e: KeyboardEvent) => void,
		option?: ShortcutRegisterOption,
	): void;
	once(
		actionName: string,
		keySequence: string,
		callback: (e: KeyboardEvent) => void,
		option?: ShortcutRegisterOption,
	): void;
	update(actionName: string, newSequence: string | KeyBinding[]): void;
	restore(actionName: string): void;
	getKeySequence(actionName: string): string;
	getDefaultKeySequence(actionName: string): string;
	getAllActions(): Array<{
		actionName: string;
		keySequence: string;
	}>;
	has(actionName: string): boolean;
}

const actions = new Map<string, Action>();
for (const [actionName, value] of Object.entries(actions)) {
	value.custom ??= dataset.getItem<string>(actionName);
}

interface KikeyInfo {
	kikey: ReturnType<typeof createKikey>;
	callback: (e: KeyboardEvent) => void;
}

const registry: Record<string, KikeyInfo[]> = {};
const globalKikey = createKikey();

function getCurrent(actionName: string) {
	if (!actions.has(actionName)) {
		throw Error(
			`Action name [ ${actionName} ] not found. Maybe you want to register the action? You can try to call 'on' or 'once'.`,
		);
	}
	const action = actions.get(actionName)!;
	return action.custom ?? action.default;
}

function registerAction(
	actionName: string,
	keySequence: string,
	callback: (e: KeyboardEvent) => void,
	isOnce: boolean = false,
	option: ShortcutRegisterOption = {},
) {
	if (actions.has(actionName)) {
		throw Error(
			`Action name [ ${actionName} ] already exists. Please try another name. Or maybe you want to 'update' instead?`,
		);
	}
	actions.set(actionName, { default: keySequence });
	const kikey = option.el ? createKikey(option.el) : globalKikey;

	let cb = callback;
	if (option.shouldPreventDefault) {
		cb = (e: KeyboardEvent) => {
			e.preventDefault();
			callback(e);
		};
	}

	if (isOnce) {
		kikey.once(getCurrent(actionName), cb);
	} else {
		kikey.on(getCurrent(actionName), cb);
	}

	if (!registry[actionName]) {
		registry[actionName] = [];
	}
	registry[actionName].push({ kikey, callback: cb });
}

export const shortcutManager: ShortcutManager = {
	on(
		actionName: string,
		keySequence: string,
		callback: (e: KeyboardEvent) => void,
		option: ShortcutRegisterOption = { shouldPreventDefault: true },
	) {
		registerAction(actionName, keySequence, callback, false, option);
	},
	once(
		actionName: string,
		keySequence: string,
		callback: (e: KeyboardEvent) => void,
		option: ShortcutRegisterOption = { shouldPreventDefault: true },
	) {
		registerAction(actionName, keySequence, callback, true, option);
	},
	update(actionName: string, newSequence: string) {
		for (const { kikey, callback } of registry[actionName] ?? []) {
			kikey.updateSequence(newSequence, callback);
			actions.get(actionName)!.custom = newSequence;
			dataset.setItem(actionName, newSequence);
		}
	},
	restore(actionName: string) {
		for (const { kikey, callback } of registry[actionName] ?? []) {
			const action = actions.get(actionName)!;
			kikey.updateSequence(action.default, callback);
			delete action.custom;
			dataset.removeItem(actionName);
		}
	},
	getKeySequence(actionName: string) {
		return keySequenceToString(getCurrent(actionName));
	},
	getDefaultKeySequence(actionName: string) {
		return keySequenceToString(actions.get(actionName)!.default);
	},
	getAllActions() {
		return [...actions.entries()].map(([key, value]) => ({
			actionName: key,
			keySequence: keySequenceToString(
				(value.custom ?? value.default).split(" ").map(parseBinding),
			),
		}));
	},
	has(actionName: string) {
		return actions.has(actionName);
	},
};

function keyBindingToString(binding: KeyBinding, isMac = false): string {
	const modifiers = [
		{ key: "ctrlKey", default: "Ctrl", mac: "⌘" },
		{ key: "shiftKey", default: "Shift", mac: "⇧" },
		{ key: "altKey", default: "Alt", mac: "⌥" },
		{ key: "metaKey", default: "Meta", mac: "⌃" },
	];

	const parts = modifiers
		.filter((mod) => binding[mod.key as keyof KeyBinding])
		.map((mod) => (isMac ? mod.mac : mod.default));

	let key = binding.key;
	const arrowKeys: { [key: string]: string } = {
		arrowup: "↑",
		arrowdown: "↓",
		arrowleft: "←",
		arrowright: "→",
	};
	key = arrowKeys[key.toLowerCase()] ?? key;

	parts.push(key.length === 1 ? key.toUpperCase() : key);

	return parts.join(" + ");
}

export function keySequenceToString(sequence: string | KeyBinding[]) {
	let s: KeyBinding[];
	if (typeof sequence === "string") {
		s = sequence.split(" ").map(parseBinding);
	} else {
		s = sequence;
	}

	return s.map((b) => keyBindingToString(b)).join(", ");
}
