# Set Up Development Environment

This document will guide you through setting up the environment for developing Mencrouche.

## Installation

1. Install <dfn title="Bun is an all-in-one toolkit for JavaScript and TypeScript apps.">Bun</dfn> according to the [official guide](https://bun.sh/docs/installation)
    ```bash
    # Confirm if bun is installed successfully
    bun --version
    ```
2. Clone the [Mencrouche repository](https://github.com/FOBshippingpoint/mencrouche)

    ```bash
    git clone https://github.com/FOBshippingpoint/mencrouche.git
    ```
3. Install the required libraries
    ```bash
    cd mencrouche
    bun install
    ```

## Development Server

1. Build the required packages
    ```bash
    bun run --filter=@mencrouche/dataset build
    bun run --filter=@mencrouche/apocalypse build
    bun run --filter=@mencrouche/dollars build
    bun run --filter=@mencrouche/n81i build
    bun run --filter=@mencrouche/types build
    ```
2. Start the development server
    ```bash
    bun run --bun --filter=@mencrouche/app site:dev
    ```
    You should see http://localhost:5173 open in your browser
