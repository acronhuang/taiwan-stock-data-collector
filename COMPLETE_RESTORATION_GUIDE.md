# 🚀 台灣股票數據收集系統 - 完整還原指南

## 📋 備份內容概述

**備份時間**: 2025-11-04 21:41  
**GitHub倉庫**: https://github.com/acronhuang/taiwan-stock-data-collector  
**分支**: development  

### 🗃️ 備份包含內容
- ✅ **完整專案代碼** (NestJS應用程式)
- ✅ **資料庫結構描述** (MongoDB collections)  
- ✅ **系統配置檔案** (package.json, tsconfig等)
- ✅ **自動化腳本** (cron排程, 備份腳本)
- ✅ **網頁界面** (Handlebars模板)
- ✅ **技術分析模組** (指標計算引擎)

### 📊 資料庫規模
- **Tickers**: 2,205,077 筆記錄 (股票價格資料)
- **Technical Indicators**: 1,506,199 筆記錄 (技術指標)
- **Market Stats**: 754 筆記錄 (市場統計)
- **覆蓋期間**: 2001-2025年
- **支援交易所**: TWSE (台灣證交所), TPEx (櫃買中心)

---

## 🛠️ 還原步驟

### 步驟 1: 系統需求檢查
```bash
# 檢查 Node.js 版本 (需要 18+)
node --version

# 檢查 npm 版本
npm --version

# 檢查 MongoDB 版本 (需要 6.0+)
mongosh --version

# 檢查 Git 版本
git --version
```

### 步驟 2: 克隆專案
```bash
# 克隆 GitHub 倉庫
git clone https://github.com/acronhuang/taiwan-stock-data-collector.git

# 進入專案目錄
cd taiwan-stock-data-collector

# 切換到 development 分支
git checkout development
```

### 步驟 3: 安裝依賴
```bash
# 安裝 Node.js 依賴
npm install

# 複製環境配置檔案
cp .env.example .env

# 編輯 .env 檔案，設置 MongoDB 連接
nano .env
# 或使用其他編輯器：
# vim .env
# code .env
```

### 步驟 4: 設置 MongoDB
```bash
# 啟動 MongoDB 服務
# macOS (使用 Homebrew):
brew services start mongodb/brew/mongodb-community

# Ubuntu/Debian:
sudo systemctl start mongod

# CentOS/RHEL:
sudo systemctl start mongod
```

```bash
# 建立資料庫和索引
mongosh scraper --eval "
// 建立 tickers 集合索引
db.tickers.createIndex({date: 1});
db.tickers.createIndex({symbol: 1});
db.tickers.createIndex({exchange: 1});
db.tickers.createIndex({date: 1, symbol: 1});

// 建立 technicalindicators 集合索引  
db.technicalindicators.createIndex({date: 1});
db.technicalindicators.createIndex({symbol: 1});
db.technicalindicators.createIndex({date: 1, symbol: 1});

// 建立 marketstats 集合索引
db.marketstats.createIndex({date: 1});
db.marketstats.createIndex({type: 1});

print('✅ 資料庫索引建立完成');
"
```

### 步驟 5: 編譯專案
```bash
# 編譯 TypeScript 代碼
npm run build

# 檢查編譯結果
ls -la dist/
```

### 步驟 6: 資料還原 (兩種方式)

#### 方式 A: 從原始機器傳輸完整資料庫
如果您有原始機器的存取權限：

```bash
# 在原始機器上建立完整資料庫備份
node github_backup_20251104_214111/create_full_database_backup.sh

# 將備份檔案傳輸到新機器
scp database_full_backup_*.tar.gz user@new-machine:/path/to/project/

# 在新機器上還原
tar -xzf database_full_backup_*.tar.gz
mongorestore temp_db_backup/
rm -rf temp_db_backup/
```

#### 方式 B: 重新獲取歷史資料
如果無法從原始機器傳輸：

```bash
# 使用內建歷史資料獲取工具
node working-historical-fetch.js

# 或指定年份範圍獲取
node working-historical-fetch.js 2020 2024

# 獲取最新資料
node fetch-workday-data.js
```

