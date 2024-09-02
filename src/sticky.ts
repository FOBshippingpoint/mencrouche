import { Apocalypse, apocalypse } from "./apocalypse";
import { registerContextMenu } from "./contextMenu";
import { $, $$, type Allowance } from "./utils/dollars";
import { getTemplateWidgets } from "./utils/getTemplateWidgets";
import { n81i } from "./utils/n81i";
import { BinPacker } from "./utils/packer";

export interface StickyPlugin {}
export interface Sticky<T extends StickyPlugin = StickyPlugin>
  extends Allowance<HTMLDivElement> {
  delete: () => void;
  forceDelete: () => void;
  duplicate: () => Sticky;
  toggleMaximize: () => void;
  toggleGhostMode: () => void;
  togglePin: () => void;
  addControlWidget: (element: HTMLElement) => void;
  replaceBody: (...nodes: (Node | string)[]) => void;
  save: () => Record<string, unknown>;
  plugin: T;
}

// This element is for getting var(--size-fluid-9) in pixels. So that we can
// set default sticky position to center if user hasn't move the cursor yet.
const stickySizeDummy = $<HTMLDivElement>("#stickySizeDummy")!;
const stickyContainer = $<HTMLDivElement>(".stickyContainer")!;

// Continuosly track pointer position.
let pointerX = stickyContainer.getBoundingClientRect().width / 2;
let pointerY =
  (stickyContainer.getBoundingClientRect().height -
    stickySizeDummy.getBoundingClientRect().width) /
  2;
stickyContainer.on("pointermove", (e) => {
  pointerX = e.clientX - stickyContainer!.getBoundingClientRect().left;
  pointerY = e.clientY - stickyContainer!.getBoundingClientRect().top;
});

const mutationObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.target.dispatchEvent(new CustomEvent("classchange"));
  }
});

registerContextMenu("basic", [
  (sticky: Sticky) => ({
    name: "delete_sticky",
    icon: "lucide-trash",
    execute() {
      sticky.delete();
    },
  }),
  (sticky: Sticky) => ({
    name: "duplicate_sticky",
    icon: "lucide-copy",
    execute() {
      sticky.duplicate();
    },
  }),
  (sticky: Sticky) => ({
    name:
      (sticky.classList.contains("maximized") ? "minimize" : "maximize") +
      "_sticky",
    icon: sticky.classList.contains("maximized")
      ? "lucide-minimize-2"
      : "lucide-maximize-2",
    execute() {
      sticky.toggleMaximize();
    },
  }),
  (sticky: Sticky) => ({
    name: (sticky.classList.contains("pin") ? "unpin" : "pin") + "_sticky",
    icon: sticky.classList.contains("pin") ? "lucide-pin-off" : "lucide-pin",
    execute() {
      sticky.togglePin();
    },
  }),
  (sticky: Sticky) => ({
    name:
      "sticky_ghost_mode_" +
      (sticky.classList.contains("ghost") ? "off" : "on"),
    icon: sticky.classList.contains("ghost")
      ? "lucide-square"
      : "lucide-box-select",
    execute() {
      sticky.toggleGhostMode();
    },
  }),
]);

class StickyManager {
  #highestZIndex: number = 0;
  /** An array for tracking the sticky order, from lowest -> topest */
  #stickies: Sticky[] = [];
  #apocalypse: Apocalypse;

  constructor(apocalypse: Apocalypse) {
    this.#apocalypse = apocalypse;
    this.refreshHighestZIndex();
  }

  refreshHighestZIndex() {
    // Find and set the highestZIndex when initialize from existing document.
    this.#highestZIndex = 0;
    for (const sticky of $$(".sticky")) {
      const zIndex = parseInt(sticky.style.zIndex);
      if (zIndex > this.#highestZIndex) {
        this.#highestZIndex = zIndex;
      }
    }
  }

  restoreAll(stickies: BuildStickyOptions[]) {
    for (const sticky of stickies) {
      this.#restoreSticky(sticky);
    }
  }

