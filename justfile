# justfile is the "makefile" like commands recipes.
# See https://github.com/casey/just for more information.

default: clean-dev

dev:
  bun run --filter=@mencrouche/app site:dev

clean-dev: && dev
  rm -rf apps/mencrouche/.parcel-cache

doc:
  bun run --filter=@mencrouche/docs docs:dev --open

loc:
  @echo Counting line of codes...
  @find apps/mencrouche/src -name '*.ts' \
  | xargs -n 1 wc -l \
  | awk '{ sum += $1 } END { print sum, "lines (^_^)" }'  

todo:
  @echo Listing todos...
  @find apps/mencrouche/src -name '*.ts' \
  | xargs -n 1 awk -v RS= ' /TODO/ { sum += 1; print $0; } END { if (sum > 0) print sum, "todos orz\n" }'  
