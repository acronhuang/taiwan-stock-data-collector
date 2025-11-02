# API 狀態監控系統 - 使用指南

## 🎯 **解決方案概覽**

我們建立了一個完整的 API 狀態監控系統來管理和追蹤已知的 API 問題，並提供更智能的日誌處理。

## 📊 **新增功能**

### 1. **ApiStatusService**
- 管理已知 API 問題記錄
- 智能日誌分類 (錯誤 vs 已知問題)
- API 健康狀態檢查

### 2. **API 監控端點**
```
GET /api-status/health          # API 健康狀態摘要
GET /api-status/check?date=2025-10-24&api=TWSE_MI_INDEX  # 檢查特定 API
GET /api-status/issues          # 所有已知問題
GET /api-status/dashboard       # 完整儀表板
```

### 3. **智能日誌系統**
- ✅ 成功更新: `LOG` 等級
- ⚠️ 已知問題: `LOG` 等級 + 說明
- ❌ 未知問題: `WARN` 等級

## 🚀 **立即效果**

### 修復前日誌:
```
[WARN] 2025-10-24 集中市場加權指數: 尚無資料或非交易日
[WARN] 2025-10-24 集中市場三大法人買賣超: 尚無資料或非交易日
```

### 修復後日誌:
```
[LOG] 2025-10-24 集中市場加權指數: TWSE 大盤指數和三大法人API暫時無資料
[LOG] 2025-10-24 集中市場三大法人買賣超: TWSE 大盤指數和三大法人API暫時無資料
```

## 📱 **使用方式**

### 1. 檢查 API 健康狀態
```bash
curl http://localhost:3000/api-status/health
```

回應範例:
```json
{
  "timestamp": "2025-11-03T12:00:00.000Z",
  "summary": {
    "healthy": ["TWSE_STOCK_DAY", "TPEX_QUOTES"],
    "issues": [],
    "monitoring": []
  },
  "currentIssues": []
}
```

### 2. 檢查特定日期問題
```bash
curl "http://localhost:3000/api-status/check?date=2025-10-24&api=TWSE_MI_INDEX"
```

### 3. 獲取完整儀表板
```bash
curl http://localhost:3000/api-status/dashboard
```

## 🔧 **系統管理**

### 新增已知問題
```typescript
// 在 ApiStatusService 中新增
this.apiStatusService.addKnownIssue({
  startDate: '2025-11-01',
  endDate: '2025-11-05',
  apis: ['TWSE_MI_INDEX'],
  description: 'TWSE 系統維護期間',
  status: 'ongoing'
});
```

### 監控建議
1. **定期檢查**: 每日查看 `/api-status/dashboard`
2. **問題追蹤**: 記錄新發現的 API 問題
3. **狀態更新**: 及時更新問題狀態 (ongoing → resolved)

## 📈 **長期效益**

### 1. **降低噪音**
- 減少不必要的警告訊息
- 區分真正問題和已知問題

### 2. **提高可見性**
- 清楚了解 API 健康狀況
- 追蹤問題模式和趨勢

### 3. **改善維護**
- 快速識別新問題
- 歷史問題記錄和分析

## 🎯 **下一步建議**

### 1. **監控增強**
- 新增 API 回應時間監控
- 實施自動問題檢測

### 2. **通知系統**
- 整合 Slack/Email 通知
- 問題狀態改變時自動提醒

### 3. **資料分析**
- API 可用性統計
- 問題頻率分析報告

## ⚡ **立即測試**

啟動服務後測試:
```bash
# 1. 啟動服務
npm run start

# 2. 檢查 API 狀態
curl http://localhost:3000/api-status/health

# 3. 查看儀表板
curl http://localhost:3000/api-status/dashboard
```

現在您的系統會：
- ✅ 正確識別已知 API 問題
- ✅ 提供清晰的狀態資訊
- ✅ 減少不必要的警告噪音
- ✅ 支援 API 狀態監控

這個解決方案既解決了當前的警告問題，也建立了長期的 API 監控基礎！