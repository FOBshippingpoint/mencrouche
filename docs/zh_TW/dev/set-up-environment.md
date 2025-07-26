# 設定開發環境

這份文件會一步步帶你設定好開發 Mencrouche 的環境。

## 安裝

1. 依照[官方指引](https://bun.com/docs/installation)安裝 <dfn title="Bun is an all-in-one toolkit for JavaScript and TypeScript apps.">Bun</dfn>
    ```bash
    # 確認 bun 是否安裝成功
    bun --version
    ```
2. 克隆 [Mencrouche 儲存庫](https://github.com/FOBshippingpoint/mencrouche)

    ```bash
    git clone https://github.com/FOBshippingpoint/mencrouche.git
    ```
3. 安裝所需函式庫
    ```bash
    cd mencrouche
    bun install
    ```

## 開發伺服器

1. 建置所需軟體包
    ```bash
    bun run --filter=@mencrouche/dataset build
    bun run --filter=@mencrouche/apocalypse build
    bun run --filter=@mencrouche/dollars build
    bun run --filter=@mencrouche/n81i build
	bun run --filter=@mencrouche/types build
    ```
2. 啟動開發伺服器
    ```bash
	bun run --bun --filter=@mencrouche/app site:dev
    ```
    你應該可以看見 http://localhost:5173 在瀏覽器中打開
