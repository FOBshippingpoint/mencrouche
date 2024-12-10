import { $, $$$ } from "../utils/dollars";
import {
  type CustomStickyComposer,
  type CustomStickyConfig,
  type Sticky,
  type StickyPlugin,
  registerSticky,
} from "../sticky";
import Quill from "quill";

interface NotePlugin extends StickyPlugin {}
interface NoteConfig extends CustomStickyConfig {
  // some data
}

const noteSticky: CustomStickyComposer = {
  type: "note",
  onCreate(sticky: Sticky<NoteConfig>) {
    const quillDom = $$$("div");
    sticky.replaceBody(quillDom);
    new Quill(quillDom, {
      theme: "snow",
    });
  },
  onSave(sticky: Sticky<NotePlugin>) {},
  onDelete() {},
  onRestore(sticky: Sticky<NotePlugin>, pluginConfig: NoteConfig) {},
};

export function initNoteSticky() {
  registerSticky(noteSticky);
}
