export interface ZoomContext {
  scale: number;
}

export class ZoomAware {
  zoomContext: ZoomContext;
  static NO_SCALE_ZOOM_CONTEXT = { scale: 1 };

  constructor(zoomContext?: ZoomContext) {
    this.zoomContext = zoomContext ?? ZoomAware.NO_SCALE_ZOOM_CONTEXT;
  }

  get scale() {
    return this.zoomContext.scale;
  }
}

export class Zoomable implements ZoomContext {
  scale = 1;
  translateX = 0;
  translateY = 0;

  el: HTMLElement;
  interactEl: HTMLElement;
  minScale: number;
  maxScale: number;

  constructor(
    targetEl: HTMLElement,
    options: {
      minScale?: number;
      maxScale?: number;
      interactEl?: HTMLElement;
      onZoom?: () => void;
    } = {},
  ) {
    this.el = targetEl;
    this.interactEl = options.interactEl ?? targetEl;
    this.minScale = options.minScale ?? 0.125;
    this.maxScale = options.maxScale ?? 4;

    this.interactEl.on("wheel", (e) => {
      // Ctrl + wheel scroll to zoom.
      if (!e.ctrlKey) return;

      e.preventDefault();
      // Convert mouse position to relative to content position
      const rect = this.el.getBoundingClientRect();
      const dx = (e.clientX - rect.x) / this.scale;
      const dy = (e.clientY - rect.y) / this.scale;
      // Calculate new scale
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = clamp(
        this.minScale,
        this.scale * zoomFactor,
        this.maxScale,
      );
      if (newScale !== this.scale) {
        // Calculate new position to keep mouse point fixed
        const newX = this.translateX + (e.clientX - rect.x) - dx * newScale;
        const newY = this.translateY + (e.clientY - rect.y) - dy * newScale;
        this.scale = newScale;
        this.translateX = newX;
        this.translateY = newY;
        this.applyTransform();
        options.onZoom?.();
      }
    });
  }

  zoomIn() {
    this.scale *= 1.1;
    this.applyTransform();
  }

  zoomOut() {
    this.scale *= 0.9;
    this.applyTransform();
  }

  zoomReset() {
    this.scale = 1;
    this.applyTransform();
  }

  transformReset() {
    this.translateX = 0;
    this.translateY = 0;
    this.applyTransform();
  }

  private applyTransform() {
    this.el.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  setTransform(transform: Transform) {
    this.translateX = transform.translateX;
    this.translateY = transform.translateY;
    this.scale = transform.scale;
    this.applyTransform();
  }

  getTransform(): Transform {
    return {
      translateX: this.translateX,
      translateY: this.translateY,
      scale: this.scale,
    };
  }
}

export interface Transform {
  translateX: number;
  translateY: number;
  scale: number;
}

function clamp(min: number, value: number, max: number) {
  return Math.min(Math.max(min, value), max);
}
