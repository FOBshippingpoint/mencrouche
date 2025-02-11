import { Apocalypse, apocalypse } from "../apocalypse";
import { registerContextMenu } from "../contextMenu";
import { dataset, addTodoAfterLoad, addTodoBeforeSave } from "../dataWizard";
import { getTemplateWidgets } from "../utils/getTemplateWidgets";
import { n81i } from "../utils/n81i";
import { BinPacker } from "../utils/packer";
import { markDirtyAndSaveDocument } from "../lifesaver";
import { Zoomable, type Transform } from "./zoom";
import { Resizable } from "./resize";
import { Draggable, type Offset } from "./drag";
import { $, $$$ } from "../utils/dollars";

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

export interface StickyPlugin {}
export interface StickyConfig<
  C extends CustomStickyConfig = CustomStickyConfig,
> {
  id?: string;
  type?: string;
  rect?: Rectangle;
  zIndex?: number;
  className?: string;
  pluginConfig?: C;
  dataset?: Record<string, unknown>;
}
export interface Sticky<
  T extends StickyPlugin = StickyPlugin,
  C extends CustomStickyConfig = CustomStickyConfig,
> extends HTMLDivElement {
  type: string;
  delete: () => void;
  forceDelete: () => void;
  duplicate: () => Sticky;
  toggleMaximize: () => void;
  toggleGhostMode: () => void;
  togglePin: () => void;
  addControlWidget: (element: HTMLElement) => void;
  replaceBody: (...nodes: (Node | string)[]) => void;
  save: () => StickyConfig<C>;
  plugin: T;
}

/**
 * `var(--size-fluid-9)` in pixels.
 *
 * Enable us to set centering sticky position
 * even if user hasn't move the cursor yet.
 */
const defaultWidth = $<HTMLDivElement>("#stickySizeDummy")!.offsetWidth;

const mutationObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.target.dispatchEvent(new CustomEvent("classchange"));
  }
});

registerContextMenu("basic", [
  (sticky: Sticky) => ({
    name: "deleteSticky",
    icon: "lucide-trash",
    execute() {
      sticky.delete();
    },
  }),
  (sticky: Sticky) => ({
    name: "duplicateSticky",
    icon: "lucide-copy",
    execute() {
      sticky.duplicate();
    },
  }),
  (sticky: Sticky) => ({
    name:
      (sticky.classList.contains("maximized") ? "minimize" : "maximize") +
      "Sticky",
    icon: sticky.classList.contains("maximized")
      ? "lucide-minimize-2"
      : "lucide-maximize-2",
    execute() {
      sticky.toggleMaximize();
    },
  }),
  (sticky: Sticky) => ({
    name: (sticky.classList.contains("pin") ? "unpin" : "pin") + "Sticky",
    icon: sticky.classList.contains("pin") ? "lucide-pin-off" : "lucide-pin",
    execute() {
      sticky.togglePin();
    },
  }),
  (sticky: Sticky) => ({
    name:
      "stickyGhostMode" + (sticky.classList.contains("ghost") ? "Off" : "On"),
    icon: sticky.classList.contains("ghost")
      ? "lucide-square"
      : "lucide-box-select",
    execute() {
      sticky.toggleGhostMode();
    },
  }),
]);

export interface WorkspaceConfig {
  /** CSS transform for stickyContainer. */
  transform: Transform;
  /** Offset left and offset top for stickyContainer. */
  offset: Offset;
  /** All stickies inside workspace. */
  stickies: StickyConfig[];
}
class StickyWorkspace {
  /** Contains stickies. */
  stickyContainer: HTMLDivElement;
  /**
   * Contains stickyContainer.
   * A simple html element wrapper, so that we can use
   * css transform without worrying outer layout.
   */
  workspaceContainer: HTMLDivElement;
  zoomable: Zoomable;
  draggable: Draggable;
  buildSticky: ReturnType<typeof buildBuildSticky>;
  private highestZIndex: number = 0;
  /** An array for tracking the sticky order `[lowest, ..., topest]` */
  private stickies: Sticky[] = [];
  private apocalypse: Apocalypse;

