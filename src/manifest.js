export function getManifestString(version = 2) {
	const manifestV2 = {
		manifest_version: 2,
		name: "Goocoucou",
		version: process.env.npm_package_version,
		author: "FOBshippingpoint",
		description: "__MSG_extensionDescription__",
		homepage_url: "https://github.com/FOBshippingpoint/goocoucou-webext",
		chrome_url_overrides: {
			newtab: "index.html",
		},
		icons: {
			// 16: "assets/icon-16.png",
			// 64: "assets/icon-64.png",
		},
		browser_action: {},
		// options_ui: {
		// 	page: "options/index.html",
		// 	open_in_tab: true,
		// },
		// background: {
		// 	scripts: ["background/index.ts"],
		// },
		// content_scripts: [
		// 	{
		// 		js: ["contentScripts/index.ts"],
		// 		css: ["index.css"],
		// 	},
		// ],
		default_locale: "en",
		permissions: ["activeTab", "storage"],
	};

	const { browser_action, ...manifestV3 } = manifestV2;
	manifestV3.manifest_version = 3;
	manifestV3.action = { ...browser_action };

	if (version === 2) {
		return JSON.stringify(manifestV2);
	} else if (version === 3) {
		return JSON.stringify(manifestV3);
	}
}
