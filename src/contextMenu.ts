import { $, $$$ } from "./utils/dollars";
import { getTemplateWidgets } from "./utils/getTemplateWidgets";
import { n81i } from "./utils/n81i";

const contextMenu = $<HTMLDivElement>("#contextMenu")!;
const registry = new Map();

function isIos() {
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

function showContextMenu(e: MouseEvent | CustomEvent) {
  const target = (e.target as HTMLElement).closest("[data-context-menu]") as
    | HTMLElement
    | undefined;

  if (!target) {
    return;
  }

  const keys = target.dataset.contextMenu!.split(" ");
  const frag = document.createDocumentFragment();
  for (const key of keys ?? []) {
    const menuItems = registry.get(key);
    if (menuItems === undefined) {
      throw Error(
        `Context menu '${key}' not found. Please register context menu first via 'registerContextMenu'.`,
      );
    }
    frag.appendChild(buildMenuItems(menuItems, target));
  }
  contextMenu.replaceChildren(frag);

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

  const docRect = document.body.getBoundingClientRect();
  const menuRect = contextMenu.getBoundingClientRect();

  contextMenu.style.top = `${Math.min(y, docRect.height - menuRect.height)}px`;
  contextMenu.style.left = `${Math.min(x, docRect.width - menuRect.width)}px`;
}

document.on("contextmenu", (e) => {
  if (e.shiftKey) return;
  if (!$("#settings")!.classList.contains("none")) return;
  if ((e.target as Element).matches("input,textarea,[contenteditable='true']"))
    return;

  showContextMenu(e);
});

if (isIos()) {
  document.on("longpress", (e) => {
    showContextMenu(e);
  });
}

document.on("click", (e) => {
  if (!(e as any).target.closest(".contextMenu")) {
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

type MenuItemBuilder = (
  eventTarget: EventTarget,
) => MenuItemDefinition | null | "hr";

interface MenuItemDefinition {
  name: string;
  icon?: string;
  execute?: (eventTarget: EventTarget) => void;
  subItems?: MenuItem[];
}

export type MenuItem = MenuItemDefinition | MenuItemBuilder | "hr";

/**
 * Register a context menu (right-click menu) for element with
 * data-contextmenu="{name}" attribute.
 *
 * ```typescript
 *
 * ```
 */
export function registerContextMenu(name: string, menuItems: MenuItem[]) {
  registry.set(name, menuItems);
}

function buildMenuItems(menuItems: MenuItem[], eventTarget: EventTarget) {
  // TODO:
  // this line used to decouple from dataset, but I think it has the room to improve.
  const theme = document.documentElement.dataset.theme;

  const frag = document.createDocumentFragment();
  for (const item of menuItems) {
    let menuItem: MenuItem | null = item;
    if (typeof item === "function") {
      menuItem = item(eventTarget);
      if (!menuItem) {
        continue;
      }
    }

    if (item === "hr") {
      frag.appendChild($$$("hr"));
    } else {
      const menuItemDef = menuItem as MenuItemDefinition;
      const template = getTemplateWidgets("menuItem") as DocumentFragment;
      const btn = template.$<HTMLButtonElement>("button")!;
      const iconL = template.$<HTMLElement>(".icon.left")!;
      const span = template.$<HTMLSpanElement>("span")!;
      const iconR = template.$<HTMLElement>(".icon.right")!;
      span.dataset.i18n = menuItemDef.name;

      function setIconProperty(iconEl: HTMLElement, iconName: string) {
        iconEl.classList.add("used");
        iconEl.style.setProperty(
          "--icon",
          `url("https://api.iconify.design/${iconName}.svg?color=${theme === "dark" ? "%23ffffff" : "%23000000"}")`,
        );
      }
      if (menuItemDef.icon) {
        setIconProperty(iconL, menuItemDef.icon);
      }
      if (menuItemDef.subItems) {
        setIconProperty(iconR, "lucide-chevron-right");
      }

      frag.appendChild(btn);
      if (menuItemDef.subItems) {
        const subItem = $$$("div");
        subItem.classList.add("subItem", "contextMenu");
        subItem.appendChild(buildMenuItems(menuItemDef.subItems, eventTarget));
        btn.insertAdjacentElement("beforeend", subItem);
        btn.dataset.subItemActive = "off";

        function showSubItems() {
          contextMenu
            .$$<HTMLDivElement>('[data-sub-item-active="on"]')
            .forEach((el) => {
              if (!el.contains(subItem)) {
                el.dataset.subItemActive = "off";
              }
            });
          btn.dataset.subItemActive = "on";
          if (
            document.body.getBoundingClientRect().right <
            subItem.getBoundingClientRect().right
          ) {
            subItem.classList.add("expandLeft");
          }
          if (
            document.body.getBoundingClientRect().bottom <
            subItem.getBoundingClientRect().bottom
          ) {
            subItem.classList.add("expandTop");
          }
        }

        btn.on("mouseenter", showSubItems);
        // btn.on("click", showSubItems);
      } else if (menuItemDef.execute) {
        btn.on("click", () => {
          contextMenu.classList.add("none");
          menuItemDef.execute!(eventTarget),
            {
              once: true,
            };
        });
      }
    }
  }
  n81i.translateElement(frag);

  return frag;
}
