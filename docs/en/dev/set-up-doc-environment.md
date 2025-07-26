---
next: false
---

# Set Up Documentation Environment

This document will guide you through setting up the environment for writing Mencrouche documentation.

## Environment Setup

Mencrouche documentation is built on [VitePress](https://vitepress.dev/), a static site generator built on Vue and Vite. Please follow the steps below to install the packages and start the documentation site locally:

1.  Install <dfn title="Bun is an all-in-one toolkit for JavaScript and TypeScript apps.">Bun</dfn> according to the [official guide](https://bun.sh/docs/installation)
    ```bash
    # Confirm if bun is installed successfully
    bun --version
    ```
2.  Clone the [Mencrouche repository](https://github.com/FOBshippingpoint/mencrouche)

    ```bash
    git clone https://github.com/FOBshippingpoint/mencrouche.git
    ```
3.  Install Git Large File Storage according to the [official guide](https://git-lfs.com/) (Mencrouche uses Git LFS to store large files, such as videos)
    ```bash
    git lfs install
    git pull
    ```
4.  Install the required libraries
    ```bash
    cd mencrouche/docs
    bun install
    ```
5.  Start the local website server
    ```bash
	bun run --bun --filter=@mencrouche/docs docs:dev --open
    ```
    You should see http://localhost:5173 open in your browser
6.  Try to change the text of the `mencrouche/docs/en/index.md` file and save it. You can see the text changes on the English homepage without refreshing the page.