  delete(sticky: Sticky) {
    const obj = this.save(sticky);
    this.#apocalypse.write({
      execute: () => {
        this.#deleteSticky(sticky);
      },
      undo: () => {
        this.#restoreSticky(obj);
      },
    });
  }

  deleteLatest() {
    const sticky = this.getLatestSticky();
    if (sticky) {
      this.delete(sticky);
    }
  }

  forceDelete(sticky: Sticky) {
    this.#stickies.splice(this.#stickies.indexOf(sticky), 1);
    sticky.remove();
  }

  deleteAll() {
    const backup = this.saveAll();
    this.#apocalypse.write({
      execute: () => {
        while (this.#stickies.length) {
          this.#deleteSticky(this.#stickies.at(-1)!);
        }
      },
      undo: () => {
        for (const sticky of backup) {
          this.#restoreSticky(sticky);
        }
      },
    });
  }

  save(sticky: Sticky) {
    const obj = sticky.save();
    obj.pluginConfig = {};
    const customSticky = getCustomStickyComposer(sticky);
    if (customSticky) {
      obj.type = customSticky.type;
      Object.assign(obj.pluginConfig, customSticky.onSave(sticky));
    }

    // If pluginConfig has any content, return as is.
    for (const _ in obj.pluginConfig) {
      return obj;
    }
    // If not, delete pluginConfig and return.
    delete obj.pluginConfig;
    return obj;
  }

  saveAll() {
    return this.#stickies.map(this.save);
  }

  duplicate(sticky: Sticky) {
    const clone = $<HTMLDivElement>(sticky.cloneNode(true) as any);
    const duplicated = enableFunctionality(clone as any);
    this.#apocalypse.write({
      execute: () => {
        this.#addToTop(duplicated);
        duplicated.style.left = `${parseInt(duplicated.style.left, 10) + 20}px`;
        duplicated.style.top = `${parseInt(duplicated.style.top, 10) + 20}px`;
        duplicated.focus();
      },
      undo: () => {
        this.#deleteSticky(duplicated);
      },
    });
  }

  duplicateLatest() {
    const sticky = this.getLatestSticky();
    if (sticky) {
      this.duplicate(sticky);
    }
  }

  moveToTop(sticky: Sticky) {
    this.#highestZIndex++;
    sticky.style.zIndex = this.#highestZIndex.toString();
    sticky.style.order = this.#highestZIndex.toString();
  }

  arrange() {
    const stickies: Sticky[] = [];
    for (const sticky of this.#stickies) {
      if (!sticky.classList.contains("pin")) {
        stickies.push(sticky);
      }
    }

    const GAP = 10;

    apocalypse.write({
      execute() {
        const blocks = stickies.map((sticky) => {
          // Backup original position for undo.
          sticky.dataset.left = sticky.style.left;
          sticky.dataset.top = sticky.style.top;

          const block = {
            x: sticky.getBoundingClientRect().x + GAP,
            y: sticky.getBoundingClientRect().y + GAP,
            w: sticky.getBoundingClientRect().width + GAP,
            h: sticky.getBoundingClientRect().height + GAP,
          };
          return block;
        });

        const packer = new BinPacker(
          stickyContainer.getBoundingClientRect().width - GAP * 2,
          stickyContainer.getBoundingClientRect().height - GAP * 2,
        );
        const fittedBlocks = packer.fit(blocks);

        stickyContainer.on(
          "transitionend",
          () => stickyContainer.classList.remove("arranging"),
          {
            once: true,
          },
        );
        for (let i = 0; i < fittedBlocks.length; i++) {
          const sticky = stickies[i]!;
          const fitted = fittedBlocks[i];
          if (fitted) {
            sticky.style.left = `${fitted.x + GAP}px`;
            sticky.style.top = `${fitted.y + GAP}px`;
          }
        }
        stickyContainer.classList.add("arranging");
      },
      undo() {
        stickyContainer.on(
          "transitionend",
          () => stickyContainer.classList.remove("arranging"),
          {
            once: true,
          },
        );
        for (const sticky of stickies) {
          sticky.style.left = sticky.dataset.left!;
          sticky.style.top = sticky.dataset.top!;
          delete sticky.dataset.left;
          delete sticky.dataset.top;
        }
        stickyContainer.classList.add("arranging");
      },
    });
  }

  getLatestSticky() {
    return this.#stickies.at(-1);
  }

  getAllStickies(): readonly Sticky[] {
    return this.#stickies;
  }

  #deleteSticky(sticky: Sticky) {
    const idx = this.#stickies.indexOf(sticky);
    if (idx !== -1) {
      this.#stickies.splice(idx, 1);
    }
    this.#stickies.at(-1)?.focus();

    const custom = getCustomStickyComposer(sticky);
    if (custom) {
      custom.onDelete(sticky);
    }

    sticky.on(
      "animationend",
      () => {
        sticky.remove();
      },
      {
        once: true,
      },
    );
    sticky.classList.add("deleted");
  }

  #restoreSticky(options: BuildStickyOptions) {
    const sticky = buildSticky("restore", options);
    this.#stickies.push(sticky);
    stickyContainer.appendChild(sticky);
  }

  #addToTop(sticky: Sticky) {
    this.moveToTop(sticky);
    this.#stickies.push(sticky);
    stickyContainer.appendChild(sticky);
  }

  create(options: BuildStickyOptions) {
    let backupOptions: Record<string, unknown>;
    let sticky: Sticky;

    this.#apocalypse.write({
      execute: () => {
        sticky = buildSticky("create", backupOptions ?? options);
        this.#addToTop(sticky);
        backupOptions = sticky.save();
      },
      undo: () => {
        this.forceDelete(sticky);
      },
    });
  }
}

