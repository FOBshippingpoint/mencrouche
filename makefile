# If you are not familir with makefile (just like me),
# you can start with https://makefiletutorial.com/

.DEFAULT_GOAL := clean-dev

# Start dev server and open in browser.
dev:
	bun run --filter=@mencrouche/app site:dev

# Clean app's cache.
clean:
	rm -rf apps/mencrouche/.parcel-cache

# Build static website for the app.
build:
	bun run --filter=@mencrouche/app site:build

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

# Clean app's cache & start dev server.
clean-dev: clean dev

clean-build: clean build

# Start documentation site dev server.
doc:
	bun run --filter=@mencrouche/docs docs:dev --open
