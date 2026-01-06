# GitHub Copilot MCP Configurator

一個簡單易用的網頁工具，用於管理 GitHub Copilot 的 MCP (Model Context Protocol) 設定。

![MCP Configurator](https://github.com/doggy8088/cca-mcp-configurator/raw/main/docs/images/mcp-configurator.png)

## 功能特色

### ✨ 內建預設設定
- **Playwright MCP**: 瀏覽器自動化工具，可用於網頁測試和互動
- 更多內建設定即將加入...

### 🎨 自訂設定管理
- ➕ 新增自訂 MCP 伺服器設定
- ✏️ 編輯現有的自訂設定
- 🗑️ 刪除不需要的設定

### 💾 資料持久化
- 所有設定自動保存在瀏覽器的 localStorage
- 重新載入頁面後資料依然保留

### 📤 匯出/匯入
- 📥 匯出設定為 JSON 檔案
- 📂 匯入之前保存的設定檔案
- 方便在不同裝置間同步設定

### 📋 快速複製
- 一鍵複製生成的 JSON 設定到剪貼簿
- 直接貼到 GitHub Copilot 設定中使用

## 使用方式

### 線上使用

訪問 GitHub Pages 部署版本：[https://doggy8088.github.io/cca-mcp-configurator/](https://doggy8088.github.io/cca-mcp-configurator/)

### 本地開發

#### 安裝依賴

```bash
bun install
```

#### 開發模式

```bash
bun run dev
# 訪問 http://localhost:8080
```

#### 建置生產版本

```bash
bun run build
```

建置後的檔案會在 `dist` 目錄中，包含壓縮優化的 HTML、CSS 和 JavaScript。

#### 本地預覽建置版本

```bash
bun run serve
# 訪問 http://localhost:8080
```

### 直接使用（無需建置）

1. 直接開啟 `src/index.html` 檔案（在瀏覽器中）

或者使用任何靜態檔案伺服器：

```bash
# 使用 Python
python -m http.server 8080

# 使用 Node.js http-server
npx http-server src

# 使用 PHP
php -S localhost:8080
```

2. 在瀏覽器中訪問 `http://localhost:8080`

### 選擇預設設定

1. 在「內建設定」區塊中，勾選您想要使用的 MCP 伺服器
2. JSON 輸出會自動更新

### 新增自訂設定

1. 點擊「+ 新增自訂設定」按鈕
2. 填寫以下資訊：
   - **名稱**: MCP 伺服器的識別名稱（必填）
   - **描述**: 簡短說明此設定的用途（選填）
   - **設定 (JSON)**: 伺服器的完整 JSON 設定（必填）
3. 點擊「儲存」

範例 JSON 設定：
```json
{
  "type": "local",
  "command": "node",
  "args": ["server.js"],
  "tools": ["*"]
}
```

### 編輯自訂設定

1. 點擊自訂設定旁的「編輯」按鈕
2. 修改資訊
3. 點擊「儲存」

### 刪除自訂設定

1. 點擊自訂設定旁的「刪除」按鈕
2. 確認刪除

### 匯出設定

1. 點擊「💾 匯出設定」按鈕
2. 檔案會自動下載為 `mcp-config.json`

### 匯入設定

1. 點擊「📂 匯入設定」按鈕
2. 選擇之前匯出的 JSON 檔案
3. 設定會自動載入並覆蓋當前設定

### 複製 JSON 設定

1. 點擊「📋 複製到剪貼簿」按鈕
2. JSON 設定已複製，可以直接貼到 GitHub Copilot 設定檔中

## JSON 輸出格式

生成的 JSON 格式符合 MCP 標準：

```json
{
  "mcpServers": {
    "playwright": {
      "type": "local",
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--allowed-hosts",
        "*"
      ],
      "tools": ["*"]
    },
    "your-custom-server": {
      "type": "local",
      "command": "node",
      "args": ["server.js"],
      "tools": ["*"]
    }
  }
}
```

## 技術細節

- 使用 **TypeScript** 開發，提供型別安全
- 使用 **Bun** 建置系統進行程式碼轉譯、壓縮和優化
- 預設設定獨立於程式碼，存放在 `presets/` 資料夾中的 JSON 檔案
- 建置時自動合併預設設定並注入到程式碼中
- 使用 `csso` 壓縮 CSS（減少約 48%）
- 使用 `terser` 壓縮 JavaScript（減少約 64%）  
- 使用 `html-minifier-terser` 壓縮 HTML（減少約 28%）
- 使用 localStorage 進行客戶端資料存儲
- 響應式設計，支援行動裝置
- 現代化的使用者介面

## CI/CD

專案使用 GitHub Actions 進行持續整合和部署：

- **Pull Request**: 自動驗證預設設定格式、執行建置測試和驗證
- **Push to main**: 自動建置並部署到 GitHub Pages
- **手動觸發**: 支援手動觸發部署

工作流程檔案：`.github/workflows/ci.yml`

### 新增預設設定

要新增新的 MCP 預設設定，請在 `presets/` 目錄中新增一個 JSON 檔案。檔案名稱必須與 `id` 欄位一致。

範例 (`presets/my-preset.json`)：

```json
{
  "id": "my-preset",
  "name": "My Custom MCP",
  "description": "這是我的自訂 MCP 設定",
  "config": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@my/mcp-server"],
    "tools": ["*"]
  }
}
```

必要欄位：
- `id`: 預設設定的唯一識別碼（必須與檔案名稱一致，不含 .json）
- `name`: 顯示名稱
- `description`: 說明文字（可使用 HTML）
- `config`: MCP 伺服器設定
  - `type`: 連線類型（`stdio`、`http` 或 `sse`）
  - 其他欄位依連線類型而定

驗證指令：

```bash
bun run validate:presets
```

## 專案結構

```
cca-mcp-configurator/
├── src/               # 原始碼
│   ├── index.html     # HTML 模板
│   ├── styles.css     # CSS 樣式
│   └── app.ts         # TypeScript 程式碼
├── presets/           # MCP 預設設定
│   ├── playwright.json
│   ├── brave-search.json
│   ├── puppeteer.json
│   ├── sqlite.json
│   ├── sequential-thinking.json
│   ├── memory.json
│   └── context7.json
├── scripts/           # 建置腳本
│   └── merge-presets.ts  # 預設合併與驗證
├── dist/              # 建置輸出（自動生成）
│   ├── index.html     # 壓縮的 HTML
│   ├── styles.min.css # 壓縮的 CSS
│   └── app.min.js     # 壓縮的 JavaScript
├── .github/
│   └── workflows/
│       └── ci.yml     # GitHub Actions 工作流程
├── build.ts           # 建置腳本
├── tsconfig.json      # TypeScript 設定
├── package.json       # 專案設定
└── README.md          # 說明文件
```

## 瀏覽器支援

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 任何支援 ES6 和 localStorage 的現代瀏覽器

## 授權

MIT License

## 貢獻

歡迎提交 Issue 和 Pull Request！
