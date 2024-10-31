import { Apocalypse, apocalypse } from "./apocalypse";
import { registerContextMenu } from "./contextMenu";
import { dataset, addTodoAfterLoad, addTodoBeforeSave } from "./dataWizard";
import { getTemplateWidgets } from "./utils/getTemplateWidgets";
import { n81i } from "./utils/n81i";
import { BinPacker } from "./utils/packer";
import { markDirtyAndSaveDocument } from "./lifesaver";
import { $, $$, $$$, type Allowance } from "./utils/dollars";
import { implementation } from "happy-dom/lib/PropertySymbol.js";

export interface StickyPlugin {}
interface StickyConfig extends Record<string, unknown> {
  pluginConfig?: CustomStickyConfig;
}
export interface Sticky<T extends StickyPlugin = StickyPlugin>
  extends Allowance<HTMLDivElement> {
  type: string;
  delete: () => void;
  forceDelete: () => void;
  duplicate: () => Sticky;
  toggleMaximize: () => void;
  toggleGhostMode: () => void;
  togglePin: () => void;
  addControlWidget: (element: HTMLElement) => void;
  replaceBody: (...nodes: (Node | string)[]) => void;
  save: () => StickyConfig;
  plugin: T;
}

// This element is for getting var(--size-fluid-9) in pixels. So that we can
// set default sticky position to center if user hasn't move the cursor yet.
const stickySizeDummy = $<HTMLDivElement>("#stickySizeDummy")!;
const stickyContainer = $<HTMLDivElement>(".stickyContainer")!;

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

export class Zoomable implements ZoomContext {
  scale = 1;
  translateX = 0;
  translateY = 0;

  el: HTMLElement;
  interactEl: HTMLElement;
  minScale: number;
  maxScale: number;

  constructor(
    targetEl: HTMLElement,
    options: {
      minScale?: number;
      maxScale?: number;
      interactEl?: HTMLElement;
    } = {},
  ) {
    this.el = targetEl;
    this.interactEl = options.interactEl ?? targetEl;
    this.minScale = options.minScale ?? 0.125;
    this.maxScale = options.maxScale ?? 4;

    // Setup wheel listener
    this.interactEl.on("wheel", (e) => {
      // Ctrl + wheel scroll to zoom.
      if (!e.ctrlKey) return;

      e.preventDefault();
      // Convert mouse position to relative to content position
      const rect = this.el.getBoundingClientRect();
      const dx = (e.clientX - rect.x) / this.scale;
      const dy = (e.clientY - rect.y) / this.scale;
      // Calculate new scale
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = clamp(
        this.minScale,
        this.scale * zoomFactor,
        this.maxScale,
      );
      if (newScale !== this.scale) {
        // Calculate new position to keep mouse point fixed
        const newX = this.translateX + (e.clientX - rect.x) - dx * newScale;
        const newY = this.translateY + (e.clientY - rect.y) - dy * newScale;
        this.scale = newScale;
        this.translateX = newX;
        this.translateY = newY;
        this.applyTransform();
      }
    });
  }

  applyTransform() {
    this.el.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }
}

class StickyWorkspace {
  stickyContainer: Allowance<HTMLDivElement>;
  workspaceContainer: Allowance<HTMLDivElement>;
  zoomable: Zoomable;
  #highestZIndex: number = 0;
  /** An array for tracking the sticky order `[lowest, ..., topest]` */
  #stickies: Sticky[] = [];
  #apocalypse: Apocalypse;
  buildSticky: ReturnType<typeof buildBuildSticky>;

