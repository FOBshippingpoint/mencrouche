import {
	blobToArrayBuffer,
	decryptData,
	encryptData,
	IV_LENGTH_BYTES,
} from "./utils/encryption";
import { createDataset } from "@mencrouche/dataset";
import { upgradeFileToLatest } from "./upgradeFile";
import { downloadBlobAsFile } from "./utils/toDataUrl";
import type { MencroucheFileFormat } from "@mencrouche/types";

const DEFAULT_DB_NAME = "mencrouche";
const DEFAULT_STORE_NAME = "data";
const DEFAULT_KEY = "mc";
const FILE_FORMAT_VERSION = 1;

export type Todo = () => Promise<void> | void;
export interface Source {
	read(): Promise<MencroucheFileFormat>;
	write(data: MencroucheFileFormat): Promise<void>;
}

export interface RemoteConfig {
	url: string;
	resourceId: string;
	encryptionKey: string;
}

const _dataset = createDataset();
// Avoid exposing import/export methods of original dataset object
const { toJson, toObject, fromObject, fromJson, ...dataset } = _dataset;

const beforeSaveTodos: Todo[] = [];
const afterLoadTodos: Todo[] = [];

export function addTodoBeforeSave(todo: Todo) {
	beforeSaveTodos.push(todo);
}

export function addTodoAfterLoad(todo: Todo) {
	afterLoadTodos.push(todo);
}

/**
 * Prepares data before saving by running all registered before-save tasks
 * and setting metadata properties.
 */
async function prepareSave(): Promise<void> {
	const promises = beforeSaveTodos.map((t) => t());
	await Promise.all(promises);
	dataset.setItem("mencroucheFileFormatVersion", FILE_FORMAT_VERSION);
	dataset.setItem("timestamp", new Date().toISOString());
}

/**
 * Finalizes data loading by running all registered after-load tasks.
 */
async function finishLoad(): Promise<void> {
	const promises = afterLoadTodos.map((t) => t());
	await Promise.all(promises);
}

/**
 * Saves data to one or more storage sources.
 * @param sources - Storage sources to save to
 * @throws If saving to any source fails
 */
export async function saveToSources(...sources: Source[]): Promise<void> {
	if (sources.length === 0) {
		throw new Error("No sources provided for saving");
	}

	await prepareSave();
	const mcObj = toObject.call(_dataset) as MencroucheFileFormat;

	const errors: Error[] = [];
	await Promise.all(
		sources.map(async (source) => {
			try {
				await source.write(mcObj);
			} catch (error) {
				errors.push(error instanceof Error ? error : new Error(String(error)));
			}
		}),
	);

	if (errors.length === sources.length) {
		throw new Error(
			`Failed to save to all sources: ${errors.map((e) => e.message).join("; ")}`,
		);
	}
}

/**
 * Loads data from one or more storage sources with configurable conflict resolution.
 * @param sources - Storage sources to load from
 * @param conflictResolution - Strategy for resolving conflicts between sources
 * @throws If no source provides valid data
 */
export async function loadFromSources(
	sources: Source[],
	conflictResolution:
		| "keepNewest"
		| ((
				mcObjList: MencroucheFileFormat[],
		  ) => MencroucheFileFormat) = "keepNewest",
): Promise<void> {
	if (sources.length === 0) {
		throw new Error("No sources provided for loading");
	}

	// Collect successful reads, ignoring failures
	const mcObjList: MencroucheFileFormat[] = [];
	const errors: Error[] = [];

	for (const source of sources) {
		try {
			const result = await source.read();
			if (result) {
				mcObjList.push(result);
			}
		} catch (error) {
			errors.push(error instanceof Error ? error : new Error(String(error)));
		}
	}

	// Check if we have any valid data
	if (mcObjList.length === 0) {
		throw new Error(
			`Could not load data from any source: ${errors.map((e) => e.message).join("; ")}`,
		);
	}

	// Apply conflict resolution strategy
	let mcObjToImport: MencroucheFileFormat;

	if (conflictResolution === "keepNewest") {
		mcObjToImport = findNewestMcObject(mcObjList);
	} else {
		mcObjToImport = conflictResolution(mcObjList);
	}
	const upgraded = upgradeFileToLatest(mcObjToImport);
	// Apply the data and run post-load tasks
	fromObject.call(_dataset, upgraded);
	await finishLoad();
}

/**
 * Finds the newest object based on timestamp.
 * @param objects - List of objects with timestamps
 * @returns The object with the most recent timestamp
 */
