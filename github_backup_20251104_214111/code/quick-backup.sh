#!/bin/bash

# 台灣股市資料收集系統 - 快速代碼備份腳本
# 用於快速備份程式碼（不包含資料庫）

echo "⚡ === 快速代碼備份 ==="
echo "備份時間: $(date '+%Y-%m-%d %H:%M:%S')"

# 設定變數
PROJECT_NAME="taiwan-stock-data-collector"
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$HOME/Desktop/${PROJECT_NAME}_code_backup_${BACKUP_DATE}"
SOURCE_DIR="/Users/ming/Desktop/ch026"

echo "📁 建立備份目錄: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 備份程式碼
echo "💾 正在備份程式碼..."
rsync -av --progress \
    --exclude='node_modules/' \
    --exclude='dist/' \
    --exclude='.git/' \
    --exclude='*.log' \
    --exclude='app.log' \
    --exclude='server.log' \
    "$SOURCE_DIR/" "$BACKUP_DIR/"

# 創建簡單的備份資訊
cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
台灣股市資料收集系統 - 代碼備份
備份時間: $(date '+%Y-%m-%d %H:%M:%S')
備份類型: 僅程式碼 (不含資料庫)
還原方式: 
1. 將檔案複製到新位置
2. 執行 npm install
3. 配置 .env 檔案
4. 執行 npm run start
EOF

echo "✅ 快速代碼備份完成!"
echo "📁 備份位置: $BACKUP_DIR"
echo "⏱️  耗時: $(date '+%Y-%m-%d %H:%M:%S')"