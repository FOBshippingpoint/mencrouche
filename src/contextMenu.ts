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

export function initContextMenu() {
  contextMenu.on("click", (e) => {
    // const commandName = (e.target as any).closest("[data-command-name]")
    // 	?.dataset.commandName;
    // if (commandName) {
    // 	executeCommand(commandName);
    // }
    contextMenu.classList.add("none");
  });

  document.on("contextmenu", (e) => {
    if (e.shiftKey) return;
    if (!$("#settings")!.classList.contains("none")) return;

    const target = e.target.closest("[data-context-menu]");
    const key = target?.dataset.contextMenu;
    const menuItems = registry.get(key);
    contextMenu.replaceChildren(buildMenuItems(menuItems, target));

    e.preventDefault();
    contextMenu.classList.remove("none");
    contextMenu.style.top = `${Math.min(e.clientY, document.body.getBoundingClientRect().height - contextMenu.getBoundingClientRect().height)}px`;
    contextMenu.style.left = `${Math.min(e.clientX, document.body.getBoundingClientRect().width - contextMenu.getBoundingClientRect().width)}px`;
  });

  document.on("click", (e) => {
    if ((e as any).target.offsetParent != contextMenu) {
      contextMenu.classList.add("none");
    }
  });
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
