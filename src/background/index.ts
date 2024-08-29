import platform from "../utils/platform";

platform.runtime.onMessage.addListener(
	(message: { command: string; active: boolean; url: string }) => {
		if (message.command === "open_in_add_tab") {
			platform.tabs.create({ url: message.url, active: message.active });
		}
	},
);

platform.browserAction.onClicked.addListener(() => {
	platform.runtime.openOptionsPage();
});