  constructor(apocalypse: Apocalypse) {
    this.#apocalypse = apocalypse;

    this.workspaceContainer = $$$("div");
    this.workspaceContainer.className = "workspace";

    this.stickyContainer = $$$("div");
    this.stickyContainer.className = "stickyContainer";

    this.workspaceContainer.appendChild(this.stickyContainer);

    this.zoomable = new Zoomable(this.stickyContainer, {
      interactEl: this.workspaceContainer,
    });
    // Peak hidden border when pressing ctrl key.
    document.body.on("keydown", (e) => {
      this.stickyContainer.classList.toggle("peakGhost", e.ctrlKey);
    });
    document.body.on("keyup", (e) => {
      this.stickyContainer.classList.toggle("peakGhost", e.ctrlKey);
    });

    // Continuosly track the cursor position.
    const cursorPoint: CursorPoint = [
      this.stickyContainer.offsetWidth / 2, // default x
      (this.stickyContainer.offsetHeight - stickySizeDummy.offsetWidth) / 2, // default y
    ];
    this.workspaceContainer.on("pointermove", (e) => {
      const rect = this.stickyContainer.getBoundingClientRect();
      cursorPoint[0] = (e.clientX - rect.x) / this.zoomable.scale;
      cursorPoint[1] = (e.clientY - rect.y) / this.zoomable.scale;
    });

    // Build buildSticky function that has wrap with dynamic cursor point.
    this.buildSticky = buildBuildSticky(cursorPoint, this);

    this.refreshHighestZIndex();
  }

  refreshHighestZIndex() {
    // Find and set the highestZIndex when initialize from existing document.
    this.#highestZIndex = 0;
    for (const sticky of this.workspaceContainer.$$(".sticky")) {
      const zIndex = parseInt(sticky.style.zIndex);
      if (zIndex > this.#highestZIndex) {
        this.#highestZIndex = zIndex;
      }
    }
  }

  restoreAndReplaceAll(stickies: BuildStickyOptions[]) {
    this.forceDeleteAll();
    for (const sticky of stickies) {
      this.#restoreSticky(sticky);
    }
    this.refreshHighestZIndex();
  }

