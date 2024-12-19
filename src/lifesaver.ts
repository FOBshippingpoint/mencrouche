/**
 * lifesaver.ts
 * The highest level of abstraction of saving/loading mencrouche file.
 * Client could call `saveDocument()` to easily save the document without deciding the Source, handling encryption.
 */

import { switchDocumentStatus } from "./documentStatus";
import { generateEncryptionKey } from "./utils/encryption";
import { debounce } from "./utils/debounce";
import {
  IndexedDbSource,
  RemoteSource,
  saveToSources,
  type Source,
} from "./dataWizard";

function getLocalStorageItem(key: string): string {
  const value = localStorage.getItem(key);
  if (!value) throw new Error(`${key} not found in localStorage.`);
  return value;
}

async function getOrGenerateEncryptionKey(): Promise<string> {
  let key = localStorage.getItem("encryptionKey");
  if (!key) {
    key = await generateEncryptionKey();
    localStorage.setItem("encryptionKey", key);
  }
  return key;
}

function getOrCreateSyncResourceId(): string {
  let syncResourceId = localStorage.getItem("syncResourceId");
  if (!syncResourceId) {
    syncResourceId = crypto.randomUUID();
    localStorage.setItem("syncResourceId", syncResourceId);
  }
  return syncResourceId;
}

interface SyncInfo {
  syncUrl: string;
  syncResourceId: string;
  encryptionKey: string;
}
let urlFragSyncInfo: SyncInfo;

function parseSyncInfoFromUrlFragment() {
  // Parse only if url has hash (aka #)
  if (window.location.hash.length) {
    const b64 = window.location.hash.slice(1);
    try {
      const json = window.atob(b64);
      return JSON.parse(json);
    } catch (error) {
      console.log("Cannot parse from URL fragment, got error: ", error);
    }
  }
}

export type DocumentSourceOrigin =
  | "HashEncodedRemoteSource"
  | "SyncRemoteSource"
  | "IndexedDbSource";

// TODO: maybe we should return Source directly??
export async function loadDocument(): Promise<DocumentSourceOrigin> {
  urlFragSyncInfo = parseSyncInfoFromUrlFragment();
  if (urlFragSyncInfo) {
    // Load from remote url
    await new RemoteSource(urlFragSyncInfo).load();
    return "HashEncodedRemoteSource";
  } else {
    // TODO: dup code
    const isCloudSyncEnabled =
      localStorage.getItem("isCloudSyncEnabled") === "on";
    if (isCloudSyncEnabled && localStorage.getItem("syncUrl")) {
      const syncInfo = {
        syncUrl: getLocalStorageItem("syncUrl"),
        syncResourceId: getOrCreateSyncResourceId(),
        encryptionKey: await getOrGenerateEncryptionKey(),
        // syncRemoteAuthKey: getLocalStorageItem("syncRemoteAuthKey"),
      };
      await new RemoteSource(syncInfo).load();
      return "SyncRemoteSource";
    } else {
      await new IndexedDbSource().load();
      return "IndexedDbSource";
    }
  }
}

export async function saveDocument() {
  const sources: Source[] = [new IndexedDbSource()];
  const isCloudSyncEnabled =
    localStorage.getItem("isCloudSyncEnabled") === "on";
  if (isCloudSyncEnabled && localStorage.getItem("syncUrl")) {
    const syncInfo = urlFragSyncInfo ?? {
      syncUrl: getLocalStorageItem("syncUrl"),
      syncResourceId: getOrCreateSyncResourceId(),
      encryptionKey: await getOrGenerateEncryptionKey(),
      // syncRemoteAuthKey: getLocalStorageItem("syncRemoteAuthKey"),
    };
    const remoteSource = new RemoteSource(syncInfo);
    sources.push(remoteSource);
  }
  await saveToSources(...sources);
  switchDocumentStatus("saved");
}

const saveDocumentDebounced = debounce(saveDocument);
export function markDirtyAndSaveDocument() {
  switchDocumentStatus("saving");
  saveDocumentDebounced();
}
