export interface Undoable {
	execute: () => void;
	undo: () => void;
	toString?: () => string; // Useful when debugging
}

export interface ArgumentedUndoable<T> {
	execute: (state: T) => void;
	undo: (state: T) => void;
	toString?: () => string; // Useful when debugging
}

export type Overwrite<T> = (state: ArgumentedUndoable<T>) => void;

function log(message?: string) {
	if (message) {
		console.log(
			`%c[ APOCALYPSE ]%c ${message}`,
			"background: red; color: black; font-weight: bold; padding: 2px 6px; border-radius: 3px;",
			"font-weight: bold;",
		);
	}
}

// I name it Apocalypse because 'history' is a Web API.
export class Apocalypse {
	private history: Undoable[] = [];
	private pointer: number = -1;
	public debug: boolean = false;

	redo() {
		if (this.pointer < this.history.length - 1) {
			this.pointer++;
			const undoable = this.history[this.pointer]!;
			undoable.execute();
			if (this.debug) {
				log(`Redo → ${undoable.toString?.()}`);
			}
		}
	}
	undo() {
		if (this.pointer >= 0) {
			const undoable = this.history[this.pointer]!;
			undoable.undo();
			this.pointer--;
			if (this.debug) {
				log(`Undo ← ${undoable.toString?.()}`);
			}
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
		if (this.debug) {
			log(`Write → ${undoable.toString?.()}`);
		}
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