  constructor(apocalypse: Apocalypse) {
    this.apocalypse = apocalypse;

    this.workspaceContainer = $$$("div");
    this.workspaceContainer.className = "workspace";

    this.stickyContainer = $$$("div");
    this.stickyContainer.className = "stickyContainer";

    this.workspaceContainer.appendChild(this.stickyContainer);

    this.zoomable = new Zoomable(this.stickyContainer, {
      interactEl: this.workspaceContainer,
      onZoom: () => markDirtyAndSaveDocument(),
    });

    this.draggable = new Draggable(this.stickyContainer, {
      interactEl: this.workspaceContainer,
      acceptMouseButton: 1, // Only accept middle button drag.
      onDragStart: () => (this.workspaceContainer.style.cursor = "grab"),
      onDragEnd: () => this.workspaceContainer.style.removeProperty("cursor"),
      onDrag: () => markDirtyAndSaveDocument(),
    });

    // Peak hidden border when pressing ctrl key.
    document.body.on("keydown", (e) => {
      this.stickyContainer.classList.toggle("peakGhost", e.ctrlKey);
    });
    document.body.on("keyup", (e) => {
      this.stickyContainer.classList.toggle("peakGhost", e.ctrlKey);
    });

    // Continuosly track the cursor position.
    const cursorPoint: CursorPoint = [NaN, NaN];
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
    this.highestZIndex = 0;
    for (const sticky of this.workspaceContainer.$$<HTMLDivElement>(
      ".sticky",
    )) {
      const zIndex = parseInt(sticky.style.zIndex);
      if (zIndex > this.highestZIndex) {
        this.highestZIndex = zIndex;
      }
    }
  }

  restoreAndReplaceAll(stickies: StickyConfig[]) {
    this.forceDeleteAll();
    for (const sticky of stickies) {
      this.restoreSticky(sticky);
    }
    this.refreshHighestZIndex();
  }

