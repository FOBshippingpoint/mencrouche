import "../utils/dollars";
import { blobToDataUrl } from "../utils/toDataUrl";

export interface ImageChangeDetail {
	url: string;
	blob?: Blob | File;
	name?: string | null;
}

export class ImagePicker extends HTMLElement {
	private dropzone: HTMLElement;
	private fileInput: HTMLInputElement;

	constructor() {
		super();
		this.dropzone = this.$(".dropzone")!;
		this.fileInput = this.$('input[type="file"]')!;
		if (this.dropzone && this.fileInput) {
			this.dropzone.on("dragover", (e) => {
				e.preventDefault();
				this.dropzone.classList.add("active");
			});

			this.dropzone.on("dragleave", () => {
				this.dropzone.classList.remove("active");
			});

			this.dropzone.on("drop", this.handleDrop.bind(this));
			this.dropzone.on("click", () => this.fileInput.click());
			this.fileInput.on("change", () => {
				if (this.fileInput.files?.[0]) {
					this.processImage(this.fileInput.files[0]);
				}
			});
		} else {
			console.error("Dropzone or file input element not found in DOM.");
		}
	}

	listenToPaste(targetElement: Element) {
		targetElement.on("paste", async () => {
			try {
				const clipboardItems = await navigator.clipboard.read();
				for (const item of clipboardItems) {
					// Check for image file
					const type = item.types.find((type) => type.startsWith("image/"));
					if (type) {
						const blob = await item.getType(type);
						this.processImage(blob);
						return;
					}

					// Check for URL
					try {
						const blob = await item.getType("text/plain");
						const url = await blob.text();
						this.tryProcessUrl(url);
					} catch (err) {
						/* Not text or not a URL */
					}
				}
			} catch (err) {
				/* Clipboard API failed */
			}
		});
	}

	private handleDrop(e: DragEvent) {
		e.preventDefault();
		this.dropzone.classList.remove("active");
		if (e.dataTransfer?.files?.length) {
			this.processImage(e.dataTransfer.files[0]!);
		}
	}

	private tryProcessUrl(text: string) {
		try {
			new URL(text);
			this.dispatch({ url: text });
		} catch (err) {
			/* Not a valid URL */
		}
	}

	private async processImage(blob: Blob) {
		const url = await blobToDataUrl(blob);
		this.dispatch({
			url,
			blob,
			name: blob instanceof File ? blob.name : null,
		});
	}

	private dispatch(data: ImageChangeDetail) {
		this.dropzone.style.background = `url(${data.url}) center center / cover no-repeat`;
		this.dispatchEvent(
			new CustomEvent("imageChange", {
				bubbles: true,
				detail: data,
			}),
		);
	}

	openFilePicker() {
		this.fileInput?.click();
	}
}

customElements.define("image-picker", ImagePicker);
