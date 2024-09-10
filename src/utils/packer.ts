/**
 * This file contains a modified version of the bin-packing library originally
 * authored by Jake Gordon.
 *
 * Credits: https://github.com/jakesgordon/bin-packing/
 */

// Use "PackerNode" instead of "Node" to avoid confusion with the Web API's
// Node interface.
interface PackerNode {
  x: number;
  y: number;
  w: number;
  h: number;
  used?: boolean;
  right?: PackerNode;
  down?: PackerNode;
}
export class BinPacker {
  root: PackerNode;

  constructor(w: number, h: number) {
    this.root = { x: 0, y: 0, w, h };
  }

  fit(blocks: PackerNode[]) {
    let node: PackerNode;

    return blocks.map(block => {
      if ((node = this.findNode(this.root, block.w, block.h))) {
        return this.splitNode(node, block.w, block.h);
      } else {
        return null;
      }
    })
  }

  findNode(root: PackerNode, w: number, h: number) {
    if (root.used)
      return this.findNode(root.right, w, h) || this.findNode(root.down, w, h);
    else if (w <= root.w && h <= root.h) return root;
    else return null;
  }

  splitNode(node: PackerNode, w: number, h: number) {
    node.used = true;
    node.down = { x: node.x, y: node.y + h, w: node.w, h: node.h - h };
    node.right = { x: node.x + w, y: node.y, w: node.w - w, h: h };
    return node;
  }
}
