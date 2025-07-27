import { createKikey } from "kikey";
import { $, n81i, apocalypse } from "./utils/tools";
import { shortcutManager } from "./shortcutManager";
import { getTemplate } from "./utils/getTemplate";
import { Fuzzy } from "./utils/fuzzy";
import type { Command, ArgCommand } from "@mencrouche/types";

const commandPalette = $<HTMLDivElement>("#commandPalette")!;
const searchInput = $<HTMLInputElement>("#searchInput")!;
const commandList = $<HTMLUListElement>("#commandList")!;
const commandArg = $<HTMLDivElement>("#commandArg")!;

const commands: Command[] = [];

let keyboardSelectedCommandName: string | null = null;

const searchKikey = createKikey(searchInput);

searchInput.on("keyup", (e) => {
	if (
		e.key === "Backspace" &&
		searchInput.value === "" &&
		!commandArg.classList.contains("none")
	) {
		commandArg.classList.add("none");
	}
});

function openCommandPalette() {
	updateFilteredCommands();
	commandPalette.classList.remove("none");
	searchInput.focus();
}

function closeCommandPalette() {
	searchInput.value = "";
	commandArg.classList.add("none");
	commandPalette.classList.add("none");
}

function toggleCommandPalette() {
	commandPalette.classList.contains("none")
		? openCommandPalette()
		: closeCommandPalette();
}

function updateFilteredCommands() {
	keyboardSelectedCommandName = null;
	commandList.replaceChildren();

	const query = searchInput.value.toLowerCase();

	let filteredCommands: Command[];
	if (query === "") {
		filteredCommands = commands;
	} else {
		filteredCommands = commands.filter((command) =>
			command.show ? command.show() : true,
		);
		const fuzzy = new Fuzzy(
			filteredCommands.flatMap((command) => [
				{ text: command.name, command },
				{ text: n81i.t(command.name), command },
			]),
		);
		filteredCommands = [
			...new Set(fuzzy.search(query).map((result) => result.item.command)),
		];
	}

	const frag = document.createDocumentFragment();
	for (const { name } of filteredCommands) {
		const li = getTemplate<HTMLLIElement>("commandListItem")!;
		li.dataset.commandName = name;
		li.$("span")!.textContent = n81i.t(name);
		if (shortcutManager.has(name)) {
			li.$("kbd")!.classList.remove("none");
			li.$("kbd")!.textContent = shortcutManager.getKeySequence(name);
		}
		li.on("click", () => {
			closeCommandPalette();
			executeCommand(name);
		});
		frag.appendChild(li);
	}

	// By default, select first command. So user can avoid pressing down arrow
	// key to select after key-in desired result.
	if (frag.firstElementChild) {
		frag.firstElementChild!.setAttribute("aria-selected", "true");
		keyboardSelectedCommandName = (frag.firstElementChild! as HTMLLIElement)
			.dataset.commandName!;
	}

	commandList.appendChild(frag);
}

function selectCommand(direction: "up" | "down") {
	const items = [...commandList.children] as HTMLLIElement[];
	let idx = items.findIndex((item) => {
		return item.dataset.commandName === keyboardSelectedCommandName;
	});
	if (idx !== -1) {
		items[idx]!.setAttribute("aria-selected", "false");
	}

	if (direction === "down") {
		idx = (idx + 1) % items.length;
	} else {
		idx = (idx - 1 + items.length) % items.length;
	}

	const selectedItem = items[idx]!;
	selectedItem.setAttribute("aria-selected", "true");
	selectedItem.scrollIntoView({ block: "nearest" });
	keyboardSelectedCommandName = selectedItem.dataset.commandName!;
}

function isArgCommand(command: Command): command is ArgCommand {
	return "argName" in command;
}

function chooseCommand(commandName: string) {
	const command = commands.find((command) => command.name === commandName);
	if (command) {
		if (isArgCommand(command)) {
			if (commandArg.classList.contains("none")) {
				commandArg.textContent = n81i.t(command.argName);
				commandArg.classList.remove("none");
				searchInput.value = "";
				commandList.replaceChildren();
			} else {
				executeCommand(commandName, searchInput.value);
				closeCommandPalette();
			}
		} else {
			closeCommandPalette();
			executeCommand(commandName);
		}
	} else {
		throw Error(`command [ ${commandName} ] not found`);
	}
}

shortcutManager.on("toggleCommandPalette", "C-.", toggleCommandPalette);
searchKikey.on("escape", closeCommandPalette);
searchKikey.on("arrowup", (e) => {
	e.preventDefault();
	selectCommand("up");
});
searchKikey.on("arrowdown", (e) => {
	e.preventDefault();
	selectCommand("down");
});
searchKikey.on("enter", () => {
	if (keyboardSelectedCommandName) {
		chooseCommand(keyboardSelectedCommandName);
	}
});

// Initialize event listeners
searchInput.on("input", () => {
	if (commandArg.classList.contains("none")) {
		updateFilteredCommands();
	}
});

shortcutManager.on(
	"undo",
	"C-z",
	(e) => {
		if (
			!(e.target as Element).matches('input,textarea,[contenteditable="true"]')
		) {
			apocalypse.undo();
		}
	},
	{ shouldPreventDefault: false },
);
shortcutManager.on(
	"redo",
	"C-y",
	(e) => {
		if (
			!(e.target as Element).matches('input,textarea,[contenteditable="true"]')
		) {
			apocalypse.redo();
		}
	},
	{
		shouldPreventDefault: false,
	},
);

export function executeCommand(
	commandName: string,
	argument: string | null = null,
) {
	const command = commands.find(({ name }) => name === commandName);
	if (!command) {
		throw Error(
			`Command [ ${commandName} ] not found. Please call 'registerCommand' first.`,
		);
	}
	if (isArgCommand(command)) {
		command.execute(argument ?? "");
	} else {
		command.execute();
	}
}

export function registerCommand(command: Command) {
	if (commands.find(({ name }) => command.name === name)) {
		throw Error(
			`Command [ ${command.name} ] already exists. Please try another name.`,
		);
	}

	if (command.defaultShortcut) {
		shortcutManager.on(command.name, command.defaultShortcut, () =>
			executeCommand(command.name),
		);
	}
	commands.push(command);
}