### 步驟 7: 啟動系統
```bash
# 啟動開發模式
npm run start:dev

# 或啟動生產模式
npm start

# 檢查服務狀態
curl http://localhost:3001/
```

### 步驟 8: 驗證系統運行
```bash
# 檢查 API 端點
curl http://localhost:3001/api/tickers | jq

# 檢查技術分析 API
curl -X POST http://localhost:3001/technical-analysis/calculate \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-11-04"}'

# 查看網頁界面
open http://localhost:3001/analysis
```

### 步驟 9: 設置自動化 (可選)
```bash
# 賦予腳本執行權限
chmod +x *.sh

# 安裝 cron 排程
./install-cron.sh

# 或手動添加到 crontab
crontab -e
# 添加以下行：
# 30 17 * * 1-5 cd /path/to/project && node smart-technical-indicators.js
```

---

## 🔧 故障排除

### 常見問題及解決方案

#### 1. MongoDB 連接失敗
```bash
# 檢查 MongoDB 服務狀態
ps aux | grep mongod

# 檢查端口占用
netstat -an | grep 27017

# 重啟 MongoDB 服務
sudo systemctl restart mongod
```

#### 2. 端口 3001 被占用
```bash
# 檢查端口占用
lsof -i :3001

# 終止占用進程
kill -9 <PID>

# 或修改端口設置
# 編輯 src/main.ts，修改 port 變數
```

#### 3. 依賴安裝失敗
```bash
# 清除 npm 緩存
npm cache clean --force

# 刪除 node_modules 重新安裝
rm -rf node_modules package-lock.json
npm install
```

#### 4. 權限問題
```bash
# 賦予腳本執行權限
chmod +x *.sh

# 修復檔案所有者
sudo chown -R $USER:$USER .
```

---

## 📈 性能優化建議

### 資料庫優化
```bash
# 檢查索引使用情況
mongosh scraper --eval "
db.tickers.getIndexes();
db.technicalindicators.getIndexes();
"

# 分析查詢性能
mongosh scraper --eval "
db.tickers.find({date: '2024-11-04'}).explain('executionStats');
"
```

### 系統監控
```bash
# 檢查系統狀態
node system-status.js

# 檢查資料完整性
node database-integrity-checker.js

# 查看日誌
tail -f logs/application.log
```

---

## 🚨 緊急還原程序

如果標準還原失敗，可以使用備份目錄中的檔案：

### 使用備份目錄還原
```bash
# 使用備份中的代碼
cp -r github_backup_20251104_214111/code/* .

# 安裝依賴
npm install

# 重新編譯
npm run build

# 啟動服務
npm start
```

### 最小化系統啟動
```bash
# 僅啟動核心功能
node src/main.ts

# 或使用簡化版技術分析
cp src/technical-analysis/technical-analysis.service.minimal.ts \
   src/technical-analysis/technical-analysis.service.ts
```

---

## 📞 支援資源

### 檔案位置參考
- **主要配置**: `package.json`, `.env`, `tsconfig.json`
- **核心代碼**: `src/` 目錄
- **自動化腳本**: `*.sh` 檔案
- **網頁模板**: `views/` 目錄
- **技術分析**: `src/technical-analysis/`

### 重要 API 端點
- `GET /api/tickers` - 股票資料
- `POST /technical-analysis/calculate` - 技術指標計算
- `GET /analysis` - 分析網頁界面
- `GET /admin` - 管理界面

### 日誌檢查
```bash
# 應用程式日誌
tail -f logs/application.log

# 系統日誌
journalctl -u mongod -f

# cron 日誌
grep CRON /var/log/syslog
```

---

## ✅ 驗證清單

完成還原後，請驗證以下項目：

- [ ] MongoDB 服務正常運行
- [ ] 專案依賴安裝完成
- [ ] 環境變數配置正確
- [ ] API 端點正常回應
- [ ] 網頁界面可以存取
- [ ] 資料庫索引建立完成
- [ ] 自動化排程設置完成
- [ ] 歷史資料獲取功能正常
- [ ] 技術指標計算正常運行

---

**🎉 恭喜！您已成功還原台灣股票數據收集系統**

如遇任何問題，請檢查上述故障排除章節或查看專案 README.md 檔案。