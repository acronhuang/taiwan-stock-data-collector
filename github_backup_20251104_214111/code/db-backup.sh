#!/bin/bash

# 台灣股市資料收集系統 - 資料庫備份腳本
# 專門用於備份 MongoDB 資料庫

echo "🗃️  === 資料庫備份 ==="
echo "備份時間: $(date '+%Y-%m-%d %H:%M:%S')"

# 設定變數
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_DIR="$HOME/Desktop/scraper_db_backup_${BACKUP_DATE}"

echo "📁 建立資料庫備份目錄: $DB_BACKUP_DIR"
mkdir -p "$DB_BACKUP_DIR"

# 檢查 MongoDB 工具
if ! command -v mongodump >/dev/null 2>&1; then
    echo "❌ mongodump 指令不存在"
    echo "請安裝 MongoDB 工具: brew install mongodb/brew/mongodb-database-tools"
    exit 1
fi

# 備份資料庫
echo "🔄 正在備份 scraper 資料庫..."
mongodump --db scraper --out "$DB_BACKUP_DIR" --quiet

if [ $? -eq 0 ]; then
    echo "✅ 資料庫備份完成"
    
    # 生成詳細統計
    echo "📊 生成資料庫統計報告..."
    mongosh scraper --eval "
    console.log('=== MongoDB 資料庫統計報告 ===');
    console.log('備份時間: $(date)');
    console.log('資料庫: scraper');
    console.log('');
    
    // 基本統計
    var marketStatsCount = db.marketstats.countDocuments();
    var tickersCount = db.tickers.countDocuments();
    
    console.log('📊 集合統計:');
    console.log('  marketstats: ' + marketStatsCount.toLocaleString() + ' 筆記錄');
    console.log('  tickers: ' + tickersCount.toLocaleString() + ' 筆記錄');
    console.log('  總計: ' + (marketStatsCount + tickersCount).toLocaleString() + ' 筆記錄');
    console.log('');
    
    // MarketStats 詳細資訊
    if(marketStatsCount > 0) {
        var marketDates = db.marketstats.distinct('date').sort();
        console.log('📅 MarketStats 資料範圍:');
        console.log('  最早日期: ' + marketDates[0]);
        console.log('  最新日期: ' + marketDates[marketDates.length-1]);
        console.log('  涵蓋天數: ' + marketDates.length + ' 天');
        console.log('');
    }
    
    // Tickers 詳細資訊
    if(tickersCount > 0) {
        var tickerDates = db.tickers.distinct('date').sort();
        console.log('📅 Tickers 資料範圍:');
        console.log('  最早日期: ' + tickerDates[0]);
        console.log('  最新日期: ' + tickerDates[tickerDates.length-1]);
        console.log('  涵蓋天數: ' + tickerDates.length + ' 天');
        console.log('');
        
        console.log('🏛️ 交易所分布:');
        var exchanges = db.tickers.distinct('exchange');
        exchanges.forEach(function(ex) {
            var count = db.tickers.countDocuments({exchange: ex});
            console.log('  ' + ex + ': ' + count.toLocaleString() + ' 筆');
        });
        console.log('');
        
        console.log('📈 股票類型分布:');
        var types = db.tickers.distinct('type');
        types.forEach(function(type) {
            var count = db.tickers.countDocuments({type: type});
            console.log('  ' + type + ': ' + count.toLocaleString() + ' 筆');
        });
    }
    
    console.log('');
    console.log('💾 備份檔案大小:');
    " > "$DB_BACKUP_DIR/database_report.txt" 2>/dev/null
    
    # 計算備份大小
    BACKUP_SIZE=$(du -sh "$DB_BACKUP_DIR" | cut -f1)
    echo "  備份大小: $BACKUP_SIZE" >> "$DB_BACKUP_DIR/database_report.txt"
    
    # 建立還原腳本
    cat > "$DB_BACKUP_DIR/restore.sh" << EOF
#!/bin/bash
# 資料庫還原腳本
# 使用方式: ./restore.sh

echo "🔄 正在還原 scraper 資料庫..."
mongorestore --db scraper --drop "$DB_BACKUP_DIR/scraper/"
if [ \$? -eq 0 ]; then
    echo "✅ 資料庫還原完成"
else
    echo "❌ 資料庫還原失敗"
fi
EOF
    chmod +x "$DB_BACKUP_DIR/restore.sh"
    
    echo "✅ 統計報告已生成"
    echo "📁 備份位置: $DB_BACKUP_DIR"
    echo "📊 備份大小: $BACKUP_SIZE"
    echo "🔧 還原方式: cd $DB_BACKUP_DIR && ./restore.sh"
    
else
    echo "❌ 資料庫備份失敗"
    exit 1
fi

echo ""
echo "🎉 資料庫備份完成!"
echo "備份時間: $(date '+%Y-%m-%d %H:%M:%S')"