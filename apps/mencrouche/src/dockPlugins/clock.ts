import { dataset } from "../dataWizard";
import { registerDock } from "../dock/dock";
import type { DockPlugin, DockPluginModel } from "@mencrouche/types";
import { forkTemplate } from "../utils/forkTemplate";
import { isSmallScreen } from "../utils/screenSize";
import { toBcp47LangTag } from "../utils/toBcp47LangTag";

declare module "@mencrouche/types" {
	interface DockPluginRegistry {
		clock: ClockPlugin;
	}
}

interface ClockPlugin extends DockPlugin {}

const clockModel: DockPluginModel<"clock"> = {
	type: "clock",
	onMount(dock) {
		const clock = forkTemplate("clockWidgets");
		const timeEl = clock.$(".time")!;
		const dateEl = clock.$(".date")!;
		const secondHand = clock.$<HTMLElement>(".second")!;
		const minuteHand = clock.$<HTMLElement>(".minute")!;
		const hourHand = clock.$<HTMLElement>(".hour")!;

		let locale = dataset.getItem<string | undefined>("locale", undefined);
		if (locale) {
			locale = toBcp47LangTag(locale);
		}
		dataset.on<string>("locale", (_, value) => {
			locale = value ? toBcp47LangTag(value) : undefined;
		});
		function updateTime() {
			const now = new Date();

			timeEl.textContent = now.toLocaleTimeString(locale, {
				hour: "2-digit",
				minute: "2-digit",
			});
			dateEl.textContent = now.toLocaleDateString(locale, {
				weekday: "short",
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		}
		updateTime();
		setInterval(() => updateTime(), 1000);

		const now = new Date();
		const hours = now.getHours() % 12;
		const minutes = now.getMinutes();
		const seconds = now.getSeconds();
		const milliseconds = now.getMilliseconds();

		const secondRatio = (seconds + milliseconds / 1000) / 60;
		const minuteRatio = (minutes + secondRatio) / 60;
		const hourRatio = (hours + minuteRatio) / 12;

		const secondDelay = -secondRatio * 60; // In seconds
		const minuteDelay = -minuteRatio * 3600; // In seconds
		const hourDelay = -hourRatio * 43200; // In seconds (12 hours)

		secondHand.style.animationDelay = `${secondDelay}s`;
		minuteHand.style.animationDelay = `${minuteDelay}s`;
		hourHand.style.animationDelay = `${hourDelay}s`;

		// If already none, omit check screen size
		if (!dock.isHidden) {
			dock.classList.toggle("none", isSmallScreen());
		}
		dock.replaceBody(clock);
	},
	onDelete() {},
	onSave() {},
};

export function initClockDock() {
	registerDock(clockModel);
}
