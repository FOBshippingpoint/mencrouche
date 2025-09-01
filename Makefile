# If you are not familir with makefile (just like me),
# you can start with https://makefiletutorial.com/

.DEFAULT_GOAL := dev

# Start dev server and open in browser.
dev:
	bun run --bun --filter=@mencrouche/app site:dev

# Build static website for the app.
build:
	bun run --bun --filter=@mencrouche/app site:build

# Build static website for the app.
build-web-ext:
	bun run --bun --filter=@mencrouche/app site:build
	bun run --bun --filter=@mencrouche/app ext:pack

# Build packages
build-package:
	bun run --filter=@mencrouche/dataset \
				  --filter=@mencrouche/apocalypse \
				  --filter=@mencrouche/dollars \
				  --filter=@mencrouche/n81i \
					build
	bun run --filter=@mencrouche/types build

format:
	bun run format

# Start documentation site dev server.
doc:
	bun run --filter=@mencrouche/docs docs:dev --open
