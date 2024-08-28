import { $, $$$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

const dialog = $<HTMLDialogElement>("#generalDialog")!;
const dialogTitle = dialog.$<HTMLHeadingElement>(".dialogTitle")!;
const dialogMessage = dialog.$<HTMLParagraphElement>(".dialogMessage")!;
const dialogButtonGroup = dialog.$<HTMLDivElement>(".dialogButtonGroup")!;

interface ButtonAttrs extends Record<string, string | (() => void)> {
  onClick: () => void;
}

interface DialogOptions {
  title: string;
  message: string;
  buttons: ButtonAttrs[];
}

export function createDialog({ title, message, buttons }: DialogOptions) {
  dialogTitle.dataset.i18n = title;
  dialogMessage.dataset.i18n = message;
  const buttonMap = new Map<HTMLButtonElement, () => void>();

  for (const btnAttrs of buttons) {
    const button = $$$("button");
    for (const [key, value] of Object.entries(btnAttrs)) {
      if (key !== "onClick") {
        button.setAttribute(key, value as string);
      }
    }
    if (btnAttrs.onClick) {
      buttonMap.set(button, btnAttrs.onClick);
    }
    dialogButtonGroup.appendChild(button);
  }
  n81i.translateElement(dialog);

  let controller: AbortController;

  return {
    open() {
      controller = new AbortController();
      for (const [button, onClick] of buttonMap.entries()) {
        button.on("click", onClick, { signal: controller.signal });
      }
      dialog.showModal();
    },
    close() {
      dialog.close();
      controller?.abort();
    },
  };
}
