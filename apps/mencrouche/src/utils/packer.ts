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
