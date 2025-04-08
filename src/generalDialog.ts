import { $, $$$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

// this implementation is using same dialog element
// so it might have trouble when open new dialog on a dialog

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
	onClose?: () => void;
}

export function createDialog({
	title,
	message,
	buttons,
	onClose,
}: DialogOptions) {
	let controller: AbortController;

	return {
		open() {
			controller = new AbortController();
			dialogTitle.dataset.i18n = title;
			dialogMessage.dataset.i18n = message;
			const buttonMap = new Map<HTMLButtonElement, () => void>();

			const frag = document.createDocumentFragment();
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
				frag.appendChild(button);
			}
			dialogButtonGroup.replaceChildren(frag);
			n81i.translateElement(dialog);

			for (const [button, onClick] of buttonMap.entries()) {
				button.on("click", onClick, { signal: controller.signal });
			}
			dialog.showModal();
			dialog.on("close", () => onClose?.(), { signal: controller.signal });
		},
		close() {
			dialog.close();
			controller?.abort();
		},
	};
}
