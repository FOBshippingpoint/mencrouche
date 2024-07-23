import { $ } from "./utils/dollars";

const dropzone = $<HTMLDivElement>(".dropzone")!;
const fileInput = $<HTMLInputElement>(".fileInput")!;
const setToDefaultBtn = $<HTMLButtonElement>(".setToDefaultBtn")!;

// Copy from web.dev: https://web.dev/patterns/clipboard/paste-images#js
dropzone.addEventListener("paste", async (e) => {
  e.preventDefault();
  const clipboardItems =
    typeof navigator?.clipboard?.read === "function"
      ? await navigator.clipboard.read()
      : e.clipboardData.files;

  for (const clipboardItem of clipboardItems) {
    let blob;
    if (clipboardItem.type?.startsWith("image/")) {
      // For files from `e.clipboardData.files`.
      blob = clipboardItem;
      // Do something with the blob.
      handleBlob(blob);
    } else {
      // For files from `navigator.clipboard.read()`.
      const imageTypes = clipboardItem.types?.filter((type) =>
        type.startsWith("image/"),
      );
      for (const imageType of imageTypes) {
        blob = await clipboardItem.getType(imageType);
        console.log("b");
        // Do something with the blob.
        handleBlob(blob);
      }
    }
  }
});

function handleBlob(blob: Blob | File) {
  const dataUrl = URL.createObjectURL(blob);
  setBackgroundImageByDataUrl(dataUrl);
}

// Handle drag and drop events
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault(); // Prevent default browser behavior (open file)
  dropzone.setAttribute("active", "");
});
dropzone.addEventListener("dragleave", () => {
  dropzone.removeAttribute("active");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.removeAttribute("active");
  if (e.dataTransfer?.items) {
    // Use DataTransferItemList interface to access the file(s)
    [...e.dataTransfer?.items].forEach((item, i) => {
      // If dropped items aren't files, reject them
      if (item.kind === "file") {
        const file = item.getAsFile()!;
        handleBlob(file);
      }
    });
  } else {
    // Use DataTransfer interface to access the file(s)
    [...e.dataTransfer?.files].forEach((file) => {
      handleBlob(file);
    });
  }
});

// Handle click on dropzone to open file selection dialog
dropzone.addEventListener("click", () => {
  fileInput.click();
});

// Handle file selection from dialog
fileInput.addEventListener("change", (e) => {
  const selectedFile = e.target.files[0];
  handleBlob(selectedFile);
});

setToDefaultBtn.addEventListener("click", () => {
  removeBackground();
});

function setBackgroundImageByDataUrl(url: string) {
  document.documentElement.style.setProperty(
    "--page-background",
    `url(${url}) no-repeat center center fixed`,
  );
}

function removeBackground() {
  document.documentElement.style.setProperty("--page-background", "unset");
}
