import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Mencrouche Doc",
  head: [["link", { rel: "icon", href: "/icon.svg" }]],
  description: "Mencrouche Documentation Site",
  themeConfig: {
    logo: "/icon.svg",
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Mencrouche", link: "https://mencrouche.com" },
      // { text: "I'm User", link: "/user" },
      { text: "I'm Developer", link: "/dev" },
      { text: "About", link: "/about" },
    ],

    sidebar: {
      "/dev/": [
        {
          text: "Introduction",
          items: [
            { text: "Overview", link: "/dev" },
            { text: "Clock Sticky Tutorial", link: "/dev/clock-sticky-tutorial" },
            { text: "Sticky LifeCycle", link: "/dev/sticky-lifecycle" },
          ],
        },
        {
          text: "API",
          items: [
            { text: "Dollars API", link: "/dev/dollars" },
            { text: "Context Menu API", link: "/dev/context-menu" },
            { text: "Command API", link: "/dev/command" },
            { text: "n81i API", link: "/dev/n81i" },
            { text: "Apocalypse API", link: "/dev/apocalypse" },
          ],
        },
      ],
    },

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
