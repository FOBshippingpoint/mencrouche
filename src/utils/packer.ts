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

    return blocks.map((block) => {
      if ((node = this.findNode(this.root, block.w, block.h))) {
        return this.splitNode(node, block.w, block.h);
      } else {
        return null;
      }
    });
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

export interface Bin {
  width: number;
  height: number;
}

export function pack(containerWidth: number, bins: Bin[]) {
  const cellSize = 100;
  const numCols = Math.floor(containerWidth / cellSize);

  const occupiedGrid: boolean[][] = [];
  for (let i = 0; i < cellSize; i++) {
    // Arbitrary max height
    occupiedGrid.push(Array(numCols).fill(false));
  }

  return bins.map((bin) => {
    // Calculate how many cells this box needs
    const colSpan = Math.ceil(bin.width / cellSize);
    const rowSpan = Math.ceil(bin.height / cellSize);

    // Find a free spot in the occupiedGrid
    let foundRow = -1;
    let foundCol = -1;
    outerLoop: for (
      let row = 0;
      row < occupiedGrid.length - rowSpan + 1;
      row++
    ) {
      for (let col = 0; col <= numCols - colSpan; col++) {
        let canFit = true;

        // Check if all required cells are free
        for (let r = 0; r < rowSpan; r++) {
          for (let c = 0; c < colSpan; c++) {
            if (occupiedGrid[row + r]![col + c]) {
              canFit = false;
              break;
            }
          }
          if (!canFit) break;
        }

        if (canFit) {
          foundRow = row;
          foundCol = col;
          break outerLoop;
        }
      }
    }

    // Mark cells as occupied
    for (let r = 0; r < rowSpan; r++) {
      for (let c = 0; c < colSpan; c++) {
        occupiedGrid[foundRow + r]![foundCol + c] = true;
      }
    }

    // Position box
    return {
      left: foundCol * cellSize,
      top: foundRow * cellSize,
    };
  });
}
