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
