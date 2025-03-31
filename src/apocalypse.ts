export interface Undoable {
  execute: () => void;
  undo: () => void;
  toString?: () => string; // Useful when debugging
}

interface ArgumentedUndoable<T> {
  execute: (state: T) => void;
  undo: (state: T) => void;
  toString?: () => string; // Useful when debugging
}

export type Overwrite<T> = (state: ArgumentedUndoable<T>) => void;

// I name it Apocalypse because 'history' is a Web API.
export class Apocalypse {
  private history: Undoable[] = [];
  private pointer: number = -1;

  redo() {
    if (this.pointer < this.history.length - 1) {
      this.pointer++;
      this.history[this.pointer]!.execute();
    }
  }
  undo() {
    if (this.pointer >= 0) {
      this.history[this.pointer]!.undo();
      this.pointer--;
    }
  }
  write(undoable: Undoable) {
    // If we're in the middle of the stack, remove all "future" commands
    if (this.pointer < this.history.length - 1) {
      this.history.splice(this.pointer + 1);
    }
    this.history.push(undoable);
    this.pointer++;
    undoable.execute();
  }
  listAll(): readonly Undoable[] {
    return this.history;
  }
  checkpoint<T>(state: T): Overwrite<T> {
    let isFirstRun = true;
    let pointer: number;
    return (undoable: ArgumentedUndoable<T>) => {
      const wrappedUndoable = {
        execute: () => undoable.execute(state),
        undo: () => undoable.undo(state),
      };
      if (isFirstRun) {
        pointer = this.pointer;
        isFirstRun = false;
        this.write(wrappedUndoable);
      } else {
        // Replace current action. History length remains the same.
        this.history[pointer] = wrappedUndoable;
        wrappedUndoable.execute();
      }
    };
  }
}

export const apocalypse = new Apocalypse();
