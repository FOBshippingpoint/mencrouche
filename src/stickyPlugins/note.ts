import { $$$ } from "../utils/dollars";
import Quill, { Delta } from "quill";
import {
	registerSticky,
	type StickyPlugin,
	type StickyPluginModel,
} from "../sticky/sticky";

declare module "../sticky/sticky" {
	interface StickyPluginRegistry {
		note: NotePlugin;
	}
}

interface NotePlugin extends StickyPlugin {
	quill: Quill;
	config: {
		contents: Delta;
	};
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
	},
	onSave(sticky) {
		return { contents: sticky.plugin.quill.getContents() };
	},
	onDelete() {},
};

export function initNoteSticky() {
	registerSticky(noteSticky);
}
