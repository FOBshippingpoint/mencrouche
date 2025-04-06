class ToggleIconButton extends HTMLElement {
	private _checked: boolean = false;
	private _iconOn: HTMLElement | null = null;
	private _iconOff: HTMLElement | null = null;
	private _checkbox: HTMLInputElement | null = null;

	constructor() {
		super();
		this._handleClick = this._handleClick.bind(this);
	}

	connectedCallback(): void {
		this._setupSlots();
		this._updateDisplay();
		this.addEventListener("click", this._handleClick);
	}

	disconnectedCallback(): void {
		this.removeEventListener("click", this._handleClick);
	}

	get checked(): boolean {
		return this._checked;
	}

	set checked(value: boolean) {
		const isChecked = Boolean(value);
		if (this._checked !== isChecked) {
			this._checked = isChecked;
			this._updateDisplay();

			if (this._checkbox) {
				this._checkbox.checked = this._checked;
			}

			this.dispatchEvent(
				new CustomEvent("change", {
					bubbles: true,
					detail: { checked: this._checked },
				}),
			);
		}
	}

	private _setupSlots(): void {
		const iconOnElements =
			this.querySelectorAll<HTMLElement>('[slot="icon-on"]');
		const iconOffElements =
			this.querySelectorAll<HTMLElement>('[slot="icon-off"]');
		const checkboxElements =
			this.querySelectorAll<HTMLInputElement>('[slot="checkbox"]');

		this._iconOn = iconOnElements[0] ?? null;
		this._iconOff = iconOffElements[0] ?? null;
		this._checkbox = checkboxElements[0] ?? null;

		if (this._checkbox) {
			this._checked = this._checkbox.checked;

			this._checkbox.addEventListener("change", () => {
				this.checked = this._checkbox!.checked;
			});
		}
	}

	private _handleClick(): void {
		this.checked = !this._checked;
	}

	private _updateDisplay(): void {
		if (this._iconOn) {
			this._iconOn.style.display = this._checked ? "block" : "none";
		}
		if (this._iconOff) {
			this._iconOff.style.display = this._checked ? "none" : "block";
		}
	}
}

// Define the custom element
customElements.define("toggle-icon-button", ToggleIconButton);
