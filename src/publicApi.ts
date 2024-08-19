import { registerCommand, executeCommand, apocalypse } from "./commands";
import { $, $$, $$$ } from "./utils/dollars";
import {
  createSticky,
  getCustomStickyTypes,
  getRelatedCustomStickies,
  registerSticky,
} from "./sticky";
import { n81i } from "./utils/n81i";
import { dataset } from "./myDataset";
import { registerContextMenu } from "./contextMenu";

declare global {
  interface Window {
    mc: typeof mc;
  }
}

const mc = {
  $,
  $$,
  $$$,
  n81i,
  dataset,
  apocalypse,
  createSticky,
  registerSticky,
  executeCommand,
  registerCommand,
  registerContextMenu,
  getCustomStickyTypes,
  getRelatedCustomStickies,
};

export function addPublicApi() {
  window.mc = mc;
}
