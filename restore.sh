#!/bin/bash

# 台灣股市資料收集系統 - 一鍵還原腳本
# 用於從完整備份還原整個系統

echo "🔄 === 系統還原工具 ==="
echo "還原時間: $(date '+%Y-%m-%d %H:%M:%S')"

# 顯示使用說明
if [ $# -eq 0 ]; then
    echo ""
    echo "📋 使用方式:"
    echo "  ./restore.sh <備份目錄路徑> [目標目錄]"
    echo ""
    echo "📁 範例:"
    echo "  ./restore.sh ~/Desktop/taiwan-stock-data-collector_backup_20240101_120000"
    echo "  ./restore.sh ~/Desktop/taiwan-stock-data-collector_backup_20240101_120000 ~/Projects/new-location"
    echo ""
    echo "🗂️  或從壓縮檔還原:"
    echo "  tar -xzf taiwan-stock-data-collector_backup_20240101_120000.tar.gz"
    echo "  ./restore.sh ~/Desktop/taiwan-stock-data-collector_backup_20240101_120000"
    exit 1
fi

# 設定變數
BACKUP_DIR="$1"
TARGET_DIR="${2:-$(pwd)/restored-project}"

# 檢查備份目錄
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ 備份目錄不存在: $BACKUP_DIR"
    exit 1
fi

echo "📁 備份來源: $BACKUP_DIR"
echo "📁 還原目標: $TARGET_DIR"
echo ""

# 確認還原
read -p "🔄 確定要還原到 $TARGET_DIR 嗎? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 還原已取消"
    exit 1
fi

# 建立目標目錄
echo "📁 建立目標目錄..."
mkdir -p "$TARGET_DIR"

# 1. 還原程式碼
echo ""
echo "💾 === 第1步: 還原程式碼 ==="
if [ -d "$BACKUP_DIR/code" ]; then
    echo "正在複製程式碼檔案..."
    cp -r "$BACKUP_DIR/code/"* "$TARGET_DIR/"
    echo "✅ 程式碼還原完成"
else
    echo "⚠️  找不到程式碼目錄，嘗試直接從備份根目錄還原..."
    cp -r "$BACKUP_DIR/"*.json "$TARGET_DIR/" 2>/dev/null
    cp -r "$BACKUP_DIR/src" "$TARGET_DIR/" 2>/dev/null
    cp -r "$BACKUP_DIR/views" "$TARGET_DIR/" 2>/dev/null
fi

# 2. 還原配置檔案
echo ""
echo "⚙️  === 第2步: 還原配置檔案 ==="
if [ -d "$BACKUP_DIR/config" ]; then
    cp "$BACKUP_DIR/config/"* "$TARGET_DIR/" 2>/dev/null
    echo "✅ 配置檔案還原完成"
fi

# 3. 安裝依賴
echo ""
echo "📦 === 第3步: 安裝依賴套件 ==="
cd "$TARGET_DIR"
if [ -f "package.json" ]; then
    echo "正在安裝 npm 依賴..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 依賴套件安裝完成"
    else
        echo "⚠️  依賴套件安裝出現問題，請手動執行 npm install"
    fi
else
    echo "❌ 找不到 package.json，跳過依賴安裝"
fi

# 4. 還原資料庫
echo ""
echo "🗃️  === 第4步: 還原資料庫 ==="
if [ -d "$BACKUP_DIR/database/scraper" ]; then
    if command -v mongorestore >/dev/null 2>&1; then
        echo "正在還原 MongoDB 資料庫..."
        mongorestore --db scraper --drop "$BACKUP_DIR/database/scraper/"
        if [ $? -eq 0 ]; then
            echo "✅ 資料庫還原完成"
        else
            echo "❌ 資料庫還原失敗，請手動執行:"
            echo "   mongorestore --db scraper --drop $BACKUP_DIR/database/scraper/"
        fi
    else
        echo "⚠️  mongorestore 指令不存在，請手動還原資料庫:"
        echo "   mongorestore --db scraper --drop $BACKUP_DIR/database/scraper/"
    fi
else
    echo "⚠️  找不到資料庫備份，跳過資料庫還原"
fi

# 5. 建立環境配置
echo ""
echo "🔧 === 第5步: 建立環境配置 ==="
if [ ! -f "$TARGET_DIR/.env" ] && [ -f "$TARGET_DIR/.env.example" ]; then
    cp "$TARGET_DIR/.env.example" "$TARGET_DIR/.env"
    echo "✅ 已從 .env.example 建立 .env 檔案"
    echo "⚠️  請編輯 .env 檔案設定 MongoDB 連接等參數"
else
    echo "⚠️  請確保 .env 檔案存在並正確配置"
fi

# 6. 建置專案
echo ""
echo "🔨 === 第6步: 建置專案 ==="
if [ -f "$TARGET_DIR/package.json" ]; then
    npm run build
    if [ $? -eq 0 ]; then
        echo "✅ 專案建置完成"
    else
        echo "⚠️  專案建置出現問題，請檢查錯誤訊息"
    fi
fi

# 7. 創建啟動腳本
echo ""
echo "🚀 === 第7步: 創建啟動腳本 ==="
cat > "$TARGET_DIR/start.sh" << EOF
#!/bin/bash
# 台灣股市資料收集系統 - 啟動腳本

echo "🚀 啟動台灣股市資料收集系統..."
echo "時間: \$(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 檢查 MongoDB 連接
echo "🔍 檢查 MongoDB 連接..."
if ! mongosh scraper --eval "db.runCommand('ping')" --quiet >/dev/null 2>&1; then
    echo "❌ MongoDB 連接失败，請確保 MongoDB 服務正在運行"
    exit 1
fi
echo "✅ MongoDB 連接正常"

# 啟動服務
echo "🎯 啟動 NestJS 服務..."
npm run start

EOF
chmod +x "$TARGET_DIR/start.sh"

# 8. 完成報告
echo ""
echo "🎉 === 還原完成 ==="
echo "還原時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo "目標位置: $TARGET_DIR"
echo ""
echo "📋 後續步驟:"
echo "1. 📝 編輯 .env 檔案設定環境變數"
echo "2. 🔍 檢查 MongoDB 連接設定"
echo "3. 🚀 執行 cd $TARGET_DIR && ./start.sh 啟動服務"
echo ""
echo "🌐 服務網址:"
echo "  - API: http://localhost:3000"
echo "  - 管理介面: http://localhost:3000/admin/fetch-data"
echo ""
echo "📚 其他指令:"
echo "  - 開發模式: npm run start:dev"
echo "  - 背景執行: npm run start:prod"
echo "  - 手動備份: ./full-backup.sh"
echo ""
echo "✅ 系統還原完成！"