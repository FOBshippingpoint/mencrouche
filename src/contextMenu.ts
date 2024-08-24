import { getTemplateWidgets } from "./stickyPlugins/getWidgets";
import { $, $$$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

const contextMenu = $<HTMLDivElement>("#contextMenu")!;
const registry = new Map();

function getIcon(icon: string) {
  const menuItemIconsContainer = (
    $<HTMLTemplateElement>("#menuItemIcons")!.content.cloneNode(true) as any
  ).firstElementChild as HTMLDivElement;
  return menuItemIconsContainer.getElementsByClassName(icon)[0];
}

function iOS() {
  return (
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}

export function initContextMenu() {
  contextMenu.on("click", (e) => {
    // const commandName = (e.target as any).closest("[data-command-name]")
    // 	?.dataset.commandName;
    // if (commandName) {
    // 	executeCommand(commandName);
    // }
    contextMenu.classList.add("none");
  });

  function showContextMenu(e: MouseEvent | CustomEvent) {
    $("#debug").textContent = $("#debug")?.textContent + "context menu";
    const target = e.target.closest("[data-context-menu]");
    const key = target?.dataset.contextMenu;
    const menuItems = registry.get(key);
    contextMenu.replaceChildren(buildMenuItems(menuItems, target));

    e.preventDefault();
    contextMenu.classList.remove("none");

    let x: number;
    let y: number;
    if (e instanceof MouseEvent) {
      x = e.clientX;
      y = e.clientY;
    } else {
      x = e.detail.originalEvent.clientX;
      y = e.detail.originalEvent.clientY;
    }

    contextMenu.style.top = `${Math.min(y, document.body.getBoundingClientRect().height - contextMenu.getBoundingClientRect().height)}px`;
    contextMenu.style.left = `${Math.min(x, document.body.getBoundingClientRect().width - contextMenu.getBoundingClientRect().width)}px`;
  }

  document.on("contextmenu", (e) => {
    if (e.shiftKey) return;
    if (!$("#settings")!.classList.contains("none")) return;
    if (e.target.matches("input,textarea")) return;

    showContextMenu(e);
  });

  if (iOS()) {
    document.on("longpress", (e) => {
      showContextMenu(e);
    });
  }

  document.on("click", (e) => {
    if ((e as any).target.offsetParent != contextMenu) {
      contextMenu.classList.add("none");
    }
  });

  let timer: number;
  let isLongPress = false;

  function startLongPress(e: PointerEvent) {
    timer = window.setTimeout(() => {
      isLongPress = true;
      const longPressEvent = new CustomEvent("longpress", {
        bubbles: true,
        cancelable: true,
        detail: { originalEvent: e },
      });
      e.target?.dispatchEvent(longPressEvent);
    }, 1500);
  }

  function endLongPress(event: PointerEvent) {
    clearTimeout(timer);
    if (isLongPress) {
      event.preventDefault();
    }
    isLongPress = false;
  }

  document.on("pointerdown", startLongPress);
  document.on("pointerup", endLongPress);
  document.on("pointercancel", endLongPress);
  document.on("pointerleave", endLongPress);
}

type MenuItemBuilder = () => MenuItemDefinition | null | "hr";
type MenuItem = MenuItemDefinition | MenuItemBuilder | "hr";

interface MenuItemDefinition {
  name: string;
  icon?: string;
  execute: (eventTarget: EventTarget) => void;
  subItems?: MenuItem[];
}

export function registerContextMenu(name: string, menuItems: MenuItem[]) {
  registry.set(name, menuItems);
}

function buildMenuItems(menuItems: MenuItem[], eventTarget: EventTarget) {
  const frag = document.createDocumentFragment();
  for (const item of menuItems) {
    let menuItem: MenuItem | null = item;
    if (typeof item === "function") {
      menuItem = item();
      if (!menuItem) {
        continue;
      }
    }

    if (item === "hr") {
      frag.appendChild($$$("hr"));
    } else {
      const menuItemDef = menuItem as MenuItemDefinition;
      const template = getTemplateWidgets("menuItem");
      const btn = template.$<HTMLButtonElement>("button")!;
      const span = template.$<HTMLSpanElement>("span")!;

      span.dataset.i18n = menuItemDef.name;
      if (menuItemDef.icon) {
        const icon = getIcon(menuItemDef.icon);
        btn.insertAdjacentElement("beforeend", icon);
      }

      btn.on("click", () => menuItemDef.execute(eventTarget), { once: true });
      frag.appendChild(btn);
    }
  }
  n81i.translateElement(frag);

  return frag;
}
