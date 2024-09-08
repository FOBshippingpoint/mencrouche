# justfile is the "makefile" like commands recipes.
# See https://github.com/casey/just for more information.

default: dev
alias cd := clean-dev

dev:
  bun dev-site

clean-dev: && dev
  rm -rf .parcel-cache

loc:
  @echo Counting line of codes...
  @/usr/bin/find src -name '*.ts' \
  | xargs -n 1 wc -l \
  | awk '{ sum += $1 } END { print sum, "lines (^_^)" }'  
