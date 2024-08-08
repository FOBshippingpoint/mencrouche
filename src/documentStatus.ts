import { triggerCommand } from "./commandPalette";
import { $ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

type DocumentStatus = "saved" | "unsave" | "saving";

const ds = $<HTMLButtonElement>("#documentStatus")!;
const span = ds.$<HTMLSpanElement>("span")!;

ds.on("click", () => {
  triggerCommand("save_document");
});

export function switchDocumentStatus(status: DocumentStatus) {
  if (ds.className === status) return;
  ds.classList.remove("saved");
  ds.classList.remove("unsave");
  ds.classList.remove("saving");
  ds.classList.add(status);

  span.textContent = n81i.t(status);
}
