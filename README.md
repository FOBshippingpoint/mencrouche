# [Mencrouche](https://mencrouche.com)

![feature_image](https://github.com/user-attachments/assets/2ff6f50b-6183-4ff2-9411-e2f2e5e81c90)

> It's your digital home, content hub, and visual workspace – all in one.

- Arrange notes, bookmarks, and media with sticky.
- Stream Spotify, watch YouTube, view web pages, or even Chrome Dino.
- Tailor appearance with themes and backgrounds.
- [Powerful API](https://docs.mencrouche.com/dev/) for developers.

<br/>

✨ [Try Now](https://mencrouche.com)&nbsp;&nbsp;•&nbsp;&nbsp;📘 [Documentation](https://docs.mencrouche.com)

## Extensible API Examples

Here are some examples of how you can extend Mencrouche. Visit [Mencrouche](https://mencrouche.com), open the developer tools, and paste the snippet to see the effect.

Create a Weather widget:

```js
const WEATHER_CODE_MAP = {
    0: "☀", 1: "🌤", 2: "⛅", 3: "☁", 45: "🌫", 48: "🌫",
    51: "🌦", 53: "🌦", 55: "🌦", 61: "🌧", 63: "🌧", 66: "🌧",
    80: "🌦", 81: "🌧", 82: "⛈", 95: "⛈", 96: "⛈", 99: "⛈"
};

// Get geolocation and fetch weather data.
async function getWeatherData() {
    const coords = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition((pos) =>
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        );
    });
    const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code`,
    );
    return await response.json();
}

// Register the weather sticky.
mc.registerSticky({
    type: "weather",
    onMount: async (sticky) => {
        // Use "h" to create HTML from a string.
        sticky.replaceBody(
            mc.h(`
            <div class="container">
                <div class="emoji">⏳</div>
                <div class="temperature">Loading...</div>
            </div>
        `),
        );

        try {
            const data = await getWeatherData();
            // jQuery-like syntax for writing spaghetti code (and I love spaghetti).
            sticky.$(".temperature").textContent = `${data.current.temperature_2m}°C`;
            sticky.$(".emoji").textContent = WEATHER_CODE_MAP[data.current.weather_code] ?? "❓";
        } catch (error) {
            sticky.$(".temperature").textContent = "Error";
            sticky.$(".emoji").textContent = "❌";
        }
    },
    onDelete() {},
    onSave() {},
    // Yup, you can apply CSS right here without polluting global stylesheets.
    css: `
        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            .emoji { font-size: var(--size-8); }
            .temperature { font-size: var(--size-5); font-weight: bold; }
        }
    `,
});

// Create the sticky.
mc.workspace.createSticky({ type: "weather" });
```

![](https://github.com/user-attachments/assets/81cbc5d3-5ec7-4e8a-a05c-4bc7e298622d)


Command for searching pull request by commit SHA (press `Ctrl + .` to open command palette):

```js
// Add a command for searching pull requests by commit.
mc.registerCommand({
    name: "githubPr",
    execute(commitSha) {
        const url = new URL("https://github.com/search?type=pullrequests");
        url.searchParams.set("q", commitSha);
        window.open(url, "_blank");
    },
    argName: "commitSha",
});

// Add the corresponding translations.
mc.n81i.addTranslations({
    en: {
        githubPr: {
            message: "Search GitHub PR by Commit SHA",
        },
        commitSha: {
            message: "Commit SHA",
        },
    },
});
```

![](https://github.com/user-attachments/assets/087e4af9-9ff2-4868-9dfb-cbb801742de6)


## Screenshots

![](https://raw.githubusercontent.com/FOBshippingpoint/mencrouche/refs/heads/main/docs/public/media/index/student.webp)
![](https://raw.githubusercontent.com/FOBshippingpoint/mencrouche/refs/heads/main/docs/public/media/index/cook.webp)
![](https://raw.githubusercontent.com/FOBshippingpoint/mencrouche/refs/heads/main/docs/public/media/index/tmr.webp)
![](https://raw.githubusercontent.com/FOBshippingpoint/mencrouche/refs/heads/main/docs/public/media/index/light.webp)

## Authors

- [@FOBshippingpoint](https://github.com/FOBshippingpoint)

## License

- app: [AGPLv3](https://github.com/FOBshippingpoint/mencrouche/blob/main/LICENSE)
- packages: MIT, see LICENSE under individual package (e.g., `./packages/apocalypse/LICENSE`).
