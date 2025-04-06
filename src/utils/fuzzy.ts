// Forked from Fuzzify under MIT License
// link: https://github.com/ad1992/fuzzify
export interface FuzzyItem {
	text: string;
	[key: string]: any;
}

export interface FuzzySearchResult {
	item: FuzzyItem;
	distance: number;
	matches: [number, number][];
	score: number;
}

export class Fuzzy {
	// Weights for matching score and normalized distance
	private readonly MATCHING_SCORE_WEIGHT = 0.5;
	private readonly NORMALIZED_DISTANCE_WEIGHT = 0.5;
	private items: FuzzyItem[];

	constructor(items: FuzzyItem[]) {
		this.items = items;
	}

	// Calculate Levenshtein distance between two strings
	#levenshteinFullMatrixSearch(query: string, target: string): number[][] {
		const dp: number[][] = new Array(query.length + 1)
			.fill(0)
			.map(() => new Array(target.length + 1).fill(0));

		for (let j = 0; j <= query.length; j++) {
			dp[j]![0] = j;
		}

		for (let k = 0; k <= target.length; k++) {
			dp[0]![k] = k;
		}

		for (let j = 1; j <= query.length; j++) {
			for (let k = 1; k <= target.length; k++) {
				if (query[j - 1] === target[k - 1]) {
					dp[j]![k] = dp[j - 1]![k - 1]!;
				} else {
					dp[j]![k] =
						Math.min(dp[j]![k - 1]!, dp[j - 1]![k]!, dp[j - 1]![k - 1]!) + 1;
				}
			}
		}

		return dp;
	}

	// Set max distance based on the length of the strings
	#getMaxLevenshteinDistance(query: string, target: string): number {
		const length = Math.max(query.length, target.length);
		if (length <= 5) {
			return 3;
		}
		if (length <= 15) {
			return 10;
		}
		return 15;
	}

	// Get matching indices from the matrix
	#getMatchingIndices(
		matrix: number[][],
		query: string,
		target: string,
	): [number, number][] {
		const matches: [number, number][] = [];
		let i = query.length;
		let j = target.length;

		while (i > 0 && j > 0) {
			if (query[i - 1] === target[j - 1]) {
				matches.unshift([i - 1, j - 1]);
				i--;
				j--;
			} else if (matrix[i - 1]![j]! > matrix[i]![j - 1]!) {
				j--;
			} else {
				i--;
			}
		}

		return matches;
	}

	// Calculate score based on matching score and normalized distance
	#calculateScore(
		query: string,
		target: string,
		matches: [number, number][],
		distance: number,
	): number {
		const maxLevenshteinDistance = this.#getMaxLevenshteinDistance(
			query,
			target,
		);

		if (distance > maxLevenshteinDistance) {
			return 0;
		}

		const matchingScore =
			matches.length / Math.min(target.length, query.length);
		const normalizedDistance = distance / Math.max(query.length, target.length);

		const score =
			this.NORMALIZED_DISTANCE_WEIGHT * (1 - normalizedDistance) +
			this.MATCHING_SCORE_WEIGHT * matchingScore;

		return score;
	}

	search(query: string): FuzzySearchResult[] {
		const result: FuzzySearchResult[] = [];
		query = query.toLowerCase();

		for (let i = 0; i < this.items.length; i++) {
			const target = this.items[i]!;
			const text = target.text.toLowerCase();
			const matrix = this.#levenshteinFullMatrixSearch(query, text);
			const matches = this.#getMatchingIndices(matrix, query, text);
			const distance = matrix[query.length]![text.length]!;
			const score = this.#calculateScore(query, text, matches, distance);

			result[i] = {
				item: target,
				distance,
				matches,
				score,
			};
		}

		result.sort((x, y) => y.score - x.score);

		const approxMatches: FuzzySearchResult[] = [];

		for (let i = 0; i < result.length; i++) {
			const r = result[i]!;
			if (r.score > 0) {
				approxMatches[i] = r;
			}
		}

		return approxMatches.filter(Boolean);
	}
}
