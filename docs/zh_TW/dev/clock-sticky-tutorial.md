# 時鐘便利貼教學

本教學中我們將建立一個能顯示現在時間的**時鐘便利貼**，並有一個按鈕能夠更改顏色，關閉便利貼再打開還能維持設定的顏色。以下是最終結果：

![](/img/clock-sticky-tutorial/done.gif)

在此我們會用<abbr title="Mencrouche">`mc`</abbr>物件來和Mencrouche API溝通。你可以把後續的程式碼直接貼上到瀏覽器開發人員工具主控台。

## 第一步：顯示時間

首先，建立一個簡簡單單只顯示現在時間的便利貼，每一秒鐘更新一次。

**你的回合**：開啟[https://mencrouche.com](https://mencrouche.com)，然後把以下程式碼貼到主控台執行。

```javascript
// 用mc.registerSticky定義便利貼類型"clock"
mc.registerSticky({
  type: "clock", // 便利貼種類ID
  onMount(sticky) {
    // onMount會在初次建立時或還原時執行
    console.log("Clock sticky mounted");
    const timeElement = document.createElement("time");

    // 💡用sticky.replaceBody()取代便利貼的DOM內容
    sticky.replaceBody(timeElement);

    // 更新時間
    function updateClock() {
      const now = new Date();
      timeElement.textContent = now.toLocaleTimeString();
      console.log("update clock");
    }

    // 💡初始化時間和定期每秒更新一次
    updateClock();
    setInterval(updateClock, 1000);
  },
  onSave(sticky) {
    // onSave會自動在便利貼需要儲存的時候執行
    // 現在這個便利貼不需要儲存任何資訊
    console.log("Clock sticky save requested");
  },
  onDelete(sticky) {
    // onDelete會在便利貼將被刪除前執行
    console.log("Clock sticky delete requested");
    // 現在還不需要
  },
  // 可選的CSS，讓時間置中
  css: `.stickyBody { display: grid; place-items: center; }`,
});

// 定義完後實際建立一個便利貼
mc.workspace.createSticky({ type: "clock" });

````

✅ **結果**：你應該能看到一個顯示現在時間的便利貼。

![](/img/clock-sticky-tutorial/step1.webp)


## 第二步：

第一步中我們用`setInterval`每秒更新一次時間，然而，當我們關閉便利貼後，更新時間的函數還是會繼續執行，有鑑於此，我們應該在便利貼關閉時清理這個函數。

**你的回合**：為了避免和先前的版本衝突，**請先重新整理頁面**再貼上程式碼。

```javascript
mc.registerSticky({
  type: "clock",
  onMount(sticky) {
    console.log("Clock sticky mounted");
    const timeElement = document.createElement("time");
    sticky.replaceBody(timeElement);

    function updateClock() {
      const now = new Date();
      timeElement.textContent = now.toLocaleTimeString();
      console.log("update clock");
    }

    updateClock();
    // 💡儲存intervalId等等再用
    // sticky.plugin是個專門用來儲存runtime資料的物件
    sticky.plugin.intervalId = setInterval(updateClock, 1000);
  },
  onSave(sticky) {
    console.log("Clock sticky save requested");
  },
  onDelete(sticky) {
    console.log("Clock sticky delete requested");

    // 💡使用clearInterval清理剛剛的intervalId
    clearInterval(sticky.plugin.intervalId);
    console.log("Interval cleared");
  },
  css: `.stickyBody { display: grid; place-items: center; }`,
});

mc.workspace.createSticky({ type: "clock" });
```

✅ **結果**：貼上程式碼，你應該能看到在主控台看到每秒印出一次"update clock"的訊息，現在關閉便利貼，你會發現"update clock"的訊息不再出現。

## 第三步：改變顏色＆儲存

現在新增一個按鈕來改變時間顏色，另外，在便利貼關閉的時候，要儲存現在的顏色，復原時才會保留先前的狀態。

**你的回合**：貼上最終版本程式碼到主控台

```javascript
mc.registerSticky({
  type: "clock",
  onMount(sticky, origin) {
    // 'origin'參數表示onMount是由'create'或'restore'而觸發
    console.log(`Clock sticky mounted (origin: ${origin})`);

    const timeElement = document.createElement("time");
    const randomColorBtn = document.createElement("button");
    randomColorBtn.textContent = "Change Color";

    sticky.replaceBody(timeElement, randomColorBtn);

    function updateClock() {
      const now = new Date();
      timeElement.textContent = now.toLocaleTimeString();
    }

    sticky.plugin.intervalId = setInterval(updateClock, 1000);
    updateClock();

    // 點擊按鈕隨機改變顏色
    randomColorBtn.addEventListener("click", () => {
      const randomColor = "#" + (~~(Math.random() * (1 << 24))).toString(16).padStart(6, '0');
      console.log("Changing color to:", randomColor);
      timeElement.style.color = randomColor;
    });

    // 💡在因為'restore'而觸發onMount時還原顏色
    if (origin === "restore") {
      console.log("Restoring color:", sticky.pluginConfig.color);
      timeElement.style.color = sticky.pluginConfig.color;
    }
  },
  onSave(sticky) {
    // onSave應回傳一個可序列化的JSON物件
    // 當系統需要回復便利貼時，會帶入JSON回onMount
    console.log("Clock sticky save requested");
    return {
      // 💡把現在timeElement的顏色儲存成{ color }物件
      color: sticky.querySelector("time").style.color,
    };
  },
  onDelete(sticky) {
    console.log("Clock sticky delete requested");
    clearInterval(sticky.plugin.intervalId);
    console.log("Interval cleared");
  },
  css: `.stickyBody { display: grid; place-items: center; }`,
});

mc.workspace.createSticky({ type: "clock" });
```

✅ **結果**：

1. 出現一個顯示時間與「Change Color」按鈕的便利貼。
2. 點擊按鈕可變更文字顏色。
3. 記下你最後設定的顏色。
4. 關閉（刪除）這張便利貼。
5. 按下<kbd>Ctrl</kbd>+<kbd>Z</kbd>來復原刪除。
6. 便利貼應會以**完全相同的顏色**重新出現。

之所以會這樣，是因為：

* `onSave`函式會回傳一個物件`{ color: timeElement.style.color }`，並將其儲存至系統中。
* 當便利貼被復原時，`onMount`會以`origin`為`"restore"`的參數執行，並將先前儲存的物件注入至`sticky.pluginConfig`。
* `onMount`程式碼會檢查`origin`是否為`"restore"`，並將`sticky.pluginConfig.color`套用回`timeElement`。

---

🎉 恭喜！你已成功建立一個會自動更新、具備互動控制、會在移除時清理、並能透過`onMount`、`onSave`和`onDelete`在不同階段保存狀態的時鐘便利貼！
