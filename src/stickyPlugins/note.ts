import { $$$ } from "../utils/dollars";
import Quill, { Delta } from "quill";
import {
	registerSticky,
	type PluginStickyModel,
	type PluginStickyConfig,
	type Sticky,
	type PluginSticky,
} from "../sticky/sticky";
import { n81i } from "../utils/n81i";

declare module "../sticky/sticky" {
	interface PluginStickyPoolMap {
		note: Sticky<NotePlugin, NoteConfig>;
	}
}

interface NotePlugin extends PluginSticky {
	quill: Quill;
}
interface NoteConfig extends PluginStickyConfig {
	contents: Delta;
}

const noteSticky: PluginStickyModel<NotePlugin, NoteConfig> = {
	type: "note",
	onCreate(sticky) {
		enable(sticky);
	},
	onSave(sticky) {
		return { contents: sticky.plugin.quill.getContents() };
	},
	onDelete() {},
	onRestore(sticky, pluginConfig) {
		enable(sticky);
		if (pluginConfig) {
			sticky.plugin.quill.setContents(pluginConfig.contents);
		}
	},
	css: `--sticky-padding: 0`,
};

const toolbarOptions = [
	[{ header: [1, 2, 3, 4, false] }],
	["bold", "italic", "underline", "strike", { color: [] }, { background: [] }], // toggled buttons
	[{ list: "ordered" }, { list: "bullet" }, { list: "check" }, { align: [] }],
	["link", "image", "code-block", "clean"],
];

function enable(sticky: Sticky<NotePlugin>) {
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
						handler: function (range, context) {
							// If the quill sticky is focused, then let quill's undo pass.
							return sticky.contains(document.activeElement);
						},
					},
				},
			},
		},
		theme: "snow",
	});
}

export function initNoteSticky() {
	registerSticky(noteSticky);
}
