#!/bin/bash

# 台灣股市資料收集系統 - 定期自動備份腳本
# 建議加入 crontab 定期執行

echo "⏰ === 定期自動備份 ==="
echo "執行時間: $(date '+%Y-%m-%d %H:%M:%S')"

# 設定變數
PROJECT_DIR="/Users/ming/Desktop/ch026"
BACKUP_BASE_DIR="$HOME/Desktop/backups"
MAX_BACKUPS=7  # 保留最近 7 個備份

# 建立備份基礎目錄
mkdir -p "$BACKUP_BASE_DIR"

# 執行備份
echo "🔄 開始執行自動備份..."
cd "$PROJECT_DIR"
if [ -f "./full-backup.sh" ]; then
    # 執行完整備份，將輸出重導向到備份目錄
    ./full-backup.sh 2>&1 | tee "$BACKUP_BASE_DIR/backup_$(date +%Y%m%d_%H%M%S).log"
    
    # 移動備份檔案到備份目錄
    mv ~/Desktop/taiwan-stock-data-collector_backup_*.tar.gz "$BACKUP_BASE_DIR/" 2>/dev/null
    
    echo "✅ 自動備份完成"
else
    echo "❌ 備份腳本不存在: $PROJECT_DIR/full-backup.sh"
    exit 1
fi

# 清理舊備份 (保留最近 N 個)
echo "🧹 清理舊備份檔案..."
cd "$BACKUP_BASE_DIR"
BACKUP_COUNT=$(ls taiwan-stock-data-collector_backup_*.tar.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    # 刪除最舊的備份
    ls -t taiwan-stock-data-collector_backup_*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    echo "✅ 已清理舊備份，保留最近 $MAX_BACKUPS 個備份"
else
    echo "📁 目前有 $BACKUP_COUNT 個備份，無需清理"
fi

# 顯示備份狀態
echo ""
echo "📊 === 備份狀態摘要 ==="
echo "備份位置: $BACKUP_BASE_DIR"
echo "備份檔案:"
ls -lah "$BACKUP_BASE_DIR"/taiwan-stock-data-collector_backup_*.tar.gz 2>/dev/null | tail -5
echo ""
echo "💾 總備份大小: $(du -sh "$BACKUP_BASE_DIR" | cut -f1)"
echo "⏰ 完成時間: $(date '+%Y-%m-%d %H:%M:%S')"

# 可選：發送通知 (需要安裝 terminal-notifier)
if command -v terminal-notifier >/dev/null 2>&1; then
    terminal-notifier -title "備份完成" -message "台灣股市資料收集系統已完成自動備份" -sound default
fi