  delete(sticky: Sticky) {
    const obj = this.save(sticky);
    this.#apocalypse.write({
      execute: () => {
        this.#deleteSticky(sticky);
        markDirtyAndSaveDocument();
      },
      undo: () => {
        this.#restoreSticky(obj);
        markDirtyAndSaveDocument();
      },
    });
  }

  deleteLatest() {
    const sticky = this.getLatestSticky();
    if (sticky) {
      this.delete(sticky);
      markDirtyAndSaveDocument();
    }
  }

  forceDelete(sticky: Sticky) {
    this.#stickies.splice(this.#stickies.indexOf(sticky), 1);
    sticky.remove();
    markDirtyAndSaveDocument();
  }

  forceDeleteAll() {
    for (const sticky of this.#stickies) {
      sticky.remove();
    }
    this.#stickies.length = 0;
    markDirtyAndSaveDocument();
  }

  deleteAll() {
    const backup = this.saveAll();
    this.#apocalypse.write({
      execute: () => {
        while (this.#stickies.length) {
          this.#deleteSticky(this.#stickies.at(-1)!);
        }
        markDirtyAndSaveDocument();
      },
      undo: () => {
        for (const sticky of backup) {
          this.#restoreSticky(sticky);
        }
        markDirtyAndSaveDocument();
      },
    });
  }

  save(sticky: Sticky) {
    const config = sticky.save();
    config.pluginConfig = {};
    const customSticky = getCustomSticky(sticky);
    if (customSticky) {
      config.type = customSticky.type;
      Object.assign(config.pluginConfig, customSticky.onSave(sticky));
    }

    // If pluginConfig has any content, return as is.
    for (const _ in config.pluginConfig) {
      return config;
    }
    // If not, delete pluginConfig and return.
    delete config.pluginConfig;
    return config;
  }

  saveAll() {
    return this.#stickies.map(this.save);
  }

  duplicate(sticky: Sticky) {
    const config = this.save(sticky);
    const duplicated = this.buildSticky("restore", config);
    duplicated.style.left = `${duplicated.offsetLeft + 20}px`;
    duplicated.style.top = `${duplicated.offsetTop + 20}px`;
    this.#apocalypse.write({
      execute: () => {
        this.#addToTop(duplicated);
        duplicated.focus();
        markDirtyAndSaveDocument();
      },
      undo: () => {
        this.forceDelete(duplicated);
        markDirtyAndSaveDocument();
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
    let idx = this.#stickies.indexOf(sticky);
    if (idx !== -1) {
      this.#stickies.splice(idx, 1);
      this.#stickies.push(sticky);
      markDirtyAndSaveDocument();
    }
  }

  arrange() {
    const stickies: Sticky[] = [];
    for (const sticky of this.#stickies) {
      if (!sticky.classList.contains("pin")) {
        stickies.push(sticky);
      }
    }

    const GAP = 10;
    const stickyContainer = this.stickyContainer;
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

        onEventOrTimeout(
          stickyContainer,
          () => {
            stickyContainer.classList.remove("arranging");
            markDirtyAndSaveDocument();
          },
          "transitionend",
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
        onEventOrTimeout(
          stickyContainer,
          () => {
            stickyContainer.classList.remove("arranging");
            markDirtyAndSaveDocument();
          },
          "transitionend",
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

    const custom = getCustomSticky(sticky);
    if (custom) {
      custom.onDelete(sticky);
    }

    onEventOrTimeout(sticky, () => sticky.remove(), "animationend");
    sticky.classList.add("deleted");
  }

  #restoreSticky(options: BuildStickyOptions) {
    const sticky = this.buildSticky("restore", options);
    this.#stickies.push(sticky);
    this.stickyContainer.appendChild(sticky);
  }

  #addToTop(sticky: Sticky) {
    this.#stickies.push(sticky);
    this.moveToTop(sticky);
    this.stickyContainer.appendChild(sticky);
  }

  create(options: BuildStickyOptions) {
    let backupOptions: Record<string, unknown>;
    let sticky: Sticky;

    this.#apocalypse.write({
      execute: () => {
        sticky = this.buildSticky("create", backupOptions ?? options);
        this.#addToTop(sticky);
        backupOptions = sticky.save();
      },
      undo: () => {
        this.forceDelete(sticky);
      },
    });
  }

  pause(sticky: Sticky) {
    const prevRect = extractRect(sticky);

    return (type: "drag" | "resize") => {
      const currRect = extractRect(sticky);

      this.#apocalypse.write({
        toString() {
          return prevRect.toString() + type;
        },
        execute: () => {
          const s = sticky;
          if (type === "drag") {
            s.style.left = `${currRect[0]}px`;
            s.style.top = `${currRect[1]}px`;
          } else if (type === "resize") {
            s.style.width = `${currRect[2]}px`;
            s.style.height = `${currRect[3]}px`;
          }
        },
        undo: () => {
          const s = sticky;
          if (type === "drag") {
            if (prevRect[0] !== null && prevRect[0] !== undefined) {
              s.style.left = `${prevRect[0]}px`;
            }
            if (prevRect[1] !== null && prevRect[1] !== undefined) {
              s.style.top = `${prevRect[1]}px`;
            }
          } else if (type === "resize") {
            if (prevRect[2] !== undefined) {
              s.style.width = `${
                prevRect[2] === null
                  ? stickySizeDummy.getBoundingClientRect().width
                  : prevRect[2]
              }px`;
            }
            if (prevRect[3] !== undefined) {
              s.style.height = `${
                prevRect[3] === null
                  ? stickySizeDummy.getBoundingClientRect().width // Width not height because the dummy only had width with zero height.
                  : prevRect[3]
              }px`;
            }
          }
        },
      });
    };
  }

  getById(id: string) {
    for (const sticky of this.#stickies) {
      if (sticky.id === id) {
        return sticky;
      }
    }
  }
}

