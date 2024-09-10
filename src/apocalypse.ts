export interface Undoable {
  execute: () => void;
  undo: () => void;
  toString?: () => string;
}

// Cuz 'history' already exists in Web API.
export class Apocalypse {
  private arr: Undoable[] = [];
  private cur: number = -1;

  redo() {
    if (this.cur < this.arr.length - 1) {
      this.cur++;
      this.arr[this.cur]!.execute();
    }
  }
  undo() {
    if (this.cur >= 0) {
      this.arr[this.cur]!.undo();
      this.cur--;
    }
  }
  write(undoable: Undoable) {
    // If we're in the middle of the stack, remove all "future" commands
    if (this.cur < this.arr.length - 1) {
      this.arr.splice(this.cur + 1);
    }

    this.arr.push(undoable);
    this.cur++;
    undoable.execute();
  }
  listAll(): readonly Undoable[] {
    return this.arr;
  }
}

export const apocalypse: Apocalypse = new Apocalypse();
