import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ticker, TickerDocument } from './ticker.schema';

@Injectable()
export class TickerRepository {
  constructor(
    @InjectModel(Ticker.name) private readonly model: Model<TickerDocument>,
  ) {}

  async updateTicker(ticker: Partial<Ticker>) {
    const { date, symbol } = ticker;
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
  async getTicker(date: string, symbol: string): Promise<TickerDocument | null> {
    return this.model.findOne({ date, symbol });
  }

  /**
   * 批量檢查特定日期的資料數量
   */
  async getTickerCount(date: string, filters?: Partial<Ticker>): Promise<number> {
    const query = { date, ...filters };
    return this.model.countDocuments(query);
  }

  /**
   * 檢查資料是否需要更新
   */
  async needsUpdate(date: string, symbol: string, newData: Partial<Ticker>): Promise<boolean> {
    const existing = await this.getTicker(date, symbol);
    if (!existing) return true;

    // 比較關鍵欄位
    const keyFields = ['closePrice', 'openPrice', 'highPrice', 'lowPrice', 'volume', 'tradeValue'];
    
    for (const field of keyFields) {
      if (newData[field] !== undefined && existing[field] !== newData[field]) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 智能批量更新
   */
  async smartBatchUpdate(tickers: Partial<Ticker>[]): Promise<{ updated: number; skipped: number; total: number }> {
    let updated = 0;
    let skipped = 0;
    
    for (const ticker of tickers) {
      const { date, symbol } = ticker;
      if (!date || !symbol) continue;
      
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
}
