#!/bin/bash

# 移除 TickerService 中個別方法的休假日檢查
cd /Users/ming/Desktop/ch026/src/ticker

# 使用 sed 移除休假日檢查代碼塊
sed -i '' '/\/\/ 檢查是否為休假日/,/^    $/d' ticker.service.ts

echo "✅ TickerService 休假日檢查已移除"

# 移除 MarketStatsService 中個別方法的休假日檢查  
cd ../market-stats

sed -i '' '/\/\/ 檢查是否為休假日/,/^    $/d' market-stats.service.ts

echo "✅ MarketStatsService 休假日檢查已移除"

echo "🎯 優化完成 - 現在只在主方法中檢查休假日"