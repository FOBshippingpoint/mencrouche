import { createDataset } from "./utils/dataset";
import { $ } from "./utils/dollars";

const datasetContainer = $("#dataset")!;
loadDatasetFromLocalStorage();

function loadDatasetFromLocalStorage() {
  const datasetHtml = localStorage.getItem("dataset") ?? "";
  datasetContainer.replaceChildren(
    document.createRange().createContextualFragment(datasetHtml),
  );
}

export function saveDataset() {
  localStorage.setItem("dataset", datasetContainer.innerHTML);
}

export const dataset = createDataset();
