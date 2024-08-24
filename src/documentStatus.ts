import { executeCommand } from "./commands";
import { dataset, saveDataset } from "./myDataset";
import { stickyManager } from "./sticky";
import { $ } from "./utils/dollars";
import { n81i } from "./utils/n81i";
import { toDataUrl } from "./utils/toDataUrl";

type DocumentStatus = "saved" | "unsaved" | "saving";

const ds = $<HTMLButtonElement>("#documentStatus")!;
const span = ds.$<HTMLSpanElement>("span")!;

ds.on("click", () => {
  executeCommand("save_document");
});

export function switchDocumentStatus(status: DocumentStatus) {
  if (ds.className === status) return;
  console.log("save document", status);
  ds.classList.remove("saved");
  ds.classList.remove("unsaved");
  ds.classList.remove("saving");
  ds.classList.add(status);

  span.dataset.i18n = status;
  n81i.translateElement(span);
}

export async function saveDocument() {
  switchDocumentStatus("saving");
  let html = $(".stickyContainer")!.innerHTML;

  const urls = dataset.getItem("urls", []);
  if (urls) {
    const promises = urls.map(async ({ blobUrl }) => {
      const dataUrl = await toDataUrl(blobUrl);
      return { blobUrl, dataUrl };
    });
    const blobToDataUrlMappings = await Promise.all(promises);
    dataset.setItem("urls", blobToDataUrlMappings);
  }

  stickyManager.saveAll();
  localStorage.setItem("doc", html);
  saveDataset();

  // Prevent mutation observer callback for stickyManager.saveAll.
  setTimeout(() => {
    switchDocumentStatus("saved");
  }, 0);
}
