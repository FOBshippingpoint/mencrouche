import { switchDocumentStatus } from "./documentStatus";
import { generateEncryptionKey } from "./utils/encryption";
import {
  IndexedDbSource,
  loadFromSource,
  RemoteSource,
  saveToSources,
  type Source,
} from "./dataWizard";
import { createDialog } from "./generalDialog";

function debounce(
  callback: Function,
  { isLeadingEdge, waitMs }: { isLeadingEdge?: boolean; waitMs?: number } = {
    isLeadingEdge: false,
    waitMs: 3000, // 3 sec delay before saving
  },
) {
  let timeoutId: number | undefined;

  return function (...args: unknown[]) {
    const context = this;
    const isCallNow = isLeadingEdge && !timeoutId;

    clearTimeout(timeoutId);

    timeoutId = window.setTimeout(function () {
      timeoutId = undefined;

      if (!isLeadingEdge) {
        callback.call(context, ...args);
      }
    }, waitMs);

    if (isCallNow) {
      callback.call(context, ...args);
    }
  };
}

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

function grantTrustThirdPartyContentPermission() {
  return new Promise<boolean>((resolve) => {
    const trustThridPartyContentDialog = createDialog({
      title: "trust_thrid_party_content",
      message: "trust_thrid_party_content_message",
      buttons: [
        {
          "data-i18n": "do_not_trust_btn",
          onClick() {
            trustThridPartyContentDialog.close();
            resolve(false);
          },
        },
        {
          "data-i18n": "trust_btn",
          onClick() {
            trustThridPartyContentDialog.close();
            resolve(true);
          },
          type: "reset",
        },
      ],
      onClose() {
        resolve(false);
      },
    });
    trustThridPartyContentDialog.open();
  });
}

interface SyncInfo {
  syncUrl: string;
  syncResourceId: string;
  encryptionKey: string;
}
let urlFragSyncInfo: SyncInfo;

export async function saveDocument() {
  switchDocumentStatus("saving");
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

function parseSyncInfoFromUrlFragment() {
  const b64 = window.location.hash.slice(1);
  try {
    const json = window.atob(b64);
    return JSON.parse(json);
  } catch (error) {
    console.log("Cannot parse from URL fragment, got error: ", error);
  }
}

export async function loadDocument() {
  urlFragSyncInfo = parseSyncInfoFromUrlFragment();
  if (urlFragSyncInfo) {
    const remoteSource = new RemoteSource(urlFragSyncInfo);
    return await loadFromSource(remoteSource);
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
      const remoteSource = new RemoteSource(syncInfo);
      return await loadFromSource(remoteSource);
    } else {
      return await loadFromSource(new IndexedDbSource());
    }
  }
}
const saveDebounced = debounce(saveDocument);

export const markDirtyAndSaveDocument = () => {
  switchDocumentStatus("unsaved");
  saveDebounced();
};
