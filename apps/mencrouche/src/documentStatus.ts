import { executeCommand } from "./commands";
import { $, n81i } from "./utils/tools";

type DocumentStatus = "saved" | "unsaved" | "saving";

const ds = $<HTMLButtonElement>("#documentStatus")!;
const span = ds.$<HTMLSpanElement>("span")!;
const saveDocumentBtn = $<HTMLDivElement>("#documentStatus button")!;
saveDocumentBtn.on("click", () => executeCommand("saveDocument"));
switchDocumentStatus("saved");

export function switchDocumentStatus(status: DocumentStatus) {
	if (ds.className === status) return;
	ds.classList.remove("saved");
	ds.classList.remove("unsaved");
	ds.classList.remove("saving");
	ds.classList.add(status);

	span.dataset.i18n = status;
	n81i.translateElement(span);
}