type CursorPoint = [number, number];
function buildBuildSticky(
  cursorPoint: CursorPoint,
  stickyWorkspace: StickyWorkspace,
) {
  return function buildSticky(
    buildType: "create" | "restore",
    {
      id,
      type,
      rect,
      zIndex,
      className,
      pluginConfig,
    }: BuildStickyOptions = {},
  ) {
    const sticky = $<HTMLDivElement>(
      getTemplateWidgets("sticky").firstElementChild as any,
    )!;

    sticky.id = id ?? crypto.randomUUID();
    const x = cursorPoint[0];
    const y = cursorPoint[1];

    if (rect) {
      const [left, top, width, height] = rect;

      if (typeof left === "number") {
        sticky.style.left = `${left}px`;
      } else {
        sticky.style.left = `${x - stickySizeDummy.getBoundingClientRect().width / 2}px`;
      }

      if (typeof top === "number") {
        sticky.style.top = `${top}px`;
      } else {
        sticky.style.top = `${y - 10}px`;
      }

      if (typeof width === "number") {
        sticky.style.width = `${width}px`;
      }

      if (typeof height === "number") {
        sticky.style.height = `${height}px`;
      }
    } else {
      sticky.style.left = `${x - stickySizeDummy.getBoundingClientRect().width / 2}px`;
      sticky.style.top = `${y - 10}px`;
    }
    if (zIndex) {
      sticky.style.zIndex = zIndex.toString();
    }
    if (className) {
      sticky.className = className;
    }

    function enableStickyFunctionality(): Sticky {
      const stickyHeader = sticky.$(".stickyHeader")!;
      const deleteBtn = sticky.$<HTMLButtonElement>(".deleteBtn")!;
      const maximizeToggleLbl =
        sticky.$<HTMLLabelElement>(".maximizeToggleLbl")!;

      let resumeForDrag: (type: "drag" | "resize") => void;
      let resumeForResize: (type: "drag" | "resize") => void;

      const draggable = new Draggable(
        sticky,
        {
          handle: stickyHeader,
          container: stickyWorkspace.workspaceContainer,
          padding: 20,
          onDragStart: (e) => {
            if (sticky.classList.contains("maximized")) {
              sticky.style.top = "0px";
              sticky.style.left = `${e.clientX - sticky.offsetWidth / 2}px`;
              (sticky as Sticky).toggleMaximize();
            }
            resumeForDrag = stickyWorkspace.pause(sticky as Sticky);
          },
          onDragEnd: () => resumeForDrag("drag"),
        },
        stickyWorkspace.zoomable,
      );
      const resizable = new Resizable(
        sticky,
        {
          onResizeStart: () => {
            resumeForResize = stickyWorkspace.pause(sticky as Sticky);
          },
          onResizeEnd: () => {
            resumeForResize("resize");
          },
        },
        stickyWorkspace.zoomable,
      );

      const extendedSticky = sticky as Sticky;

      Object.assign(sticky, {
        delete() {
          stickyWorkspace.delete(extendedSticky);
        },
        forceDelete() {
          stickyWorkspace.forceDelete(extendedSticky);
        },
        duplicate() {
          stickyWorkspace.duplicate(extendedSticky);
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
          const config: {
            id: string;
            type: string;
            className: string;
            rect?: Rectangle;
            zIndex?: number;
          } = {
            id: extendedSticky.id,
            type: extendedSticky.type,
            className: sticky.className,
          };
          config.rect = extractRect(sticky);
          const zIndex = sticky.style.zIndex;
          if (zIndex !== "") {
            config.zIndex = parseInt(zIndex);
          }

          return config;
        },
      });

      sticky.on("pointerdown", (e) => {
        if (e.button !== 2 /* NOT right-click */) {
          stickyWorkspace.moveToTop(extendedSticky);
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
    // TODO: should not return?
    const basicSticky = enableStickyFunctionality();
    basicSticky.dataset.contextMenu = "basic";
    if (type) {
      const custom = customStickiComposers.get(type);
      if (custom) {
        if (buildType === "create") {
          custom.onCreate(basicSticky);
          basicSticky.classList.add(type);
          basicSticky.type = type;
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
  };
}

export const stickyWorkspace = new StickyWorkspace(apocalypse);

export function extractRect(element: HTMLElement): Rectangle {
  const rect: Rectangle = [null, null, null, null];
  const rectProperties = ["left", "top", "width", "height"] as const;
  rectProperties.forEach((prop, index) => {
    const value = element.style[prop];
    rect[index] = value ? parseInt(value) : null;
  });
  return rect;
}

const customStickiComposers = new Map<string, CustomStickyComposer>();

type Rectangle = [
  left: number | null,
  top: number | null,
  width: number | null,
  height: number | null,
];
export interface BuildStickyOptions {
  id?: string;
  type?: string;
  rect?: Rectangle;
  zIndex?: number;
  className?: string;
  pluginConfig?: CustomStickyConfig;
  pointerX?: number;
  pointerY?: number;
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

export function getCustomSticky(sticky: Allowance<HTMLDivElement> | Sticky) {
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

addTodoBeforeSave(() => {
  dataset.setItem("stickies", stickyWorkspace.saveAll());
});
addTodoAfterLoad(() => {
  const stickies = dataset.getOrSetItem<BuildStickyOptions[]>("stickies", []);
  stickyWorkspace.restoreAndReplaceAll(stickies);
});

function onEventOrTimeout<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  todo: () => void,
  type: K,
  timeout = 1000,
) {
  let timeoutId: number;

  const handler = () => {
    clearTimeout(timeoutId);
    todo();
  };

  el.on(type, handler, { once: true });

  timeoutId = window.setTimeout(() => {
    el.off(type, handler);
    todo();
  }, timeout);
}

// Types
interface DragOptions {
  handle?: HTMLElement;
  container?: HTMLElement;
  padding?: number;
  onDragStart?: (e: PointerEvent) => void;
  onDrag?: (e: PointerEvent) => void;
  onDragEnd?: (e: PointerEvent) => void;
}

interface ResizeOptions {
  onResizeStart?: (e: PointerEvent) => void;
  onResize?: (e: PointerEvent) => void;
  onResizeEnd?: (e: PointerEvent) => void;
}

interface ZoomContext {
  scale: number;
}

class ZoomAware {
  zoomContext: ZoomContext;
  static NO_SCALE_ZOOM_CONTEXT = { scale: 1 };

  constructor(zoomContext?: ZoomContext) {
    this.zoomContext = zoomContext ?? ZoomAware.NO_SCALE_ZOOM_CONTEXT;
  }

  get scale() {
    return this.zoomContext.scale;
  }
}

function clamp(min: number, value: number, max: number) {
  return Math.min(Math.max(min, value), max);
}

export class Draggable extends ZoomAware {
  private element: HTMLElement;
  private handle: HTMLElement;
  private container: HTMLElement;
  private options: DragOptions;
  private padding = 0;
  private isDragging = false;
  private initialX = 0;
  private initialY = 0;
  private dx = 0;
  private dy = 0;

  constructor(
    element: HTMLElement,
    options: DragOptions = {},
    zoomContext?: ZoomContext,
  ) {
    super(zoomContext);
    this.element = element;
    this.handle = options.handle ?? element;
    this.container = options.container ?? document.body;
    this.padding = options.padding ?? this.padding;
    this.options = options;
    this.init();
  }

  private init() {
    this.handle.on("pointerdown", this.dragStart.bind(this));
  }

  private dragStart(e: PointerEvent) {
    if (e.button === 2) return; // Ignore right-click

    this.isDragging = true;
    this.initialX = e.clientX;
    this.initialY = e.clientY;

    document.on("pointermove", this.drag.bind(this));
    document.on("pointerup", this.dragEnd.bind(this));

    this.options.onDragStart?.(e);
  }

  private drag(e: PointerEvent) {
    if (!this.isDragging) return;
    e.preventDefault();

    // Delta of every drag moment.
    this.dx = e.clientX - this.initialX;
    this.dy = e.clientY - this.initialY;
    // Reset initial point by current cursor point.
    this.initialX = e.clientX;
    this.initialY = e.clientY;

    // TODO: fix min, max boundary
    // const minX = -this.element.offsetWidth + this.padding;
    // const minY = 0;
    // const maxX = this.container.offsetWidth - this.padding;
    // const maxY = this.container.offsetHeight - this.padding;
    // this.currentX = Math.min(Math.max(this.currentX, minX), maxX);
    // this.currentY = Math.min(Math.max(this.currentY, minY), maxY);

    this.element.style.left = `${parseInt(this.element.style.left) + this.dx / this.scale}px`;
    this.element.style.top = `${parseInt(this.element.style.top) + this.dy / this.scale}px`;

    this.options.onDrag?.(e);
  }

  private dragEnd(e: PointerEvent) {
    this.isDragging = false;

    document.off("pointermove", this.drag.bind(this));
    document.off("pointerup", this.dragEnd.bind(this));

    this.options.onDragEnd?.(e);
  }

  destroy() {
    this.handle.off("pointerdown", this.dragStart.bind(this));
  }
}

export class Resizable extends ZoomAware {
  private element: HTMLElement;
  private options: ResizeOptions;
  private isResizing = false;
  private currentHandle: HTMLElement | null = null;
  private handles: HTMLElement[] = [];
  private initialX = 0;
  private initialY = 0;
  private initialWidth = 0;
  private initialHeight = 0;
  private initialLeft = 0;
  private initialTop = 0;

  constructor(
    element: HTMLElement,
    options: ResizeOptions = {},
    zoomContext?: ZoomContext,
  ) {
    super(zoomContext);
    this.element = element;
    this.options = options;
    this.createEightHandles();
  }

  private createEightHandles() {
    const frag = new DocumentFragment();
    for (const pos of ["t", "r", "b", "l", "t l", "t r", "b l", "b r"]) {
      const handle = $$$("div");
      handle.className = `resizeHandle ${pos}`;
      frag.appendChild(handle);
      handle.on("pointerdown", this.resizeStart.bind(this));
      this.handles.push(handle);
    }
    this.element.appendChild(frag);
  }

  private resizeStart(e: PointerEvent) {
    e.preventDefault();
    this.isResizing = true;
    this.currentHandle = e.target as HTMLElement;
    this.initialX = e.clientX;
    this.initialY = e.clientY;
    this.initialWidth = this.element.offsetWidth;
    this.initialHeight = this.element.offsetHeight;
    this.initialLeft = this.element.offsetLeft;
    this.initialTop = this.element.offsetTop;
    document.on("pointermove", this.resize.bind(this));
    document.on("pointerup", this.resizeEnd.bind(this));
    this.options.onResizeStart?.(e);
  }

  private resize(e: PointerEvent) {
    if (!this.isResizing || !this.currentHandle) return;

    const isHandleType = (type: "l" | "r" | "b" | "t") => {
      return this.currentHandle?.classList.contains(type);
    };

    const dx = (e.clientX - this.initialX) / this.scale;
    const dy = (e.clientY - this.initialY) / this.scale;

    if (isHandleType("r")) {
      this.element.style.width = `${this.initialWidth + dx}px`;
    }

    if (isHandleType("b")) {
      this.element.style.height = `${this.initialHeight + dy}px`;
    }

    if (isHandleType("l")) {
      // Because the min-width property is 'em' not 'px', thus we need getComputedStyle
      const minWidth = parseInt(getComputedStyle(this.element).minWidth);
      const newWidth = this.initialWidth - dx;

      if (minWidth < newWidth) {
        this.element.style.width = `${newWidth}px`;
        this.element.style.left = `${this.initialLeft + dx}px`;
      }
    }

    if (isHandleType("t")) {
      // Because the min-width property is 'em' not 'px', thus we need getComputedStyle
      const minHeight = parseInt(getComputedStyle(this.element).minHeight);
      const newHeight = this.initialHeight - dy;

      if (minHeight < newHeight) {
        this.element.style.height = `${newHeight}px`;
        this.element.style.top = `${this.initialTop + dy}px`;
      }
    }

    this.options.onResize?.(e);
  }

  private resizeEnd(e: PointerEvent) {
    this.isResizing = false;
    this.currentHandle = null;
    document.off("pointermove", this.resize.bind(this));
    document.off("pointerup", this.resizeEnd.bind(this));

    this.options.onResizeEnd?.(e);
  }

  destroy() {
    for (const handle of this.handles) {
      handle.off("pointerdown", this.resizeStart.bind(this));
      handle.remove();
    }
  }
}
