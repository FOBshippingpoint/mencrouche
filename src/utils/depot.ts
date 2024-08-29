import { dataset } from "../myDataset";

export interface SyncInfo {
  url: string;
  id?: string;
}

export const depot = {
  async load(syncInfo: SyncInfo) {
    if (!syncInfo.id) {
      throw Error("Missing sync id.");
    }

    const url = new URL(syncInfo.url);
    url.searchParams.set("id", syncInfo.id);
    try {
      const response = await fetch(url);
      const json = await response.json();
      if (json?.status === 200) {
        const { doc, dataset } = JSON.parse(json.data.text);
        localStorage.setItem("dataset", dataset);
        localStorage.setItem("doc", doc);
      }
    } catch (error) {
      console.error(error);
    }
  },
  async save(syncInfo: SyncInfo) {
    const payload = {
      text: JSON.stringify({
        dataset: localStorage.getItem("dataset"),
        doc: localStorage.getItem("doc"),
      }),
    };
    if (syncInfo.id) {
      payload['id'] = syncInfo.id;
    }
    const body = JSON.stringify(payload);

    const response = await fetch(syncInfo.url, { method: "POST", body });
    const json = await response.json();
    if (json.status === 200) {
      dataset.setItem("syncInfo", { url: syncInfo.url, id: json.data.id });
    } else {
      console.log("sync failed", json);
      throw Error("Sync failed");
    }
  },
};
