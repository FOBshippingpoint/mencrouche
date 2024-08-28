import { dataset, saveDataset } from "./myDataset";
import { $ } from "./utils/dollars";
import { n81i } from "./utils/n81i";
import { toDataUrl } from "./utils/toDataUrl";

type DocumentStatus = "saved" | "unsaved" | "saving";

const ds = $<HTMLButtonElement>("#documentStatus")!;
const span = ds.$<HTMLSpanElement>("span")!;

export function switchDocumentStatus(status: DocumentStatus) {
  if (ds.className === status) return;
  ds.classList.remove("saved");
  ds.classList.remove("unsaved");
  ds.classList.remove("saving");
  ds.classList.add(status);

  span.dataset.i18n = status;
  n81i.translateElement(span);
}

export async function saveDocument() {
  switchDocumentStatus("saving");
  localStorage.setItem("doc", await serializeDocument());
  saveDataset();

  // Prevent mutation observer callback for stickyManager.saveAll.
  setTimeout(() => {
    switchDocumentStatus("saved");
  }, 0);
}

export async function serializeDocument() {
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

  return html;
}
