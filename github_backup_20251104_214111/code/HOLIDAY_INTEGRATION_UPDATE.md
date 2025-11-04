# 政府行政機關辦公日曆表整合更新

## 更新概要

本次更新整合了政府行政機關辦公日曆表，為台灣金融數據爬蟲系統新增了休假日檢查功能，確保系統只在交易日執行數據收集任務。

## 新增功能

### 1. 休假日服務 (HolidayService)
- **位置**: `src/common/holiday.service.ts`
- **功能**: 提供全面的休假日檢查和工作日計算功能

#### 主要方法：
- `isHoliday(date: string)`: 檢查指定日期是否為休假日
- `isWorkingDay(date: string)`: 檢查指定日期是否為工作日
- `getWorkingDays(startDate: string, endDate: string)`: 獲取指定範圍內的工作日
- `getNextWorkingDay(date: string)`: 獲取下一個工作日

#### 假日檢查邏輯：
1. **週末檢查**: 自動識別週六、週日為休假日
2. **國定假日**: 內建 2024-2025 年國定假日清單
3. **API 整合**: 嘗試從新北市政府 OpenData API 獲取假日資訊
4. **快取機制**: 24小時快取有效期，提升性能
5. **降級處理**: API 失敗時回退到基本邏輯（週末檢查）

### 2. 休假日檢查 API
- **基礎路徑**: `/holiday`
- **控制器**: `src/common/holiday.controller.ts`

#### API 端點：
```
GET /holiday/check?date=YYYY-MM-DD           # 檢查單一日期
GET /holiday/working-days?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD  # 工作日範圍
GET /holiday/next-working-day?date=YYYY-MM-DD # 下一個工作日
GET /holiday/cache-stats                     # 快取統計
GET /holiday/clear-cache                     # 清除快取
```

### 3. 自動排程整合

所有現有的 Cron 排程任務現已整合休假日檢查：

#### TickerService 排程任務：
- `updateTwseIndicesQuotes` (14:00) - 上市指數行情
- `updateTpexIndicesQuotes` (14:00) - 上櫃指數行情  
- `updateTwseMarketTrades` (14:30) - 上市市場成交
- `updateTpexMarketTrades` (14:30) - 上櫃市場成交
- `updateTwseIndicesTrades` (15:00) - 上市指數成交
- `updateTpexIndicesTrades` (15:00) - 上櫃指數成交
- `updateTwseEquitiesQuotes` (15:00-21:00/2小時) - 上市個股行情
- `updateTpexEquitiesQuotes` (15:00-21:00/2小時) - 上櫃個股行情
- `updateTwseEquitiesInstInvestorsTrades` (16:30) - 上市法人進出
- `updateTpexEquitiesInstInvestorsTrades` (16:30) - 上櫃法人進出

#### MarketStatsService 排程任務：
- `updateTaiex` (15:00) - 大盤指數
- `updateInstInvestorsTrades` (15:30) - 法人買賣超
- `updateMarginTransactions` (21:30) - 信用交易統計
- `updateFiniTxfNetOi` (15:00) - 外資期貨淨部位
- `updateFiniTxoNetOiValue` (15:05) - 外資選擇權淨價值
- `updateLargeTradersTxfNetOi` (15:10) - 十大交易人期貨部位
- `updateRetailMxfPosition` (15:15) - 散戶小台淨部位
- `updateTxoPutCallRatio` (15:20) - Put/Call Ratio
- `updateUsdTwdRate` (17:00) - 美元台幣匯率

## 休假日資料來源

### 1. 新北市政府 OpenData API
- **URL**: `https://staging.data.ntpc.gov.tw/api/datasets/308dcd75-6434-45bc-a95f-584da4fed251/json`
- **資料範圍**: 2013-2023 年（持續更新中）
- **格式**: JSON 格式，包含日期、假日類別、說明等資訊

### 2. 內建國定假日清單
- **2024年**: 完整國定假日清單
- **2025年**: 預估國定假日清單（基於行政院人事行政總處公告）

### 3. 週末自動識別
- 週六 (dayOfWeek = 6)
- 週日 (dayOfWeek = 0)

## 系統架構更新

### 新增模組：
- `CommonModule`: 共用服務模組
  - 匯出 `HolidayService`
  - 提供 `HolidayController`

### 模組依賴更新：
- `AppModule` ← `CommonModule`
- `TickerModule` ← `CommonModule`
- `MarketStatsModule` ← `CommonModule`

## 測試驗證

### API 測試範例：

```bash
# 檢查今日是否為休假日
curl "http://localhost:3000/holiday/check?date=2024-11-02"

# 獲取本週工作日
curl "http://localhost:3000/holiday/working-days?startDate=2024-11-01&endDate=2024-11-07"

# 查找下一個工作日
curl "http://localhost:3000/holiday/next-working-day?date=2024-11-02"
```

### 預期行為：
- ✅ 週末自動識別為休假日
- ✅ 國定假日正確識別 (如 2024-10-10 國慶日)
- ✅ 工作日正確計算，排除週末和假日
- ✅ 所有排程任務在休假日自動跳過執行
- ✅ 日誌記錄休假日跳過訊息

## 效能優化

- **快取機制**: 24小時記憶體快取，減少重複 API 調用
- **降級處理**: API 失敗時使用本地邏輯，確保服務可用性
- **批量查詢**: 工作日範圍查詢支援批量處理
- **非阻塞設計**: 休假日檢查不影響其他系統功能

## 監控和維護

- **快取統計**: 透過 `/holiday/cache-stats` 監控快取使用情況
- **錯誤處理**: 完整的錯誤捕獲和日誌記錄
- **API 備援**: 多重資料來源，確保服務穩定性
- **年度更新**: 需定期更新國定假日清單

## 未來擴展

1. **多年份支援**: 擴展至更多年份的假日資料
2. **補班日處理**: 整合政府補班日公告
3. **地區假日**: 支援不同地區的特殊假日
4. **外部 API**: 整合更多官方假日資料來源
5. **彈性設定**: 支援自訂假日和工作日設定

## 注意事項

- 系統現在會自動跳過休假日的數據收集任務
- 確保 MongoDB 連線正常，以避免影響休假日服務
- 定期檢查政府假日公告，更新國定假日清單
- 監控 API 調用次數，避免超出限制

---

**更新完成時間**: 2024年11月2日  
**系統版本**: v1.2.0  
**更新範圍**: 全面整合政府行政機關辦公日曆表功能