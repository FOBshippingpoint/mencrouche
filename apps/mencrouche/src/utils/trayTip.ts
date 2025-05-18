import { $ } from "../utils/tools";
import { getTemplate } from "./getTemplate";

export interface TrayTipOptions {
	title?: string;
	message?: string;
	type?: "info" | "success" | "warning" | "error";
	onClose?: () => void;
	durationMs?: number;
}

/**
 * Displays a notification
 *
 * ```typesctip
 * trayTip({ title: "Copied", message: "Text copied to the clipboard." });
 * ```
 *
 * @returns - Control function to close the trayTip
 */
export function trayTip(options: TrayTipOptions): () => void {
	const settings: TrayTipOptions = {
		title: "",
		message: "",
		type: "info",
		onClose: () => {},
		durationMs: 4000,
		...options,
	};

	const trayTip = getTemplate<HTMLDivElement>("trayTipWidgets");
	trayTip.classList.add(settings.type || "info");
	trayTip.$(`.trayTipIcon .${settings.type}`)!.classList.remove("none");
	trayTip.$(".trayTipTitleWrapper span")!.textContent = settings.title ?? "";
	trayTip.$(".trayTipBody")!.textContent = settings.message ?? "";
	trayTip
		.$<HTMLButtonElement>(".trayTipCloseBtn")!
		.on("click", () => closeTrayTip());

	$("#trayTipContainer")!.appendChild(trayTip);

	// Auto-close timer
	let autoCloseTimeout: number;
	if (settings.durationMs && settings.durationMs > 0) {
		autoCloseTimeout = window.setTimeout(
			() => closeTrayTip(),
			settings.durationMs,
		);
	}

	function closeTrayTip(): void {
		window.clearTimeout(autoCloseTimeout);
		trayTip.on("animationend", () => {
			trayTip.remove();
			if (settings.onClose) settings.onClose();
		});
		trayTip.classList.add("slideOutTop");
	}

	return closeTrayTip;
}
