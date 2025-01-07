// Drag and drop code was modified from https://codepen.io/gabrielferreira/pen/jMgaLe
// Under MIT License (https://blog.codepen.io/legal/licensing/)
export class DragAndDropSorter {
  private onBeforeSwap: (src: HTMLElement, target: HTMLElement) => void;
  private container: HTMLElement;
  private dragSrcEl: HTMLElement | null = null;

  private dragStart = (e: DragEvent) => {
    if (e.target instanceof HTMLElement) {
      const target = e.target.closest('[draggable="true"]')! as HTMLElement;
      target.style.opacity = "0.4";
      this.dragSrcEl = target;
    }
  };

  private dragEnter = (e: DragEvent) => {
    (e.target as HTMLElement).classList.add("dragOver");
  };

  private dragLeave = (e: DragEvent) => {
    (e.target as HTMLElement).classList.remove("dragOver");
  };

  private dragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    return false;
  };

  private dragDrop = (e: DragEvent) => {
    e.stopPropagation();
    const target = (e.target as HTMLElement).closest(
      '[draggable="true"]',
    ) as HTMLElement;
    if (this.dragSrcEl && this.dragSrcEl !== target) {
      this.onBeforeSwap(this.dragSrcEl, target);
      this.swap(this.dragSrcEl, target);
    }
    this.container
      .$$(".dragOver")
      .forEach((el) => el.classList.remove("dragOver"));
    return false;
  };

  private dragEnd = () => {
    this.container
      .$$(".dragOver")
      .forEach((el) => el.classList.remove("dragOver"));
    if (this.dragSrcEl) {
      this.dragSrcEl.style.opacity = "1";
    }
  };

  constructor(
    container: HTMLElement,
    onBeforeSwap: (src: HTMLElement, target: HTMLElement) => void = () => {},
  ) {
    this.container = container;
    this.onBeforeSwap = onBeforeSwap;
    this.setupListeners();
    new MutationObserver(() => {
      this.setupListeners();
    }).observe(container, { childList: true });
  }

  private setupListeners() {
    for (const _el of this.container.$$('[draggable="true"]')) {
      const el = _el as HTMLElement;
      el.on("dragstart", this.dragStart);
      el.on("dragenter", this.dragEnter);
      el.on("dragover", this.dragOver);
      el.on("dragleave", this.dragLeave);
      el.on("drop", this.dragDrop);
      el.on("dragend", this.dragEnd);
    }
  }

  private swap(a: Node, b: Node) {
    const aSibling = a.nextSibling === b ? a : a.nextSibling;
    b.parentNode!.insertBefore(a, b);
    a.parentNode!.insertBefore(b, aSibling);
  }
}
