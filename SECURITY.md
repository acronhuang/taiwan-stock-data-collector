# 🔒 安全設定指南

## ⚠️ 重要安全提醒

### 環境變數設定

1. **複製環境變數範本**
   ```bash
   cp .env.example .env
   ```

2. **編輯 .env 檔案**
   ```bash
   # 編輯實際的設定值
   nano .env
   ```

3. **確認 .env 不會被提交**
   ```bash
   # 檢查 .env 是否被 Git 忽略
   git check-ignore .env
   ```

### 📋 環境變數說明

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `MONGODB_URI` | MongoDB 連接字串 | `mongodb://localhost:27017/scraper` |
| `SCRAPER_INIT_ENABLED` | 是否啟用初始化資料抓取 | `false` |
| `SCRAPER_INIT_DAYS` | 初始化抓取天數 | `31` |

### 🛡️ 安全最佳實踐

✅ **已實施的安全措施**
- `.env` 檔案已加入 `.gitignore`
- 提供 `.env.example` 範本檔案
- 程式碼中無硬編碼的敏感資訊
- 使用政府公開 API，無需認證金鑰

✅ **API 資料來源**
- 台灣證券交易所 (TWSE) - 公開 API
- 櫃買中心 (TPEx) - 公開 API  
- 期貨交易所 (TAIFEX) - 公開 API
- 集保中心 (TDCC) - 公開 API
- 新北市政府開放資料 - 假日日曆 API

### 🔍 定期安全檢查

```bash
# 檢查是否有敏感檔案被意外提交
git ls-files | grep -E '\.(env|key|secret|pem)$'

# 檢查程式碼中是否有硬編碼的敏感資訊  
grep -r "password\|secret\|key\|token" src/ --exclude-dir=node_modules
```

### 📝 部署注意事項

- 生產環境請設定適當的環境變數
- 建議使用 Docker secrets 或雲端服務的環境變數管理
- 定期輪換密碼和連接字串