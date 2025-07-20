/**
 * lifesaver.ts
 * The highest level of abstraction of saving/loading mencrouche file.
 * Client could call `saveDocument()` to easily save the document without deciding the Source, handling encryption.
 */

import { switchDocumentStatus } from "./documentStatus";
import { generateEncryptionKey } from "./utils/encryption";
import { debounce } from "./utils/debounce";
import {
	dataset,
	IndexedDbSource,
	loadFromSources,
	RemoteSource,
	saveToSources,
	type RemoteConfig,
	type Source,
} from "./dataWizard";

const storage = {
	get: (key: string): string | null => localStorage.getItem(key),
	set: (key: string, value: string): void => {
		localStorage.setItem(key, value);
	},
	getRequired: (key: string): string => {
		const value = localStorage.getItem(key);
		if (!value) throw new Error(`${key} not found in localStorage`);
		return value;
	},
};

if (import.meta.env.CLOUD_SYNC_URL && storage.get("url") === null) {
	storage.set("url", import.meta.env.CLOUD_SYNC_URL);
}

const sourcer = {
	async getRemoteConfig(): Promise<RemoteConfig | null> {
		if (!isCloudSyncEnabled() || !storage.get("url")) {
			return null;
		}

		return {
			url: storage.getRequired("url"),
			resourceId: await this.getOrCreateResourceId(),
			encryptionKey: await this.getOrCreateEncryptionKey(),
		};
	},
	async getOrCreateEncryptionKey() {
		let key = storage.get("encryptionKey");
		if (!key) {
			key = await generateEncryptionKey();
			storage.set("encryptionKey", key);
		}
		return key;
	},
	async getOrCreateResourceId() {
		let resourceId = storage.get("resourceId");
		if (!resourceId) {
			const response = await fetch(storage.getRequired("url"), {
				method: "PUT",
				body: "",
			});
			const json = await response.json();
			resourceId = json.resourceId;
			storage.set("resourceId", json.resourceId);
		}
		return resourceId!;
	},
	parseRemoteConfigFromUrl(): RemoteConfig | null {
		if (!window.location.hash) return null;

		try {
			const json = window.atob(window.location.hash.slice(1));
			return JSON.parse(json);
		} catch (error) {
			console.log("Failed to parse URL fragment:", error);
			return null;
		}
	},
};

export function isCloudSyncEnabled() {
	let isCloudSyncEnabled = storage.get("isCloudSyncEnabled");
	if (isCloudSyncEnabled === null) {
		setIsCloudSyncEnabled(false);
		return false;
	}
	return isCloudSyncEnabled === "true";
}
export function setIsCloudSyncEnabled(isEnabled: boolean) {
	storage.set("isCloudSyncEnabled", isEnabled ? "true" : "false");
}

export async function loadDocument() {
	// If is share url, then load based on the hash info.
	const shareConfig = sourcer.parseRemoteConfigFromUrl();
	if (shareConfig) {
		await loadFromSources([new RemoteSource(shareConfig)]);
		return;
	}

	// If not, load local => remote.
	const sources: Source[] = [new IndexedDbSource()];
	const localConfig = await sourcer.getRemoteConfig();
	if (localConfig) {
		sources.push(new RemoteSource(localConfig));
	}
	// WIP
	await loadFromSources(sources);
}

async function getDefaultSources() {
	const sources: Source[] = [];
	return await (async () => {
		if (sources.length === 0) {
			sources.push(new IndexedDbSource());
			const localConfig = await sourcer.getRemoteConfig();
			if (localConfig) {
				sources.push(new RemoteSource(localConfig));
			}
		}
		return sources;
	})();
}

export async function saveDocument() {
	const sources = await getDefaultSources();
	await saveToSources(...sources);
	switchDocumentStatus("saved");
}

const debouncedSaveDocument = debounce(saveDocument);

export const markDirtyAndSaveDocument = () => {
	if (dataset.getOrSetItem("isAutoSaveEnabled", true)) {
		switchDocumentStatus("saving");
		debouncedSaveDocument();
	} else {
		switchDocumentStatus("unsaved");
	}
};
