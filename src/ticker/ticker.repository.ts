import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { safeGet } from '../common/security.utils';
import { Ticker, TickerDocument } from './ticker.schema';

@Injectable()
export class TickerRepository {
  constructor(
    @InjectModel(Ticker.name) private readonly model: Model<TickerDocument>,
  ) {}

  async updateTicker(ticker: Partial<Ticker>) {
    const { date, symbol } = ticker;
    
    // 只對前幾筆資料記錄調試信息
    if (parseInt(symbol) < 1000 || symbol === '0050') {
      console.log(`🔧 嘗試更新: ${symbol} (${date})`, ticker);
      const result = await this.model.updateOne({ date, symbol }, ticker, { upsert: true });
      console.log(`📝 更新結果 ${symbol}: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}`);
      return result;
    }
    
    return this.model.updateOne({ date, symbol }, ticker, { upsert: true });
  }

  /**
   * 檢查指定日期和代號的資料是否已存在
   */
  async hasTicker(date: string, symbol: string): Promise<boolean> {
    const count = await this.model.countDocuments({ date, symbol });
    return count > 0;
  }

  /**
   * 獲取指定日期和代號的現有資料
   */
  async getTicker(
    date: string,
    symbol: string,
  ): Promise<TickerDocument | null> {
    return this.model.findOne({ date, symbol });
  }

  /**
   * 批量檢查特定日期的資料數量
   */
  async getTickerCount(
    date: string,
    filters?: Partial<Ticker>,
  ): Promise<number> {
    const query = { date, ...filters };
    return this.model.countDocuments(query);
  }

  /**
   * 檢查資料是否需要更新
   */
  async needsUpdate(
    date: string,
    symbol: string,
    newData: Partial<Ticker>,
  ): Promise<boolean> {
    const existing = await this.getTicker(date, symbol);
    if (!existing) {
      return true;
    }

    // 比較關鍵欄位
    const keyFields = [
      'closePrice',
      'openPrice',
      'highPrice',
      'lowPrice',
      'volume',
      'tradeValue',
    ];

    for (const field of keyFields) {
      const newValue = safeGet(newData, field);
      const existingValue = safeGet(existing, field);
      if (newValue !== undefined && existingValue !== newValue) {
        return true;
      }
    }

    return false;
  }

  /**
   * 智能批量更新
   */
  async smartBatchUpdate(
    tickers: Partial<Ticker>[],
  ): Promise<{ updated: number; skipped: number; total: number }> {
    let updated = 0;
    let skipped = 0;

    for (const ticker of tickers) {
      const { date, symbol } = ticker;
      if (!date || !symbol) {
        continue;
      }

      const needsUpdate = await this.needsUpdate(date, symbol, ticker);
      if (needsUpdate) {
        await this.updateTicker(ticker);
        updated++;
      } else {
        skipped++;
      }
    }

    return { updated, skipped, total: tickers.length };
  }

  /**
   * 取得指定日期的所有股票資料
   */
  async getTickersByDate(date: string): Promise<TickerDocument[]> {
    return this.model.find({ date }).sort({ symbol: 1 }).exec();
  }

  /**
   * 取得指定股票的歷史資料
   */
  async getHistoricalTickers(
    symbol: string,
    startDate?: string,
    endDate?: string,
    limit?: number,
  ): Promise<TickerDocument[]> {
    const query: any = { symbol };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    let queryBuilder = this.model.find(query).sort({ date: -1 });
    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    return queryBuilder.exec();
  }

  /**
   * 獲取日期範圍內有資料的日期
   */
  async getAvailableDates(startDate: string, endDate: string): Promise<string[]> {
    const query: any = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };
    
    return this.model.distinct('date', query);
  }

  /**
   * 獲取所有有資料的日期
   */
  async getAllAvailableDates(): Promise<string[]> {
    return this.model.distinct('date');
  }

  /**
   * 按日期查找ticker (別名)
   */
  async findByDate(date: string): Promise<TickerDocument[]> {
    return this.getTickersByDate(date);
  }

  /**
   * 查找歷史數據 (別名)
   */
  async findHistoricalData(symbol: string, beforeDate: string, limit: number): Promise<TickerDocument[]> {
    return this.getHistoricalTickers(symbol, undefined, beforeDate, limit);
  }

  /**
   * 獲取所有日期 (別名)
   */
  async getAllDates(): Promise<string[]> {
    return this.getAllAvailableDates();
  }
}
