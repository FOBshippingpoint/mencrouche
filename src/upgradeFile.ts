export function upgradeFileToLatest(
  mcFile: MencroucheFileFormat,
): MencroucheFileFormat {
  let currentVersion = mcFile.mencroucheFileFormatVersion || 0;

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

interface MencroucheFileFormat extends Record<string, unknown> {
  mencroucheFileFormatVersion: number;
}

interface V1 extends MencroucheFileFormat {
  mencroucheFileFormatVersion: 1;
  timestamp: string;
  locale: string;
  availableLocales: string[];
  isGhostMode: boolean;
  backgroundImageUrl: string; // base64 url or other like imgur url.
  paletteHue: string;
  theme: "light" | "dark";
}

interface VersionRegistry extends Record<number, MencroucheFileFormat> {
  1: V1;
}
