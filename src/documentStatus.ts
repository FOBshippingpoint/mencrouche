import { triggerCommand } from "./commandPalette";
import { $ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

type DocumentStatus = "saved" | "unsaved" | "saving";

const ds = $<HTMLButtonElement>("#documentStatus")!;
const span = ds.$<HTMLSpanElement>("span")!;

ds.on("click", () => {
  triggerCommand("save_document");
});

export function switchDocumentStatus(status: DocumentStatus) {
  if (ds.className === status) return;
  ds.classList.remove("saved");
  ds.classList.remove("unsaved");
  ds.classList.remove("saving");
  ds.classList.add(status);

  span.dataset.i18n = status;
  n81i.translateElement(span);
}
