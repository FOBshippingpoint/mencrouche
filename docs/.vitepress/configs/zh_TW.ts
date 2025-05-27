import { defineConfig, type DefaultTheme } from "vitepress";

export const zh_TW = defineConfig({
	lang: "zh-TW",
	themeConfig: {
		nav: nav(),
		sidebar: sidebar(),
	},
});

function nav(): DefaultTheme.NavItem[] {
	return [
		{ text: "Mencrouche", link: "https://mencrouche.com" },
		{ text: "我是使用者", link: "zh_TW/user" },
		{ text: "我是開發者", link: "zh_TW/dev" },
		{ text: "關於", link: "zh_TW/about" },
	];
}

function sidebar(): DefaultTheme.Sidebar {
	return {
		"zh_TW/dev/": [
			{
				text: "簡介",
				items: [
					{ text: "概觀", link: "/zh_TW/dev/" },
					{
						text: "時鐘便利貼教學",
						link: "/zh_TW/dev/clock-sticky-tutorial",
					},
					{ text: "便利貼生命週期", link: "/zh_TW/dev/sticky-lifecycle" },
				],
			},
			{
				text: "API",
				base: "zh_TW/dev/",
				items: [
					{ text: "Dollars API", link: "dollars" },
					{ text: "右鍵選單API", link: "context-menu" },
					{ text: "指令API", link: "command" },
					{ text: "n81i API", link: "n81i" },
					{ text: "修訂歷史API", link: "apocalypse" },
				],
			},
			{
				text: "附錄",
				base: "zh_TW/dev/",
				items: [{ text: "詞彙表", link: "glossary" }],
			},
		],
	};
}
