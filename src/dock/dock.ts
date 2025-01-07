import { getTemplateWidgets } from "../utils/getTemplateWidgets";
import { dataset, addTodoAfterLoad, addTodoBeforeSave } from "../dataWizard";
import { $ } from "../utils/dollars";

const dockData: Record<string, unknown> = {};

interface DockCreationOptions<C extends DockConfig> {
  name: string;
  placement: Placement;
  body: Node;
  edgePadding: string;
  grow: boolean;
  onSave?: () => C;
  onRestore?: (config: C) => void;
}

export interface DockConfig extends Record<string, unknown> {}

type Placement =
  | "topLeft"
  | "top"
  | "topRight"
  | "right"
  | "bottomRight"
  | "bottom"
  | "bottomLeft"
  | "left";

const dockRegistry = new Set<string>();

export function createDock<C extends DockConfig>({
  name,
  body,
  placement = "right",
  edgePadding = "var(--size-2)",
  grow = false,
  onSave,
  onRestore,
}: DockCreationOptions<C>) {
  if (dockRegistry.has(name)) {
    throw Error(`Dock '${name}' already exists. Try create with another name.`);
  } else {
    dockRegistry.add(name);
  }
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
      dock.style.transform = "translateX(-50%)";
      break;

    case "right":
      dock.style.right = `${edgePadding}`;
      dock.style.top = "50%";
      dock.style.transform = "translateY(-50%)";
      break;

    case "bottom":
      dock.style.bottom = `${edgePadding}`;
      dock.style.left = "50%";
      dock.style.transform = "translateX(-50%)";
      break;

    case "left":
      dock.style.left = `${edgePadding}`;
      dock.style.top = "50%";
      dock.style.transform = "translateY(-50%)";
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

  $("#dockSlot")!.appendChild(dock);

  addTodoBeforeSave(() => {
    if (typeof onSave === "function") {
      dockData[name] = onSave();
      dataset.setItem("dock", dockData);
    }
  });
  addTodoAfterLoad(() => {
    const dockData = dataset.getItem<Record<string, unknown>>("dock");
    if (dockData && dockData[name]) {
      onRestore?.(dockData[name] as C);
    }
  });
}
