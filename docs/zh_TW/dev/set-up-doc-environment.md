---
next: false
---


# 設定撰寫文件環境

這份文件會一步步帶你設定好撰寫 Mencrouche 文件所需的環境。

## 環境設定

Mencrouche 文件建立於 [VitePress](https://vitepress.dev/) 之上，VitePress 是由 Vue 及 Vite 建立而成的靜態文件產生器。請依照下列步驟安裝套件並在本機啟動文件網站：

1. 依照[官方指引](https://bun.com/docs/installation)安裝 <dfn title="Bun is an all-in-one toolkit for JavaScript and TypeScript apps.">Bun</dfn>
    ```bash
    # 確認 bun 是否安裝成功
    bun --version
    ```
2. 克隆 [Mencrouche 儲存庫](https://github.com/FOBshippingpoint/mencrouche)

    ```bash
    git clone https://github.com/FOBshippingpoint/mencrouche.git
    ```
3. 依照[官方指引](https://git-lfs.com/)安裝 Git Large File Storage（Mencrouche 使用 Git LFS 儲存大型檔案，如影片）
    ```bash
    git lfs install
    git pull
    ```
4. 安裝所需函式庫
    ```bash
    cd mencrouche/docs
    bun install
    ```
5. 啟動本機網站伺服器
    ```bash
	bun run --bun --filter=@mencrouche/docs docs:dev --open

    ```
    你應該可以看見 http://localhost:5173 在瀏覽器中打開
6. 試著變更 mencrouche/docs/en/index.md 檔案的文字並儲存，你可以發現無須重新整理網頁就可以在英文版的首頁看見文字變化。
