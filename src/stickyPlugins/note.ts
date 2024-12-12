import { $, $$$ } from "../utils/dollars";
import Quill, { Delta } from "quill";
import {
  registerSticky,
  type CustomStickyComposer,
  type CustomStickyConfig,
  type Sticky,
  type StickyPlugin,
} from "../sticky";
import { n81i } from "../utils/n81i";

interface NotePlugin extends StickyPlugin {
  quill: Quill;
}
interface NoteConfig extends CustomStickyConfig {
  contents: Delta;
}

const noteSticky: CustomStickyComposer = {
  type: "note",
  onCreate(sticky: Sticky<NotePlugin>) {
    enable(sticky);
  },
  onSave(sticky: Sticky<NotePlugin>) {
    return { contents: sticky.plugin.quill.getContents() };
  },
  onDelete() {},
  onRestore(sticky: Sticky<NotePlugin>, pluginConfig: NoteConfig) {
    enable(sticky);
    sticky.plugin.quill.setContents(pluginConfig.contents);
  },
};

function enable(sticky: Sticky<NotePlugin>) {
  const quillDom = $$$("div");
  sticky.replaceBody(quillDom);
  sticky.plugin.quill = new Quill(quillDom, {
    theme: "snow",
    placeholder: n81i.t("stickyTextareaStartTypingPlaceholder")
  });
}

export function initNoteSticky() {
  registerSticky(noteSticky);
}
