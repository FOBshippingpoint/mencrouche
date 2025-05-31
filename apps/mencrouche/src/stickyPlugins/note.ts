import { $$$ } from "../utils/tools";
import Quill, { Delta } from "quill";
import { registerSticky } from "../sticky/sticky";
import { registerContextMenu } from "../contextMenu";
import {
	type MenuItem,
	type Sticky,
	type StickyPlugin,
	type StickyPluginModel,
} from "@mencrouche/types";

declare module "@mencrouche/types" {
	interface StickyPluginRegistry {
		note: NotePlugin;
	}
}

interface NotePlugin extends StickyPlugin {
	quill: Quill;
	config: {
		contents: Delta;
	};
	toggleToolbar: () => void;
}

const toolbarOptions = [
	[{ header: [1, 2, 3, 4, false] }],
	["bold", "italic", "underline", "strike", { color: [] }, { background: [] }], // toggled buttons
	[{ list: "ordered" }, { list: "bullet" }, { list: "check" }, { align: [] }],
	["link", "image", "code-block", "clean"],
];

const noteSticky: StickyPluginModel<"note"> = {
	type: "note",
	onMount(sticky, origin) {
		const quillDom = $$$("div");
		sticky.replaceBody(quillDom);
		sticky.dataset.contextMenu = "note basic";
		sticky.plugin.quill = new Quill(quillDom, {
			modules: {
				toolbar: toolbarOptions,
				keyboard: {
					bindings: {
						undo: {
							key: "z",
							shortKey: true,
							handler: function () {
								// If the quill sticky is focused, then let quill's undo pass.
								return sticky.contains(document.activeElement);
							},
						},
					},
				},
			},
			theme: "snow",
		});
		if (origin === "create") {
			setTimeout(() => {
				sticky.$<HTMLElement>(".ql-editor")!.focus();
			});
		}
		if (sticky.pluginConfig) {
			sticky.plugin.quill.setContents(sticky.pluginConfig.contents);
		}

		sticky.plugin.toggleToolbar = () => sticky.classList.toggle("hideToolbar");
	},
	onSave(sticky) {
		return { contents: sticky.plugin.quill.getContents() };
	},
	onDelete() {},
};

const noteStickyMenuItems: MenuItem[] = [
	(sticky: Sticky<"note">) => ({
		name: sticky.classList.contains("hideToolbar")
			? "noteStickyHideToolbarOn"
			: "noteStickyHideToolbarOff",
		icon: sticky.classList.contains("hideToolbar")
			? "lucide-eye"
			: "lucide-eye-closed",
		execute() {
			sticky.plugin.toggleToolbar();
		},
	}),
	"hr",
];

export function initNoteSticky() {
	registerSticky(noteSticky);
	registerContextMenu("note", noteStickyMenuItems);
}
