#!/bin/bash

# GitHub友好的備份策略 - 不包含資料庫二進位檔案
# 代碼 + 資料庫結構描述 + 還原指令

set -e

BACKUP_DATE=$(date '+%Y%m%d_%H%M%S')
GITHUB_BACKUP_DIR="github_backup_${BACKUP_DATE}"

echo "🚀 建立GitHub友好的備份..."
echo "備份時間: $(date)"

# 1. 建立GitHub備份目錄
mkdir -p "${GITHUB_BACKUP_DIR}"

# 2. 複製代碼 (排除大檔案)
echo "📁 複製專案代碼..."
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude 'backup_*' \
    --exclude 'old' \
    --exclude '*.bson' \
    --exclude '*.tar.gz' \
    . "${GITHUB_BACKUP_DIR}/code/"

# 3. 建立資料庫結構描述
echo "📊 生成資料庫結構描述..."
mkdir -p "${GITHUB_BACKUP_DIR}/database_schema"

# 匯出資料庫結構 (不含資料)
mongodump --db scraper --collection tickers --query '{}' --limit 5 --out "${GITHUB_BACKUP_DIR}/database_schema/"
mongodump --db scraper --collection technicalindicators --query '{}' --limit 5 --out "${GITHUB_BACKUP_DIR}/database_schema/"
mongodump --db scraper --collection marketstats --query '{}' --limit 5 --out "${GITHUB_BACKUP_DIR}/database_schema/"

# 4. 建立資料庫統計資訊
mongosh scraper --eval "
print('=== 資料庫完整統計 ===');
print('生成時間: ' + new Date());
print('');

print('Tickers 集合統計:');
var tickersStats = db.tickers.stats();
printjson({
    count: tickersStats.count,
    size: tickersStats.size,
    avgObjSize: tickersStats.avgObjSize,
    indexes: tickersStats.nindexes
});

print('');
print('Technical Indicators 集合統計:');
var indicatorsStats = db.technicalindicators.stats();
printjson({
    count: indicatorsStats.count,
    size: indicatorsStats.size,
    avgObjSize: indicatorsStats.avgObjSize,
    indexes: indicatorsStats.nindexes
});

print('');
print('Market Stats 集合統計:');
var marketStats = db.marketstats.stats();
printjson({
    count: marketStats.count,
    size: marketStats.size,
    avgObjSize: marketStats.avgObjSize,
    indexes: marketStats.nindexes
});

print('');
print('資料範圍統計:');
print('Tickers 日期範圍: ' + db.tickers.findOne({}, {date: 1, _id: 0}).date + ' 到 ' + db.tickers.find({}, {date: 1, _id: 0}).sort({date: -1}).limit(1).toArray()[0].date);
print('總股票數: ' + db.tickers.distinct('symbol').length);
print('總交易所: ' + JSON.stringify(db.tickers.distinct('exchange')));
" > "${GITHUB_BACKUP_DIR}/database_schema/database_stats.txt"

# 5. 建立資料庫樣本資料
echo "📝 生成資料樣本..."
mongosh scraper --eval "
print('=== 資料樣本 ===');
print('');
print('Tickers 樣本 (最新5筆):');
db.tickers.find().sort({date: -1}).limit(5).forEach(printjson);
print('');
print('Technical Indicators 樣本 (最新5筆):');
db.technicalindicators.find().sort({date: -1}).limit(5).forEach(printjson);
print('');
print('Market Stats 樣本 (最新5筆):');
db.marketstats.find().sort({date: -1}).limit(5).forEach(printjson);
" > "${GITHUB_BACKUP_DIR}/database_schema/sample_data.json"

# 6. 建立完整還原指令
cat > "${GITHUB_BACKUP_DIR}/RESTORE_INSTRUCTIONS.md" << 'EOF'
# 完整系統還原指南

## 系統需求
- Node.js 18+ 
- MongoDB 6.0+
- npm或yarn

## 1. 基礎環境設置
```bash
# 克隆專案
git clone https://github.com/acronhuang/taiwan-stock-data-collector.git
cd taiwan-stock-data-collector

# 安裝依賴
npm install

# 複製環境配置
cp .env.example .env
# 編輯 .env 檔案，設置MongoDB連接字符串
```

## 2. MongoDB 設置
```bash
# 啟動MongoDB
mongod

# 建立資料庫和索引
mongosh scraper --eval "
  // 建立集合索引
  db.tickers.createIndex({date: 1});
  db.tickers.createIndex({symbol: 1});
  db.tickers.createIndex({exchange: 1});
  db.tickers.createIndex({date: 1, symbol: 1});
  
  db.technicalindicators.createIndex({date: 1});
  db.technicalindicators.createIndex({symbol: 1});
  db.technicalindicators.createIndex({date: 1, symbol: 1});
  
  db.marketstats.createIndex({date: 1});
  db.marketstats.createIndex({type: 1});
"
```