function buildSticky(
  buildType: "create" | "restore",
  {
    type,
    left,
    top,
    width,
    height,
    zIndex,
    className,
    pluginConfig,
  }: BuildStickyOptions = {},
) {
  const sticky = $<HTMLDivElement>(
    getTemplateWidgets("sticky").firstElementChild as any,
  )!;

  if (left) {
    sticky.style.left = `${left}px`;
  } else {
    sticky.style.left = `${pointerX - stickySizeDummy.getBoundingClientRect().width / 2}px`;
  }
  if (top) {
    sticky.style.top = `${top}px`;
  } else {
    sticky.style.top = `${Math.max(pointerY - 10, 0)}px`;
  }
  if (width) {
    sticky.style.width = `${width}px`;
  }
  if (height) {
    sticky.style.height = `${height}px`;
  }
  if (zIndex) {
    sticky.style.zIndex = zIndex.toString();
  }
  if (className) {
    sticky.className = className;
  }

  const basicSticky = enableFunctionality(sticky);
  basicSticky.dataset.contextMenu = "basic";
  if (type) {
    const custom = customStickiComposers.get(type);
    if (custom) {
      if (buildType === "create") {
        custom.onCreate(basicSticky);
        basicSticky.classList.add(type);
      } else if (buildType === "restore") {
        custom.onRestore(basicSticky, pluginConfig);
      }
    } else {
      throw Error(
        `Custom sticky type '${type}' not found. Please register sticky type first via 'registerSticky'.`,
      );
    }
  }
  n81i.translateElement(basicSticky);

  return basicSticky;
}

export const stickyManager = new StickyManager(apocalypse);

