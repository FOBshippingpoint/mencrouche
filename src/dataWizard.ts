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

const supportsFileSystemAccess =
  "showSaveFilePicker" in window &&
  (() => {
    try {
      return window.self === window.top;
    } catch {
      return false;
    }
  })();

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

async function prepareSave() {
  const promises = beforeSaveTodos.map((t) => t());
  await Promise.all(promises);
  dataset.setItem("mencroucheFileFormatVersion", 1);
  dataset.setItem("timestamp", new Date().toISOString());
}
async function finishLoad() {
  const promises = afterLoadTodos.map((t) => t());
  await Promise.all(promises);
}
export async function saveToSources(...sources: Source[]) {
  await prepareSave();
  const mcObj = toObject.call(_dataset) as MencroucheFileFormat;
  await Promise.all(sources.map((source) => source.write(mcObj)));
}
/**
 * Try to load from various sources.
 */
export async function loadFromSources(
  sources: Source[],
  conflictResolution:
    | "keepNewest"
    | ((
        mcObjList: MencroucheFileFormat[],
      ) => MencroucheFileFormat) = "keepNewest",
) {
  const mcObjList = await Promise.all(sources.map((source) => source.read()));

  let mcObjToImport;
  if (conflictResolution === "keepNewest") {
    let newest = mcObjList[0]!;
    for (const mcObj of mcObjList) {
      if (newest.timestamp.localeCompare(mcObj.timestamp) < 1) {
        newest = mcObj;
      }
    }
    mcObjToImport = newest;
  } else {
    mcObjToImport = conflictResolution(mcObjList);
  }

  fromObject.call(_dataset, upgradeFileToLatest(mcObjToImport));
  await finishLoad();
}

interface Source {
  read(): Promise<MencroucheFileFormat>;
  write(data: MencroucheFileFormat): Promise<void>;
}

export class IndexedDbSource implements Source {
  private db: Promise<IDBDatabase>;

  constructor(
    private readonly dbName: string = "mencrouche",
    private readonly storeName: string = "data",
    private readonly key: string = "mc",
  ) {
    this.db = this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async read(): Promise<MencroucheFileFormat> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readonly");
      const request = transaction.objectStore(this.storeName).get(this.key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async write(data: MencroucheFileFormat): Promise<void> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const request = transaction
        .objectStore(this.storeName)
        .put(data, this.key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export interface RemoteConfig {
  url: string;
  resourceId: string;
  encryptionKey: string;
}

export class RemoteSource implements Source {
  private endpoint: URL;

  constructor(private readonly config: RemoteConfig) {
    this.endpoint = new URL(config.resourceId, config.url);
  }

  async read(): Promise<MencroucheFileFormat> {
    const blob = await this.fetch();
    if (!blob) throw new Error("No data found");
    const decrypted = await this.decrypt(blob);
    return JSON.parse(decrypted);
  }

  async write(data: MencroucheFileFormat): Promise<void> {
    const encrypted = await this.encrypt(JSON.stringify(data));
    await this.upload(encrypted);
  }

  private async encrypt(data: string) {
    const encrypted = await encryptData(this.config.encryptionKey, data);
    const combined = new Uint8Array(
      encrypted.iv.byteLength + encrypted.encryptedBuffer.byteLength,
    );
    combined.set(encrypted.iv, 0);
    combined.set(
      new Uint8Array(encrypted.encryptedBuffer),
      encrypted.iv.byteLength,
    );
    return combined;
  }

  private async decrypt(blob: Blob) {
    const buffer = await blobToArrayBuffer(blob);
    const view = new Uint8Array(buffer);
    const iv = view.slice(0, IV_LENGTH_BYTES);
    const encrypted = buffer.slice(IV_LENGTH_BYTES);
    const decrypted = await decryptData(
      iv,
      encrypted,
      this.config.encryptionKey,
    );
    return new TextDecoder().decode(decrypted);
  }

  private async upload(data: Uint8Array) {
    const response = await fetch(this.endpoint, {
      method: "PUT",
      body: data,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${await response.text()}`);
    }
  }

  private async fetch(): Promise<Blob | null> {
    const response = await fetch(this.endpoint);
    if (!response.ok) return null;
    return response.blob();
  }
}

export class JsonFileSource implements Source {
  constructor(private inputFile?: File) {}

  async read(): Promise<MencroucheFileFormat> {
    if (this.inputFile) {
      const text = await this.inputFile.text();
      return JSON.parse(text);
    } else {
      throw Error("Please provide inputFile in JsonFileSource constructor.");
    }
  }

  async write(data: MencroucheFileFormat): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    const filename =
      this.inputFile?.name ??
      `mencrouche_${new Date()
        .toISOString()
        .slice(0, 19)
        .replaceAll(":", "-")}.json`;
    const file = new File([json], filename, { type: "application/json" });
    this.triggerDownload(file, filename);
  }

  // Copy from https://web.dev/patterns/files/save-a-file#progressive_enhancement
  private async triggerDownload(file: File, suggestedName: string) {
    if (supportsFileSystemAccess) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
        });
        const writable = await handle.createWritable();
        await writable.write(file);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err.name, err.message);
          return;
        }
      }
    } else {
      const blobUrl = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = suggestedName;
      a.hidden = true;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        a.remove();
      }, 1000);
    }
  }
}