## 3. 恢復歷史資料 (可選)
```bash
# 使用內建的歷史資料抓取工具
node working-historical-fetch.js

# 或者批量獲取特定年份
node working-historical-fetch.js 2020 2024
```

## 4. 啟動系統
```bash
# 編譯專案
npm run build

# 啟動服務
npm start

# 或開發模式
npm run start:dev
```

## 5. 設置自動化排程 (可選)
```bash
# 安裝cron排程
./install-cron.sh

# 或手動添加到crontab
echo "30 17 * * 1-5 cd /path/to/project && node smart-technical-indicators.js" | crontab -
```

## 6. 驗證系統運行
- 訪問 http://localhost:3001 檢查API
- 訪問 http://localhost:3001/analysis 查看分析頁面
- 檢查日誌文件確認自動化運行

## 資料庫統計參考
基於2025-11-04的備份：
- Tickers: 2,205,077 筆記錄
- Technical Indicators: 1,506,199 筆記錄  
- Market Stats: 754 筆記錄
- 覆蓋期間: 2001-2025年
- 支援交易所: TWSE, TPEx

## 故障排除
1. MongoDB連接問題：檢查.env配置和MongoDB服務狀態
2. 端口占用：修改main.ts中的端口設置
3. 權限問題：確保腳本有執行權限 (chmod +x *.sh)
4. 依賴問題：清除node_modules並重新安裝

## 支援聯繫
如遇問題請查看README.md或提交issue
EOF

# 7. 建立資料庫完整備份指令 (用戶在新機器上執行)
cat > "${GITHUB_BACKUP_DIR}/create_full_database_backup.sh" << 'EOF'
#!/bin/bash
# 在原始機器上執行此腳本來建立完整資料庫備份

echo "建立完整資料庫備份..."
BACKUP_DATE=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="database_full_backup_${BACKUP_DATE}.tar.gz"

# 匯出完整資料庫
mongodump --db scraper --out temp_db_backup/

# 壓縮
tar -czf "${BACKUP_FILE}" temp_db_backup/

# 清理
rm -rf temp_db_backup/

echo "✅ 完整資料庫備份完成: ${BACKUP_FILE}"
echo "請將此檔案傳輸到新機器並執行還原"

# 還原指令
cat > "restore_${BACKUP_FILE}" << 'RESTORE_EOF'
#!/bin/bash
# 還原完整資料庫備份

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
    echo "使用方式: $0 <backup_file.tar.gz>"
    exit 1
fi

echo "還原資料庫備份: $BACKUP_FILE"
tar -xzf "$BACKUP_FILE"
mongorestore temp_db_backup/
rm -rf temp_db_backup/
echo "✅ 資料庫還原完成"
RESTORE_EOF

chmod +x "restore_${BACKUP_FILE}"
echo "還原腳本已建立: restore_${BACKUP_FILE}"
EOF

chmod +x "${GITHUB_BACKUP_DIR}/create_full_database_backup.sh"

# 8. 建立系統資訊
cat > "${GITHUB_BACKUP_DIR}/SYSTEM_INFO.md" << EOF
# 系統備份資訊

## 備份詳情
- 備份時間: $(date)
- 原始機器: $(uname -a)
- Node.js版本: $(node --version)
- npm版本: $(npm --version)
- MongoDB版本: $(mongosh --version | head -1)

## 資料庫統計
- 資料庫名稱: scraper
- Tickers: $(mongosh scraper --quiet --eval "db.tickers.countDocuments()")
- Technical Indicators: $(mongosh scraper --quiet --eval "db.technicalindicators.countDocuments()")
- Market Stats: $(mongosh scraper --quiet --eval "db.marketstats.countDocuments()")

## 備份內容
1. 完整專案代碼
2. 資料庫結構樣本
3. 詳細還原指南
4. 自動化腳本
5. 系統配置檔案

## 注意事項
- 此備份不包含完整資料庫數據（因GitHub大小限制）
- 使用RESTORE_INSTRUCTIONS.md進行完整系統重建
- 可使用create_full_database_backup.sh在原機器建立完整資料庫備份
EOF

echo "✅ GitHub友好備份完成！"
echo "備份位置: ${GITHUB_BACKUP_DIR}"
echo "備份大小: $(du -sh ${GITHUB_BACKUP_DIR} | cut -f1)"
echo ""
echo "下一步: 將此目錄內容推送到GitHub"