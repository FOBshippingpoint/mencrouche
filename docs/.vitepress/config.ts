import { defineConfig } from "vitepress";
import { en } from "./configs/en";
import { zh_TW } from "./configs/zh_TW";

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: "Mencrouche Doc",
	rewrites: {
		"en/:rest*": ":rest*",
	},
	locales: {
		root: { label: "English", ...en },
		zh_TW: { label: "繁體中文", ...zh_TW },
	},
	lastUpdated: true,
	cleanUrls: true,
	head: [["link", { rel: "icon", href: "/icon.svg" }]],
	description: "Mencrouche Documentation Site",
	themeConfig: {
		logo: "/icon.svg",

		socialLinks: [
			{
				icon: "github",
				link: "https://github.com/FOBshippingpoint/mencrouche",
			},
		],

		search: {
			provider: "local",
		},
	},
});