  delete(sticky: Sticky) {
    const obj = this.saveSticky(sticky);
    this.apocalypse.write({
      execute: () => {
        this.deleteSticky(sticky);
        markDirtyAndSaveDocument();
      },
      undo: () => {
        this.restoreSticky(obj);
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
    this.stickies.splice(this.stickies.indexOf(sticky), 1);
    sticky.remove();
    markDirtyAndSaveDocument();
  }

  forceDeleteAll() {
    for (const sticky of this.stickies) {
      sticky.remove();
    }
    this.stickies.length = 0;
    markDirtyAndSaveDocument();
  }

  deleteAll() {
    const backup = this.saveAllStickies();
    this.apocalypse.write({
      execute: () => {
        while (this.stickies.length) {
          this.deleteSticky(this.stickies.at(-1)!);
        }
        markDirtyAndSaveDocument();
      },
      undo: () => {
        for (const sticky of backup) {
          this.restoreSticky(sticky);
        }
        markDirtyAndSaveDocument();
      },
    });
  }

  saveSticky(sticky: Sticky) {
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

  saveAllStickies() {
    return this.stickies.map(this.saveSticky);
  }

  /**
   * Save stickies and workspace attributes.
   * Use when serializing workspace.
   */
  saveWork(): WorkspaceConfig {
    return {
      stickies: this.saveAllStickies(),
      transform: this.zoomable.getTransform(),
      offset: this.draggable.getOffset(),
    };
  }

  duplicate(sticky: Sticky) {
    const config = this.saveSticky(sticky);
    const duplicated = this.buildSticky("restore", config);
    duplicated.style.left = `${duplicated.offsetLeft + 20}px`;
    duplicated.style.top = `${duplicated.offsetTop + 20}px`;
    this.apocalypse.write({
      execute: () => {
        this.addToTop(duplicated);
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
    this.highestZIndex++;
    sticky.style.zIndex = this.highestZIndex.toString();
    sticky.style.order = this.highestZIndex.toString();
    let idx = this.stickies.indexOf(sticky);
    if (idx !== -1) {
      this.stickies.splice(idx, 1);
      this.stickies.push(sticky);
      markDirtyAndSaveDocument();
    }
  }

  arrange() {
    const stickies: Sticky[] = [];
    for (const sticky of this.stickies) {
      if (!sticky.classList.contains("pin")) {
        stickies.push(sticky);
      }
    }

    const GAP = 10;
    const stickyContainer = this.stickyContainer;
    const workspaceContainer = this.workspaceContainer;
    apocalypse.write({
      execute() {
        const blocks = stickies.map((sticky) => {
          // Backup original position for undo.
          sticky.dataset.left = sticky.style.left;
          sticky.dataset.top = sticky.style.top;

          const block = {
            x: sticky.offsetLeft + GAP,
            y: sticky.offsetTop + GAP,
            w: sticky.offsetWidth + GAP,
            h: sticky.offsetHeight + GAP,
          };
          return block;
        });

        const packer = new BinPacker(
          workspaceContainer.offsetWidth / stickyWorkspace.zoomable.scale -
            GAP * 2,
          workspaceContainer.offsetHeight / stickyWorkspace.zoomable.scale -
            GAP * 2,
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
    return this.stickies.at(-1);
  }

  getAllStickies(): readonly Sticky[] {
    return this.stickies;
  }

  private deleteSticky(sticky: Sticky) {
    const idx = this.stickies.indexOf(sticky);
    if (idx !== -1) {
      this.stickies.splice(idx, 1);
    }
    this.stickies.at(-1)?.focus();

    const custom = getCustomSticky(sticky);
    if (custom) {
      custom.onDelete(sticky);
    }

    onEventOrTimeout(sticky, () => sticky.remove(), "animationend");
    sticky.classList.add("deleted");
  }

  private restoreSticky(options: StickyConfig) {
    const sticky = this.buildSticky("restore", options);
    this.stickies.push(sticky);
    this.stickyContainer.appendChild(sticky);
  }

  private addToTop(sticky: Sticky) {
    this.stickies.push(sticky);
    this.moveToTop(sticky);
    this.stickyContainer.appendChild(sticky);
  }

  create(options: StickyConfig) {
    let backupOptions: StickyConfig;
    let sticky: Sticky;

    this.apocalypse.write({
      execute: () => {
        sticky = this.buildSticky("create", backupOptions ?? options);
        this.addToTop(sticky);
        backupOptions = sticky.save();
      },
      undo: () => {
        this.forceDelete(sticky);
      },
    });
  }

  pause(sticky: Sticky) {
    const prevRect = extractRectangle(sticky);

    return (type: "drag" | "resize") => {
      const currRect = extractRectangle(sticky);

      this.apocalypse.write({
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
                prevRect[2] === null ? defaultWidth : prevRect[2]
              }px`;
            }
            if (prevRect[3] !== undefined) {
              s.style.height = `${
                prevRect[3] === null ? defaultWidth : prevRect[3]
              }px`;
            }
          }
        },
      });
    };
  }

  getById(id: string) {
    for (const sticky of this.stickies) {
      if (sticky.id === id) {
        return sticky;
      }
    }
  }

  getCentralPoint(): CursorPoint {
    return [
      this.stickyContainer.offsetWidth / 2,
      (this.stickyContainer.offsetHeight - defaultWidth) / 2,
    ];
  }
}

/**
 * NaN means that there is the cursor point is not initialized.
 * Since we need stickyContainer to be append first to get the width and height.
 * TODO: We use this ugly approach to judge whether the point is ready for use.
 *
 * :: (number | null) will cause more type issue, but current approach is inconsist.
 * e.g. the Rectangle type accept null.
 */
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
      dataset,
      pluginConfig,
    }: StickyConfig = {},
  ) {
    const sticky = (getTemplateWidgets("sticky") as HTMLDivElement)
      .firstElementChild! as HTMLDivElement;

    sticky.id = id ?? crypto.randomUUID();

    let x: number;
    let y: number;
    if (isNaN(cursorPoint[0])) {
      [x, y] = stickyWorkspace.getCentralPoint();
    } else {
      [x, y] = cursorPoint;
    }

    if (rect) {
      const [left, top, width, height] = rect;

      if (typeof left === "number") {
        sticky.style.left = `${left}px`;
      } else {
        sticky.style.left = `${x - defaultWidth / 2}px`;
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
      sticky.style.left = `${x - defaultWidth / 2}px`;
      sticky.style.top = `${y - 10}px`;
      sticky.style.width = `${defaultWidth}px`;
      sticky.style.height = `${defaultWidth}px`;
    }
    if (zIndex) {
      sticky.style.zIndex = zIndex.toString();
    }
    if (className) {
      sticky.className = className;
    }
    if (dataset) {
      for (const [key, value] of Object.entries(dataset)) {
        sticky.dataset[key] = value as string;
      }
    }

    function enableStickyFunctionality(): Sticky {
      const stickyHeader = sticky.$<HTMLDivElement>(".stickyHeader")!;
      const deleteBtn = sticky.$<HTMLButtonElement>(".deleteBtn")!;
      const maximizeToggleLbl =
        sticky.$<HTMLLabelElement>(".maximizeToggleLbl")!;

      let resumeForDrag: (type: "drag" | "resize") => void;
      let resumeForResize: (type: "drag" | "resize") => void;

      new Draggable(
        sticky,
        {
          interactEl: stickyHeader,
          container: stickyWorkspace.workspaceContainer,
          padding: 20,
          onDragStart: (e) => {
            if (sticky.classList.contains("maximized")) {
              const topWhenMaximized = sticky.style.top;
              (sticky as Sticky).toggleMaximize();
              sticky.style.top = topWhenMaximized;
              sticky.style.left = `${e.clientX - sticky.offsetWidth / 2}px`;
            }
            resumeForDrag = stickyWorkspace.pause(sticky as Sticky);
          },
          onDragEnd: () => resumeForDrag("drag"),
        },
        stickyWorkspace.zoomable,
      );
      new Resizable(
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
          sticky.classList.toggle("maximized");
          if (sticky.classList.contains("maximized")) {
            // minimize => maximized
            sticky.dataset.rect = rectangleToString(extractRectangle(sticky));
            sticky.style.width =
              stickyWorkspace.workspaceContainer.offsetWidth /
                stickyWorkspace.zoomable.scale +
              "px";
            sticky.style.height =
              stickyWorkspace.workspaceContainer.offsetHeight /
                stickyWorkspace.zoomable.scale +
              "px";
            const matrix = new DOMMatrixReadOnly(
              getComputedStyle(stickyWorkspace.stickyContainer).transform,
            );
            // m41 = translateX
            // m42 = translateY
            const scale = stickyWorkspace.zoomable.scale;
            sticky.style.left = `${-stickyWorkspace.stickyContainer.offsetLeft / scale - matrix.m41 / scale}px`;
            sticky.style.top = `${-stickyWorkspace.stickyContainer.offsetTop / scale - matrix.m42 / scale}px`;
          } else {
            // maximized => minimize
            // Recover previous position and size.
            const rect = parseRectangleFromString(sticky.dataset.rect!);
            sticky.style.left = `${rect[0]}px`;
            sticky.style.top = `${rect[1]}px`;
            sticky.style.width = `${rect[2]}px`;
            sticky.style.height = `${rect[3]}px`;
          }

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
          return extendedSticky;
        },
        replaceBody(...nodes: (Node | string)[]) {
          sticky.$(".stickyBody")!.replaceChildren(...nodes);
        },
        plugin: {},
        save() {
          const config: StickyConfig = {
            id: extendedSticky.id,
            type: extendedSticky.type,
            className: sticky.className,
          };
          config.rect = extractRectangle(sticky);
          // Convert DOMStringMap to plain js object.
          config.dataset = Object.fromEntries(Object.entries(sticky.dataset));
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
        const options: CustomStickyOptions = custom.options ?? {};
        options.noPadding ??= false;
        basicSticky.classList.toggle("noPadding", options.noPadding);
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

const customStickiComposers = new Map<
  string,
  CustomStickyComposer<StickyPlugin, CustomStickyConfig>
>();

type Rectangle = [
  left: number | null,
  top: number | null,
  width: number | null,
  height: number | null,
];

function extractRectangle(element: HTMLElement): Rectangle {
  return [
    element.offsetLeft,
    element.offsetTop,
    element.offsetWidth,
    element.offsetHeight,
  ];
}
function rectangleToString(rect: Rectangle) {
  return rect.join(",");
}
function parseRectangleFromString(rect: string): Rectangle {
  const numbers = rect.split(",");
  if (numbers.length === 4) {
    return numbers.map((n) => parseInt(n)) as Rectangle;
  } else {
    throw Error(
      `Rectangle string must have 4 value seperated with comma. '${rect}' has length '${numbers.length}'.`,
    );
  }
}

export interface CustomStickyConfig extends Record<string, unknown> {}
export interface CustomStickyComposer<
  S extends StickyPlugin,
  C extends CustomStickyConfig,
> {
  type: string;
  onCreate(sticky: Sticky<S, C>): void;
  onSave(sticky: Sticky<S, C>): C | void;
  onDelete(sticky: Sticky<S, C>): void;
  onRestore(sticky: Sticky<S, C>, config?: C): void;
  options?: CustomStickyOptions;
}

interface CustomStickyOptions {
  noPadding?: boolean;
}

export function registerSticky<
  S extends StickyPlugin,
  C extends CustomStickyConfig,
>(customSticky: CustomStickyComposer<S, C>) {
  if (customStickiComposers.has(customSticky.type)) {
    throw Error(
      `Custom sticky '${customSticky.type}' already exists. Please try another name.`,
    );
  }

  customStickiComposers.set(customSticky.type, customSticky);
}

export function getCustomSticky(sticky: HTMLDivElement | Sticky) {
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
  dataset.setItem("workspace", stickyWorkspace.saveWork());
});
addTodoAfterLoad(() => {
  const config = dataset.getItem<WorkspaceConfig>("workspace");
  if (config) {
    stickyWorkspace.zoomable.setTransform(config.transform);
    stickyWorkspace.draggable.setOffset(config.offset);
    stickyWorkspace.restoreAndReplaceAll(config.stickies);
  }
});
