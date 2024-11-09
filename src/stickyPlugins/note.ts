import {
  type CustomStickyComposer,
  type CustomStickyConfig,
  type Sticky,
  type StickyPlugin,
  registerSticky,
} from "../sticky";
import { $, $$$ } from "../utils/dollars";
import Quill from "quill";
import Toolbar from "quill/modules/toolbar";
import Snow from "quill/themes/snow";
import Bold from "quill/formats/bold";
import Italic from "quill/formats/italic";
import Header from "quill/formats/header";

interface NotePlugin extends StickyPlugin {}
interface NoteConfig extends CustomStickyConfig {
  // some data
}

Quill.register({
  "modules/toolbar": Toolbar,
  "themes/snow": Snow,
  "formats/bold": Bold,
  "formats/italic": Italic,
  "formats/header": Header,
});

customElements.define("my-quill", class extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `

    <div></div>
    `;
  }
});

const noteSticky: CustomStickyComposer = {
  type: "note",
  onCreate(sticky: Sticky<NoteConfig>) {
    const myQuill = $$$("my-quill");
    const quillHolder = myQuill.$("div")!;
    sticky.replaceBody(quillHolder);
    const quill = new Quill(quillHolder, {
      bounds: quillHolder.parentElement,
      modules: {
        toolbar: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline"],
          ["image", "code-block"],
        ],
      },
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
