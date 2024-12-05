import { $, $$$ } from "../utils/dollars";
import {
  type CustomStickyComposer,
  type CustomStickyConfig,
  type Sticky,
  type StickyPlugin,
  registerSticky,
} from "../sticky";

class ShadowDOMEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
                <style>
                  @import "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css";
                </style>
                <div id="editor-container"></div>
                `;

    this.shadowRoot.appendChild(wrapper);

    const tag = document.createElement("script");
    tag.src = "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag?.parentNode!.insertBefore(tag, firstScriptTag);

    const editorContainer = this.shadowRoot.getElementById("editor-container");

    tag.onload = () => {
      new Quill(editorContainer, {
        theme: "snow",
      });
    };
  }
}

customElements.define("quill-editor", ShadowDOMEditor);

interface NotePlugin extends StickyPlugin {}
interface NoteConfig extends CustomStickyConfig {
  // some data
}

const noteSticky: CustomStickyComposer = {
  type: "note",
  onCreate(sticky: Sticky<NoteConfig>) {
    const quillDom = $$$("quill-editor");
    sticky.replaceBody(quillDom);
  },
  onSave(sticky: Sticky<NotePlugin>) {},
  onDelete() {},
  onRestore(sticky: Sticky<NotePlugin>, pluginConfig: NoteConfig) {},
};

export function initNoteSticky() {
  registerSticky(noteSticky);
}