export function enableFunctionality(sticky: Allowance<HTMLDivElement>): Sticky {
  const stickyHeader = sticky.$(".stickyHeader")!;
  const deleteBtn = sticky.$<HTMLButtonElement>(".deleteBtn")!;
  const maximizeToggleLbl = sticky.$<HTMLLabelElement>(".maximizeToggleLbl")!;

  // Drag-and-drop variables
  let isDragging = false;
  let dragCurrentX: number;
  let dragCurrentY: number;
  let dragInitialX: number;
  let dragInitialY: number;
  let dragX = parseInt(sticky.style.left, 10) || pointerX;
  let dragY = parseInt(sticky.style.top, 10) || pointerY;

  stickyHeader.on("pointerdown", dragStart);

  // Resize variables
  const resizeHandles = sticky.$$<HTMLDivElement>(".resizeHandle");
  let isResizing = false;
  let resizeHandle: HTMLDivElement | null = null;
  let resizeStartX: number;
  let resizeStartY: number;
  let resizeStartWidth: number;
  let resizeStartHeight: number;
  let resizeStartLeft: number;
  let resizeStartTop: number;

  for (const handle of resizeHandles) {
    handle.on("pointerdown", resizeStart);
  }

  function dragStart(e: PointerEvent) {
    if (e.button !== 2 && e.target === stickyHeader) {
      isDragging = true;
      if (sticky.classList.contains("maximized")) {
        sticky.style.top = "0px";

        let width: number;
        if (sticky.style.width) {
          width = parseInt(sticky.style.width, 10);
        } else {
          width = stickySizeDummy.getBoundingClientRect().width;
        }
        sticky.style.left = `${e.clientX - width / 2}px`;
        (sticky as Sticky).toggleMaximize();
      }
    }

    dragInitialX = e.clientX - sticky.offsetLeft;
    dragInitialY = e.clientY - sticky.offsetTop;

    document.on("pointermove", drag);
    document.on("pointerup", dragEnd);
  }

  function drag(e: PointerEvent) {
    if (isDragging && !isResizing) {
      e.preventDefault();
      dragCurrentX = e.clientX - dragInitialX;
      dragCurrentY = e.clientY - dragInitialY;

      const maxX = stickyContainer.offsetWidth - 20;
      const maxY = stickyContainer.offsetHeight - 20;
      const minX = -sticky.offsetWidth + 20;
      const minY = 0;

      dragX = Math.min(Math.max(dragCurrentX, minX), maxX);
      dragY = Math.min(Math.max(dragCurrentY, minY), maxY);

      sticky.style.left = `${dragX}px`;
      sticky.style.top = `${dragY}px`;
    }
  }

  function dragEnd() {
    dragInitialX = sticky.offsetLeft;
    dragInitialY = sticky.offsetTop;
    isDragging = false;

    document.removeEventListener("pointermove", drag);
    document.removeEventListener("pointerup", dragEnd);
  }

  function resizeStart(e: PointerEvent) {
    e.preventDefault();

    isResizing = true;
    resizeHandle = e.target as HTMLDivElement;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = sticky.offsetWidth;
    resizeStartHeight = sticky.offsetHeight;
    resizeStartLeft = sticky.offsetLeft;
    resizeStartTop = sticky.offsetTop;

    document.on("pointermove", resize);
    document.on("pointerup", resizeEnd);
  }

  function resize(e: PointerEvent) {
    if (!isResizing) return;
    const resizeDeltaX = e.clientX - resizeStartX;
    const resizeDeltaY = e.clientY - resizeStartY;

    if (
      resizeHandle!.classList.contains("right") ||
      resizeHandle!.classList.contains("bottomRight") ||
      resizeHandle!.classList.contains("topRight")
    ) {
      sticky.style.width = `${resizeStartWidth + resizeDeltaX}px`;
    }
    if (
      resizeHandle!.classList.contains("bottom") ||
      resizeHandle!.classList.contains("bottomRight") ||
      resizeHandle!.classList.contains("bottomLeft")
    ) {
      sticky.style.height = `${resizeStartHeight + resizeDeltaY}px`;
    }
    if (
      resizeHandle!.classList.contains("left") ||
      resizeHandle!.classList.contains("topLeft") ||
      resizeHandle!.classList.contains("bottomLeft")
    ) {
      if (
        parseInt(getComputedStyle(sticky).minWidth, 10) <
        resizeStartWidth - resizeDeltaX
      ) {
        sticky.style.width = `${resizeStartWidth - resizeDeltaX}px`;
        sticky.style.left = `${resizeStartLeft + resizeDeltaX}px`;
      }
    }
    if (
      resizeHandle!.classList.contains("top") ||
      resizeHandle!.classList.contains("topLeft") ||
      resizeHandle!.classList.contains("topRight")
    ) {
      if (
        parseInt(getComputedStyle(sticky).minHeight, 10) <
        resizeStartHeight - resizeDeltaY
      ) {
        sticky.style.height = `${resizeStartHeight - resizeDeltaY}px`;
        sticky.style.top = `${resizeStartTop + resizeDeltaY}px`;
      }
    }
  }

  function resizeEnd() {
    isResizing = false;

    document.removeEventListener("pointermove", resize);
    document.removeEventListener("pointerup", resizeEnd);
  }

  const extendedSticky = sticky as Sticky;

  Object.assign(sticky, {
    delete() {
      stickyManager.delete(extendedSticky);
    },
    forceDelete() {
      stickyManager.forceDelete(extendedSticky);
    },
    duplicate() {
      stickyManager.duplicate(extendedSticky);
    },
    toggleMaximize() {
      maximizeToggleLbl.$$("svg").do((el) => el.classList.toggle("none"));
      sticky.classList.toggle("maximized");

      sticky.dispatchEvent(
        new CustomEvent(
          sticky.classList.contains("maximized") ? "minimize" : "maximize",
        ),
      );
    },
    toggleGhostMode() {
      sticky.classList.toggle("ghost");
    },
    togglePin() {
      sticky.classList.toggle("pin");
      if (sticky.classList.contains("pin")) {
        sticky.dispatchEvent(new CustomEvent("pin"));
      } else {
        sticky.dispatchEvent(new CustomEvent("unpin"));
      }
    },
    addControlWidget(element: HTMLElement) {
      sticky.$<HTMLDivElement>(".controls slot")!.appendChild(element);
    },
    replaceBody(...nodes: (Node | string)[]) {
      sticky.$(".stickyBody")!.replaceChildren(...nodes);
    },
    plugin: {},
    save() {
      const obj = {
        className: sticky.className,
      };
      for (const key of ["width", "height", "left", "top", "zIndex"]) {
        const value = sticky.style[key as keyof typeof sticky.style];
        if (value !== "") {
          obj[key] = parseFloat(value);
        }
      }
      return obj;
    },
  });

  sticky.on("pointerdown", (e) => {
    if (e.button !== 2 /* Not right-click */) {
      stickyManager.moveToTop(extendedSticky);
    }
  });

  deleteBtn.on("click", () => {
    extendedSticky.delete();
  });

  maximizeToggleLbl.on("change", () => {
    extendedSticky.toggleMaximize();
  });

  mutationObserver.observe(sticky, { attributeFilter: ["class"] });

  // colorful outline
  // [].forEach.call($$("*"), function (a) { a.style.outline = "1px solid #" + (~~(Math.random() * (1 << 24))).toString(16); });

  return sticky as Sticky;
}

