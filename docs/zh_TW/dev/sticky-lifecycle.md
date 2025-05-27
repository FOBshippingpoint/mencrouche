# 便利貼生命週期

便利貼提供了三個核心的生命週期函式供插件實作：`onMount`、`onSave`、`onDelete`。這些函式稱為 "Hooks"，由系統在便利貼生命週期的特定時間點呼叫。

此圖表說明了這些生命週期函式的順序和觸發時機：

![](/media/sticky-lifecycle/sticky_lifecycle_diagram.webp)


## `onMount(sticky, origin)`

當便利貼被新增到 Workspace 時被呼叫（無論是透過使用者操作或從已儲存的資料還原），是插件執行初始設定的主要位置。

**引數：**

  * `sticky`：便利貼的 HTMLDivElement 實例，繼承了 Div 元素的屬性和方法，並**可能**包含`pluginConfig`屬性（詳見下文）。
  * `origin`：指出`onMount`被呼叫的原因：
      * `"create"`：表示便利貼是新建立的（例如，使用者點擊了「新增」按鈕）。
      * `"restore"`：表示便利貼正從先前儲存的資料中重新建立。

**用途：**

  * **初始化：** 設定便利貼的初始狀態、外觀和行為。
  * **DOM 操作：** 填入或替換便利貼 Body 的內容。
  * **新增控制項：** 在便利貼 Header 新增自訂元件（如按鈕）。
  * **還原狀態：** 若`origin`是`"restore"`，則使用`sticky.pluginConfig`（從先前的`onSave`呼叫中填入的資料）中的資料來還原插件的狀態。

**使用範例：**

```javascript
// 範例插件實作
onMount(sticky, origin) {
  if (origin === "create") {
    // 便利貼剛被建立，可以在此提示使用者輸入初始內容。
    // 例如：sticky.replaceBody = h('<input placeholder="輸入網址" />');
    // 為按鈕附加事件監聽器...
    console.log("新的便利貼已建立，正在執行初始設定。");
  } else if (origin === "restore") {
    // 這個便利貼正在從已儲存的資料中還原。
    // 使用 sticky.pluginConfig 來設定狀態。
    // 例如：const savedUrl = sticky.pluginConfig.url;
    // displayContentBasedOnUrl(sticky, savedUrl);
    console.log("便利貼已從資料還原：", sticky.pluginConfig);
  }
  // 建立和還原共通的設定可以放在這裡...
}
```

## `onSave(sticky)`

當 Mencrouche 需要儲存便利貼的狀態時被呼叫。這通常在使用者明確儲存時發生，或在便利貼即將被刪除前自動發生。

**引數：**

  * `sticky`：便利貼的實例。

**用途：**

  * **持久化狀態：** 回傳一個可序列化為 JSON 的物件，其中包含稍後使用`onMount`（且`origin == "restore"`）還原插件狀態所需的所有資料。

**回傳值：**

  * 一個代表插件狀態的可序列化為 JSON 的物件；如果此插件沒有特定內容需要儲存，則回傳`null`或`undefined`。回傳的物件將被儲存，並在後續呼叫`onMount`且`origin`設定為`"restore"`時，作為`sticky.pluginConfig`傳回。

**使用範例：**

```javascript
// 範例插件實作
onSave(sticky) {
  // 假設插件邏輯將資料儲存在 'plugin' 命名空間中
  if (sticky.plugin) {
    return {
      videoId: sticky.plugin.videoId,
      autoplay: sticky.plugin.shouldAutoplay,
      lastPosition: sticky.plugin.currentProgress,
      // 還原所需的任何其他資料
    };
  }
  // 或者，如果此插件沒有狀態需要儲存，則不需要明確 return
}
```

## `onDelete(sticky)`

在便利貼從工作空間移除前被呼叫。是清理插件所使用資源的好時機。

**引數：**

  * `sticky`：便利貼的實例。

**用途：**
  * **資源清理：** 釋放便利貼消失後不再需要的任何資源。這可以防止記憶體洩漏或不必要的背景處理程序（例如：Object URL）。
  * **停止處理程序：** 取消任何進行中的操作，例如`setInterval`、`setTimeout`、待處理的網路請求，或與此便利貼實例特別相關的事件監聽器。

**使用範例：**

```javascript
// 範例插件實作
onDelete(sticky) {
  // 如果插件建立了物件 URL
  if (sticky.plugin && sticky.plugin.imageUrl) {
    URL.revokeObjectURL(sticky.plugin.imageUrl);
    console.log("已銷毀 ${sticky.id} 便利貼的 Object URL");
  }
}
```

## 總結

* **`onMount(sticky, origin)`**
  * **時機：** 在便利貼建立時（`origin == "create"`）或還原時（`origin == "restore"`）呼叫。
  * **用途：** 初始化插件、設定 DOM 元素，適用時使用`sticky.pluginConfig`還原狀態。
* **`onSave(sticky)`**
  * **時機：** 在明確的儲存操作以及在刪除或應用程式關閉前自動呼叫。
  * **用途：** 回傳一個 JSON 物件，其中包含稍後透過`onMount`完全還原插件狀態所需的必要資料。
* **`onDelete(sticky)`**
  * **時機：** 在便利貼被銷毀前呼叫。
  * **用途：** 清理與該便利貼相關的任何資源。

可以閱讀[sticky plugins 原始碼](https://github.com/FOBshippingpoint/mencrouche/tree/main/apps/mencrouche/src/stickyPlugins)了解更多用途。
