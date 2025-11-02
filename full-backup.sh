#!/bin/bash

# 台灣股市資料收集系統 - 完整備份腳本
# 備份日期: $(date +"%Y-%m-%d %H:%M:%S")

echo "🚀 === 台灣股市資料收集系統 - 完整備份 ==="
echo "備份時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo "====================================================="

# 設定變數
PROJECT_NAME="taiwan-stock-data-collector"
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$HOME/Desktop/${PROJECT_NAME}_backup_${BACKUP_DATE}"
SOURCE_DIR="/Users/ming/Desktop/ch026"

echo "📁 建立備份目錄: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 1. 備份程式碼
echo ""
echo "💾 === 第1步: 備份程式碼檔案 ==="
echo "正在複製程式碼檔案..."

# 排除不需要的檔案
rsync -av --progress \
    --exclude='node_modules/' \
    --exclude='dist/' \
    --exclude='.git/' \
    --exclude='*.log' \
    --exclude='app.log' \
    --exclude='server.log' \
    "$SOURCE_DIR/" "$BACKUP_DIR/code/"

echo "✅ 程式碼備份完成"

# 2. 備份 package.json 和依賴資訊
echo ""
echo "📦 === 第2步: 備份依賴資訊 ==="
cp "$SOURCE_DIR/package.json" "$BACKUP_DIR/"
cp "$SOURCE_DIR/package-lock.json" "$BACKUP_DIR/" 2>/dev/null || echo "   (package-lock.json 不存在)"

# 創建依賴清單
echo "正在生成依賴清單..."
cd "$SOURCE_DIR"
npm list --depth=0 > "$BACKUP_DIR/dependencies_list.txt" 2>/dev/null || echo "無法生成 npm 依賴清單"

echo "✅ 依賴資訊備份完成"

# 3. 備份資料庫
echo ""
echo "🗃️  === 第3步: 備份 MongoDB 資料庫 ==="
DB_BACKUP_DIR="$BACKUP_DIR/database"
mkdir -p "$DB_BACKUP_DIR"

echo "正在備份 scraper 資料庫..."
if command -v mongodump >/dev/null 2>&1; then
    mongodump --db scraper --out "$DB_BACKUP_DIR" --quiet
    if [ $? -eq 0 ]; then
        echo "✅ 資料庫備份完成"
        
        # 生成資料庫統計
        echo "正在生成資料庫統計..."
        mongosh scraper --eval "
        console.log('=== 資料庫統計報告 ===');
        console.log('備份時間: $(date)');
        console.log('');
        console.log('📊 集合統計:');
        console.log('MarketStats:', db.marketstats.countDocuments(), '筆');
        console.log('Tickers:', db.tickers.countDocuments(), '筆');
        console.log('');
        if(db.marketstats.countDocuments() > 0) {
            var dates = db.marketstats.distinct('date').sort();
            console.log('📅 MarketStats 日期範圍: ' + dates[0] + ' ~ ' + dates[dates.length-1] + ' (' + dates.length + ' 天)');
        }
        if(db.tickers.countDocuments() > 0) {
            var tickerDates = db.tickers.distinct('date').sort();
            console.log('📅 Tickers 日期範圍: ' + tickerDates[0] + ' ~ ' + tickerDates[tickerDates.length-1] + ' (' + tickerDates.length + ' 天)');
        }
        console.log('');
        console.log('🏛️ 交易所分布:');
        db.tickers.distinct('exchange').forEach(ex => {
            console.log('  ' + ex + ':', db.tickers.countDocuments({exchange: ex}), '筆');
        });
        " > "$DB_BACKUP_DIR/database_stats.txt" 2>/dev/null
    else
        echo "❌ 資料庫備份失敗"
    fi
else
    echo "⚠️  mongodump 指令不存在，跳過資料庫備份"
    echo "   請手動執行: mongodump --db scraper --out $DB_BACKUP_DIR"
fi

# 4. 備份配置檔案
echo ""
echo "⚙️  === 第4步: 備份配置檔案 ==="
CONFIG_BACKUP_DIR="$BACKUP_DIR/config"
mkdir -p "$CONFIG_BACKUP_DIR"

# 複製重要配置檔案
cp "$SOURCE_DIR/.env.example" "$CONFIG_BACKUP_DIR/" 2>/dev/null
cp "$SOURCE_DIR/tsconfig.json" "$CONFIG_BACKUP_DIR/" 2>/dev/null
cp "$SOURCE_DIR/nest-cli.json" "$CONFIG_BACKUP_DIR/" 2>/dev/null
cp "$SOURCE_DIR/.eslintrc"* "$CONFIG_BACKUP_DIR/" 2>/dev/null
cp "$SOURCE_DIR/.prettierrc" "$CONFIG_BACKUP_DIR/" 2>/dev/null