function findNewestMcObject(
	objects: MencroucheFileFormat[],
): MencroucheFileFormat {
	if (objects.length) {
		return objects.reduce((newest, current) => {
			return newest!.timestamp.localeCompare(current.timestamp) < 0
				? current
				: newest;
		}, objects[0])!;
	} else {
		throw Error("mencrouche objects length should > 0.");
	}
}

/**
 * IndexedDB storage implementation.
 */
export class IndexedDbSource implements Source {
	private db: Promise<IDBDatabase>;

	constructor(
		private readonly dbName: string = DEFAULT_DB_NAME,
		private readonly storeName: string = DEFAULT_STORE_NAME,
		private readonly key: string = DEFAULT_KEY,
	) {
		this.db = this.initDb();
	}

	private initDb(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, 1);

			request.onerror = () =>
				reject(request.error || new Error("Failed to open IndexedDB"));

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
			const store = transaction.objectStore(this.storeName);
			const request = store.get(this.key);

			request.onerror = () =>
				reject(request.error || new Error("Failed to read from IndexedDB"));

			request.onsuccess = () => {
				if (!request.result) {
					reject(new Error(`No data found for key: ${this.key}`));
					return;
				}
				resolve(request.result);
			};
		});
	}

	async write(data: MencroucheFileFormat): Promise<void> {
		const db = await this.db;

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.storeName, "readwrite");
			const store = transaction.objectStore(this.storeName);
			const request = store.put(data, this.key);

			request.onerror = () =>
				reject(request.error || new Error("Failed to write to IndexedDB"));
			request.onsuccess = () => resolve();
		});
	}
}

/**
 * Remote server storage with encryption.
 */
export class RemoteSource implements Source {
	private endpoint: URL;

	constructor(private readonly config: RemoteConfig) {
		this.endpoint = new URL(config.resourceId, config.url);
	}

	async read(): Promise<MencroucheFileFormat> {
		const blob = await this.fetch();
		if (!blob) {
			throw new Error("No data found on remote server");
		}

		try {
			const decrypted = await this.decrypt(blob);
			return JSON.parse(decrypted);
		} catch (error) {
			throw new Error(
				`Failed to decrypt or parse remote data: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async write(data: MencroucheFileFormat): Promise<void> {
		try {
			const encrypted = await this.encrypt(JSON.stringify(data));
			await this.upload(encrypted);
		} catch (error) {
			throw new Error(
				`Failed to encrypt or upload data: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async encrypt(data: string): Promise<Uint8Array> {
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

	private async decrypt(blob: Blob): Promise<string> {
		const buffer = await blobToArrayBuffer(blob);
		const view = new Uint8Array(buffer);

		if (view.length <= IV_LENGTH_BYTES) {
			throw new Error("Invalid encrypted data: too short");
		}

		const iv = view.slice(0, IV_LENGTH_BYTES);
		const encrypted = buffer.slice(IV_LENGTH_BYTES);
		const decrypted = await decryptData(
			iv,
			encrypted,
			this.config.encryptionKey,
		);
		return new TextDecoder().decode(decrypted);
	}

	private async upload(data: Uint8Array): Promise<void> {
		const response = await fetch(this.endpoint, {
			method: "PUT",
			body: data,
		});

		if (!response.ok) {
			throw new Error(
				`Upload failed: ${response.status} ${response.statusText}`,
			);
		}
	}

	private async fetch(): Promise<Blob | null> {
		try {
			const response = await fetch(this.endpoint);
			if (response.status === 404) {
				return null;
			}
			if (!response.ok) {
				throw new Error(
					`HTTP error: ${response.status} ${response.statusText}`,
				);
			}
			return response.blob();
		} catch (error) {
			throw new Error(
				`Network error during fetch: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}

/**
 * JSON file-based storage.
 */
export class JsonFileSource implements Source {
	constructor(private inputFile?: File) {}

	async read(): Promise<MencroucheFileFormat> {
		if (!this.inputFile) {
			throw new Error("Please provide inputFile in JsonFileSource constructor");
		}

		try {
			const text = await this.inputFile.text();
			return JSON.parse(text);
		} catch (error) {
			throw new Error(
				`Failed to read or parse JSON file: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async write(data: MencroucheFileFormat): Promise<void> {
		const json = JSON.stringify(data, null, 2);
		const filename = this.generateFilename();
		const file = new File([json], filename, { type: "application/json" });

		try {
			await downloadBlobAsFile(file, filename);
		} catch (error) {
			throw new Error(
				`Failed to save file: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private generateFilename(): string {
		return (
			this.inputFile?.name ??
			`mencrouche_${(new Date().toISOString().slice(0, 19) as any).replaceAll(":", "-")}.json`
		);
	}
}

export { dataset };
