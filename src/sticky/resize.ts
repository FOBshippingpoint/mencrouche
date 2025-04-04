import { ZoomAware, type ZoomContext } from "./zoom.js";

export interface ResizeOptions {
	onResizeStart?: (e: PointerEvent) => void;
	onResize?: (e: PointerEvent) => void;
	onResizeEnd?: (e: PointerEvent) => void;
}

export class Resizable extends ZoomAware {
	private element: HTMLElement;
	private options: ResizeOptions;
	private isResizing = false;
	private currentHandle: HTMLElement | null = null;
	private handles: HTMLElement[] = [];
	private initialX = 0;
	private initialY = 0;
	private initialWidth = 0;
	private initialHeight = 0;
	private initialLeft = 0;
	private initialTop = 0;

	constructor(
		element: HTMLElement,
		options: ResizeOptions = {},
		zoomContext?: ZoomContext,
	) {
		super(zoomContext);
		this.element = element;
		this.options = options;
		this.createEightHandles();
	}

	private createEightHandles() {
		const frag = new DocumentFragment();
		for (const pos of ["t", "r", "b", "l", "t l", "t r", "b l", "b r"]) {
			const handle = document.createElement("div");
			handle.className = `resizeHandle ${pos}`;
			frag.appendChild(handle);
			handle.on("pointerdown", this.resizeStart.bind(this));
			this.handles.push(handle);
		}
		this.element.appendChild(frag);
	}

	private resizeStart(e: PointerEvent) {
		e.preventDefault();
		this.isResizing = true;
		this.currentHandle = e.target as HTMLElement;
		this.initialX = e.clientX;
		this.initialY = e.clientY;
		this.initialWidth = this.element.offsetWidth;
		this.initialHeight = this.element.offsetHeight;
		this.initialLeft = this.element.offsetLeft;
		this.initialTop = this.element.offsetTop;
		document.on("pointermove", this.resize.bind(this));
		document.on("pointerup", this.resizeEnd.bind(this));
		this.options.onResizeStart?.(e);
	}

	private resize(e: PointerEvent) {
		if (!this.isResizing || !this.currentHandle) return;

		const isHandleType = (type: "l" | "r" | "b" | "t") => {
			return this.currentHandle?.classList.contains(type);
		};

		const dx = (e.clientX - this.initialX) / this.scale;
		const dy = (e.clientY - this.initialY) / this.scale;

		if (isHandleType("r")) {
			this.element.style.width = `${this.initialWidth + dx}px`;
		}

		if (isHandleType("b")) {
			this.element.style.height = `${this.initialHeight + dy}px`;
		}

		if (isHandleType("l")) {
			// Because the min-width property is 'em' not 'px', thus we need getComputedStyle
			const minWidth = parseInt(getComputedStyle(this.element).minWidth);
			const newWidth = this.initialWidth - dx;

			if (minWidth < newWidth) {
				this.element.style.width = `${newWidth}px`;
				this.element.style.left = `${this.initialLeft + dx}px`;
			}
		}

		if (isHandleType("t")) {
			// Because the min-width property is 'em' not 'px', thus we need getComputedStyle
			const minHeight = parseInt(getComputedStyle(this.element).minHeight);
			const newHeight = this.initialHeight - dy;

			if (minHeight < newHeight) {
				this.element.style.height = `${newHeight}px`;
				this.element.style.top = `${this.initialTop + dy}px`;
			}
		}

		this.options.onResize?.(e);
	}

	private resizeEnd(e: PointerEvent) {
		if (!this.isResizing) return;
		this.isResizing = false;
		this.currentHandle = null;
		document.off("pointermove", this.resize.bind(this));
		document.off("pointerup", this.resizeEnd.bind(this));

		this.options.onResizeEnd?.(e);
	}

	destroy() {
		for (const handle of this.handles) {
			handle.off("pointerdown", this.resizeStart.bind(this));
			handle.remove();
		}
	}
}
