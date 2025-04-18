import type { WorkspaceConfig } from "./sticky/sticky";

export function upgradeFileToLatest(
	mcFile: MencroucheFileFormat,
): MencroucheFileFormat {
	let currentVersion = mcFile.mencroucheFileFormatVersion ?? 1;

	return migrations.reduce((acc, migration) => {
		if (migration.version > currentVersion) {
			acc = migration.migrate(acc);
			acc.mencroucheFileFormatVersion = migration.version;
		}
		return acc;
	}, mcFile);
}

const migrations = [
	{
		version: 1,
		migrate(obj: MencroucheFileFormat) {
			return obj;
		},
	},
	{
		version: 2,
		migrate(obj: VersionRegistry[1]) {
			// some migration logics.
			return obj as VersionRegistry[2];
		},
	},
];

export interface MencroucheFileFormat extends Record<string, unknown> {
	mencroucheFileFormatVersion: number;
	timestamp: string;
}

interface V1 extends MencroucheFileFormat {
	mencroucheFileFormatVersion: 1;
	locale: string;
	availableLocales: string[];
	isGhostMode: boolean;
	/**
	 * base64 url or other like imgur url.
	 */
	backgroundImageUrl: string;
	paletteHue: string;
	theme: "light" | "dark";
	workspace: WorkspaceConfig;
}

interface VersionRegistry extends Record<number, MencroucheFileFormat> {
	1: V1;
}