const customStickiComposers = new Map<string, CustomStickyComposer>();

export interface BuildStickyOptions {
  type?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  className?: string;
  pluginConfig?: CustomStickyConfig;
}

export interface CustomStickyConfig extends Record<string, unknown> {}
export interface CustomStickyComposer {
  type: string;
  onCreate(sticky: Sticky): void;
  onSave(sticky: Sticky): CustomStickyConfig | undefined;
  onDelete(sticky: Sticky): void;
  onRestore(sticky: Sticky, config?: CustomStickyConfig): void;
}

export function registerSticky(customSticky: CustomStickyComposer) {
  if (customStickiComposers.has(customSticky.type)) {
    throw Error(
      `Custom sticky '${customSticky.type}' already exists. Please try another name.`,
    );
  }

  customStickiComposers.set(customSticky.type, customSticky);
}

export function getCustomStickyComposer(
  sticky: Allowance<HTMLDivElement> | Sticky,
) {
  for (const className of sticky.classList.values()) {
    const custom = customStickiComposers.get(className);
    if (custom) {
      return custom;
    }
  }
}

export function getCustomStickyTypes() {
  return [...customStickiComposers.values()].map(({ type }) => type);
}

export function getWidgets(sticky: Sticky, widgetTemplateId: string) {
  for (const type of getCustomStickyTypes()) {
    if (sticky.classList.contains(type)) {
      return sticky;
    }
  }

  return getTemplateWidgets(widgetTemplateId)!;
}
