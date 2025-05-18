import "../utils/tools";

/**
 * A custom element that represents a toggle between two icons.
 *
 * @example
 * ```html
 * <icon-toggle checked>
 *   <span>ON Icon</span>
 *   <span>OFF Icon</span>
 * </icon-toggle>
 * ```
 *
 * @fires change - Dispatched when the toggle state changes
 * @element icon-toggle
 */
export class IconToggle extends HTMLElement {
	/** Reference to the "on" state icon element */
	private onIcon: HTMLElement | null = null;
	/** Reference to the "off" state icon element */
	private offIcon: HTMLElement | null = null;
	private _checked: boolean;

	/**
	 * @throws {Error} When child elements fewer than 2;
	 */
	constructor() {
		super();
		this.onIcon = this.$<HTMLElement>(":scope > :nth-child(1)");
		this.offIcon = this.$<HTMLElement>(":scope > :nth-child(2)");
		if (!this.onIcon || !this.offIcon) {
			throw Error("Please define two icon inside [ icon-toggle ] element.");
		}
		this._setChecked(this.hasAttribute("checked"));
		this._checked = this.checked; // make typescript happy :)
	}

	connectedCallback(): void {
		this.checked;
		this.on("click", () => (this.checked = !this.checked));
	}

	/**
	 * Gets the current checked state of the toggle.
	 * @returns {boolean} The checked state
	 */
	get checked(): boolean {
		return this._checked;
	}

	/**
	 * Sets the checked state and dispatches a 'change' event.
	 * @param {boolean} value - The new checked state
	 */
	set checked(value: boolean) {
		this._setChecked(value);
		this.dispatchEvent(new CustomEvent("change"));
	}

	toggleChecked(checked?: boolean) {
		if (checked === undefined) {
			this.checked = !this.checked;
		} else {
			this.checked = checked;
		}
	}

	/**
	 * Sets the checked state without dispatching an event.
	 * Updates the visibility of the icons based on the state.
	 * @param {boolean} value - The new checked state
	 * @private
	 */
	_setChecked(value: boolean) {
		this.onIcon!.classList.toggle("none", !value);
		this.offIcon!.classList.toggle("none", value);
		this._checked = value;
	}
}
customElements.define("icon-toggle", IconToggle);
