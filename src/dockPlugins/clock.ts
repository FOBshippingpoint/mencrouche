import {
	registerDock,
	type DockPlugin,
	type DockPluginModel,
} from "../dock/dock";
import { getTemplate } from "../utils/getTemplate";
import { isSmallScreen } from "../utils/screenSize";

declare module "../dock/dock" {
	interface DockPluginRegistry {
		clock: ClockPlugin;
	}
}

interface ClockPlugin extends DockPlugin {}

const clockModel: DockPluginModel<"clock"> = {
	type: "clock",
	onMount(dock) {
		const clock = getTemplate("clockWidgets");
		const timeEl = clock.$(".time")!;
		const dateEl = clock.$(".date")!;
		const secondHand = clock.$<HTMLElement>(".second")!;
		const minuteHand = clock.$<HTMLElement>(".minute")!;
		const hourHand = clock.$<HTMLElement>(".hour")!;

		function updateTime() {
			const now = new Date();
			timeEl.textContent = now.toLocaleTimeString(undefined, {
				hour: "2-digit",
				minute: "2-digit",
			});
			dateEl.textContent = now.toLocaleDateString(undefined, {
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

		dock.classList.toggle("none", isSmallScreen());
		dock.replaceBody(clock);
	},
	onDelete() {},
	onSave() {},
};

export function initClockDock() {
	registerDock(clockModel);
}
