import { blobToDataUrl } from "./toDataUrl";

export async function handlePasteImage(
	e: ClipboardEvent,
): Promise<string | null> {
	if (e.clipboardData?.files?.[0]) {
		// Check for image file
		const file = e.clipboardData.files[0];
		const dataUrl = await blobToDataUrl(file);
		new URL(dataUrl);
		return dataUrl;
	}
	// Check for image URL
	const url = e.clipboardData?.getData("text/plain") ?? "";
	try {
		new URL(url);
		return url;
	} catch (_) {}
	return null;
}
