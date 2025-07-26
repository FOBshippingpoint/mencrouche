import { defineConfig, type DefaultTheme } from "vitepress";

export const en = defineConfig({
	lang: "en-US",
	themeConfig: {
		nav: nav(),
		sidebar: sidebar(),
	},
});

function nav(): DefaultTheme.NavItem[] {
	return [
		{ text: "Mencrouche", link: "https://mencrouche.com" },
		{ text: "I'm User", link: "/user" },
		{ text: "I'm Developer", link: "/dev" },
		{ text: "About", link: "/about" },
	];
}

function sidebar(): DefaultTheme.Sidebar {
	return {
		"/dev/": [
			{
				text: "Introduction",
				base: "/dev/",
				items: [
					{ text: "Overview", link: "/" },
					{
						text: "Clock Sticky Tutorial",
						link: "clock-sticky-tutorial",
					},
					{ text: "Sticky LifeCycle", link: "sticky-lifecycle" },
				],
			},
			{
				text: "API",
				base: "/dev/",
				items: [
					{ text: "Dollars API", link: "dollars" },
					{ text: "Context Menu API", link: "context-menu" },
					{ text: "Command API", link: "command" },
					{ text: "n81i API", link: "n81i" },
					{ text: "Apocalypse API", link: "apocalypse" },
				],
			},
			{
				text: "Contributing",
				base: "/dev/",
				items: [
					{ text: "Contributing to Mencrouche", link: "contributing" },
					{
						text: "Code Patches",
						items: [{ text: "Set Up Environment", link: "set-up-environment" }],
					},
					{
						text: "Writing Documentation",
						items: [
							{ text: "About Documentation", link: "about-documentation" },
							{
								text: "Set Up Documentation Environment",
								link: "set-up-doc-environment",
							},
						],
					},
				],
			},
			{
				text: "Appendix",
				base: "/dev/",
				items: [{ text: "Glossary", link: "glossary" }],
			},
		],
	};
}