echo "✅ 配置檔案備份完成"

# 5. 備份文檔
echo ""
echo "📚 === 第5步: 備份文檔資料 ==="
DOC_BACKUP_DIR="$BACKUP_DIR/documentation"
mkdir -p "$DOC_BACKUP_DIR"

# 複製所有 .md 文件
cp "$SOURCE_DIR"/*.md "$DOC_BACKUP_DIR/" 2>/dev/null
cp "$SOURCE_DIR/README.md" "$DOC_BACKUP_DIR/" 2>/dev/null

echo "✅ 文檔資料備份完成"

# 6. 創建備份資訊檔案
echo ""
echo "📋 === 第6步: 創建備份資訊 ==="
cat > "$BACKUP_DIR/BACKUP_INFO.md" << EOF
# 台灣股市資料收集系統 - 備份資訊

## 📊 備份詳情
- **備份時間**: $(date '+%Y-%m-%d %H:%M:%S')
- **專案名稱**: 台灣股市資料收集系統
- **版本**: $(grep '"version"' "$SOURCE_DIR/package.json" | cut -d'"' -f4)
- **備份位置**: $BACKUP_DIR

## 📁 備份內容
- \`code/\` - 完整原始碼 (排除 node_modules, dist, .git)
- \`database/\` - MongoDB 資料庫完整備份
- \`config/\` - 系統配置檔案
- \`documentation/\` - 所有文檔檔案
- \`package.json\` - 專案依賴配置
- \`dependencies_list.txt\` - 完整依賴清單

## 🔧 還原步驟

### 1. 還原程式碼
\`\`\`bash
cp -r $BACKUP_DIR/code/ /path/to/new/location/
cd /path/to/new/location/
npm install
\`\`\`

### 2. 還原資料庫
\`\`\`bash
mongorestore --db scraper $BACKUP_DIR/database/scraper/
\`\`\`

### 3. 配置環境
\`\`\`bash
cp $BACKUP_DIR/config/.env.example .env
# 編輯 .env 檔案設定 MongoDB 連接等
\`\`\`

### 4. 啟動服務
\`\`\`bash
npm run build
npm run start
\`\`\`

## 📊 系統狀態 (備份時)
$(if [ -f "$DB_BACKUP_DIR/database_stats.txt" ]; then cat "$DB_BACKUP_DIR/database_stats.txt"; else echo "資料庫統計資訊未生成"; fi)

## 🏷️ 專案標籤
- TypeScript
- NestJS
- MongoDB
- 股市資料收集
- 定時任務
- RESTful API

---
**備份腳本版本**: 1.0
**創建者**: GitHub Copilot
EOF

# 7. 壓縮備份
echo ""
echo "🗜️  === 第7步: 壓縮備份檔案 ==="
cd "$HOME/Desktop"
ARCHIVE_NAME="${PROJECT_NAME}_backup_${BACKUP_DATE}.tar.gz"

echo "正在壓縮備份檔案: $ARCHIVE_NAME"
tar -czf "$ARCHIVE_NAME" "$(basename "$BACKUP_DIR")"

if [ $? -eq 0 ]; then
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
    echo "✅ 壓縮完成: $ARCHIVE_NAME ($ARCHIVE_SIZE)"
    
    # 可選：刪除未壓縮的備份目錄以節省空間
    read -p "是否刪除未壓縮的備份目錄以節省空間? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$BACKUP_DIR"
        echo "✅ 已刪除未壓縮備份目錄"
    fi
else
    echo "❌ 壓縮失敗"
fi

# 8. 完成報告
echo ""
echo "🎉 === 備份完成 ==="
echo "備份位置:"
if [ -d "$BACKUP_DIR" ]; then
    echo "  📁 目錄: $BACKUP_DIR"
fi
if [ -f "$HOME/Desktop/$ARCHIVE_NAME" ]; then
    echo "  📦 壓縮檔: $HOME/Desktop/$ARCHIVE_NAME"
fi
echo ""
echo "📋 備份內容:"
echo "  ✅ 程式碼檔案"
echo "  ✅ 資料庫資料"
echo "  ✅ 配置檔案"
echo "  ✅ 文檔資料"
echo "  ✅ 依賴資訊"
echo ""
echo "💡 還原說明請參考: $BACKUP_DIR/BACKUP_INFO.md"
echo ""
echo "🔐 備份完成時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo "====================================================="