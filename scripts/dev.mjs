import "zx/globals";
import { getManifestString } from "../src/manifest.js";

await $`mkdir -p dist`;
const manifest = getManifestString(2);
fs.writeFile("src/manifest.json", manifest);
$`npm run host`;
$`sleep 2; npm run start:firefox`;
