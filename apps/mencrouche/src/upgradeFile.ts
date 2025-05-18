import type {
	MencroucheFileFormat,
	MencroucheFileFormatVersionRegistry,
} from "@mencrouche/types";

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
		migrate(obj: MencroucheFileFormatVersionRegistry[1]) {
			// some migration logics.
			return obj as MencroucheFileFormatVersionRegistry[2];
		},
	},
];
