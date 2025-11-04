# 源代碼品質掃描配置

本項目已配置了完整的源代碼品質掃描工具。

## 已安裝工具

### 1. TypeScript ESLint
- `@typescript-eslint/eslint-plugin`: TypeScript 專用規則
- `@typescript-eslint/parser`: TypeScript 解析器

### 2. 安全性掃描
- `eslint-plugin-security`: 檢測常見安全問題
- 規則包括：SQL 注入、XSS、不安全的正規表達式等

### 3. 代碼品質分析
- `eslint-plugin-sonarjs`: SonarJS 代碼品質規則
- 檢測複雜度、重複代碼、代碼異味等

### 4. Import 管理
- `eslint-plugin-import`: 檢查 import/export 語句
- `eslint-plugin-node`: Node.js 特定規則

## 使用方法

### 基本掃描
```bash
# 掃描所有檔案
npm run lint

# 掃描特定檔案
npx eslint src/market-stats/market-stats.service.ts

# 自動修復可修復的問題
npm run lint:fix
```

### 完整安全掃描
```bash
# 使用增強配置進行完整掃描
npx eslint --config .eslintrc.enhanced.js src/

# 只掃描安全問題
npx eslint --config .eslintrc.enhanced.js --rule "security/*: error" src/
```

### 代碼品質報告
```bash
# 生成詳細報告
npx eslint --config .eslintrc.enhanced.js --format=json src/ > code-quality-report.json

# 生成 HTML 報告
npx eslint --config .eslintrc.enhanced.js --format=html src/ > code-quality-report.html
```

## 配置檔案

### `.eslintrc.simple.js`
生產環境配置，包含：
- TypeScript 嚴格檢查
- 安全性規則
- 代碼品質規則
- Import 排序規則

### 主要檢查項目

#### 安全性
- 物件注入攻擊檢測
- 不安全的正規表達式
- 評估表達式檢測
- 檔案系統操作安全檢查
- 隨機數生成安全檢查

#### 代碼品質
- 認知複雜度控制（≤20）
- 重複代碼檢測
- 死代碼檢測
- 冗餘邏輯檢測
- 代碼異味檢測

#### TypeScript
- 未使用變數檢測
- 類型安全檢查
- 函數返回類型檢查

## 持續整合

可將掃描加入 GitHub Actions：

```yaml
# .github/workflows/code-quality.yml
name: Code Quality
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx eslint --config .eslintrc.enhanced.js src/
```

## 建議工作流程

1. **開發前**：先掃描現有代碼
2. **開發中**：使用編輯器整合的 ESLint
3. **提交前**：執行完整掃描
4. **部署前**：執行安全掃描

## 常見問題修復

### 安全問題
- 使用參數化查詢而非字串拼接
- 驗證所有外部輸入
- 避免使用 eval() 函數

### 代碼品質
- 將複雜函數拆分為小函數
- 移除重複代碼
- 使用有意義的變數名稱

### TypeScript
- 明確定義函數返回類型
- 避免使用 any 類型
- 移除未使用的變數和匯入