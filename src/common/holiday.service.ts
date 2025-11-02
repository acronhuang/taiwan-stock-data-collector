import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface HolidayData {
  date: string;
  chinese: string | null;
  isholiday: string;
  holidaycategory: string;
  description: string;
}

@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);
  private holidayCache = new Map<string, boolean>();
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小時

  // 2024 年國定假日和休假日 (根據行政院人事行政總處)
  private readonly KNOWN_HOLIDAYS_2024 = [
    '2024-01-01', // 中華民國開國紀念日
    '2024-02-08', // 農曆除夕前一日
    '2024-02-09', // 農曆除夕
    '2024-02-10', // 農曆春節
    '2024-02-11', // 農曆春節
    '2024-02-12', // 農曆春節
    '2024-02-13', // 農曆春節
    '2024-02-14', // 農曆春節
    '2024-02-28', // 和平紀念日
    '2024-04-04', // 兒童節
    '2024-04-05', // 清明節
    '2024-05-01', // 勞動節
    '2024-06-10', // 端午節
    '2024-09-17', // 中秋節
    '2024-10-10', // 國慶日
  ];

  // 2025 年國定假日和休假日 (預估)
  private readonly KNOWN_HOLIDAYS_2025 = [
    '2025-01-01', // 中華民國開國紀念日
    '2025-01-28', // 農曆除夕前一日
    '2025-01-29', // 農曆除夕
    '2025-01-30', // 農曆春節
    '2025-01-31', // 農曆春節
    '2025-02-01', // 農曆春節
    '2025-02-02', // 農曆春節
    '2025-02-03', // 農曆春節
    '2025-02-28', // 和平紀念日
    '2025-04-04', // 兒童節
    '2025-04-05', // 清明節 (假設)
    '2025-05-01', // 勞動節
    '2025-05-31', // 端午節 (假設)
    '2025-10-06', // 中秋節 (假設)
    '2025-10-10', // 國慶日
  ];

  /**
   * 檢查指定日期是否為休假日
   */
  async isHoliday(date: string): Promise<boolean> {
    const dateStr = this.formatDate(date);
    
    // 檢查是否為週末
    if (this.isWeekend(dateStr)) {
      return true;
    }

    // 檢查快取
    if (this.holidayCache.has(dateStr) && this.isCacheValid()) {
      return this.holidayCache.get(dateStr);
    }

    // 檢查已知假日
    if (this.isKnownHoliday(dateStr)) {
      this.holidayCache.set(dateStr, true);
      return true;
    }

    // 嘗試從 API 獲取
    try {
      const isHolidayFromApi = await this.fetchHolidayFromApi(dateStr);
      this.holidayCache.set(dateStr, isHolidayFromApi);
      return isHolidayFromApi;
    } catch (error) {
      this.logger.warn(`無法從 API 獲取 ${dateStr} 的假日資訊: ${error.message}`);
      // 回退到基本邏輯：週末視為假日
      const isWeekendOnly = this.isWeekend(dateStr);
      this.holidayCache.set(dateStr, isWeekendOnly);
      return isWeekendOnly;
    }
  }

  /**
   * 檢查指定日期是否為工作日
   */
  async isWorkingDay(date: string): Promise<boolean> {
    return !(await this.isHoliday(date));
  }

  /**
   * 獲取指定日期範圍內的工作日
   */
  async getWorkingDays(startDate: string, endDate: string): Promise<string[]> {
    const workingDays: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = this.formatDate(date.toISOString());
      if (await this.isWorkingDay(dateStr)) {
        workingDays.push(dateStr);
      }
    }
    
    return workingDays;
  }

  /**
   * 獲取下一個工作日
   */
  async getNextWorkingDay(date: string): Promise<string> {
    let nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    while (await this.isHoliday(this.formatDate(nextDate.toISOString()))) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    
    return this.formatDate(nextDate.toISOString());
  }

  /**
   * 檢查是否為週末
   */
  private isWeekend(dateStr: string): boolean {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0=週日, 6=週六
  }

  /**
   * 檢查是否為已知假日
   */
  private isKnownHoliday(dateStr: string): boolean {
    return this.KNOWN_HOLIDAYS_2024.includes(dateStr) || 
           this.KNOWN_HOLIDAYS_2025.includes(dateStr);
  }

  /**
   * 從 API 獲取假日資訊
   */
  private async fetchHolidayFromApi(dateStr: string): Promise<boolean> {
    try {
      const response = await axios.get(
        'https://staging.data.ntpc.gov.tw/api/datasets/308dcd75-6434-45bc-a95f-584da4fed251/json',
        {
          params: { size: 5000 },
          timeout: 5000
        }
      );

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('API 回應格式不正確');
      }

      // 轉換日期格式 (API 使用 YYYY/MM/DD，我們使用 YYYY-MM-DD)
      const apiDateStr = dateStr.replace(/-/g, '/');
      const holidayRecord = response.data.find((item: HolidayData) => 
        item.date === apiDateStr
      );

      return holidayRecord ? holidayRecord.isholiday === '是' : false;
    } catch (error) {
      this.logger.error(`API 請求失敗: ${error.message}`);
      throw error;
    }
  }

  /**
   * 格式化日期為 YYYY-MM-DD
   */
  private formatDate(date: string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * 檢查快取是否有效
   */
  private isCacheValid(): boolean {
    if (!this.lastCacheUpdate) {
      this.lastCacheUpdate = new Date();
      return false;
    }
    
    const now = new Date();
    return (now.getTime() - this.lastCacheUpdate.getTime()) < this.CACHE_DURATION;
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.holidayCache.clear();
    this.lastCacheUpdate = null;
    this.logger.log('假日快取已清除');
  }

  /**
   * 獲取快取統計
   */
  getCacheStats(): { size: number; lastUpdate: Date | null } {
    return {
      size: this.holidayCache.size,
      lastUpdate: this.lastCacheUpdate
    };
  }
}