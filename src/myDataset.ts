import { openDB } from "idb";
import { upgradeFileToLatest } from "./upgradeFile";
import { createDataset } from "./utils/dataset";
import {
  blobToArrayBuffer,
  decryptData,
  encryptData,
  generateEncryptionKey,
  IV_LENGTH_BYTES,
} from "./utils/encryption";

export function serializeToJson() {
  dataset.setItem("mencroucheFileFormatVersion", 1);
  dataset.setItem("timestamp", new Date().toISOString());
  return dataset.toJson();
}

export function importFromJsonFile(jsonFile: File) {
  const reader = new FileReader();

  return new Promise<void>((resolve) => {
    reader.addEventListener("load", () => {
      dataset.fromJson(reader.result as string);
      resolve();
    });
    reader.readAsText(jsonFile);
  });
}

export async function saveAndEncryptFileToRemote() {
  const json = serializeToJson();

  const syncUrl = localStorage.getItem("syncUrl");
  if (!syncUrl) {
    throw Error("syncUrl not found in localStorage.");
  }
  const syncRemoteAuthKey = localStorage.getItem("syncRemoteAuthKey");
  if (!syncRemoteAuthKey) {
    throw Error("remoteAuthKey cannot found in localStorage.");
  }

  let key = localStorage.getItem("encryptionKey");
  if (!key) {
    key = await generateEncryptionKey();
    localStorage.setItem("encryptionKey", key);
  }

  let syncResourceId = localStorage.getItem("syncResourceId");
  if (!syncResourceId) {
    syncResourceId = crypto.randomUUID();
    localStorage.setItem("syncResourceId", syncResourceId);
  }

  const encrypted = await encryptData(key, json);
  const view = new Uint8Array(
    encrypted.iv.byteLength + encrypted.encryptedBuffer.byteLength,
  );
  view.set(encrypted.iv, 0);
  view.set(new Uint8Array(encrypted.encryptedBuffer), encrypted.iv.byteLength);

  const response = await fetch(new URL(syncResourceId, syncUrl), {
    method: "PUT",
    body: view,
    headers: { "X-Custom-Auth-Key": syncRemoteAuthKey },
  });
  if (!response.ok) {
    console.log("Failed to upload file", await response.text());
  }
}

export async function loadEncryptedFileFromRemote() {
  const key = localStorage.getItem("encryptionKey");
  if (!key) {
    throw Error(`Decrypt key not found in localStorage.`);
  }

  const syncUrl = localStorage.getItem("syncUrl");
  if (!syncUrl) {
    throw Error("syncUrl not found in localStorage.");
  }
  const syncResourceId = localStorage.getItem("syncResourceId");
  if (!syncResourceId) {
    throw Error("syncResourceId not found in localStorage.");
  }

  const response = await fetch(new URL(syncResourceId, syncUrl));
  if (!response.ok) {
    console.log("Failed to upload file, response message: ", await response.text());
    return;
  }

  const blob = await response.blob();
  const buffer = await blobToArrayBuffer(blob);
  const view = new Uint8Array(buffer);
  const iv = view.slice(0, IV_LENGTH_BYTES);
  const encryptedBuffer = buffer.slice(IV_LENGTH_BYTES);
  const data = await decryptData(iv, encryptedBuffer, key);
  const json = new TextDecoder().decode(data);
  const mcFile = upgradeFileToLatest(JSON.parse(json));
  dataset.fromObject(mcFile);
}

export async function saveFileToIndexedDb() {
  const obj = dataset.toObject();
  const db = await openDB("mencrouche", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("data")) {
        db.createObjectStore("data");
      }
    },
  });
  await db.put("data", obj, "mc");
}

export async function loadFileFromIndexedDb() {
  const db = await openDB("mencrouche", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("data")) {
        db.createObjectStore("data");
      }
    },
  });
  try {
    const obj = await db.get("data", "mc");
    console.log(obj);
    dataset.fromObject(obj);
  } catch (error) {}
}

export const dataset = createDataset();
