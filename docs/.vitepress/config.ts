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
	head: [
		["link", { rel: "icon", type: "image/svg+xml", href: "/icon.svg" }],
		["meta", { property: "og:type", content: "website" }],
		["meta", { property: "og:site_name", content: "Mencrouche Doc" }],
		[
			"meta",
			{
				property: "og:image",
				content: "https://mencrouche.com/public/og_image.png",
			},
		],
		["meta", { property: "og:url", content: "https://docs.mencrouche.com/" }],
	],
	description:
		"Mencrouche Documentation Site - A highly customizable homepage for organizing links and notes.",
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
