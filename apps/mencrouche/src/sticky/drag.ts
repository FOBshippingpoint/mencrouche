import { ZoomAware, type ZoomContext } from "./zoom.js";
import type { Offset } from "@mencrouche/types";

export interface DragOptions {
	interactEl?: HTMLElement;
	container?: HTMLElement;
	padding?: number;
	/**
	 * See https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
	 */
	acceptMouseButton?: number;
	onDragStart?: (e: PointerEvent) => void;
	onDrag?: (e: PointerEvent) => void;
	onDragEnd?: (e: PointerEvent) => void;
}

export class Draggable extends ZoomAware {
	private element: HTMLElement;
	private interactEl: HTMLElement;
	private container: HTMLElement;
	private options: DragOptions;
	private padding = 0;
	private isDragging = false;
	private initialX = 0;
	private initialY = 0;
	private dx = 0;
	private dy = 0;

	constructor(
		element: HTMLElement,
		options: DragOptions = {},
		zoomContext?: ZoomContext,
	) {
		super(zoomContext);
		this.element = element;
		this.interactEl = options.interactEl ?? element;
		this.container = options.container ?? document.body;
		this.padding = options.padding ?? this.padding;
		this.options = options;
		this.init();
	}

	private init() {
		this.interactEl.on("pointerdown", this.dragStart.bind(this));
	}

	private dragStart(e: PointerEvent) {
		// Ignore right-click when accpetMouseButton is not set.
		if (this.options.acceptMouseButton !== 2 && e.button === 2) return;
		// Ignore any "non-acceptMouseButton" mouse button.
		// e.g., middle button = 1, e.button = 0, not match so no drag.
		if (
			this.options.acceptMouseButton !== undefined &&
			this.options.acceptMouseButton !== e.button
		)
			return;
		// Ignore any click on "handle" element itself.
		// This is a strategy to prevent trigger drag on click on header buttons.
		if (e.target !== e.currentTarget) return;

		this.isDragging = true;
		this.initialX = e.clientX;
		this.initialY = e.clientY;
		this.element.classList.add("dragging");

		document.on("pointermove", this.drag.bind(this) as any);
		document.on("pointerup", this.dragEnd.bind(this) as any);

		this.options.onDragStart?.(e);
	}

	private drag(e: PointerEvent) {
		if (!this.isDragging) return;
		e.preventDefault();

		// Delta of every drag moment.
		this.dx = e.clientX - this.initialX;
		this.dy = e.clientY - this.initialY;
		// Reset initial point by current cursor point.
		this.initialX = e.clientX;
		this.initialY = e.clientY;

		// FIXME: legacy implementation for dragging boundary
		// const minX = -this.element.offsetWidth + this.padding;
		// const minY = 0;
		// const maxX = this.container.offsetWidth - this.padding;
		// const maxY = this.container.offsetHeight - this.padding;
		// this.currentX = Math.min(Math.max(this.currentX, minX), maxX);
		// this.currentY = Math.min(Math.max(this.currentY, minY), maxY);

		const offsetLeft = this.element.offsetLeft + this.dx / this.scale;
		const offsetTop = this.element.offsetTop + this.dy / this.scale;
		this.setOffset({ offsetLeft, offsetTop });

		this.options.onDrag?.(e);
	}

	private dragEnd(e: PointerEvent) {
		if (!this.isDragging) return;
		this.isDragging = false;
		this.element.classList.remove("dragging");

		document.off("pointermove", this.drag.bind(this) as any);
		document.off("pointerup", this.dragEnd.bind(this) as any);

		this.options.onDragEnd?.(e);
	}

	destroy() {
		this.interactEl.off("pointerdown", this.dragStart.bind(this));
	}

	setOffset(offset: Offset) {
		this.element.setRect(offset.offsetLeft, offset.offsetTop);
	}

	offsetReset() {
		this.setOffset({ offsetLeft: 0, offsetTop: 0 });
	}

	getOffset(): Offset {
		return {
			offsetLeft: this.element.offsetLeft,
			offsetTop: this.element.offsetTop,
		};
	}
}
