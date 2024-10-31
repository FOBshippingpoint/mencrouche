# justfile is the "makefile" like commands recipes.
# See https://github.com/casey/just for more information.

default: clean-dev
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

todo:
  @echo Listing todos...
  @/usr/bin/find src -name '*.ts' \
  | xargs -n 1 awk -v RS= ' /TODO/ { sum += 1; print $0; } END { if (sum > 0) print sum, "todos orz\n" }'  
