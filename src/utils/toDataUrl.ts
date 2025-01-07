export async function toDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();

  return blobToDataUrl(blob);
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const reader = new FileReader();

  return new Promise((resolve) => {
    reader.addEventListener("load", () => {
      resolve(reader.result as string);
    });
    reader.readAsDataURL(blob);
  });
}

export async function clipboardImageItemToDataUrl(
  clipboardItems: ClipboardItems,
) {
  for (const clipboardItem of clipboardItems) {
    let blob: Blob;
    const imageTypes = clipboardItem.types.filter((type) =>
      type.startsWith("image/"),
    );
    for (const imageType of imageTypes) {
      blob = await clipboardItem.getType(imageType);
      return blobToDataUrl(blob);
    }
  }
}
