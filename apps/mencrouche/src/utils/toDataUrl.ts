export async function anyUrlToDataUrl(url: string): Promise<string> {
	const blob = await urlToBlob(url);
	const dataUrl = await blobToDataUrl(blob);
	return dataUrl;
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

export async function urlToBlob(url: string): Promise<Blob> {
	const response = await fetch(url);
	const blob = await response.blob();
	return blob;
}

export async function clipboardImageItemToDataUrl(
	clipboardItems: ClipboardItems,
) {
	for (const clipboardItem of clipboardItems) {
		const imageType = clipboardItem.types.find((type) =>
			type.startsWith("image/"),
		);
		if (imageType) {
			const blob = await clipboardItem.getType(imageType);
			return blobToDataUrl(blob);
		}
	}
}

function detectFileSystemAccessSupport(): boolean {
	return (
		"showSaveFilePicker" in window &&
		(() => {
			try {
				return window.self === window.top;
			} catch {
				return false;
			}
		})()
	);
}

const supportsFileSystemAccess = detectFileSystemAccessSupport();

export async function downloadBlobAsFile(blob: Blob, suggestedName: string) {
	if (supportsFileSystemAccess) {
		try {
			const handle = await (window as any).showSaveFilePicker({
				suggestedName,
			});
			const writable = await handle.createWritable();
			await writable.write(blob);
			await writable.close();
			return;
		} catch (err: any) {
			if (err.name !== "AbortError") {
				console.error(err.name, err.message);
				return;
			}
		}
	} else {
		const blobUrl = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = blobUrl;
		a.download = suggestedName;
		a.hidden = true;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			URL.revokeObjectURL(blobUrl);
			a.remove();
		}, 1000);
	}
}

export async function copyBlobToClipboard(blob: Blob) {
	await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}
