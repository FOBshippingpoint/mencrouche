import { openDB } from "idb";
import {
  blobToArrayBuffer,
  decryptData,
  encryptData,
  IV_LENGTH_BYTES,
} from "./utils/encryption";
import { createDataset } from "./utils/dataset";
import { upgradeFileToLatest, type MencroucheFileFormat } from "./upgradeFile";

const _dataset = createDataset();
// Avoid expose import/export methods of original dataset object.
const { toJson, toObject, fromObject, fromJson, ...dataset } = _dataset;
export { dataset };

type Todo = () => Promise<void> | void;
const beforeSaveTodos: Todo[] = [];
const afterLoadTodos: Todo[] = [];

export function addTodoBeforeSave(todo: Todo) {
  beforeSaveTodos.push(todo);
}
export function addTodoAfterLoad(todo: Todo) {
  afterLoadTodos.push(todo);
}

function readJsonFile(jsonFile: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve(reader.result as string);
    });
    reader.addEventListener("error", (e: ProgressEvent) => reject(e));
    reader.readAsText(jsonFile);
  });
}

async function importFromJsonFile(mcJsonFile: File) {
  const mcJson = await readJsonFile(mcJsonFile);
  importFromJson(mcJson);
}
function importFromJson(mcJson: string) {
  const obj = JSON.parse(mcJson);
  importFromObject(obj);
}
function importFromObject(mcObj: MencroucheFileFormat) {
  const latestMcObj = upgradeFileToLatest(mcObj);
  console.log(latestMcObj);
  fromObject.call(_dataset, latestMcObj);
}
async function prepareSave() {
  const promises = beforeSaveTodos.map((t) => t());
  await Promise.all(promises);
  dataset.setItem("mencroucheFileFormatVersion", 1);
  dataset.setItem("timestamp", new Date().toISOString());
}
export async function finishLoad() {
  const promises = afterLoadTodos.map((t) => t());
  await Promise.all(promises);
}
export async function saveToSources(...sources: Source[]) {
  await prepareSave();
  const mcObj = toObject.call(_dataset) as MencroucheFileFormat;
  for (const source of sources) {
    source.save(mcObj);
  }
}

export interface Source {
  save(mcObj: MencroucheFileFormat): Promise<void>;
  load(): Promise<void>;
}

export class RemoteSource implements Source {
  syncUrl;
  syncResourceId;
  // syncRemoteAuthKey;
  encryptionKey;

  constructor({
    syncUrl,
    syncResourceId,
    // syncRemoteAuthKey,
    encryptionKey,
  }: {
    syncUrl: string;
    syncResourceId: string;
    // syncRemoteAuthKey: string;
    encryptionKey: string;
  }) {
    this.syncUrl = syncUrl;
    this.syncResourceId = syncResourceId;
    // this.syncRemoteAuthKey = syncRemoteAuthKey;
    this.encryptionKey = encryptionKey;
  }

  async save(mcObj: MencroucheFileFormat) {
    const mcJson = JSON.stringify(mcObj);
    const encrypted = await encryptMcJson(mcJson, this.encryptionKey);
    await this.uploadBlob(
      this.syncUrl,
      this.syncResourceId,
      // this.syncRemoteAuthKey,
      encrypted,
    );
  }

  async load() {
    const fileBlob = await this.fetchBlob(this.syncUrl, this.syncResourceId);
    if (!fileBlob)
      throw Error(
        `File not found in remote '${this.syncUrl}/${this.syncResourceId}'`,
      );

    const decryptedMcJson = await decryptBlob(fileBlob, this.encryptionKey);
    importFromJson(decryptedMcJson);
  }

  async uploadBlob(
    syncUrl: string,
    resourceId: string,
    // authKey: string,
    body: Uint8Array,
  ) {
    const response = await fetch(new URL(resourceId, syncUrl), {
      method: "PUT",
      body,
      // headers: { "X-Custom-Auth-Key": authKey },
    });

    if (!response.ok) {
      console.error("Failed to upload file", await response.text());
    }
  }

  async fetchBlob(syncUrl: string, resourceId: string): Promise<Blob | null> {
    const response = await fetch(new URL(resourceId, syncUrl));
    if (!response.ok) {
      console.error("Failed to get file:", await response.text());
      return null;
    }
    return await response.blob();
  }
}

export class IndexedDbSource implements Source {
  DB_NAME = "mencrouche";
  STORE_NAME = "data";
  KEY = "mc";

  async save(mcObj: MencroucheFileFormat) {
    const db = await this.#openDatabase();
    await db.put(this.STORE_NAME, mcObj, this.KEY);
  }

  async load() {
    const db = await this.#openDatabase();
    const mcObj = await db.get(this.STORE_NAME, this.KEY);
    if (mcObj) {
      importFromObject(mcObj);
    } else {
      console.log("No data found in IndexedDB.");
    }
  }

  async #openDatabase() {
    const STORE_NAME = this.STORE_NAME;
    return openDB(this.DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
}

export class JsonFileSource implements Source {
  onSave;
  onLoad;
  constructor(
    onSave: (savedMcJsonFile: File) => void,
    onLoad: () => Promise<File>,
  ) {
    this.onSave = onSave;
    this.onLoad = onLoad;
  }

  async save(mcObj: MencroucheFileFormat) {
    const mcJson = JSON.stringify(mcObj);
    const mcJsonFile = new File(
      [mcJson],
      `mencrouche_${
        /* e.g. "2024-09-09T14-59-33" */
        new Date().toISOString().slice(0, 19).replaceAll(":", "-")
      }.json`,
    );
    this.onSave(mcJsonFile);
  }

  async load() {
    const mcJsonFile = await this.onLoad();
    if (mcJsonFile) {
      await importFromJsonFile(mcJsonFile);
    }
  }
}

async function encryptMcJson(mcJson: string, encryptionKey: string) {
  const encryptedData = await encryptData(encryptionKey, mcJson);
  return combineIvAndEncryptedData(
    encryptedData.iv,
    encryptedData.encryptedBuffer,
  );
}

function combineIvAndEncryptedData(
  iv: Uint8Array,
  encryptedBuffer: ArrayBuffer,
): Uint8Array {
  const combined = new Uint8Array(iv.byteLength + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.byteLength);
  return combined;
}

async function decryptBlob(blob: Blob, encryptionKey: string): Promise<string> {
  const buffer = await blobToArrayBuffer(blob);
  const view = new Uint8Array(buffer);
  const iv = view.slice(0, IV_LENGTH_BYTES);
  const encryptedBuffer = buffer.slice(IV_LENGTH_BYTES);
  const decryptedData = await decryptData(iv, encryptedBuffer, encryptionKey);
  return new TextDecoder().decode(decryptedData);
}
