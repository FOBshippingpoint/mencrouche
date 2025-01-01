import { registerContextMenu } from "./contextMenu";
import { formToObject } from "./utils/formToObject";
import { getTemplateWidgets } from "./utils/getTemplateWidgets";
import { apocalypse } from "./apocalypse";
import { dataset, addTodoAfterLoad, addTodoBeforeSave } from "./dataWizard";
import { $, $$$ } from "./utils/dollars";
import { getWidgets } from "./sticky/sticky";

// Drag and drop code was modified from https://codepen.io/gabrielferreira/pen/jMgaLe
// Under MIT License (https://blog.codepen.io/legal/licensing/)
class DragAndDropSorter {
  private container: HTMLElement;
  private dragSrcEl: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initializeDragAndDrop();
  }

  private initializeDragAndDrop() {
    this.container
      .$$('[draggable="true"]')
      .forEach((el) => this.add(el as HTMLElement));
  }

  add(el: HTMLElement) {
    el.on("dragstart", this.dragStart.bind(this));
    el.on("dragenter", this.dragEnter);
    el.on("dragover", this.dragOver);
    el.on("dragleave", this.dragLeave);
    el.on("drop", this.dragDrop.bind(this));
    el.on("dragend", this.dragEnd.bind(this));
  }

  private dragStart(e: DragEvent) {
    if (e.target instanceof HTMLElement) {
      const target = e.target.closest('[draggable="true"]')! as HTMLElement;
      target.style.opacity = "0.4";
      this.dragSrcEl = target;
    }
  }

  private dragEnter(e: DragEvent) {
    (e.target as HTMLElement).classList.add("dragOver");
  }

  private dragLeave(e: DragEvent) {
    (e.target as HTMLElement).classList.remove("dragOver");
  }

  private dragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    return false;
  }

  private dragDrop(e: DragEvent) {
    e.stopPropagation();
    const target = (e.target as HTMLElement).closest(
      '[draggable="true"]',
    ) as HTMLElement;
    if (this.dragSrcEl && this.dragSrcEl !== target) {
      this.swap(this.dragSrcEl, target);
    }
    this.container
      .$$(".dragOver")
      .forEach((el) => el.classList.remove("dragOver"));
    return false;
  }

  private dragEnd() {
    this.container
      .querySelectorAll('[draggable="true"]')
      .forEach((el) => el.classList.remove("dragOver"));
    if (this.dragSrcEl) {
      this.dragSrcEl.style.opacity = "1";
    }
  }

  private swap(a: Node, b: Node) {
    const aSibling = a.nextSibling === b ? a : a.nextSibling;
    b.parentNode!.insertBefore(a, b);
    a.parentNode!.insertBefore(b, aSibling);
  }
}

interface DockCreationOptions {
  placement: Placement;
  body: Node;
  edgePadding: string;
  grow: boolean;
}

type Placement =
  | "topLeft"
  | "top"
  | "topRight"
  | "right"
  | "bottomRight"
  | "bottom"
  | "bottomLeft"
  | "left";

function createDock({
  body,
  placement = "right",
  edgePadding = "var(--size-2)",
  grow = false,
}: DockCreationOptions) {
  const dock = (getTemplateWidgets("dockWidgets") as HTMLElement)
    .firstElementChild as HTMLDivElement;

  dock.$("slot")!.replaceWith(body);

  dock.style.top = "";
  dock.style.right = "";
  dock.style.bottom = "";
  dock.style.left = "";
  dock.style.transform = "";
  dock.style.width = "";
  dock.style.height = "";

  // Apply growing behavior if specified
  if (grow) {
    const isVertical = ["left", "right"].includes(placement);
    if (isVertical) {
      dock.style.height = `calc(100% - 2 * ${edgePadding})`;
    } else {
      dock.style.width = `calc(100% - 2 * ${edgePadding})`;
    }
  }

  // Apply positioning based on specified placement
  switch (placement) {
    case "top":
      dock.style.top = `${edgePadding}`;
      dock.style.left = "50%";
      dock.style.transform = grow ? "translateX(-50%)" : "translate(-50%)";
      break;

    case "right":
      dock.style.right = `${edgePadding}`;
      dock.style.top = "50%";
      dock.style.transform = grow ? "translateY(-50%)" : "translate(-50%)";
      break;

    case "bottom":
      dock.style.bottom = `${edgePadding}`;
      dock.style.left = "50%";
      dock.style.transform = grow ? "translateX(-50%)" : "translate(-50%)";
      break;

    case "left":
      dock.style.left = `${edgePadding}`;
      dock.style.top = "50%";
      dock.style.transform = grow ? "translateY(-50%)" : "translate(-50%)";
      break;

    case "topLeft":
      dock.style.left = `${edgePadding}`;
      dock.style.top = `${edgePadding}`;
      if (grow) dock.style.width = `calc(100% - 2 * ${edgePadding})`;
      break;

    case "topRight":
      dock.style.right = `${edgePadding}`;
      dock.style.top = `${edgePadding}`;
      if (grow) dock.style.width = `calc(100% - 2 * ${edgePadding})`;
      break;

    case "bottomLeft":
      dock.style.left = `${edgePadding}`;
      dock.style.bottom = `${edgePadding}`;
      if (grow) dock.style.width = `calc(100% - 2 * ${edgePadding})`;
      break;

    case "bottomRight":
      dock.style.right = `${edgePadding}`;
      dock.style.bottom = `${edgePadding}`;
      if (grow) dock.style.width = `calc(100% - 2 * ${edgePadding})`;
      break;
  }

  return dock;
}

function initClockDock() {
  const clockDock = (getTemplateWidgets("clockWidgets") as HTMLElement)
    .firstElementChild!;
  const timeEl = clockDock.$(".time")!;
  const dateEl = clockDock.$(".date")!;

  function updateTime() {
    const now = new Date();

    timeEl.textContent = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }
  updateTime();
  setInterval(() => updateTime(), 1000);
  const dock = createDock({
    placement: "bottomRight",
    body: clockDock,
    edgePadding: "var(--size-2)",
    grow: false,
  });
  $("#dockSlot")!.appendChild(dock);
}
initClockDock();
