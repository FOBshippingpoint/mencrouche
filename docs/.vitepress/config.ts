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
				content: "https://docs.mencrouche.com/og_image.png",
			},
		],
		["meta", { property: "og:image:width", content: "1200" }],
		["meta", { property: "og:image:height", content: "648" }],
		["meta", { property: "og:url", content: "https://docs.mencrouche.com/" }],
		[
			"script",
			{
				src: "https://cloud.umami.is/script.js",
				"data-website-id": "7d387d53-a773-4ea8-abb1-5468550bef69",
				defer: "",
			},
		],
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
	ignoreDeadLinks: "localhostLinks",
});
