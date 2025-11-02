import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MarketStats, MarketStatsDocument } from './market-stats.schema';
import { safeGet } from '../common/security.utils';

@Injectable()
export class MarketStatsRepository {
  constructor(
    @InjectModel(MarketStats.name)
    private readonly model: Model<MarketStatsDocument>,
  ) {}

  async updateMarketStats(marketStats: Partial<MarketStats>) {
    const { date } = marketStats;
    return this.model.updateOne({ date }, marketStats, { upsert: true });
  }

  /**
   * 檢查指定日期的資料是否已存在
   */
  async hasMarketStats(date: string): Promise<boolean> {
    const count = await this.model.countDocuments({ date });
    return count > 0;
  }

  /**
   * 獲取指定日期的現有資料
   */
  async getMarketStats(date: string): Promise<MarketStatsDocument | null> {
    return this.model.findOne({ date });
  }

  /**
   * 檢查資料是否需要更新 (比較關鍵欄位)
   */
  async needsUpdate(
    date: string,
    newData: Partial<MarketStats>,
  ): Promise<boolean> {
    const existing = await this.getMarketStats(date);
    if (!existing) {
      return true;
    }

    // 比較關鍵欄位，如果有差異則需要更新
    const keyFields = [
      'taiexPrice',
      'taiexChange',
      'finiNetBuySell',
      'sitcNetBuySell',
      'dealersNetBuySell',
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
   * 智能更新：只有在資料不存在或有變化時才更新
   */
  async smartUpdate(
    marketStats: Partial<MarketStats>,
  ): Promise<{ updated: boolean; reason: string }> {
    const { date } = marketStats;

    const existing = await this.getMarketStats(date);
    if (!existing) {
      await this.updateMarketStats(marketStats);
      return { updated: true, reason: 'new_data' };
    }

    const needsUpdate = await this.needsUpdate(date, marketStats);
    if (needsUpdate) {
      await this.updateMarketStats(marketStats);
      return { updated: true, reason: 'data_changed' };
    }

    return { updated: false, reason: 'data_identical' };
  }
}
