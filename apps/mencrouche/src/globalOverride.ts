declare global {
	interface HTMLElement {
		setRect: (
			left: number | null | undefined,
			top: number | null | undefined,
			width?: number | null | undefined,
			height?: number | null | undefined,
		) => void;
	}
	interface Element {
		hasClass: (className: string) => boolean;
		hide: () => void;
		show: () => void;
		toggleHidden: () => void;
		isHidden: boolean;
	}
}

HTMLElement.prototype.setRect = function (left, top, width, height) {
	if (left !== null && left !== undefined) {
		this.style.left = `${Math.round(left)}px`;
	}
	if (top !== null && top !== undefined) {
		this.style.top = `${Math.round(top)}px`;
	}
	if (width !== null && width !== undefined) {
		this.style.width = `${Math.round(width)}px`;
	}
	if (height !== null && height !== undefined) {
		this.style.height = `${Math.round(height)}px`;
	}
};

Element.prototype.hasClass = function (className: string) {
	return this.classList.contains(className);
};
Element.prototype.hide = function () {
	this.classList.add("none");
};
Element.prototype.show = function () {
	this.classList.remove("none");
};
Element.prototype.toggleHidden = function () {
	this.classList.toggle("none");
};
Object.defineProperty(Element.prototype, "isHidden", {
	get() {
		return this.classList.contains("none");
	},
	configurable: true,
	enumerable: false,
});

export {};
